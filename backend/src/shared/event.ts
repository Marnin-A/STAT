// Append-only domain event envelope. Same shape as the `incident_events`
// table sketched in docs/plans/backend-system-design.md.
export interface DomainEvent {
  eventId: string;
  incidentId: string;
  agencyId: string;
  version: number; // per-incident sequence, starts at 1
  type: string;
  actorId: string | null;
  occurredAt: string; // ISO, client-supplied time
  recordedAt: string; // ISO, server time
  payload: Record<string, unknown>;
}

// Injectable clock + id generator keep append helpers deterministic in tests.
export type Clock = () => string;
export type IdGen = () => string;
