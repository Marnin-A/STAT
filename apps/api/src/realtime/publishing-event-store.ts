import type { DomainEvent } from "../shared/event.js";
import type { EventStore } from "../incident/event-store.js";
import { ALL_CHANNEL, agencyChannel, incidentChannel, type EventBus } from "./bus.js";
import type { LagMetrics } from "./lag-metrics.js";

// Decorator: every successfully persisted event fans out to the incident,
// agency and firehose channels. Services stay unaware of real-time concerns.
export class PublishingEventStore implements EventStore {
  constructor(
    private readonly inner: EventStore,
    private readonly bus: EventBus,
    private readonly metrics?: LagMetrics,
  ) {}

  async put(event: DomainEvent, expectedVersion: number): Promise<void> {
    await this.inner.put(event, expectedVersion); // throws on conflict -> no publish
    this.metrics?.record(event.recordedAt);
    await this.bus.publish(incidentChannel(event.incidentId), event);
    await this.bus.publish(agencyChannel(event.agencyId), event);
    await this.bus.publish(ALL_CHANNEL, event);
  }

  currentVersion(incidentId: string): Promise<number> {
    return this.inner.currentVersion(incidentId);
  }

  load(incidentId: string): Promise<DomainEvent[]> {
    return this.inner.load(incidentId);
  }

  incidentIds(): Promise<string[]> {
    return this.inner.incidentIds();
  }
}
