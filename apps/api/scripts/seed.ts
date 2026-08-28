/**
 * Loads `supabase/seed.sql` — Lagos agencies, units and hospitals for
 * development. Matches MockApiClient's data so screens look the same whether
 * the app is running on the mock or the real backend.
 *
 * Safe to re-run: every insert is `on conflict do nothing`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPool } from "../src/db/pool.js";

const file = fileURLToPath(new URL("../supabase/seed.sql", import.meta.url));
const url = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = createPool(url);

try {
  await pool.query(readFileSync(file, "utf8"));
  console.log("seed complete");
} catch (err) {
  console.error("seed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
