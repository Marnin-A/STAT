import { describe, it, expect } from "vitest";
import { InMemoryEventStore, appendEvent } from "./event-store.js";
import { VersionConflictError } from "../shared/errors.js";

const base = {
  incidentId: "inc-1",
  agencyId: "agency-1",
  actorId: "user-1",
  occurredAt: "2026-06-27T10:00:00.000Z",
};

describe("event store", () => {
  it("appends first event at version 1 and loads it back", async () => {
    const store = new InMemoryEventStore();
    const ev = await appendEvent(store, {
      ...base,
      type: "IncidentCreated",
      payload: { type: "medical" },
      expectedVersion: 0,
    });
    expect(ev.version).toBe(1);
    expect(ev.eventId).toBeTruthy();
    expect(ev.recordedAt).toBeTruthy();

    const loaded = await store.load("inc-1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.type).toBe("IncidentCreated");
  });

  it("increments version across sequential appends", async () => {
    const store = new InMemoryEventStore();
    await appendEvent(store, { ...base, type: "A", payload: {}, expectedVersion: 0 });
    const second = await appendEvent(store, {
      ...base,
      type: "B",
      payload: {},
      expectedVersion: 1,
    });
    expect(second.version).toBe(2);
    expect(await store.currentVersion("inc-1")).toBe(2);
  });

  it("throws VersionConflictError on stale expectedVersion", async () => {
    const store = new InMemoryEventStore();
    await appendEvent(store, { ...base, type: "A", payload: {}, expectedVersion: 0 });
    await expect(
      appendEvent(store, { ...base, type: "B", payload: {}, expectedVersion: 0 }),
    ).rejects.toBeInstanceOf(VersionConflictError);
  });

  it("isolates events per incident", async () => {
    const store = new InMemoryEventStore();
    await appendEvent(store, { ...base, type: "A", payload: {}, expectedVersion: 0 });
    await appendEvent(store, {
      ...base,
      incidentId: "inc-2",
      type: "A",
      payload: {},
      expectedVersion: 0,
    });
    expect(await store.load("inc-1")).toHaveLength(1);
    expect(await store.load("inc-2")).toHaveLength(1);
  });
});
