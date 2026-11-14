import { describe, it, expect, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import type {
  ApiClient,
  CreateIncidentDTO,
  Dispatch,
  HospitalQuery,
  Incident,
  IncidentFilters,
  IncidentNote,
  IncidentStatus,
  IncidentType,
  RankedHospital,
  RankedUnit,
  ReplayCommand,
  ReplayResult,
  Role,
  TelemetryInput,
  TelemetryQuery,
  TelemetrySample,
  Triage,
  TriageAnswer,
  TriageQuestion,
  TriageScore,
  UnitQuery,
} from "@stat/shared";
import { buildApp } from "./app.js";

/**
 * The M1 gate.
 *
 * `@stat/shared` declares one `ApiClient`; the app is supposed to be a valid
 * transport for it. This file proves that two ways at once:
 *
 *  1. **At compile time** — `InjectApiClient implements ApiClient`, so any
 *     drift between the interface and what the routes accept or return is a
 *     type error, not a runtime surprise on a responder's phone.
 *  2. **At run time** — the golden path below is driven entirely through the
 *     interface, never by hand-rolled `inject` calls.
 *
 * If you change a route's shape, this file breaks before the app does.
 */

interface Principal {
  userId?: string;
  role?: Role;
  agencyId?: string;
}

function headersFor(p: Principal): Record<string, string> {
  const h: Record<string, string> = {};
  if (p.userId) h["x-user-id"] = p.userId;
  if (p.role) h["x-role"] = p.role;
  if (p.agencyId) h["x-agency-id"] = p.agencyId;
  return h;
}

class ContractError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** `ApiClient` over `app.inject()` — the real routes, no network. */
class InjectApiClient implements ApiClient {
  constructor(
    private readonly app: FastifyInstance,
    private readonly principal: Principal,
  ) {}

  private async call<T>(
    method: "GET" | "POST",
    url: string,
    opts: { payload?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    const headers = headersFor(this.principal);
    if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;

    const res = await this.app.inject({ method, url, headers, payload: opts.payload as object });
    const body = res.body ? res.json() : null;

    if (res.statusCode >= 400) {
      throw new ContractError(res.statusCode, body?.error ?? "INTERNAL", body?.message ?? "");
    }
    return body as T;
  }

  private static geo(q: { lat: number; lng: number }): string {
    return `lat=${q.lat}&lng=${q.lng}`;
  }

  // ------------------------------------------------------------- incidents

  createIncident(data: CreateIncidentDTO, idempotencyKey: string): Promise<Incident> {
    return this.call("POST", "/incidents", { payload: data, idempotencyKey });
  }

  getIncident(id: string): Promise<Incident> {
    return this.call("GET", `/incidents/${id}`);
  }

  listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    const q = filters?.status ? `?status=${filters.status}` : "";
    return this.call("GET", `/incidents${q}`);
  }

  transitionIncident(
    id: string,
    status: IncidentStatus,
    expectedVersion: number,
  ): Promise<Incident> {
    return this.call("POST", `/incidents/${id}/status`, { payload: { status, expectedVersion } });
  }

  addIncidentNote(id: string, text: string): Promise<IncidentNote> {
    return this.call("POST", `/incidents/${id}/notes`, { payload: { text } });
  }

  // -------------------------------------------------------------- dispatch

  getAvailableUnits(query: UnitQuery): Promise<RankedUnit[]> {
    const parts = [InjectApiClient.geo(query.near)];
    if (query.type) parts.push(`type=${query.type}`);
    if (query.for) parts.push(`for=${query.for}`);
    if (query.limit) parts.push(`limit=${query.limit}`);
    return this.call("GET", `/units/available?${parts.join("&")}`);
  }

  dispatchUnit(incidentId: string, unitId: string, expectedVersion: number): Promise<Dispatch> {
    return this.call("POST", `/incidents/${incidentId}/dispatch`, {
      payload: { unitId, expectedVersion },
    });
  }

  acceptDispatch(dispatchId: string): Promise<Dispatch> {
    return this.call("POST", `/dispatches/${dispatchId}/accept`);
  }

  rejectDispatch(dispatchId: string): Promise<Dispatch> {
    return this.call("POST", `/dispatches/${dispatchId}/reject`);
  }

  // ---------------------------------------------------------------- triage

  getTriageQuestions(type: IncidentType): Promise<TriageQuestion[]> {
    return this.call("GET", `/triage/questions?type=${type}`);
  }

  submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore> {
    return this.call("POST", `/incidents/${incidentId}/triage`, { payload: { answers } });
  }

  getTriage(incidentId: string): Promise<Triage> {
    return this.call("GET", `/incidents/${incidentId}/triage`);
  }

  // ------------------------------------------------------------- telemetry

  recordTelemetry(incidentId: string, sample: TelemetryInput): Promise<TelemetrySample> {
    return this.call("POST", `/incidents/${incidentId}/vitals`, { payload: sample });
  }

  getTelemetry(incidentId: string, query?: TelemetryQuery): Promise<TelemetrySample[]> {
    const parts: string[] = [];
    if (query?.limit) parts.push(`limit=${query.limit}`);
    if (query?.from) parts.push(`from=${encodeURIComponent(query.from)}`);
    if (query?.to) parts.push(`to=${encodeURIComponent(query.to)}`);
    const q = parts.length ? `?${parts.join("&")}` : "";
    return this.call("GET", `/incidents/${incidentId}/vitals${q}`);
  }

  // -------------------------------------------------------------- hospital

  getHospitals(query: HospitalQuery): Promise<RankedHospital[]> {
    const parts = [InjectApiClient.geo(query.near)];
    if (query.capability) parts.push(`capability=${query.capability}`);
    if (query.limit) parts.push(`limit=${query.limit}`);
    return this.call("GET", `/hospitals?${parts.join("&")}`);
  }

  selectHospital(incidentId: string, hospitalId: string): Promise<Incident> {
    return this.call("POST", `/incidents/${incidentId}/hospital`, { payload: { hospitalId } });
  }

  alertHospital(incidentId: string): Promise<Incident> {
    return this.call("POST", `/incidents/${incidentId}/hospital/alert`);
  }

  getHospitalActiveIncidents(): Promise<Incident[]> {
    return this.call("GET", "/hospital/incidents");
  }

  // --------------------------------------------------------------- offline

  replay(incidentId: string, commands: ReplayCommand[]): Promise<ReplayResult[]> {
    return this.call("POST", `/incidents/${incidentId}/replay`, { payload: { commands } });
  }
}

const AGENCY = "agency-medical";
const LAGOS = { lat: 6.5244, lng: 3.3792 };

describe("wire contract", () => {
  let app: FastifyInstance;
  let citizen: ApiClient;
  let dispatcher: ApiClient;
  let responder: ApiClient;
  let admin: ApiClient;

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
    citizen = new InjectApiClient(app, {});
    dispatcher = new InjectApiClient(app, {
      userId: "d1",
      role: "dispatcher",
      agencyId: AGENCY,
    });
    responder = new InjectApiClient(app, { userId: "r1", role: "responder", agencyId: AGENCY });
    admin = new InjectApiClient(app, { userId: "a1", role: "admin" });
  });

  async function sos(over: Partial<CreateIncidentDTO> = {}): Promise<Incident> {
    return citizen.createIncident(
      { type: "medical", location: LAGOS, deviceId: "device-1", agencyId: AGENCY, ...over },
      crypto.randomUUID(),
    );
  }

  it("returns an incident carrying the version the next mutation needs", async () => {
    const incident = await sos();

    expect(incident.id).toBeTruthy();
    expect(incident.status).toBe("created");
    expect(incident.version).toBe(1);
    expect(incident.notes).toEqual([]);
    expect(incident.location).toEqual(LAGOS);
  });

  it("defaults an untriaged SOS to critical", async () => {
    // Fail-safe: over-triage is recoverable, under-triage is not.
    expect((await sos()).priority).toBe("critical");
    expect((await sos({ priority: "stable" })).priority).toBe("stable");
  });

  it("drives a status transition from the version it just handed back", async () => {
    const created = await sos();
    const moved = await dispatcher.transitionIncident(created.id, "triaging", created.version);

    expect(moved.status).toBe("triaging");
    expect(moved.version).toBe(created.version + 1);
  });

  it("rejects a stale version instead of silently overwriting", async () => {
    const created = await sos();
    await dispatcher.transitionIncident(created.id, "triaging", created.version);

    await expect(
      dispatcher.transitionIncident(created.id, "dispatched", created.version),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
  });

  it("replays one idempotency key to the same incident", async () => {
    const key = crypto.randomUUID();
    const body: CreateIncidentDTO = {
      type: "medical",
      location: LAGOS,
      deviceId: "device-1",
      agencyId: AGENCY,
    };

    const first = await citizen.createIncident(body, key);
    const second = await citizen.createIncident(body, key);

    expect(second.id).toBe(first.id);
  });

  it("expands an incident type into the unit types that serve it", async () => {
    await app.inject({
      method: "POST",
      url: "/units",
      headers: headersFor({ userId: "d1", role: "dispatcher", agencyId: AGENCY }),
      payload: {
        id: "amb-1",
        agencyId: AGENCY,
        type: "ambulance",
        callSign: "AMB-01",
        location: LAGOS,
        capabilities: ["ALS"],
      },
    });

    const ranked = await dispatcher.getAvailableUnits({ near: LAGOS, for: "medical" });

    expect(ranked.map((u) => u.id)).toEqual(["amb-1"]);
    expect(ranked[0]!.distanceKm).toBeGreaterThanOrEqual(0);
    expect(ranked[0]!.etaMinutes).toBeGreaterThanOrEqual(0);
    expect(ranked[0]!.capabilities).toEqual(["ALS"]);
  });

  it("carries an incident from SOS to hospital handoff through the interface alone", async () => {
    // 1. Citizen presses SOS.
    let incident = await sos();

    // 2. Responder triages; protocol scoring sets the priority.
    const questions = await responder.getTriageQuestions("medical");
    expect(questions.length).toBeGreaterThan(0);

    const score = await responder.submitTriageAnswers(incident.id, [
      { questionId: "med-conscious", value: false },
      { questionId: "med-breathing", value: false },
    ]);
    expect(score.level).toBe("critical");
    expect(score.flags).toContain("not_breathing");

    const triage = await responder.getTriage(incident.id);
    expect(triage.score).not.toBeNull();

    // 3. Dispatcher assigns the nearest ambulance.
    await app.inject({
      method: "POST",
      url: "/units",
      headers: headersFor({ userId: "d1", role: "dispatcher", agencyId: AGENCY }),
      payload: {
        id: "amb-1",
        agencyId: AGENCY,
        type: "ambulance",
        callSign: "AMB-01",
        location: LAGOS,
      },
    });

    incident = await dispatcher.getIncident(incident.id);
    const dispatch = await dispatcher.dispatchUnit(incident.id, "amb-1", incident.version);
    expect(dispatch.status).toBe("pending");
    expect(dispatch.acceptedAt).toBeNull();

    // 4. Responder accepts and works the incident.
    const accepted = await responder.acceptDispatch(dispatch.id);
    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).not.toBeNull();

    incident = await responder.getIncident(incident.id);
    expect(incident.assignedUnitIds).toContain("amb-1");

    incident = await responder.transitionIncident(incident.id, "en_route", incident.version);
    incident = await responder.transitionIncident(incident.id, "on_scene", incident.version);

    // 5. Vitals and a note land on the timeline.
    const sample = await responder.recordTelemetry(incident.id, {
      kind: "vitals",
      capturedAt: new Date().toISOString(),
      payload: { hr: 132, spo2: 88 },
    });
    expect(sample.id).toBeTruthy();
    expect(sample.incidentId).toBe(incident.id);

    expect(await responder.getTelemetry(incident.id, { limit: 5 })).toHaveLength(1);

    const note = await responder.addIncidentNote(incident.id, "Patient moved to ambulance");
    expect(note.text).toBe("Patient moved to ambulance");

    incident = await responder.getIncident(incident.id);
    expect(incident.notes.map((n) => n.text)).toEqual(["Patient moved to ambulance"]);

    // 6. Hospital routing and pre-arrival alert.
    await app.inject({
      method: "POST",
      url: "/hospitals",
      headers: headersFor({ userId: "a1", role: "admin" }),
      payload: {
        id: "hosp-1",
        name: "LUTH",
        location: LAGOS,
        capabilities: ["cardiac"],
        availableBeds: 4,
        webhookUrl: "https://hospital.example/hook",
      },
    });

    const hospitals = await responder.getHospitals({ near: LAGOS, capability: "cardiac" });
    expect(hospitals.map((h) => h.id)).toEqual(["hosp-1"]);
    // Deployment config never reaches a client.
    expect(hospitals[0]).not.toHaveProperty("webhookUrl");

    incident = await responder.selectHospital(incident.id, "hosp-1");
    expect(incident.hospitalId).toBe("hosp-1");

    incident = await responder.transitionIncident(incident.id, "transporting", incident.version);
    incident = await responder.alertHospital(incident.id);
    expect(incident.hospitalAlerted).toBe(true);

    // 7. Hospital staff see it on their board.
    const hospitalStaff = new InjectApiClient(app, {
      userId: "h1",
      role: "hospital_staff",
      agencyId: "hosp-1",
    });
    expect((await hospitalStaff.getHospitalActiveIncidents()).map((i) => i.id)).toEqual([
      incident.id,
    ]);

    // 8. Resolve, and the whole thing is on the admin's list.
    incident = await responder.transitionIncident(incident.id, "resolved", incident.version);
    expect(incident.status).toBe("resolved");
    expect((await admin.listIncidents({ status: "resolved" })).map((i) => i.id)).toEqual([
      incident.id,
    ]);
  });

  it("drains an offline queue in occurredAt order and reports per command", async () => {
    const incident = await sos();

    const commands: ReplayCommand[] = [
      // Deliberately out of order — the server sorts by occurredAt.
      {
        key: "note-1",
        kind: "note",
        occurredAt: "2026-08-28T10:02:00.000Z",
        payload: { text: "Airway cleared" },
      },
      {
        key: "status-1",
        kind: "status",
        occurredAt: "2026-08-28T10:01:00.000Z",
        payload: { status: "triaging" },
      },
      {
        key: "bad-1",
        kind: "vitals",
        occurredAt: "2026-08-28T10:03:00.000Z",
        payload: { kind: "vitals", capturedAt: "not-a-date", payload: {} },
      },
    ];

    const results = await responder.replay(incident.id, commands);
    const byKey = new Map(results.map((r) => [r.key, r]));

    expect(byKey.get("status-1")?.applied).toBe(true);
    expect(byKey.get("note-1")?.applied).toBe(true);
    // One bad command never stops the batch.
    expect(byKey.get("bad-1")?.applied).toBe(false);
    expect(byKey.get("bad-1")?.error).toBe("BAD_REQUEST");

    const after = await responder.getIncident(incident.id);
    expect(after.status).toBe("triaging");
    expect(after.notes.map((n) => n.text)).toEqual(["Airway cleared"]);

    // Replaying the same keys is a no-op, not a duplicate.
    await responder.replay(incident.id, commands);
    const again = await responder.getIncident(incident.id);
    expect(again.notes).toHaveLength(1);
  });

  it("keeps one agency out of another's incidents", async () => {
    const incident = await sos();
    const other = new InjectApiClient(app, {
      userId: "d2",
      role: "dispatcher",
      agencyId: "agency-fire",
    });

    await expect(other.getIncident(incident.id)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("refuses an anonymous read", async () => {
    const incident = await sos();

    await expect(citizen.getIncident(incident.id)).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
    });
  });
});
