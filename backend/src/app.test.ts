import { describe, it, expect, beforeEach } from "vitest";
import { buildApp, defaultDeps } from "./app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
beforeEach(() => {
  let n = 0;
  app = buildApp(defaultDeps(() => `id-${++n}`, () => "2026-06-27T10:00:00.000Z"));
});

const sosBody = {
  agencyId: "agency-1",
  type: "medical",
  priority: "critical",
  location: { lat: 6.5, lng: 3.4 },
  deviceId: "dev-1",
};

async function createSos(key = "k1") {
  return app.inject({
    method: "POST",
    url: "/incidents",
    headers: { "idempotency-key": key },
    payload: sosBody,
  });
}

const dispatcher = { "x-user-id": "u1", "x-role": "dispatcher", "x-agency-id": "agency-1" };

describe("incident HTTP routes", () => {
  it("400 when Idempotency-Key missing", async () => {
    const res = await app.inject({ method: "POST", url: "/incidents", payload: sosBody });
    expect(res.statusCode).toBe(400);
  });

  it("201 creates incident from SOS", async () => {
    const res = await createSos();
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("created");
    expect(body.incidentId).toBeTruthy();
  });

  it("duplicate Idempotency-Key returns same incident", async () => {
    const a = await app.inject({
      method: "POST",
      url: "/incidents",
      headers: { "idempotency-key": "dup", "x-user-id": "u1" },
      payload: sosBody,
    });
    const b = await app.inject({
      method: "POST",
      url: "/incidents",
      headers: { "idempotency-key": "dup", "x-user-id": "u1" },
      payload: sosBody,
    });
    expect(a.json().incidentId).toBe(b.json().incidentId);
  });

  it("401 when reading incident anonymously", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({ method: "GET", url: `/incidents/${incidentId}` });
    expect(res.statusCode).toBe(401);
  });

  it("200 reading incident as matching-agency dispatcher", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "GET",
      url: `/incidents/${incidentId}`,
      headers: dispatcher,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(incidentId);
  });

  it("403 reading incident from another agency", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "GET",
      url: `/incidents/${incidentId}`,
      headers: { "x-user-id": "u2", "x-role": "dispatcher", "x-agency-id": "agency-2" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404 for missing incident", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/incidents/nope",
      headers: dispatcher,
    });
    expect(res.statusCode).toBe(404);
  });

  it("403 when a citizen tries to change status", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/status`,
      headers: { "x-user-id": "c1", "x-role": "citizen", "x-agency-id": "agency-1" },
      payload: { status: "triaging", expectedVersion: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("200 dispatcher changes status through a valid step", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/status`,
      headers: dispatcher,
      payload: { status: "triaging", expectedVersion: 1 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("triaging");
  });

  it("409 on invalid transition", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/status`,
      headers: dispatcher,
      payload: { status: "resolved", expectedVersion: 1 },
    });
    expect(res.statusCode).toBe(409);
  });

  it("409 on stale version", async () => {
    const { incidentId } = (await createSos()).json();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/status`,
      headers: dispatcher,
      payload: { status: "triaging", expectedVersion: 0 },
    });
    expect(res.statusCode).toBe(409);
  });

  it("lists agency-scoped incidents", async () => {
    await createSos("a");
    const res = await app.inject({ method: "GET", url: "/incidents", headers: dispatcher });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });
});
