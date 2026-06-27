import type { DomainEvent } from "../shared/event.js";
import type { IncidentStatus } from "./state-machine.js";

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Denormalized read model. Mirrors `incident_read_model` in the design doc.
export interface IncidentReadModel {
  id: string;
  agencyId: string;
  type: string;
  priority: string;
  status: IncidentStatus;
  location: GeoPoint | null;
  assignedUnitIds: string[];
  hospitalId: string | null;
  riskScore: number;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
}

const CREATION_TYPES = new Set(["SOSAccepted", "SOSFlagged", "IncidentCreated"]);

// Pure fold: event log -> current read model. Disposable & rebuildable.
export function projectIncident(events: DomainEvent[]): IncidentReadModel | null {
  let rm: IncidentReadModel | null = null;

  for (const e of events) {
    if (CREATION_TYPES.has(e.type)) {
      const p = e.payload;
      rm = {
        id: e.incidentId,
        agencyId: e.agencyId,
        type: String(p.type),
        priority: String(p.priority),
        status: "created",
        location: (p.location as GeoPoint | null) ?? null,
        assignedUnitIds: [],
        hospitalId: null,
        riskScore: typeof p.riskScore === "number" ? p.riskScore : 0,
        flagged: e.type === "SOSFlagged",
        createdAt: e.recordedAt,
        updatedAt: e.recordedAt,
      };
      continue;
    }
    if (!rm) continue; // ignore events before creation

    switch (e.type) {
      case "IncidentStatusChanged":
        rm.status = e.payload.status as IncidentStatus;
        break;
      case "UnitAssigned":
        rm.assignedUnitIds = [...rm.assignedUnitIds, String(e.payload.unitId)];
        break;
      case "HospitalSelected":
        rm.hospitalId = String(e.payload.hospitalId);
        break;
    }
    rm.updatedAt = e.recordedAt;
  }

  return rm;
}
