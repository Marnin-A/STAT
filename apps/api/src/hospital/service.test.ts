import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../incident/service.js";
import { InMemoryEventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore } from "../incident/rate-limit.js";
import { BadRequestError, NotFoundError } from "../shared/errors.js";
import { TriageService } from "../triage/service.js";
import { TelemetryService } from "../telemetry/service.js";
import { HospitalService } from "./service.js";
import { InMemoryHospitalRegistry, type Hospital } from "./registry.js";
import { rankHospitals } from "./routing.js";
import { InMemoryNotifier } from "../notification/notifier.js";

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

function hospital(over: Partial<Hospital> = {}): Hospital {
  return {
    id: "hosp-1",
    name: "Lagos General",
    location: { lat: 6.52, lng: 3.41 },
    capabilities: ["trauma", "cardiac"],
    availableBeds: 12,
    webhookUrl: null,
    updatedAt: at,
    ...over,
  };
}

describe("rankHospitals", () => {
  const loc = { lat: 6.5, lng: 3.4 };

  it("filters by capability and excludes full hospitals", () => {
    const ranked = rankHospitals(
      [
        hospital({ id: "full", availableBeds: 0 }),
        hospital({ id: "no-cardiac", capabilities: ["trauma"] }),
        hospital({ id: "ok" }),
      ],
      { location: loc, capability: "cardiac" },
    );
    expect(ranked.map((h) => h.id)).toEqual(["ok"]);
  });

  it("orders by distance nearest first with distanceKm", () => {
    const ranked = rankHospitals(
      [
        hospital({ id: "far", location: { lat: 7.0, lng: 3.4 } }),
        hospital({ id: "near", location: { lat: 6.51, lng: 3.4 } }),
      ],
      { location: loc },
    );
    expect(ranked.map((h) => h.id)).toEqual(["near", "far"]);
    expect(ranked[0]!.distanceKm).toBeLessThan(ranked[1]!.distanceKm);
  });
});

describe("HospitalService", () => {
  let incidents: IncidentService;
  let svc: HospitalService;
  let notifier: InMemoryNotifier;
  let incidentId: string;

  beforeEach(async () => {
    let n = 0;
    const idGen = () => `id-${++n}`;
    const clock = () => at;
    const events = new InMemoryEventStore();
    incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
    const triage = new TriageService(events, incidents, idGen, clock);
    const telemetry = new TelemetryService(events, incidents, idGen, clock);
    const hospitals = new InMemoryHospitalRegistry();
    notifier = new InMemoryNotifier();
    svc = new HospitalService(events, incidents, hospitals, triage, telemetry, notifier, idGen, clock);
    ({ incidentId } = await incidents.createSos(sos));
    await hospitals.upsert(hospital());

    await triage.submitAnswers(incidentId, [{ questionId: "med-conscious", value: false }], "resp-1", at);
    await telemetry.record(incidentId, { kind: "vitals", capturedAt: at, payload: { hr: 118 } }, "resp-1");
  });

  it("selects a hospital for an incident", async () => {
    await svc.selectHospital(incidentId, "hosp-1", "resp-1");
    expect((await incidents.get(incidentId))!.hospitalId).toBe("hosp-1");
  });

  it("404 selecting unknown hospital or incident", async () => {
    await expect(svc.selectHospital(incidentId, "nope", "r")).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.selectHospital("nope", "hosp-1", "r")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("alert without a selected hospital -> BadRequest", async () => {
    await expect(svc.alertHospital(incidentId, "resp-1")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("alert sends a usable handoff: triage score + latest vitals included", async () => {
    await svc.selectHospital(incidentId, "hosp-1", "resp-1");
    await svc.alertHospital(incidentId, "resp-1");

    expect(notifier.sent).toHaveLength(1);
    const handoff = notifier.sent[0]!;
    expect(handoff.hospitalId).toBe("hosp-1");
    expect(handoff.incidentId).toBe(incidentId);
    expect(handoff.summary.type).toBe("medical");
    expect(handoff.summary.triage!.level).toBe("serious");
    expect(handoff.summary.latestVitals[0]!.payload).toEqual({ hr: 118 });

    expect((await incidents.get(incidentId))!.hospitalAlerted).toBe(true);
  });

  it("lists active incidents for a hospital, excluding terminal ones", async () => {
    await svc.selectHospital(incidentId, "hosp-1", "resp-1");
    const { incidentId: other } = await incidents.createSos({ ...sos, deviceId: "d2", ip: "9.9.9.9" });
    await svc.selectHospital(other, "hosp-1", "resp-1");
    await incidents.changeStatus(other, "cancelled", 2, "disp-1");

    const active = await svc.getHospitalActiveIncidents("hosp-1");
    expect(active.map((i) => i.id)).toEqual([incidentId]);
  });
});
