# STAT Backend

Fastify + TypeScript emergency-coordination backend. Phase 1 foundation.

## Run

```bash
pnpm install
pnpm test        # 40 tests, TDD
pnpm typecheck
pnpm build
pnpm dev         # tsx watch, :3000
```

## Status: Phase 3 (real-time, in-memory)

Domain core is built and TDD-covered. Persistence is in-memory (ports defined);
Supabase Postgres + Redis + Better Auth swap in at the ports without touching
domain logic.

### Modules

- `incident/` — event store, projection (read model), state machine, abuse
  scoring, rate limit, service.
- `dispatch/` — unit registry (atomic reserve/release), availability ranking
  (haversine + v1 score: type filter, same-agency preference, nearest first),
  dispatch store, dispatch service (assign / accept / reject).
- `realtime/` — event bus port (in-memory now, Redis pub/sub later),
  publishing event-store decorator (every append fans out to
  `incident:{id}` / `agency:{id}` / firehose channels), publish-lag metrics.
- `identity/` — principal + RBAC/agency guards (**stub**: reads `x-user-id` /
  `x-role` / `x-agency-id` headers; Better Auth replaces `resolvePrincipal`).
- `shared/` — event envelope, idempotency, errors.

### Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/incidents` | anonymous citizen ok; `Idempotency-Key` required |
| GET | `/incidents?status=` | authenticated, agency-scoped |
| GET | `/incidents/:id` | authenticated, agency-scoped |
| POST | `/incidents/:id/status` | dispatcher/responder/admin, `expectedVersion` |
| POST | `/units` | dispatcher/admin |
| POST | `/units/:id/location` | responder/dispatcher/admin |
| GET | `/units/available?lat=&lng=&type=&limit=` | authenticated, ranked |
| POST | `/incidents/:id/dispatch` | dispatcher/admin, `expectedVersion` |
| POST | `/dispatches/:id/accept` | responder/admin |
| POST | `/dispatches/:id/reject` | responder/admin |
| WS | `/ws/incidents/:id?user=&role=&agency=` | query-param auth stub; close 4001/4003/4004 |
| GET (SSE) | `/dashboard/stream` | dispatcher/hospital_staff/admin; agency-scoped, admin = firehose |
| GET | `/metrics/realtime` | dispatcher/hospital_staff/admin |

### Invariants enforced

- Event sourcing: append-only log is source of truth; read model folded from log.
- Optimistic lock: `expectedVersion` mismatch -> 409.
- State machine: invalid transition -> 409.
- Idempotency: duplicate key -> original response.
- RBAC + per-agency scope: wrong role/agency -> 403.
- SOS abuse fail-open: accept + flag; hard-block obvious spam -> 429.
- Double assignment blocked: unit reserve is atomic -> 409 `UNIT_UNAVAILABLE`.
- Reject frees the unit (`UnitUnassigned` event) so it can be re-dispatched.
- Accept/reject only from `pending` -> 409 `DISPATCH_CONFLICT` otherwise.

## Next (Phase 4)

Triage + telemetry: questionnaire API, deterministic scoring, telemetry
ingest, latest-vitals projection, offline replay endpoint. Still pending from
earlier phases: Supabase migrations + Postgres impls at the ports; Redis bus
impl; Better Auth wiring.
