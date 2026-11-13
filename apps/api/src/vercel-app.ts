import Fastify, { type FastifyInstance } from "fastify";
import { buildApp, pgDeps } from "./app.js";
import { connectionString, createPool } from "./db/pool.js";

/** Separate hosted bootstrap: never accept emergency records into ephemeral memory. */
export function createVercelApp(
  databaseUrl: string | null = connectionString(),
): FastifyInstance {
  if (!databaseUrl) {
    const unavailable = Fastify({ logger: false });
    unavailable.setNotFoundHandler((_request, reply) =>
      reply.code(503).send({
        error: "SERVICE_UNAVAILABLE",
        message: "Hosted database is not configured.",
      }),
    );
    return unavailable;
  }

  const pool = createPool(databaseUrl);
  const app = buildApp(pgDeps(pool), { apiPrefix: "/api" });
  // Liveness only. Database connectivity/migrations require a separate integration check.
  app.get("/health", async () => ({ status: "ok" }));
  app.addHook("onClose", async () => {
    await pool.end();
  });
  return app;
}
