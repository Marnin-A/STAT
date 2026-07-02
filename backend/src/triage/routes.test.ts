import { describe, it, expect, beforeEach } from "vitest";
import { buildApp, defaultDeps } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;
beforeEach(() => {
  let n = 0;
  app = buildApp(defaultDeps(() => `id-${++n}`, () => "2026-07-02T10:00:00.000Z"));
});

const responder = { "x-user-id": "r1", "x-role": "responder", "x-agency-id": "agency-1" };
const hospital = { "x-user-id": "h1", "x-role": "hospital_staff", "x-agency-id": "agency-1" };

async function createIncident(): Promise<string> {
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
  return res.json().incidentId;
}

describe("triage + telemetry HTTP routes", () => {
  it("serves protocol questions by incident type", async () => {
    const res = await app.inject({ method: "GET", url: "/triage/questions?type=medical", headers: responder });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThanOrEqual(3);
  });

  it("400 for unknown question type", async () => {
    const res = await app.inject({ method: "GET", url: "/triage/questions?type=weather", headers: responder });
    expect(res.statusCode).toBe(400);
  });

  it("submit answers -> score; GET returns stored triage", async () => {
    const incidentId = await createIncident();
    const submit = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/triage`,
      headers: responder,
      payload: { answers: [{ questionId: "med-conscious", value: false }, { questionId: "med-breathing", value: false }] },
    });
    expect(submit.statusCode).toBe(201);
    expect(submit.json().level).toBe("critical");

    const get = await app.inject({ method: "GET", url: `/incidents/${incidentId}/triage`, headers: hospital });
    expect(get.statusCode).toBe(200);
    expect(get.json().score.level).toBe("critical");
  });

  it("403 submitting triage as citizen", async () => {
    const incidentId = await createIncident();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/triage`,
      headers: { "x-user-id": "c1", "x-role": "citizen" },
      payload: { answers: [] },
    });
    expect(res.statusCode).toBe(403);
  });

  it("records vitals and serves latest to hospital staff", async () => {
    const incidentId = await createIncident();
    const post = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/vitals`,
      headers: responder,
      payload: { kind: "vitals", capturedAt: "2026-07-02T10:05:00.000Z", payload: { hr: 118, spo2: 94 } },
    });
    expect(post.statusCode).toBe(201);

    const get = await app.inject({ method: "GET", url: `/incidents/${incidentId}/vitals`, headers: hospital });
    expect(get.statusCode).toBe(200);
    expect(get.json()[0].payload).toEqual({ hr: 118, spo2: 94 });
  });

  it("400 for out-of-range vitals", async () => {
    const incidentId = await createIncident();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/vitals`,
      headers: responder,
      payload: { kind: "vitals", capturedAt: "2026-07-02T10:05:00.000Z", payload: { hr: 700 } },
    });
    expect(res.statusCode).toBe(400);
  });

  it("replay endpoint applies offline batch and reports per-command results", async () => {
    const incidentId = await createIncident();
    const res = await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/replay`,
      headers: responder,
      payload: {
        commands: [
          { key: "s1", kind: "status", occurredAt: "2026-07-02T10:01:00.000Z", payload: { status: "dispatched" } },
          { key: "v1", kind: "vitals", occurredAt: "2026-07-02T10:02:00.000Z", payload: { kind: "vitals", capturedAt: "2026-07-02T10:02:00.000Z", payload: { hr: 92 } } },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().every((r: { ok: boolean }) => r.ok)).toBe(true);

    const inc = await app.inject({ method: "GET", url: `/incidents/${incidentId}`, headers: responder });
    expect(inc.json().status).toBe("dispatched");
  });
});
