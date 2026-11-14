import type {
  GeoPoint,
  Incident,
  IncidentNote,
  IncidentStatus,
  IncidentType,
  Priority,
} from "@stat/shared";
import type { DomainEvent } from "../shared/event.js";

export type { GeoPoint };

/**
 * Denormalized read model. Mirrors `incident_read_model` in the design doc and
 * satisfies the wire `Incident` in `@stat/shared` exactly — the route layer
 * hands this straight to clients.
 */
export type IncidentReadModel = Incident;

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
        type: p.type as IncidentType,
        priority: p.priority as Priority,
        status: "created",
        location: (p.location as GeoPoint | null) ?? null,
        assignedUnitIds: [],
        hospitalId: null,
        hospitalAlerted: false,
        riskScore: typeof p.riskScore === "number" ? p.riskScore : 0,
        flagged: e.type === "SOSFlagged",
        notes: [],
        version: e.version,
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
      case "UnitUnassigned":
        rm.assignedUnitIds = rm.assignedUnitIds.filter((id) => id !== String(e.payload.unitId));
        break;
      case "HospitalSelected":
        rm.hospitalId = String(e.payload.hospitalId);
        break;
      case "HospitalAlerted":
        rm.hospitalAlerted = true;
        break;
      case "IncidentNoteAdded": {
        const note: IncidentNote = {
          id: e.eventId,
          actorId: e.actorId,
          text: String(e.payload.text),
          at: e.recordedAt,
        };
        rm.notes = [...rm.notes, note];
        break;
      }
    }
    // Every applied event advances the version the client must echo back on
    // its next optimistic-locked mutation.
    rm.version = e.version;
    rm.updatedAt = e.recordedAt;
  }

  return rm;
}
