import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ApiClient, CreateIncidentDTO, Incident, Role } from "@stat/shared";
import { HttpApiClient, ApiError, NetworkError } from "@stat/shared";
import { buildApp } from "./app.js";

/**
 * M2: the first real network call.
 *
 * `contract.test.ts` proves the routes satisfy `ApiClient` in-process. This
 * goes one layer out: a Fastify server on a real socket, driven by the actual
 * `HttpApiClient` the app ships with — real fetch, real JSON, real headers,
 * real status codes. Everything the in-process test cannot catch (a wrong
 * query-string encoding, a header the server ignores, an error body the client
 * misreads) fails here.
 *
 * No mock anywhere in the loop.
 */

const AGENCY = "agency-medical";
const LAGOS = { lat: 6.5244, lng: 3.3792 };

function clientFor(
  baseUrl: string,
  principal: { userId?: string; role?: Role; agencyId?: string },
): ApiClient {
  return new HttpApiClient({
    baseUrl,
    authHeaders: () => {
      const h: Record<string, string> = {};
      if (principal.userId) h["x-user-id"] = principal.userId;
      if (principal.role) h["x-role"] = principal.role;
      if (principal.agencyId) h["x-agency-id"] = principal.agencyId;
      return h;
    },
  });
}

describe("golden path over HTTP", () => {
  let app: FastifyInstance;
  let baseUrl: string;

  let citizen: ApiClient;
  let dispatcher: ApiClient;
  let responder: ApiClient;
  let hospitalStaff: ApiClient;

  beforeAll(async () => {
    app = buildApp();
    // Port 0: the OS picks a free one, so parallel runs never collide.
    await app.listen({ port: 0, host: "127.0.0.1" });

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    baseUrl = `http://127.0.0.1:${address.port}`;

    citizen = clientFor(baseUrl, {});
    dispatcher = clientFor(baseUrl, { userId: "d1", role: "dispatcher", agencyId: AGENCY });
    responder = clientFor(baseUrl, { userId: "r1", role: "responder", agencyId: AGENCY });
    hospitalStaff = clientFor(baseUrl, {
      userId: "h1",
      role: "hospital_staff",
      agencyId: "hosp-1",
    });

    // Provision the board an admin would have set up.
    const admin = clientFor(baseUrl, { userId: "a1", role: "admin" });
    void admin;
    await fetch(`${baseUrl}/units`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "d1",
        "x-role": "dispatcher",
        "x-agency-id": AGENCY,
      },
      body: JSON.stringify({
        id: "amb-1",
        agencyId: AGENCY,
        type: "ambulance",
        callSign: "AMB-01",
        location: LAGOS,
        capabilities: ["ALS", "defibrillator"],
      }),
    });
    await fetch(`${baseUrl}/hospitals`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "a1", "x-role": "admin" },
      body: JSON.stringify({
        id: "hosp-1",
        name: "Lagos University Teaching Hospital",
        location: LAGOS,
        capabilities: ["cardiac", "trauma"],
        availableBeds: 8,
        webhookUrl: "https://hospital.example/pre-arrival",
      }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const sosBody: CreateIncidentDTO = {
    type: "medical",
    location: LAGOS,
    deviceId: "device-integration",
    agencyId: AGENCY,
  };

  it("carries one incident from SOS to hospital handoff", async () => {
    // --- citizen presses SOS ------------------------------------------------
    let incident: Incident = await citizen.createIncident(sosBody, crypto.randomUUID());
    expect(incident.status).toBe("created");
    expect(incident.priority).toBe("critical"); // untriaged: fail-safe
    expect(incident.version).toBe(1);

    // --- dispatcher sees it on the board ------------------------------------
    const board = await dispatcher.listIncidents({ status: "created" });
    expect(board.map((i) => i.id)).toContain(incident.id);

    // --- responder triages --------------------------------------------------
    const questions = await responder.getTriageQuestions("medical");
    expect(questions.map((q) => q.id)).toContain("med-breathing");

    const score = await responder.submitTriageAnswers(incident.id, [
      { questionId: "med-conscious", value: false },
      { questionId: "med-breathing", value: false },
    ]);
    expect(score.level).toBe("critical");

    // --- dispatcher assigns the nearest ambulance ---------------------------
    const ranked = await dispatcher.getAvailableUnits({ near: LAGOS, for: "medical" });
    expect(ranked.map((u) => u.id)).toEqual(["amb-1"]);
    expect(ranked[0]!.etaMinutes).toBeGreaterThanOrEqual(0);

    incident = await dispatcher.getIncident(incident.id);
    const dispatch = await dispatcher.dispatchUnit(incident.id, "amb-1", incident.version);
    expect(dispatch.status).toBe("pending");

    // The unit is off the board for anyone else.
    expect(await dispatcher.getAvailableUnits({ near: LAGOS, for: "medical" })).toEqual([]);

    // --- responder accepts and works the incident ---------------------------
    expect((await responder.acceptDispatch(dispatch.id)).status).toBe("accepted");

    incident = await responder.getIncident(incident.id);
    expect(incident.assignedUnitIds).toEqual(["amb-1"]);

    incident = await responder.transitionIncident(incident.id, "en_route", incident.version);
    incident = await responder.transitionIncident(incident.id, "on_scene", incident.version);
    expect(incident.status).toBe("on_scene");

    // --- vitals and notes ---------------------------------------------------
    await responder.recordTelemetry(incident.id, {
      kind: "vitals",
      capturedAt: new Date().toISOString(),
      payload: { hr: 138, spo2: 86, systolic: 90, diastolic: 60 },
    });
    const vitals = await responder.getTelemetry(incident.id, { limit: 5 });
    expect(vitals).toHaveLength(1);
    expect(vitals[0]!.payload).toMatchObject({ hr: 138 });

    await responder.addIncidentNote(incident.id, "IV line established");

    // --- hospital routing and pre-arrival alert -----------------------------
    const hospitals = await responder.getHospitals({ near: LAGOS, capability: "cardiac" });
    expect(hospitals.map((h) => h.id)).toEqual(["hosp-1"]);
    expect(hospitals[0]).not.toHaveProperty("webhookUrl");

    incident = await responder.selectHospital(incident.id, "hosp-1");
    incident = await responder.transitionIncident(incident.id, "transporting", incident.version);
    incident = await responder.alertHospital(incident.id);
    expect(incident.hospitalAlerted).toBe(true);

    const board2 = await hospitalStaff.getHospitalActiveIncidents();
    expect(board2.map((i) => i.id)).toContain(incident.id);

    // --- resolve ------------------------------------------------------------
    incident = await responder.transitionIncident(incident.id, "resolved", incident.version);
    expect(incident.status).toBe("resolved");
    expect(incident.notes.map((n) => n.text)).toEqual(["IV line established"]);
  });

  it("returns the original incident when a flaky connection retries the SOS", async () => {
    const key = crypto.randomUUID();

    const first = await citizen.createIncident(sosBody, key);
    const retry = await citizen.createIncident(sosBody, key);

    expect(retry.id).toBe(first.id);
  });

  it("surfaces a domain error as a typed ApiError, not a raw status", async () => {
    const incident = await citizen.createIncident(sosBody, crypto.randomUUID());
    await dispatcher.transitionIncident(incident.id, "triaging", incident.version);

    // Same version twice: the second caller is working from a stale read.
    const err = await dispatcher
      .transitionIncident(incident.id, "dispatched", incident.version)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: "VERSION_CONFLICT" });
    expect((err as ApiError).isStale).toBe(true);
    expect((err as ApiError).isRetryable).toBe(false);
  });

  it("rejects an invalid transition with the code the UI switches on", async () => {
    const incident = await citizen.createIncident(sosBody, crypto.randomUUID());
    const resolved = await dispatcher.transitionIncident(
      incident.id,
      "cancelled",
      incident.version,
    );

    await expect(
      dispatcher.transitionIncident(resolved.id, "dispatched", resolved.version),
    ).rejects.toMatchObject({ status: 409, code: "INVALID_TRANSITION" });
  });

  it("keeps one agency out of another's incidents over the wire", async () => {
    const incident = await citizen.createIncident(sosBody, crypto.randomUUID());
    const otherAgency = clientFor(baseUrl, {
      userId: "d2",
      role: "dispatcher",
      agencyId: "agency-fire",
    });

    await expect(otherAgency.getIncident(incident.id)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("reports an unreachable server as NetworkError, never as ApiError", async () => {
    // The offline queue depends on this split: a NetworkError is worth
    // retrying, an ApiError is the server saying no.
    const offline = new HttpApiClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 500 });

    const err = await offline.getIncident("whatever").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NetworkError);
    expect(err).not.toBeInstanceOf(ApiError);
  });
});
