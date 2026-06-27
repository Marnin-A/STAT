import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { Clock, IdGen } from "./shared/event.js";
import { DomainError, BadRequestError, NotFoundError } from "./shared/errors.js";
import { InMemoryIdempotencyStore, type IdempotencyStore } from "./shared/idempotency.js";
import { InMemoryEventStore } from "./incident/event-store.js";
import { InMemoryRateLimitStore } from "./incident/rate-limit.js";
import { IncidentService } from "./incident/service.js";
import type { IncidentStatus } from "./incident/state-machine.js";
import {
  resolvePrincipal,
  requireAuthenticated,
  assertRole,
  assertAgencyAccess,
} from "./identity/auth.js";

export interface AppDeps {
  incidents: IncidentService;
  idempotency: IdempotencyStore;
}

// Wire default in-memory deps (Phase 1). Supabase/Redis impls swap in here.
export function defaultDeps(idGen: IdGen = randomUUID, clock: Clock = () => new Date().toISOString()): AppDeps {
  return {
    incidents: new IncidentService(
      new InMemoryEventStore(),
      new InMemoryRateLimitStore(),
      idGen,
      clock,
    ),
    idempotency: new InMemoryIdempotencyStore(),
  };
}

export function buildApp(deps: AppDeps = defaultDeps()): FastifyInstance {
  const app = Fastify({ logger: false });
  const { incidents, idempotency } = deps;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof DomainError) {
      return reply.status(err.statusCode).send({ error: err.code, message: err.message });
    }
    return reply.status(500).send({ error: "INTERNAL", message: "internal error" });
  });

  // POST /incidents — create from SOS. Anonymous citizen allowed.
  app.post("/incidents", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    const key = req.headers["idempotency-key"] as string | undefined;
    if (!key) throw new BadRequestError("Idempotency-Key header required");

    const scoped = `${principal.userId ?? "anon"}:POST /incidents:${key}`;
    const cached = await idempotency.get(scoped);
    if (cached) return reply.status(201).send(cached);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.type || !b.priority || !b.deviceId) {
      throw new BadRequestError("type, priority, deviceId required");
    }

    const result = await incidents.createSos({
      agencyId: typeof b.agencyId === "string" ? b.agencyId : "unassigned",
      type: String(b.type),
      priority: String(b.priority),
      location: (b.location as { lat: number; lng: number } | null) ?? null,
      reporterId: principal.userId,
      deviceId: String(b.deviceId),
      ip: req.ip,
      occurredAt: typeof b.occurredAt === "string" ? b.occurredAt : new Date().toISOString(),
    });

    await idempotency.set(scoped, result);
    return reply.status(201).send(result);
  });

  // GET /incidents?status= — agency-scoped list.
  app.get("/incidents", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const status = (req.query as Record<string, string>).status as IncidentStatus | undefined;
    const scope = principal.role === "admin" ? null : principal.agencyId;
    const list = await incidents.list(scope, status);
    return reply.send(list);
  });

  // GET /incidents/:id — read model.
  app.get("/incidents/:id", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);
    return reply.send(rm);
  });

  // POST /incidents/:id/status — transition. Dispatcher/responder/admin only.
  app.post("/incidents/:id/status", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "responder", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.status || typeof b.expectedVersion !== "number") {
      throw new BadRequestError("status and expectedVersion required");
    }

    await incidents.changeStatus(
      id,
      b.status as IncidentStatus,
      b.expectedVersion,
      principal.userId!,
    );
    return reply.send(await incidents.get(id));
  });

  return app;
}

// Entry point.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: "0.0.0.0" }).then(() => {
    console.log(`STAT backend listening on :${port}`);
  });
}
