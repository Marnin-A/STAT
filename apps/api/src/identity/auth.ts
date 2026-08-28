import type { IncomingHttpHeaders } from "node:http";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";
import type { IncidentReadModel } from "../incident/projection.js";

export type Role = "citizen" | "responder" | "dispatcher" | "hospital_staff" | "admin";

export interface Principal {
  userId: string | null; // null = anonymous citizen
  role: Role;
  agencyId: string | null; // null for citizen/admin
}

const ROLES: ReadonlySet<string> = new Set([
  "citizen",
  "responder",
  "dispatcher",
  "hospital_staff",
  "admin",
]);

// PHASE 1 STUB. Reads principal from headers. At runtime Better Auth
// (access-control plugin + Capacitor bearer) replaces this — the Principal
// shape stays the same so routes/guards do not change.
export function resolvePrincipal(headers: IncomingHttpHeaders): Principal {
  const userId = (headers["x-user-id"] as string | undefined) ?? null;
  if (!userId) return { userId: null, role: "citizen", agencyId: null };

  const roleHeader = headers["x-role"] as string | undefined;
  const role: Role = roleHeader && ROLES.has(roleHeader) ? (roleHeader as Role) : "citizen";
  const agencyId = (headers["x-agency-id"] as string | undefined) ?? null;
  return { userId, role, agencyId };
}

export function requireAuthenticated(p: Principal): void {
  if (!p.userId) throw new UnauthorizedError();
}

export function assertRole(p: Principal, allowed: Role[]): void {
  if (!allowed.includes(p.role)) throw new ForbiddenError(`role ${p.role} not allowed`);
}

// Agency scope: admin sees all; others must match the incident's agency.
// Unassigned incidents (pre-dispatch) are visible to any authenticated agent.
export function assertAgencyAccess(p: Principal, rm: IncidentReadModel): void {
  if (p.role === "admin") return;
  if (rm.agencyId === "unassigned") return;
  if (p.agencyId !== rm.agencyId) throw new ForbiddenError("agency scope");
}
