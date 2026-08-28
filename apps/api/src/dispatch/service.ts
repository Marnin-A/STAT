import type { Clock, IdGen } from "../shared/event.js";
import {
  DispatchConflictError,
  NotFoundError,
  UnitUnavailableError,
} from "../shared/errors.js";
import { appendEvent, type EventStore } from "../incident/event-store.js";
import type { IncidentService } from "../incident/service.js";
import { assertTransition } from "../incident/state-machine.js";
import type { DispatchRecord, DispatchStore } from "./dispatch-store.js";
import type { UnitRegistry } from "./unit-registry.js";

// Dispatch command flow (design decision 11): dispatcher assigns, responder
// accepts/rejects. Unit reservation is the double-assignment guard; the
// incident event log keeps the audit trail.
export class DispatchService {
  constructor(
    private readonly events: EventStore,
    private readonly units: UnitRegistry,
    private readonly dispatches: DispatchStore,
    private readonly incidents: IncidentService,
    private readonly idGen: IdGen,
    private readonly clock: Clock,
  ) {}

  async dispatchUnit(
    incidentId: string,
    unitId: string,
    dispatcherId: string,
    expectedVersion: number,
  ): Promise<DispatchRecord> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");
    const unit = await this.units.get(unitId);
    if (!unit) throw new NotFoundError("unit not found");

    // First assignment moves the incident to `dispatched`; re-dispatch after a
    // rejection (or adding a unit) keeps the current status. Terminal incidents
    // fail the transition check before any state is touched.
    const needsTransition = rm.status === "created" || rm.status === "triaging";
    if (needsTransition || rm.status === "resolved" || rm.status === "cancelled") {
      assertTransition(rm.status, "dispatched");
    }

    const now = this.clock();
    if (!(await this.units.reserve(unitId, now))) {
      throw new UnitUnavailableError(unitId);
    }

    const record: DispatchRecord = {
      id: this.idGen(),
      incidentId,
      unitId,
      agencyId: unit.agencyId,
      status: "pending",
      dispatcherId,
      responderId: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await appendEvent(
        this.events,
        {
          incidentId,
          agencyId: rm.agencyId,
          type: "UnitAssigned",
          actorId: dispatcherId,
          occurredAt: now,
          payload: { unitId, dispatchId: record.id },
          expectedVersion,
        },
        this.clock,
        this.idGen,
      );
    } catch (err) {
      await this.units.release(unitId, this.clock()); // undo reservation
      throw err;
    }

    if (needsTransition) {
      await this.incidents.changeStatus(incidentId, "dispatched", expectedVersion + 1, dispatcherId);
    }

    await this.dispatches.put(record);
    return record;
  }

  async acceptDispatch(dispatchId: string, responderId: string): Promise<DispatchRecord> {
    const d = await this.requirePending(dispatchId);
    await this.appendAtHead(d.incidentId, d.agencyId, "DispatchAccepted", responderId, {
      dispatchId: d.id,
      unitId: d.unitId,
    });
    const updated: DispatchRecord = {
      ...d,
      status: "accepted",
      responderId,
      updatedAt: this.clock(),
    };
    await this.dispatches.put(updated);
    return updated;
  }

  async rejectDispatch(dispatchId: string, responderId: string): Promise<DispatchRecord> {
    const d = await this.requirePending(dispatchId);
    await this.units.release(d.unitId, this.clock());
    await this.appendAtHead(d.incidentId, d.agencyId, "UnitUnassigned", responderId, {
      dispatchId: d.id,
      unitId: d.unitId,
      reason: "responder_rejected",
    });
    const updated: DispatchRecord = {
      ...d,
      status: "rejected",
      responderId,
      updatedAt: this.clock(),
    };
    await this.dispatches.put(updated);
    return updated;
  }

  async get(dispatchId: string): Promise<DispatchRecord | null> {
    return this.dispatches.get(dispatchId);
  }

  private async requirePending(dispatchId: string): Promise<DispatchRecord> {
    const d = await this.dispatches.get(dispatchId);
    if (!d) throw new NotFoundError("dispatch not found");
    if (d.status !== "pending") throw new DispatchConflictError(d.id, d.status);
    return d;
  }

  // Accept/reject are responder facts, not dispatcher commands — they append
  // at the current head instead of taking a client expectedVersion.
  private async appendAtHead(
    incidentId: string,
    agencyId: string,
    type: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const version = await this.events.currentVersion(incidentId);
    await appendEvent(
      this.events,
      { incidentId, agencyId, type, actorId, occurredAt: this.clock(), payload, expectedVersion: version },
      this.clock,
      this.idGen,
    );
  }
}
