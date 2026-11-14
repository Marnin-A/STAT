import { describe, it, expect, beforeEach } from "vitest";
import { buildApp, defaultDeps } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
beforeEach(() => {
  let n = 0;
  app = buildApp(defaultDeps(() => `id-${++n}`, () => "2026-07-02T10:00:00.000Z"));
});

const admin = { "x-user-id": "a1", "x-role": "admin" };
const responder = { "x-user-id": "r1", "x-role": "responder", "x-agency-id": "agency-1" };
const hospitalStaff = { "x-user-id": "h1", "x-role": "hospital_staff", "x-agency-id": "hosp-1" };

const hospitalBody = {
  id: "hosp-1",
  name: "Lagos General",
  location: { lat: 6.52, lng: 3.41 },
  capabilities: ["trauma", "cardiac"],
  availableBeds: 12,
};

async function createIncident(key = "k1"): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/incidents",
    headers: { "idempotency-key": key },
    payload: {
      agencyId: "agency-1",
      type: "medical",
      priority: "critical",
      location: { lat: 6.5, lng: 3.4 },
      deviceId: "dev-1",
    },
  });
  return res.json().id;
}

describe("hospital HTTP routes", () => {
  it("201 registers a hospital as admin; 403 as responder", async () => {
    const ok = await app.inject({ method: "POST", url: "/hospitals", headers: admin, payload: hospitalBody });
    expect(ok.statusCode).toBe(201);
    const no = await app.inject({ method: "POST", url: "/hospitals", headers: responder, payload: hospitalBody });
    expect(no.statusCode).toBe(403);
  });

  it("ranks hospitals by distance with capability filter", async () => {
    await app.inject({ method: "POST", url: "/hospitals", headers: admin, payload: hospitalBody });
    await app.inject({
      method: "POST",
      url: "/hospitals",
      headers: admin,
      payload: { ...hospitalBody, id: "hosp-2", location: { lat: 7.0, lng: 3.4 }, capabilities: ["burn"] },
    });
    const res = await app.inject({
      method: "GET",
      url: "/hospitals?lat=6.5&lng=3.4&capability=cardiac",
      headers: responder,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((h: { id: string }) => h.id)).toEqual(["hosp-1"]);
  });

  it("full handoff flow: select -> alert -> hospital sees active incident", async () => {
    await app.inject({ method: "POST", url: "/hospitals", headers: admin, payload: hospitalBody });
    const incidentId = await createIncident();

    const select = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/hospital`,
      headers: responder,
      payload: { hospitalId: "hosp-1" },
    });
    expect(select.statusCode).toBe(200);
    expect(select.json().hospitalId).toBe("hosp-1");

    const alert = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/hospital/alert`,
      headers: responder,
    });
    expect(alert.statusCode).toBe(200);
    expect(alert.json().hospitalAlerted).toBe(true);

    const active = await app.inject({ method: "GET", url: "/hospital/incidents", headers: hospitalStaff });
    expect(active.statusCode).toBe(200);
    expect(active.json().map((i: { id: string }) => i.id)).toEqual([incidentId]);
  });

  it("400 alerting before selecting a hospital", async () => {
    const incidentId = await createIncident();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/hospital/alert`,
      headers: responder,
    });
    expect(res.statusCode).toBe(400);
  });

  it("PHI reads are audited and visible to admin only", async () => {
    const incidentId = await createIncident();
    await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/vitals`,
      headers: responder,
      payload: { kind: "vitals", capturedAt: "2026-07-02T10:01:00.000Z", payload: { hr: 100 } },
    });
    await app.inject({ method: "GET", url: `/incidents/${incidentId}/vitals`, headers: responder });
    await app.inject({ method: "GET", url: `/incidents/${incidentId}/triage`, headers: responder });

    const audit = await app.inject({
      method: "GET",
      url: `/audit/access?incidentId=${incidentId}`,
      headers: admin,
    });
    expect(audit.statusCode).toBe(200);
    const resources = audit.json().map((e: { resource: string }) => e.resource);
    expect(resources).toContain("vitals");
    expect(resources).toContain("triage");

    const forbidden = await app.inject({ method: "GET", url: "/audit/access", headers: responder });
    expect(forbidden.statusCode).toBe(403);
  });
});
