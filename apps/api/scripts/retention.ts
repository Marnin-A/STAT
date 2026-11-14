/**
 * Nightly vitals retention (NDPA, 90 days).
 *
 * Redacts expired telemetry payloads in place — see telemetry/retention.ts for
 * why this is an update and not a delete. Idempotent, so a cron that fires
 * twice or a retried run costs nothing.
 *
 *   DATABASE_URL=... pnpm --filter @stat/api db:retention
 */
import { createPool, connectionString } from "../src/db/pool.js";
import { PgEventStore } from "../src/db/adapters.js";
import { runRetention } from "../src/telemetry/retention.js";

const url = connectionString();
if (!url) {
  console.error("DATABASE_URL or DATABASE_POOL_URL required");
  process.exit(1);
}

const pool = createPool(url);

try {
  const redacted = await runRetention(new PgEventStore(pool), new Date().toISOString());
  console.log(`retention: redacted ${redacted} expired telemetry payload(s)`);
} catch (err) {
  console.error("retention failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
