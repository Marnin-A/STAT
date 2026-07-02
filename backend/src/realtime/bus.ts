import type { DomainEvent } from "../shared/event.js";

// Fan-out port. Redis pub/sub replaces InMemoryEventBus for multi-node;
// channel naming stays identical (Redis channels are strings too).
export type BusHandler = (event: DomainEvent) => void;

export interface EventBus {
  publish(channel: string, event: DomainEvent): Promise<void>;
  // Returns an unsubscribe function.
  subscribe(channel: string, handler: BusHandler): () => void;
}

export function incidentChannel(incidentId: string): string {
  return `incident:${incidentId}`;
}

export function agencyChannel(agencyId: string): string {
  return `agency:${agencyId}`;
}

export const ALL_CHANNEL = "incidents:all";

export class InMemoryEventBus implements EventBus {
  private readonly channels = new Map<string, Set<BusHandler>>();

  async publish(channel: string, event: DomainEvent): Promise<void> {
    for (const handler of this.channels.get(channel) ?? []) {
      try {
        handler(event);
      } catch {
        // One broken subscriber (e.g. a dying socket) must not stop fan-out.
      }
    }
  }

  subscribe(channel: string, handler: BusHandler): () => void {
    const set = this.channels.get(channel) ?? new Set();
    set.add(handler);
    this.channels.set(channel, set);
    return () => set.delete(handler);
  }
}
