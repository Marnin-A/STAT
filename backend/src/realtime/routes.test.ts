import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp, defaultDeps } from "../app.js";
import type { FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";

let app: FastifyInstance;
let base: string;

beforeEach(async () => {
  let n = 0;
  app = buildApp(defaultDeps(() => `id-${++n}`));
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  base = `127.0.0.1:${port}`;
});

afterEach(async () => {
  await app.close();
});

const dispatcher = { "x-user-id": "d1", "x-role": "dispatcher", "x-agency-id": "agency-1" };

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

function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timed out")), ms)),
  ]);
}

describe("WebSocket incident channel", () => {
  it("streams status changes for a subscribed incident", async () => {
    const incidentId = await createIncident();
    const ws = new WebSocket(
      `ws://${base}/ws/incidents/${incidentId}?user=d1&role=dispatcher&agency=agency-1`,
    );
    await withTimeout(
      new Promise<void>((res, rej) => {
        ws.onopen = () => res();
        ws.onerror = () => rej(new Error("ws error"));
      }),
    );

    const nextMessage = new Promise<Record<string, unknown>>((res) => {
      ws.onmessage = (m) => res(JSON.parse(String(m.data)));
    });

    await app.inject({
      method: "POST",
      url: `/incidents/${incidentId}/status`,
      headers: dispatcher,
      payload: { status: "triaging", expectedVersion: 1 },
    });

    const event = await withTimeout(nextMessage);
    expect(event.type).toBe("IncidentStatusChanged");
    expect((event.payload as Record<string, unknown>).status).toBe("triaging");
    ws.close();
  });

  it("rejects subscription to an unknown incident", async () => {
    const ws = new WebSocket(`ws://${base}/ws/incidents/nope?user=d1&role=dispatcher&agency=agency-1`);
    const closed = await withTimeout(
      new Promise<{ code: number }>((res) => {
        ws.onclose = (e) => res({ code: e.code });
      }),
    );
    expect(closed.code).toBe(4004); // app close code: not found
  });

  it("rejects anonymous subscription", async () => {
    const incidentId = await createIncident();
    const ws = new WebSocket(`ws://${base}/ws/incidents/${incidentId}`);
    const closed = await withTimeout(
      new Promise<{ code: number }>((res) => {
        ws.onclose = (e) => res({ code: e.code });
      }),
    );
    expect(closed.code).toBe(4001); // app close code: unauthorized
  });
});

describe("SSE dashboard feed", () => {
  it("streams agency events as SSE data lines", async () => {
    const res = await fetch(`http://${base}/dashboard/stream`, {
      headers: dispatcher,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    const firstData = (async () => {
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) throw new Error("stream ended");
        buf += decoder.decode(value, { stream: true });
        const m = buf.match(/data: (.+)\n\n/);
        if (m) return JSON.parse(m[1]!);
      }
    })();

    await createIncident(); // agency-1 event -> dispatcher's feed
    const event = await withTimeout(firstData);
    expect(event.type).toBe("SOSAccepted");
    expect(event.agencyId).toBe("agency-1");
    await reader.cancel();
  });

  it("401 for anonymous dashboard stream", async () => {
    const res = await fetch(`http://${base}/dashboard/stream`);
    expect(res.status).toBe(401);
    await res.body?.cancel();
  });

  it("403 for citizen dashboard stream", async () => {
    const res = await fetch(`http://${base}/dashboard/stream`, {
      headers: { "x-user-id": "c1", "x-role": "citizen" },
    });
    expect(res.status).toBe(403);
    await res.body?.cancel();
  });
});

describe("realtime metrics", () => {
  it("exposes publish lag counters", async () => {
    await createIncident();
    const res = await app.inject({ method: "GET", url: "/metrics/realtime", headers: dispatcher });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.published).toBeGreaterThanOrEqual(1);
    expect(body.maxLagMs).toBeGreaterThanOrEqual(0);
    expect(body.avgLagMs).toBeGreaterThanOrEqual(0);
  });
});
