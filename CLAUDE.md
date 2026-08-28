# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Before you answer or do any work ask me questions strategically and sequentially until you reach 95% confidence that you understad exactly what I want you to do. When you do I want you to summarize exactly what made you that confident and then write in 2 lines what you are going to do based on your understanding.

STAT — emergency-response coordination for Nigeria (citizen SOS → dispatch → triage → hospital handoff). Android-first Capacitor app + Fastify backend.

## Working agreements (from AGENTS.md)

- **Be extremely concise** in responses and commit messages. Sacrifice grammar for concision. Respond in English.
- **Each session works in its own git worktree** under `worktrees/`, branch `feature/<name>`. Remove the worktree when the session ends.
- **TDD is mandatory** (Red-Green-Refactor). Never fake a test or assert on trivia; test real behavior. Do not silently skip pre-existing errors/warnings — flag them.
- **Plans live in `docs/plans/`** (gitignored via `.ignore` for search tools). Multi-phase work gets one plan file per phase plus a `phase-N-checkpoint.md` summary written at phase end.
- **Design decisions go in `docs/decisions.md`** — one terse line, newest on top. Add an entry whenever a choice shapes the app.
- **Bug fixes** need a short note: cause, fix, trade-offs.

## Two separate installs

`backend/` is **not** in the pnpm workspace (`pnpm-workspace.yaml` covers `apps/*` and `packages/*` only). It has its own lockfile and must be installed and run from `backend/`.

```bash
# Frontend (repo root)
pnpm install
pnpm dev                       # vite dev server on :5173 (proxies to @stat/mobile)
pnpm build                     # tsc && vite build
pnpm test                      # vitest watch
pnpm --filter @stat/mobile test:run    # single CI run
pnpm cap:open                  # open Android project in Android Studio

# Backend (cd backend first)
pnpm install
pnpm dev                       # tsx watch src/app.ts, :3000 (PORT env overrides)
pnpm test                      # vitest run
pnpm typecheck                 # tsc --noEmit
pnpm build && pnpm start       # tsc -> dist, node dist/app.js
```

Single test file / single case:

```bash
cd backend && pnpm vitest run src/incident/service.test.ts
cd backend && pnpm vitest run -t "rejects invalid transition"
pnpm --filter @stat/mobile test:run src/pages/Dashboard.test.tsx
```

Backend imports use explicit `.js` extensions (ESM + `verbatimModuleSyntax`); tsconfig is strict with `noUncheckedIndexedAccess`.

## Backend architecture (`backend/src`)

Modular monolith, **CQRS-lite event sourcing**. The append-only event log is the source of truth; every read model is a pure fold over it.

- **Write path**: route → service → `appendEvent(store, {…, expectedVersion})`. The store rejects a version mismatch with `VersionConflictError` (409). Read models (`incident/projection.ts`) are disposable and rebuilt from `load(incidentId)`.
- **Ports + in-memory adapters.** `EventStore`, `EventBus`, `IdempotencyStore`, `UnitRegistry`, `HospitalRegistry`, `Notifier`, `AccessLog`, rate-limit store are all interfaces with `InMemory*` implementations wired in `defaultDeps()` in `app.ts`. Supabase Postgres / Redis / Better Auth / Africa's Talking swap in **at the ports only** — never by changing domain logic.
- **Realtime fan-out is a decorator**: `PublishingEventStore` wraps the real store so *every* append publishes to `incident:{id}`, `agency:{id}`, and the `incidents:all` firehose. WebSocket (`/ws/incidents/:id`) and SSE (`/dashboard/stream`) just subscribe to bus channels. Never publish by hand from a service.
- **`buildApp(deps)` takes its dependencies**; tests build an app with fakes rather than booting a server. Services take injected `clock: () => string` and `idGen: () => string` — always thread these through instead of calling `Date`/`randomUUID` directly, so tests stay deterministic.
- **Auth is a stub**: `identity/auth.ts` `resolvePrincipal()` reads `x-user-id` / `x-role` / `x-agency-id` headers (WS uses `?user=&role=&agency=` because browsers can't set handshake headers). Better Auth replaces the function; keep the `Principal` shape. Every route calls `resolvePrincipal` → `requireAuthenticated` → `assertRole` → `assertAgencyAccess`.
- **Errors**: throw a `DomainError` subclass from `shared/errors.ts`; the single Fastify error handler maps `statusCode`/`code`. Don't hand-write status codes in routes.

Invariants the tests defend (see `backend/README.md` for the endpoint table): optimistic locking via `expectedVersion`, incident state machine, `Idempotency-Key` replay returns the original response, RBAC + per-agency scope, atomic unit reserve (no double dispatch), SOS abuse **fail-open** (accept + flag; hard-block only obvious spam → 429), PHI reads audited, vitals hidden after 90 days (NDPA).

Domain phases 1–5 are complete; everything is in-memory. Remaining work is port implementations, not domain changes.

## Frontend architecture (`apps/mobile`, `packages/shared`)

- `packages/shared` is source-only (`main` points at `src/index.ts`, no build step). It holds domain `types.ts`, the `ApiClient` interface (`api.ts`), and `MockApiClient` (`mock.ts`). Backend types are **not** imported from here — the two sides define their own; keep them aligned by hand.
- **The app still runs on the mock.** `ApiProvider` defaults to `new MockApiClient()`; tests inject a fake client through the `client` prop. Wiring the real backend means adding an `ApiClient` implementation, not editing pages.
- React 19 + react-router (routes in `App.tsx`), Tailwind v4 via `@tailwindcss/vite` (no tailwind.config; config lives in `src/index.css`), Leaflet for maps.
- Capacitor native access is wrapped in hooks (`useGeolocation`, `useHaptics`, `useCamera`, `usePushNotifications`, `useOfflineQueue`) — components never import `@capacitor/*` directly.
- `useOfflineQueue` persists mutations to Capacitor `Preferences` and replays them; the backend counterpart is `POST /incidents/:id/replay` (`sync/replay.ts`), which applies commands in `occurredAt` order with per-command idempotency keys and never lets one failure abort the batch. Offline-first is a hard requirement (2G/3G Nigeria).
- Vitest config lives inside `vite.config.ts` (jsdom, globals, `src/test/setup.ts`). Tests sit next to their component as `*.test.tsx`.
