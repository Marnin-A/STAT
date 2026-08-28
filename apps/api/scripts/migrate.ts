/**
 * Applies every migration in `supabase/migrations` in filename order.
 *
 * `supabase db push` does the same thing against a linked project; this exists
 * so migrating needs nothing but a connection string — useful in CI and on a
 * machine without the Supabase CLI.
 *
 * Migrations are written to be idempotent (`create ... if not exists`), so
 * re-running is safe.
 *
 *   DATABASE_URL=... pnpm --filter @stat/api db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPool } from "../src/db/pool.js";

const dir = fileURLToPath(new URL("../supabase/migrations", import.meta.url));

// The direct connection (5432), not the pooler: DDL wants a session.
const url = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required (use the direct connection, port 5432)");
  process.exit(1);
}

const pool = createPool(url);

try {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    process.stdout.write(`applying ${file} ... `);
    await pool.query(readFileSync(`${dir}/${file}`, "utf8"));
    console.log("ok");
  }
  console.log("migrations complete");
} catch (err) {
  console.error("\nmigration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
