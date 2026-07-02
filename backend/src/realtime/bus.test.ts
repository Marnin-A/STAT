import { describe, it, expect } from "vitest";
import { InMemoryEventBus, incidentChannel, agencyChannel, ALL_CHANNEL } from "./bus.js";
import type { DomainEvent } from "../shared/event.js";

const event: DomainEvent = {
  eventId: "e1",
  incidentId: "inc-1",
  agencyId: "agency-1",
  version: 1,
  type: "SOSAccepted",
  actorId: null,
  occurredAt: "2026-07-02T10:00:00.000Z",
  recordedAt: "2026-07-02T10:00:00.000Z",
  payload: {},
};

describe("InMemoryEventBus", () => {
  it("delivers published events to channel subscribers", async () => {
    const bus = new InMemoryEventBus();
    const got: DomainEvent[] = [];
    bus.subscribe("c1", (e) => got.push(e));
    await bus.publish("c1", event);
    expect(got).toEqual([event]);
  });

  it("does not leak across channels", async () => {
    const bus = new InMemoryEventBus();
    const got: DomainEvent[] = [];
    bus.subscribe("c1", (e) => got.push(e));
    await bus.publish("c2", event);
    expect(got).toEqual([]);
  });

  it("unsubscribe stops delivery", async () => {
    const bus = new InMemoryEventBus();
    const got: DomainEvent[] = [];
    const off = bus.subscribe("c1", (e) => got.push(e));
    off();
    await bus.publish("c1", event);
    expect(got).toEqual([]);
  });

  it("a throwing subscriber does not break other subscribers", async () => {
    const bus = new InMemoryEventBus();
    const got: DomainEvent[] = [];
    bus.subscribe("c1", () => {
      throw new Error("boom");
    });
    bus.subscribe("c1", (e) => got.push(e));
    await bus.publish("c1", event);
    expect(got).toEqual([event]);
  });

  it("channel name helpers", () => {
    expect(incidentChannel("inc-1")).toBe("incident:inc-1");
    expect(agencyChannel("agency-1")).toBe("agency:agency-1");
    expect(ALL_CHANNEL).toBe("incidents:all");
  });
});
