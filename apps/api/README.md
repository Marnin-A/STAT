# STAT Backend

Fastify + TypeScript emergency-coordination backend. Domain complete (phases 1-5).

## Run

```bash
pnpm install
pnpm test        # 128 tests, TDD
pnpm typecheck
pnpm build
pnpm dev         # tsx watch, :3000
```

## Status: Phase 5 complete (hospital handoff + compliance, in-memory)

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
- `triage/` — protocol questionnaire (medical/security/fire), deterministic
  rules scoring (<100 ms, no LLM in the loop), triage service (submit folds
  latest-wins; first submit moves incident to `triaging`).
- `telemetry/` — manual vitals entry on the incident event log (range
  validation; latest-first fold for the hospital view; live via bus).
- `sync/` — offline replay: occurredAt-ordered apply, per-command idempotency
  keys, one failure never stops the batch.
- `hospital/` — hospital registry, capability+capacity routing (nearest
  first), handoff service (select, pre-arrival alert with triage + latest
  vitals), active-incident view.
- `notification/` — handoff notifier port (in-memory now; Africa's Talking
  SMS + FCM push swap in).
- `audit/` — PHI access log (NDPA): every vitals/triage/handoff read recorded.
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
| GET | `/triage/questions?type=` | authenticated |
| POST | `/incidents/:id/triage` | responder/dispatcher/admin |
| GET | `/incidents/:id/triage` | authenticated, agency-scoped |
| POST | `/incidents/:id/vitals` | responder/dispatcher/admin |
| GET | `/incidents/:id/vitals?limit=` | authenticated, agency-scoped |
| POST | `/incidents/:id/replay` | responder/dispatcher/admin |
| POST | `/hospitals` | admin |
| GET | `/hospitals?lat=&lng=&capability=` | authenticated, nearest first |
| POST | `/incidents/:id/hospital` | responder/dispatcher/admin |
| POST | `/incidents/:id/hospital/alert` | responder/dispatcher/admin |
| GET | `/hospital/incidents` | hospital_staff (own), admin (`?hospitalId=`) |
| GET | `/audit/access?incidentId=` | admin |
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
- PHI reads audited (vitals/triage/handoff) -> visible at `/audit/access`.
- Vitals older than 90 days hidden from reads (NDPA retention).

## Next (productionize)

All 5 design-doc build phases done at the domain level. Remaining swaps at
ports: Supabase migrations + Postgres impls (event store, rate limit, units,
dispatches, hospitals, audit), Redis bus, Better Auth (incl. WS token),
Africa's Talking / FCM notifier, telemetry hard-delete job.
