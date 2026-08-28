import { describe, it, expect } from "vitest";
import { runRetention, retentionCutoff } from "./retention.js";
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

  it("redacts expired payloads while keeping the event on the timeline", async () => {
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

    expect(await runRetention(events, NOW)).toBe(1);

    const log = await events.load(incidentId);
    const telemetryEvents = log.filter((e) => e.type === "TelemetryRecorded");

    // The audit trail survives: both events are still there, in sequence.
    expect(telemetryEvents).toHaveLength(2);
    expect(log.map((e) => e.version)).toEqual([1, 2, 3]);
    // The expired reading is gone; the recent one is untouched.
    expect(telemetryEvents[0]!.payload).toEqual({});
    expect(telemetryEvents[1]!.payload).toMatchObject({ payload: { hr: 90 } });
  });

  it("is safe to run twice", async () => {
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
    await telemetry.record(
      incidentId,
      { kind: "vitals", capturedAt: new Date(Date.parse(NOW) - 91 * DAYS).toISOString(), payload: { hr: 80 } },
      "r",
    );

    expect(await runRetention(events, NOW)).toBe(1);
    // Nothing left to redact — a nightly job must not keep reporting work.
    expect(await runRetention(events, NOW)).toBe(0);
  });

  it("puts the cutoff exactly 90 days back", () => {
    expect(retentionCutoff("2026-07-02T10:00:00.000Z")).toBe("2026-04-03T10:00:00.000Z");
  });
});
