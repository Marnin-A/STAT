import { it, expect } from "vitest";
import { buildApp, defaultDeps } from "./app.js";

it("serves API-prefixed requests with query strings without changing standalone routes", async () => {
  const app = buildApp(defaultDeps(), { apiPrefix: "/api" });
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/incidents",
      headers: { "idempotency-key": "vercel-sos" },
      payload: { type: "medical", location: null, deviceId: "test-device" },
    });
    expect(response.statusCode).toBe(201);
    const id = response.json().id;
    const headers = { "x-user-id": "test-reader", "x-role": "admin" };
    expect(
      (await app.inject({ url: "/api/incidents?status=created", headers }))
        .json()
        .map((i: { id: string }) => i.id),
    ).toContain(id);
    expect(
      (await app.inject({ url: "/incidents/" + id, headers })).statusCode,
    ).toBe(200);
    expect((await app.inject({ url: "/api/no-such-route" })).statusCode).toBe(
      404,
    );
  } finally {
    await app.close();
  }
});
