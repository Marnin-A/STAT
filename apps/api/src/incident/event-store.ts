import { randomUUID } from "node:crypto";
import type { Clock, DomainEvent, IdGen } from "../shared/event.js";
import { VersionConflictError } from "../shared/errors.js";

// Persistence port. A Postgres/Supabase impl replaces InMemoryEventStore at
// runtime; the optimistic-lock UNIQUE(incident_id, version) enforces the same
// invariant the in-memory store checks here.
export interface EventStore {
  currentVersion(incidentId: string): Promise<number>;
  // Persist one event. Must reject if `expectedVersion` != current version.
  put(event: DomainEvent, expectedVersion: number): Promise<void>;
  load(incidentId: string): Promise<DomainEvent[]>;
  incidentIds(): Promise<string[]>;
  /**
   * Optional bulk read: every stream for one agency (null = all) in one go.
   *
   * `IncidentService.list()` folds one read model per incident. Against a
   * database that is a round trip each; an adapter that can do it in a single
   * query implements this and the service uses it automatically.
   */
  loadByAgency?(agencyId: string | null): Promise<Map<string, DomainEvent[]>>;
}

export interface AppendInput {
  incidentId: string;
  agencyId: string;
  type: string;
  actorId: string | null;
  occurredAt: string;
  payload: Record<string, unknown>;
  expectedVersion: number;
}

// Builds the envelope (version, ids, server time) and delegates the
// concurrency check to the store.
export async function appendEvent(
  store: EventStore,
  input: AppendInput,
  clock: Clock = () => new Date().toISOString(),
  idGen: IdGen = randomUUID,
): Promise<DomainEvent> {
  const event: DomainEvent = {
    eventId: idGen(),
    incidentId: input.incidentId,
    agencyId: input.agencyId,
    version: input.expectedVersion + 1,
    type: input.type,
    actorId: input.actorId,
    occurredAt: input.occurredAt,
    recordedAt: clock(),
    payload: input.payload,
  };
  await store.put(event, input.expectedVersion);
  return event;
}

export class InMemoryEventStore implements EventStore {
  private readonly streams = new Map<string, DomainEvent[]>();

  async currentVersion(incidentId: string): Promise<number> {
    return this.streams.get(incidentId)?.length ?? 0;
  }

  async put(event: DomainEvent, expectedVersion: number): Promise<void> {
    const stream = this.streams.get(event.incidentId) ?? [];
    if (stream.length !== expectedVersion) {
      throw new VersionConflictError(expectedVersion, stream.length);
    }
    stream.push(event);
    this.streams.set(event.incidentId, stream);
  }

  async load(incidentId: string): Promise<DomainEvent[]> {
    return [...(this.streams.get(incidentId) ?? [])];
  }

  async incidentIds(): Promise<string[]> {
    return [...this.streams.keys()];
  }
}
