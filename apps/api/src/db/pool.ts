import pg from "pg";

/**
 * Connection to the hosted Supabase project.
 *
 * Two strings, two jobs (see docs/decisions.md):
 *
 *  - `DATABASE_URL` — direct, port 5432. Migrations, and anything needing
 *    session-level Postgres (LISTEN/NOTIFY, prepared statements).
 *  - `DATABASE_POOL_URL` — pooled, port 6543, pgbouncer in transaction mode.
 *    Runtime queries. No prepared statements, no LISTEN/NOTIFY.
 *
 * Runtime prefers the pooled string and falls back to the direct one.
 */
export function connectionString(): string | null {
  return process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL ?? null;
}

export function createPool(url: string): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    // Supabase terminates TLS with its own chain; the pooler hostname does not
    // match the certificate, so verification is relaxed here rather than
    // shipping a CA bundle. The connection is still encrypted.
    ssl: url.includes("localhost") || url.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // pgbouncer transaction mode cannot hold prepared statements between
    // queries, so never let node-postgres try.
    statement_timeout: 15_000,
  });
}

export type Pool = pg.Pool;

/** Postgres unique-violation. The optimistic lock surfaces as this. */
export const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION;
}
