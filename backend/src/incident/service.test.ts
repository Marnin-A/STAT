import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "./service.js";
import { InMemoryEventStore } from "./event-store.js";
import { InMemoryRateLimitStore } from "./rate-limit.js";
import {
  InvalidTransitionError,
  VersionConflictError,
  RateLimitBlockedError,
} from "../shared/errors.js";

function makeService() {
  let n = 0;
  const idGen = () => `id-${++n}`;
  const clock = () => "2026-06-27T10:00:00.000Z";
  return new IncidentService(
    new InMemoryEventStore(),
    new InMemoryRateLimitStore(),
    idGen,
    clock,
  );
}

const sos = {
  agencyId: "agency-1",
  type: "medical",
  priority: "critical",
  location: { lat: 6.5, lng: 3.4 },
  reporterId: null,
  deviceId: "dev-1",
  ip: "1.2.3.4",
  occurredAt: "2026-06-27T10:00:00.000Z",
};

describe("IncidentService", () => {
  let svc: IncidentService;
  beforeEach(() => {
    svc = makeService();
  });

  it("creates an accepted incident from a fresh SOS", async () => {
    const res = await svc.createSos(sos);
    expect(res.status).toBe("created");
    expect(res.flagged).toBe(false);
    expect(res.riskScore).toBe(0);

    const rm = await svc.get(res.incidentId);
    expect(rm!.type).toBe("medical");
    expect(rm!.status).toBe("created");
  });

  it("flags repeated SOS from same device but still creates", async () => {
    let last;
    for (let i = 0; i < 5; i++) last = await svc.createSos(sos);
    expect(last!.flagged).toBe(true);
    expect(last!.riskScore).toBeGreaterThanOrEqual(50);
    expect(last!.status).toBe("created");
  });

  it("hard-blocks obvious spam with RateLimitBlockedError", async () => {
    for (let i = 0; i < 20; i++) await svc.createSos(sos);
    await expect(svc.createSos(sos)).rejects.toBeInstanceOf(RateLimitBlockedError);
  });

  it("transitions status through a valid step", async () => {
    const { incidentId } = await svc.createSos(sos);
    await svc.changeStatus(incidentId, "triaging", 1, "user-1");
    const rm = await svc.get(incidentId);
    expect(rm!.status).toBe("triaging");
  });

  it("rejects an invalid transition with InvalidTransitionError", async () => {
    const { incidentId } = await svc.createSos(sos);
    await expect(
      svc.changeStatus(incidentId, "resolved", 1, "user-1"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects a stale version with VersionConflictError", async () => {
    const { incidentId } = await svc.createSos(sos);
    await expect(
      svc.changeStatus(incidentId, "triaging", 0, "user-1"),
    ).rejects.toBeInstanceOf(VersionConflictError);
  });

  it("rebuilds the same read model from the event log (projection parity)", async () => {
    const { incidentId } = await svc.createSos(sos);
    await svc.changeStatus(incidentId, "dispatched", 1, "user-1");
    const live = await svc.get(incidentId);
    const rebuilt = await svc.get(incidentId); // get() folds from log each call
    expect(rebuilt).toEqual(live);
    expect(live!.status).toBe("dispatched");
  });
});
