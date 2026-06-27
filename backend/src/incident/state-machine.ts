import { InvalidTransitionError } from "../shared/errors.js";

export type IncidentStatus =
  | "created"
  | "triaging"
  | "dispatched"
  | "en_route"
  | "on_scene"
  | "transporting"
  | "resolved"
  | "cancelled";

// Forward step transitions of the happy path. Cancel is added separately
// because it is reachable from every non-terminal status.
const FORWARD: Record<IncidentStatus, readonly IncidentStatus[]> = {
  created: ["triaging", "dispatched"],
  triaging: ["dispatched"],
  dispatched: ["en_route"],
  en_route: ["on_scene"],
  on_scene: ["transporting", "resolved"],
  transporting: ["resolved"],
  resolved: [],
  cancelled: [],
};

const TERMINAL: ReadonlySet<IncidentStatus> = new Set(["resolved", "cancelled"]);

export function isTerminal(status: IncidentStatus): boolean {
  return TERMINAL.has(status);
}

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (isTerminal(from)) return false;
  if (to === "cancelled") return true;
  return FORWARD[from].includes(to);
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
