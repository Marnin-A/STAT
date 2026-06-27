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

## Status: Phase 1 (in-memory)

Domain core is built and TDD-covered. Persistence is in-memory (ports defined);
Supabase Postgres + Redis + Better Auth swap in at the ports without touching
domain logic.

### Modules

- `incident/` — event store, projection (read model), state machine, abuse
  scoring, rate limit, service.
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

### Invariants enforced

- Event sourcing: append-only log is source of truth; read model folded from log.
- Optimistic lock: `expectedVersion` mismatch -> 409.
- State machine: invalid transition -> 409.
- Idempotency: duplicate key -> original response.
- RBAC + per-agency scope: wrong role/agency -> 403.
- SOS abuse fail-open: accept + flag; hard-block obvious spam -> 429.

## Next (Phase 2)

Supabase migrations (incident_events, incident_read_model, sos_rate_limit) +
Postgres EventStore/RateLimit impls; Better Auth wiring; dispatch core.
