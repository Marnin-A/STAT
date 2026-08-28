import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../incident/service.js";
import { InMemoryEventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore } from "../incident/rate-limit.js";
import { NotFoundError, BadRequestError } from "../shared/errors.js";
import { TriageService } from "./service.js";
import { TelemetryService } from "../telemetry/service.js";

const at = "2026-07-02T10:00:00.000Z";

const sos = {
  agencyId: "agency-1",
  type: "medical" as const,
  priority: "critical" as const,
  location: { lat: 6.5, lng: 3.4 },
  reporterId: null,
  deviceId: "dev-1",
  ip: "1.2.3.4",
  occurredAt: at,
};

let incidents: IncidentService;
let triage: TriageService;
let telemetry: TelemetryService;
let incidentId: string;

beforeEach(async () => {
  let n = 0;
  const idGen = () => `id-${++n}`;
  const clock = () => at;
  const events = new InMemoryEventStore();
  incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
  triage = new TriageService(events, incidents, idGen, clock);
  telemetry = new TelemetryService(events, incidents, idGen, clock);
  ({ incidentId } = await incidents.createSos(sos));
});

describe("TriageService", () => {
  const critical = [
    { questionId: "med-conscious", value: false },
    { questionId: "med-breathing", value: false },
  ];

  it("scores and stores submitted answers; incident moves to triaging", async () => {
    const score = await triage.submitAnswers(incidentId, critical, "resp-1", at);
    expect(score.level).toBe("critical");

    const t = await triage.getTriage(incidentId);
    expect(t.incidentId).toBe(incidentId);
    expect(t.answers).toEqual(critical);
    expect(t.score).toEqual(score);
    expect(t.questions.length).toBeGreaterThan(0);

    expect((await incidents.get(incidentId))!.status).toBe("triaging");
  });

  it("keeps incident status when already past triaging", async () => {
    await incidents.changeStatus(incidentId, "dispatched", 1, "disp-1");
    await triage.submitAnswers(incidentId, critical, "resp-1", at);
    expect((await incidents.get(incidentId))!.status).toBe("dispatched");
  });

  it("resubmission replaces answers (latest wins)", async () => {
    await triage.submitAnswers(incidentId, critical, "resp-1", at);
    const stable = [
      { questionId: "med-conscious", value: true },
      { questionId: "med-breathing", value: true },
    ];
    await triage.submitAnswers(incidentId, stable, "resp-1", at);
    const t = await triage.getTriage(incidentId);
    expect(t.answers).toEqual(stable);
    expect(t.score!.level).toBe("stable");
  });

  it("404 on unknown incident; empty triage before submission", async () => {
    await expect(triage.submitAnswers("nope", critical, "r", at)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    const t = await triage.getTriage(incidentId);
    expect(t.answers).toEqual([]);
    expect(t.score).toBeNull();
  });
});

describe("TelemetryService", () => {
  const sample = {
    kind: "vitals",
    capturedAt: at,
    payload: { hr: 118, spo2: 94, rr: 22 },
  };

  it("records a sample and returns it as latest", async () => {
    await telemetry.record(incidentId, sample, "resp-1");
    const latest = await telemetry.latest(incidentId);
    expect(latest).toHaveLength(1);
    expect(latest[0]!.kind).toBe("vitals");
    expect(latest[0]!.payload).toEqual(sample.payload);
    expect(latest[0]!.incidentId).toBe(incidentId);
    expect(latest[0]!.recordedAt).toBe(at);
  });

  it("latest returns newest first, capped by limit", async () => {
    for (let hr = 100; hr < 105; hr++) {
      await telemetry.record(incidentId, { ...sample, payload: { hr } }, "resp-1");
    }
    const latest = await telemetry.latest(incidentId, 2);
    expect(latest).toHaveLength(2);
    expect(latest[0]!.payload).toEqual({ hr: 104 });
    expect(latest[1]!.payload).toEqual({ hr: 103 });
  });

  it("rejects out-of-range vitals", async () => {
    await expect(
      telemetry.record(incidentId, { ...sample, payload: { hr: 700 } }, "resp-1"),
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(
      telemetry.record(incidentId, { ...sample, payload: { spo2: 12 } }, "resp-1"),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects malformed samples and unknown incidents", async () => {
    await expect(
      telemetry.record(incidentId, { kind: "", capturedAt: at, payload: {} }, "r"),
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(
      telemetry.record(incidentId, { kind: "vitals", capturedAt: "yesterday", payload: {} }, "r"),
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(telemetry.record("nope", sample, "r")).rejects.toBeInstanceOf(NotFoundError);
  });
});
