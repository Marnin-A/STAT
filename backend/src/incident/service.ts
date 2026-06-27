import type { Clock, IdGen } from "../shared/event.js";
import { RateLimitBlockedError } from "../shared/errors.js";
import { appendEvent, type EventStore } from "./event-store.js";
import type { RateLimitStore } from "./rate-limit.js";
import { assessSos, type SosSignalCounts } from "./abuse.js";
import { projectIncident, type GeoPoint, type IncidentReadModel } from "./projection.js";
import { assertTransition, type IncidentStatus } from "./state-machine.js";

export interface CreateSosInput {
  agencyId: string;
  type: string;
  priority: string;
  location: GeoPoint | null;
  reporterId: string | null;
  deviceId: string;
  ip: string;
  occurredAt: string;
}

export interface CreateSosResult {
  incidentId: string;
  status: IncidentStatus;
  flagged: boolean;
  riskScore: number;
}

function locationKey(loc: GeoPoint | null): string | null {
  if (!loc) return null;
  return `loc:${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
}

export class IncidentService {
  constructor(
    private readonly events: EventStore,
    private readonly rateLimit: RateLimitStore,
    private readonly idGen: IdGen,
    private readonly clock: Clock,
  ) {}

  async createSos(input: CreateSosInput): Promise<CreateSosResult> {
    const deviceKey = `device:${input.deviceId}`;
    const ipKey = `ip:${input.ip}`;
    const locKey = locationKey(input.location);

    const counts: SosSignalCounts = {
      device: await this.rateLimit.hitCount(deviceKey),
      ip: await this.rateLimit.hitCount(ipKey),
      location: locKey ? await this.rateLimit.hitCount(locKey) : 0,
    };

    const decision = assessSos(counts);

    // Always record the hit so the next request sees this one.
    await this.rateLimit.record(deviceKey);
    await this.rateLimit.record(ipKey);
    if (locKey) await this.rateLimit.record(locKey);

    if (decision.hardBlock) throw new RateLimitBlockedError();

    const incidentId = this.idGen();
    const type = decision.flagged ? "SOSFlagged" : "SOSAccepted";
    await appendEvent(
      this.events,
      {
        incidentId,
        agencyId: input.agencyId,
        type,
        actorId: input.reporterId,
        occurredAt: input.occurredAt,
        payload: {
          type: input.type,
          priority: input.priority,
          location: input.location,
          riskScore: decision.riskScore,
          reasons: decision.reasons,
        },
        expectedVersion: 0,
      },
      this.clock,
      this.idGen,
    );

    return {
      incidentId,
      status: "created",
      flagged: decision.flagged,
      riskScore: decision.riskScore,
    };
  }

  async changeStatus(
    incidentId: string,
    to: IncidentStatus,
    expectedVersion: number,
    actorId: string,
  ): Promise<void> {
    const rm = await this.get(incidentId);
    const from: IncidentStatus = rm?.status ?? "created";
    assertTransition(from, to); // throws InvalidTransitionError

    await appendEvent(
      this.events,
      {
        incidentId,
        agencyId: rm?.agencyId ?? "",
        type: "IncidentStatusChanged",
        actorId,
        occurredAt: this.clock(),
        payload: { status: to },
        expectedVersion, // throws VersionConflictError on mismatch
      },
      this.clock,
      this.idGen,
    );
  }

  async get(incidentId: string): Promise<IncidentReadModel | null> {
    const log = await this.events.load(incidentId);
    return projectIncident(log);
  }

  // Agency-scoped list. `agencyId === null` (admin) sees all.
  async list(
    agencyId: string | null,
    status?: IncidentStatus,
  ): Promise<IncidentReadModel[]> {
    const ids = await this.events.incidentIds();
    const out: IncidentReadModel[] = [];
    for (const id of ids) {
      const rm = await this.get(id);
      if (!rm) continue;
      if (agencyId !== null && rm.agencyId !== agencyId) continue;
      if (status && rm.status !== status) continue;
      out.push(rm);
    }
    return out;
  }
}
