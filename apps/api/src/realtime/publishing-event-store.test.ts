import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore, appendEvent } from "../incident/event-store.js";
import { VersionConflictError } from "../shared/errors.js";
import type { DomainEvent } from "../shared/event.js";
import { InMemoryEventBus, incidentChannel, agencyChannel, ALL_CHANNEL } from "./bus.js";
import { PublishingEventStore } from "./publishing-event-store.js";
import { LagMetrics } from "./lag-metrics.js";

const at = "2026-07-02T10:00:00.000Z";

describe("PublishingEventStore", () => {
  let bus: InMemoryEventBus;
  let store: PublishingEventStore;
  let metrics: LagMetrics;

  beforeEach(() => {
    bus = new InMemoryEventBus();
    metrics = new LagMetrics(() => Date.parse(at) + 50);
    store = new PublishingEventStore(new InMemoryEventStore(), bus, metrics);
  });

  async function append(expectedVersion = 0): Promise<DomainEvent> {
    return appendEvent(
      store,
      {
        incidentId: "inc-1",
        agencyId: "agency-1",
        type: "SOSAccepted",
        actorId: null,
        occurredAt: at,
        payload: {},
        expectedVersion,
      },
      () => at,
      () => "e1",
    );
  }

  it("publishes appended events to incident, agency and all channels", async () => {
    const channels: string[] = [];
    for (const c of [incidentChannel("inc-1"), agencyChannel("agency-1"), ALL_CHANNEL]) {
      bus.subscribe(c, () => channels.push(c));
    }
    await append();
    expect(channels).toEqual([incidentChannel("inc-1"), agencyChannel("agency-1"), ALL_CHANNEL]);
  });

  it("does not publish when the underlying put fails", async () => {
    let published = 0;
    bus.subscribe(ALL_CHANNEL, () => published++);
    await append();
    await expect(append(0)).rejects.toBeInstanceOf(VersionConflictError); // stale
    expect(published).toBe(1);
  });

  it("still reads through to the inner store", async () => {
    await append();
    expect(await store.currentVersion("inc-1")).toBe(1);
    expect((await store.load("inc-1")).length).toBe(1);
    expect(await store.incidentIds()).toEqual(["inc-1"]);
  });

  it("records publish lag against recordedAt", async () => {
    await append();
    const snap = metrics.snapshot();
    expect(snap.published).toBe(1);
    expect(snap.maxLagMs).toBe(50);
    expect(snap.avgLagMs).toBe(50);
  });
});

describe("LagMetrics", () => {
  it("tracks count, max and average", () => {
    let now = 1000;
    const m = new LagMetrics(() => now);
    now = 1010;
    m.record(new Date(1000).toISOString());
    now = 1030;
    m.record(new Date(1000).toISOString());
    expect(m.snapshot()).toEqual({ published: 2, maxLagMs: 30, avgLagMs: 20 });
  });

  it("empty snapshot is zeroed", () => {
    expect(new LagMetrics().snapshot()).toEqual({ published: 0, maxLagMs: 0, avgLagMs: 0 });
  });
});
