import { describe, it, expect } from "vitest";
import { IncidentService } from "../incident/service.js";
import { InMemoryEventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore } from "../incident/rate-limit.js";
import { TelemetryService } from "./service.js";

const NOW = "2026-07-02T10:00:00.000Z";
const DAYS = 24 * 60 * 60 * 1000;

describe("telemetry retention (90 days)", () => {
  it("excludes samples older than 90 days from reads", async () => {
    let n = 0;
    const events = new InMemoryEventStore();
    const incidents = new IncidentService(events, new InMemoryRateLimitStore(), () => `id-${++n}`, () => NOW);
    const telemetry = new TelemetryService(events, incidents, () => `id-${++n}`, () => NOW);

    const { incidentId } = await incidents.createSos({
      agencyId: "agency-1",
      type: "medical",
      priority: "critical",
      location: null,
      reporterId: null,
      deviceId: "d1",
      ip: "1.1.1.1",
      occurredAt: NOW,
    });

    const old = new Date(Date.parse(NOW) - 91 * DAYS).toISOString();
    const recent = new Date(Date.parse(NOW) - 89 * DAYS).toISOString();
    await telemetry.record(incidentId, { kind: "vitals", capturedAt: old, payload: { hr: 80 } }, "r");
    await telemetry.record(incidentId, { kind: "vitals", capturedAt: recent, payload: { hr: 90 } }, "r");

    const latest = await telemetry.latest(incidentId);
    expect(latest).toHaveLength(1);
    expect(latest[0]!.payload).toEqual({ hr: 90 });
  });
});
