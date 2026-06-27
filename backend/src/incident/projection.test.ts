import { describe, it, expect } from "vitest";
import { projectIncident } from "./projection.js";
import type { DomainEvent } from "../shared/event.js";

let seq = 0;
function ev(type: string, payload: Record<string, unknown>): DomainEvent {
  seq++;
  return {
    eventId: `ev-${seq}`,
    incidentId: "inc-1",
    agencyId: "agency-1",
    version: seq,
    type,
    actorId: "user-1",
    occurredAt: "2026-06-27T10:00:00.000Z",
    recordedAt: `2026-06-27T10:0${seq}:00.000Z`,
    payload,
  };
}

describe("incident projection", () => {
  it("returns null for empty event log", () => {
    expect(projectIncident([])).toBeNull();
  });

  it("builds read model from creation event", () => {
    const rm = projectIncident([
      ev("SOSAccepted", {
        type: "medical",
        priority: "critical",
        location: { lat: 6.5, lng: 3.4 },
        riskScore: 5,
      }),
    ]);
    expect(rm).not.toBeNull();
    expect(rm!.id).toBe("inc-1");
    expect(rm!.agencyId).toBe("agency-1");
    expect(rm!.type).toBe("medical");
    expect(rm!.status).toBe("created");
    expect(rm!.riskScore).toBe(5);
    expect(rm!.flagged).toBe(false);
    expect(rm!.assignedUnitIds).toEqual([]);
  });

  it("marks flagged when created via SOSFlagged", () => {
    const rm = projectIncident([
      ev("SOSFlagged", { type: "fire", priority: "serious", location: null, riskScore: 80 }),
    ]);
    expect(rm!.flagged).toBe(true);
    expect(rm!.riskScore).toBe(80);
  });

  it("applies status changes and assignments, tracking updatedAt", () => {
    const events = [
      ev("SOSAccepted", { type: "medical", priority: "critical", location: null, riskScore: 0 }),
      ev("IncidentStatusChanged", { status: "triaging" }),
      ev("UnitAssigned", { unitId: "unit-7" }),
      ev("IncidentStatusChanged", { status: "dispatched" }),
    ];
    const rm = projectIncident(events);
    expect(rm!.status).toBe("dispatched");
    expect(rm!.assignedUnitIds).toEqual(["unit-7"]);
    expect(rm!.updatedAt).toBe(events.at(-1)!.recordedAt);
    expect(rm!.createdAt).toBe(events[0]!.recordedAt);
  });
});
