import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../incident/service.js";
import { InMemoryEventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore } from "../incident/rate-limit.js";
import {
  NotFoundError,
  UnitUnavailableError,
  DispatchConflictError,
  VersionConflictError,
  InvalidTransitionError,
} from "../shared/errors.js";
import { DispatchService } from "./service.js";
import { InMemoryUnitRegistry, type Unit } from "./unit-registry.js";
import { InMemoryDispatchStore } from "./dispatch-store.js";

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

function makeUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    agencyId: "agency-1",
    type: "ambulance",
    callSign: "M-1",
    status: "available",
    location: { lat: 6.51, lng: 3.4 },
    capabilities: [],
    updatedAt: at,
    ...over,
  };
}

describe("DispatchService", () => {
  let incidents: IncidentService;
  let units: InMemoryUnitRegistry;
  let svc: DispatchService;
  let incidentId: string;

  beforeEach(async () => {
    let n = 0;
    const idGen = () => `id-${++n}`;
    const clock = () => at;
    const events = new InMemoryEventStore();
    incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
    units = new InMemoryUnitRegistry();
    svc = new DispatchService(events, units, new InMemoryDispatchStore(), incidents, idGen, clock);
    ({ incidentId } = await incidents.createSos(sos));
    await units.upsert(makeUnit());
  });

  it("dispatches an available unit: pending record, unit reserved, incident dispatched", async () => {
    const d = await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    expect(d.status).toBe("pending");
    expect(d.incidentId).toBe(incidentId);
    expect(d.unitId).toBe("unit-1");

    expect((await units.get("unit-1"))!.status).toBe("assigned");
    const rm = await incidents.get(incidentId);
    expect(rm!.status).toBe("dispatched");
    expect(rm!.assignedUnitIds).toEqual(["unit-1"]);
  });

  it("blocks double assignment of the same unit", async () => {
    await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    const { incidentId: other } = await incidents.createSos({ ...sos, deviceId: "dev-2", ip: "5.6.7.8" });
    await expect(svc.dispatchUnit(other, "unit-1", "disp-2", 1)).rejects.toBeInstanceOf(
      UnitUnavailableError,
    );
  });

  it("stale expectedVersion -> VersionConflictError and unit is released again", async () => {
    await expect(svc.dispatchUnit(incidentId, "unit-1", "disp-1", 0)).rejects.toBeInstanceOf(
      VersionConflictError,
    );
    expect((await units.get("unit-1"))!.status).toBe("available");
  });

  it("404 on unknown incident or unknown unit", async () => {
    await expect(svc.dispatchUnit("nope", "unit-1", "disp-1", 1)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(svc.dispatchUnit(incidentId, "nope", "disp-1", 1)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects dispatch to a terminal incident", async () => {
    await incidents.changeStatus(incidentId, "cancelled", 1, "disp-1");
    await expect(svc.dispatchUnit(incidentId, "unit-1", "disp-1", 2)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
    expect((await units.get("unit-1"))!.status).toBe("available");
  });

  it("responder accepts a pending dispatch", async () => {
    const d = await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    const accepted = await svc.acceptDispatch(d.id, "resp-1");
    expect(accepted.status).toBe("accepted");
    expect(accepted.responderId).toBe("resp-1");
    expect((await units.get("unit-1"))!.status).toBe("assigned");
  });

  it("responder rejects: dispatch rejected, unit freed, unit unassigned from incident", async () => {
    const d = await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    const rejected = await svc.rejectDispatch(d.id, "resp-1");
    expect(rejected.status).toBe("rejected");
    expect((await units.get("unit-1"))!.status).toBe("available");
    const rm = await incidents.get(incidentId);
    expect(rm!.assignedUnitIds).toEqual([]);
  });

  it("freed unit can be dispatched to the incident again", async () => {
    const d = await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    await svc.rejectDispatch(d.id, "resp-1");
    // log: SOSAccepted(1) UnitAssigned(2) StatusChanged(3) UnitUnassigned(4)
    const again = await svc.dispatchUnit(incidentId, "unit-1", "disp-2", 4);
    expect(again.status).toBe("pending");
    expect((await units.get("unit-1"))!.status).toBe("assigned");
  });

  it("accept/reject on a non-pending dispatch -> DispatchConflictError", async () => {
    const d = await svc.dispatchUnit(incidentId, "unit-1", "disp-1", 1);
    await svc.acceptDispatch(d.id, "resp-1");
    await expect(svc.acceptDispatch(d.id, "resp-1")).rejects.toBeInstanceOf(
      DispatchConflictError,
    );
    await expect(svc.rejectDispatch(d.id, "resp-1")).rejects.toBeInstanceOf(
      DispatchConflictError,
    );
  });

  it("accept on unknown dispatch -> NotFoundError", async () => {
    await expect(svc.acceptDispatch("nope", "resp-1")).rejects.toBeInstanceOf(NotFoundError);
  });
});
