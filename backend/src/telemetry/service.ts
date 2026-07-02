import type { Clock, IdGen } from "../shared/event.js";
import { BadRequestError, NotFoundError } from "../shared/errors.js";
import { appendEvent, type EventStore } from "../incident/event-store.js";
import type { IncidentService } from "../incident/service.js";

// Input shape matches @stat/shared TelemetrySample minus server-set fields.
export interface TelemetryInput {
  kind: string;
  capturedAt: string;
  payload: Record<string, unknown>;
  patientId?: string;
  unitId?: string;
}

export interface TelemetrySample extends TelemetryInput {
  id: string;
  incidentId: string;
  recordedAt: string;
}

// v1 is manual responder entry (see future-features.md for device streams),
// so samples ride the incident event log: PHI-auditable and fanned out live
// by the publishing store for the hospital pre-arrival view.
const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const VITAL_RANGES: Record<string, [number, number]> = {
  hr: [20, 250],
  spo2: [50, 100],
  rr: [4, 60],
  systolic: [50, 260],
  diastolic: [20, 160],
};

function validate(sample: TelemetryInput): void {
  if (!sample.kind) throw new BadRequestError("kind required");
  if (!Number.isFinite(Date.parse(sample.capturedAt))) {
    throw new BadRequestError("capturedAt must be an ISO timestamp");
  }
  if (typeof sample.payload !== "object" || sample.payload === null) {
    throw new BadRequestError("payload must be an object");
  }
  if (sample.kind === "vitals") {
    for (const [key, [min, max]] of Object.entries(VITAL_RANGES)) {
      const v = sample.payload[key];
      if (v === undefined) continue;
      if (typeof v !== "number" || v < min || v > max) {
        throw new BadRequestError(`${key} out of range [${min}, ${max}]`);
      }
    }
  }
}

export class TelemetryService {
  constructor(
    private readonly events: EventStore,
    private readonly incidents: IncidentService,
    private readonly idGen: IdGen,
    private readonly clock: Clock,
  ) {}

  async record(incidentId: string, sample: TelemetryInput, actorId: string): Promise<void> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");
    validate(sample);

    await appendEvent(
      this.events,
      {
        incidentId,
        agencyId: rm.agencyId,
        type: "TelemetryRecorded",
        actorId,
        occurredAt: sample.capturedAt,
        payload: { ...sample },
        expectedVersion: await this.events.currentVersion(incidentId),
      },
      this.clock,
      this.idGen,
    );
  }

  // Latest-first fold (design decision 4: latest valid sample wins for live
  // view, full history stays in the log). Read-side retention hides samples
  // past 90 days (NDPA); the Postgres impl adds a hard-delete job.
  async latest(incidentId: string, limit = 20): Promise<TelemetrySample[]> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");

    const cutoff = Date.parse(this.clock()) - RETENTION_DAYS * DAY_MS;
    const samples: TelemetrySample[] = [];
    for (const e of await this.events.load(incidentId)) {
      if (e.type !== "TelemetryRecorded") continue;
      const p = e.payload as unknown as TelemetryInput;
      if (Date.parse(p.capturedAt) < cutoff) continue; // expired
      samples.push({ ...p, id: e.eventId, incidentId, recordedAt: e.recordedAt });
    }
    return samples.reverse().slice(0, limit);
  }
}
