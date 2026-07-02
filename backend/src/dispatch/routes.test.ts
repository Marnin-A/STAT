import { describe, it, expect, beforeEach } from "vitest";
import { buildApp, defaultDeps } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
beforeEach(() => {
  let n = 0;
  app = buildApp(defaultDeps(() => `id-${++n}`, () => "2026-07-02T10:00:00.000Z"));
});

const dispatcher = { "x-user-id": "d1", "x-role": "dispatcher", "x-agency-id": "agency-1" };
const responder = { "x-user-id": "r1", "x-role": "responder", "x-agency-id": "agency-1" };
const citizen = { "x-user-id": "c1", "x-role": "citizen" };

const unitBody = {
  id: "unit-1",
  agencyId: "agency-1",
  type: "medical",
  callSign: "M-1",
  location: { lat: 6.51, lng: 3.4 },
};

async function registerUnit(body: Record<string, unknown> = unitBody) {
  return app.inject({ method: "POST", url: "/units", headers: dispatcher, payload: body });
}

async function createIncident() {
  const res = await app.inject({
    method: "POST",
    url: "/incidents",
    headers: { "idempotency-key": "k1" },
    payload: {
      agencyId: "agency-1",
      type: "medical",
      priority: "critical",
      location: { lat: 6.5, lng: 3.4 },
      deviceId: "dev-1",
    },
  });
  return res.json().incidentId as string;
}

async function dispatchUnit(incidentId: string, expectedVersion = 1) {
  return app.inject({
    method: "POST",
    url: `/incidents/${incidentId}/dispatch`,
    headers: dispatcher,
    payload: { unitId: "unit-1", expectedVersion },
  });
}

describe("dispatch HTTP routes", () => {
  it("201 registers a unit as dispatcher", async () => {
    const res = await registerUnit();
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe("available");
  });

  it("403 registering a unit as citizen", async () => {
    const res = await app.inject({ method: "POST", url: "/units", headers: citizen, payload: unitBody });
    expect(res.statusCode).toBe(403);
  });

  it("400 registering a unit with missing fields", async () => {
    const res = await registerUnit({ id: "u2" });
    expect(res.statusCode).toBe(400);
  });

  it("updates unit location", async () => {
    await registerUnit();
    const res = await app.inject({
      method: "POST",
      url: "/units/unit-1/location",
      headers: responder,
      payload: { lat: 6.6, lng: 3.5 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().location).toEqual({ lat: 6.6, lng: 3.5 });
  });

  it("lists available units ranked by distance", async () => {
    await registerUnit();
    await registerUnit({ ...unitBody, id: "unit-2", callSign: "M-2", location: { lat: 7.0, lng: 3.4 } });
    const res = await app.inject({
      method: "GET",
      url: "/units/available?lat=6.5&lng=3.4&type=medical",
      headers: dispatcher,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.map((u: { id: string }) => u.id)).toEqual(["unit-1", "unit-2"]);
    expect(body[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("401 listing available units anonymously", async () => {
    const res = await app.inject({ method: "GET", url: "/units/available?lat=6.5&lng=3.4" });
    expect(res.statusCode).toBe(401);
  });

  it("full flow: dispatch -> accept", async () => {
    await registerUnit();
    const incidentId = await createIncident();

    const d = await dispatchUnit(incidentId);
    expect(d.statusCode).toBe(201);
    const dispatch = d.json();
    expect(dispatch.status).toBe("pending");

    const acc = await app.inject({
      method: "POST",
      url: `/dispatches/${dispatch.id}/accept`,
      headers: responder,
    });
    expect(acc.statusCode).toBe(200);
    expect(acc.json().status).toBe("accepted");

    const inc = await app.inject({
      method: "GET",
      url: `/incidents/${incidentId}`,
      headers: dispatcher,
    });
    expect(inc.json().status).toBe("dispatched");
    expect(inc.json().assignedUnitIds).toEqual(["unit-1"]);
  });

  it("reject frees the unit for a new dispatch", async () => {
    await registerUnit();
    const incidentId = await createIncident();
    const dispatch = (await dispatchUnit(incidentId)).json();

    const rej = await app.inject({
      method: "POST",
      url: `/dispatches/${dispatch.id}/reject`,
      headers: responder,
    });
    expect(rej.statusCode).toBe(200);
    expect(rej.json().status).toBe("rejected");

    const avail = await app.inject({
      method: "GET",
      url: "/units/available?lat=6.5&lng=3.4",
      headers: dispatcher,
    });
    expect(avail.json().map((u: { id: string }) => u.id)).toContain("unit-1");
  });

  it("409 dispatching an already-assigned unit", async () => {
    await registerUnit();
    const a = await createIncident();
    await dispatchUnit(a);
    const b = await app.inject({
      method: "POST",
      url: "/incidents",
      headers: { "idempotency-key": "k2" },
      payload: {
        agencyId: "agency-1",
        type: "medical",
        priority: "critical",
        location: { lat: 6.5, lng: 3.4 },
        deviceId: "dev-2",
      },
    });
    const res = await dispatchUnit(b.json().incidentId);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("UNIT_UNAVAILABLE");
  });

  it("409 dispatching with a stale expectedVersion", async () => {
    await registerUnit();
    const incidentId = await createIncident();
    const res = await dispatchUnit(incidentId, 0);
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("VERSION_CONFLICT");
  });

  it("403 dispatching as responder", async () => {
    await registerUnit();
    const incidentId = await createIncident();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/dispatch`,
      headers: responder,
      payload: { unitId: "unit-1", expectedVersion: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("403 accepting a dispatch as citizen", async () => {
    await registerUnit();
    const incidentId = await createIncident();
    const dispatch = (await dispatchUnit(incidentId)).json();
    const res = await app.inject({
      method: "POST",
      url: `/dispatches/${dispatch.id}/accept`,
      headers: citizen,
    });
    expect(res.statusCode).toBe(403);
  });
});
