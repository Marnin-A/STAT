import type { Clock, IdGen } from "../shared/event.js";
import { BadRequestError, NotFoundError } from "../shared/errors.js";
import { appendEvent, type EventStore } from "../incident/event-store.js";
import type { IncidentService } from "../incident/service.js";
import type { IncidentReadModel } from "../incident/projection.js";
import { isTerminal } from "../incident/state-machine.js";
import type { TriageService } from "../triage/service.js";
import type { TelemetryService } from "../telemetry/service.js";
import type { HospitalRegistry } from "./registry.js";
import type { Notifier } from "../notification/notifier.js";

const HANDOFF_VITALS = 5;

export class HospitalService {
  constructor(
    private readonly events: EventStore,
    private readonly incidents: IncidentService,
    private readonly hospitals: HospitalRegistry,
    private readonly triage: TriageService,
    private readonly telemetry: TelemetryService,
    private readonly notifier: Notifier,
    private readonly idGen: IdGen,
    private readonly clock: Clock,
  ) {}

  async selectHospital(incidentId: string, hospitalId: string, actorId: string): Promise<void> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");
    if (!(await this.hospitals.get(hospitalId))) throw new NotFoundError("hospital not found");

    await this.append(incidentId, rm.agencyId, "HospitalSelected", actorId, { hospitalId });
  }

  // Pre-arrival alert: builds the handoff (triage + latest vitals), appends
  // the audit event, pushes out-of-band via the notifier. Dashboard clients
  // already receive it live through the event fan-out.
  async alertHospital(incidentId: string, actorId: string): Promise<void> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");
    if (!rm.hospitalId) throw new BadRequestError("no hospital selected for incident");

    const triage = await this.triage.getTriage(incidentId);
    const latestVitals = await this.telemetry.latest(incidentId, HANDOFF_VITALS);

    await this.append(incidentId, rm.agencyId, "HospitalAlerted", actorId, {
      hospitalId: rm.hospitalId,
    });

    await this.notifier.sendHandoff({
      hospitalId: rm.hospitalId,
      incidentId,
      summary: {
        type: rm.type,
        priority: rm.priority,
        status: rm.status,
        location: rm.location,
        triage: triage.score ?? null,
        latestVitals,
      },
      sentAt: this.clock(),
    });
  }

  async getHospitalActiveIncidents(hospitalId: string): Promise<IncidentReadModel[]> {
    const all = await this.incidents.list(null);
    return all.filter((rm) => rm.hospitalId === hospitalId && !isTerminal(rm.status));
  }

  private async append(
    incidentId: string,
    agencyId: string,
    type: string,
    actorId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await appendEvent(
      this.events,
      {
        incidentId,
        agencyId,
        type,
        actorId,
        occurredAt: this.clock(),
        payload,
        expectedVersion: await this.events.currentVersion(incidentId),
      },
      this.clock,
      this.idGen,
    );
  }
}
