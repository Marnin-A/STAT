import { it, expect } from "vitest";
import { createVercelApp } from "./vercel-app.js";
it("refuses hosted mutations and reports unavailable when the database is not configured", async () => {
  const app = createVercelApp(null);
  try {
    const health = await app.inject({ url: "/api/health" });
    expect(health.statusCode).toBe(503);
    expect(health.json().error).toBe("SERVICE_UNAVAILABLE");
    const sos = await app.inject({
      method: "POST",
      url: "/api/incidents",
      payload: { type: "medical", location: null, deviceId: "test" },
      headers: { "idempotency-key": "no-memory-fallback" },
    });
    expect(sos.statusCode).toBe(503);
    expect(sos.json()).not.toHaveProperty("id");
  } finally {
    await app.close();
  }
});
