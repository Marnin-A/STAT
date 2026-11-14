# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

STAT — emergency-response coordination for Nigeria (citizen SOS → dispatch → triage → hospital handoff). Android-first Capacitor app + Fastify API in one pnpm workspace.

## Working agreements (from AGENTS.md)

- **Be extremely concise** in responses and commit messages. Sacrifice grammar for concision. Respond in English.
- **Branch per milestone**, merged to `main` (the history is a chain of `feature/*` merges). `worktrees/` is gitignored and holds abandoned trees — don't trust their contents without checking against `main`.
- **TDD is mandatory** (Red-Green-Refactor). Never fake a test; test real behavior. Do not silently skip pre-existing errors/warnings — flag them.
- **Plans live in `docs/plans/`** (gitignored, so not in the repo history). `roadmap-to-ship.md` is the live plan; multi-phase work gets a `phase-N-checkpoint.md`.
- **Design decisions go in `docs/decisions.md`** — terse, newest on top. Add an entry whenever a choice shapes the app. This file is the fastest way to understand *why* the code looks like it does.
- **Bug fixes** need a short note: cause, fix, trade-offs.

## Commands

One workspace, one install, one lockfile.

```bash
pnpm install
pnpm dev            # vite dev server, :5173
pnpm dev:api        # tsx watch, :3000 (PORT overrides)
pnpm test           # both suites, run mode
pnpm test:api
pnpm test:mobile
pnpm typecheck      # api only; mobile typechecks as part of its build
pnpm build          # api tsc, then mobile tsc + vite build
pnpm cap:open       # Android project in Android Studio
```

Single test file / case:

```bash
pnpm --filter @stat/api exec vitest run src/incident/service.test.ts
pnpm --filter @stat/api exec vitest run -t "rejects a stale version"
pnpm --filter @stat/mobile exec vitest run src/pages/Dashboard.test.tsx
```

Database (hosted Supabase; connection strings come from a gitignored `.env`):

```bash
pnpm --filter @stat/api db:migrate    # idempotent, needs the DIRECT url (5432)
pnpm --filter @stat/api db:seed
pnpm --filter @stat/api db:retention  # nightly NDPA job
```

## The contract is the center of this repo

`packages/shared` is the **single wire contract**. Every shape crossing the network is defined once, in `types.ts`, and `ApiClient` in `api.ts` is the only surface the app talks through. Three implementations exist and all three must stay in step:

| Implementation | Where | Used by |
|---|---|---|
| `MockApiClient` | `packages/shared/src/mock.ts` | the app with no backend; component tests |
| `HttpApiClient` | `packages/shared/src/http.ts` | the shipping app; the API's integration test |
| the server itself | `apps/api/src/app.ts` | — |

Two suites defend this and **both must pass before any route or type change is done**:

- `apps/api/src/contract.test.ts` — implements `ApiClient` over `app.inject()`. Interface drift is a **compile error**.
- `apps/api/src/integration.test.ts` — drives the real `HttpApiClient` against a real socket.

**The API imports `@stat/shared` with `import type` only.** The package holds runtime values (the mock) the server must never pull in; type-only imports erase, so `dist/` has no reference and the package needs no build step. Runtime validation (enum guards, the incident→unit-type table) lives in `apps/api/src/dispatch/unit-match.ts` — the server is the validation authority.

UI-only view-models (`Vital`, `ChatMessage`) live in `apps/mobile/src/types/ui.ts`, never in the contract.

## API architecture (`apps/api/src`)

Modular monolith, **CQRS-lite event sourcing**. The append-only log is the source of truth; read models are pure folds over it.

- **Write path**: route → service → `appendEvent(store, {…, expectedVersion})`. `Incident.version` is on the read model precisely so a client can supply `expectedVersion`; a mismatch is a 409 `VERSION_CONFLICT`.
- **Ports + adapters.** Every storage concern is an interface with an `InMemory*` and a `Pg*` implementation. `defaultDeps()` wires in-memory, `pgDeps(pool)` wires Postgres, and the entry point picks based on `DATABASE_POOL_URL`/`DATABASE_URL`. **Domain code never changes when persistence changes** — that is the whole design.
- **`db/conformance.test.ts` is what makes that safe**: one suite, both adapters. It has already caught a real divergence. When you add a port method, add it there. The Postgres half skips without `TEST_DATABASE_URL`.
- **Realtime is a decorator**: `PublishingEventStore` wraps the store so *every* append fans out to `incident:{id}`, `agency:{id}` and the firehose. WS and SSE routes only subscribe. Never publish by hand from a service.
- **`buildApp(deps)` takes its dependencies**; tests build an app with fakes rather than booting a server. Services take injected `clock` and `idGen` — thread these through instead of calling `Date`/`randomUUID` directly.
- **Auth is still a stub**: `identity/auth.ts` reads `x-user-id` / `x-role` / `x-agency-id` (WS uses query params — browsers can't set handshake headers). Better Auth replaces `resolvePrincipal`; keep the `Principal` shape. Every route: `resolvePrincipal` → `requireAuthenticated` → `assertRole` → `assertAgencyAccess`.
- **Errors**: throw a `DomainError` subclass from `shared/errors.ts`; one Fastify handler maps `statusCode`/`code`. Don't hand-write status codes in routes.

Two invariants now live in the database, not in process memory: `UNIQUE (incident_id, version)` is the optimistic lock, and unit reserve is a single conditional `UPDATE` so racing dispatchers produce exactly one winner.

## App architecture (`apps/mobile`)

- **Transport is chosen once**, in `ApiProvider`: `VITE_API_URL` set → `HttpApiClient`, unset → `MockApiClient`. Tests inject a client and take neither branch.
- **`ApiError` vs `NetworkError` is load-bearing.** `ApiError` means the server decided (never blind-retry); `NetworkError` means the request never landed (the offline queue retries exactly this).
- **Live data**: `useIncidentChannel` (WS) and `useDashboardStream` (SSE). The channel has no replay, so `onResync` fires on every connect and the screen refetches — a reconnect must never leave a stale view. Server close codes 4001/4003/4004 are terminal.
- **Offline-first is a hard requirement** (2G/3G Nigeria). `useOfflineQueue` stamps a key and `occurredAt` at capture, batches per incident, and drains through `POST /incidents/:id/replay`; `OfflineBanner` shows what is saved on the phone vs synced. An SOS with no GPS fix is still filed.
- Capacitor is wrapped in hooks (`useGeolocation`, `useHaptics`, `useCamera`, `usePushNotifications`, `useOfflineQueue`, `useDeviceId`) — components never import `@capacitor/*` directly.
- React 19 + react-router (routes in `App.tsx`), Tailwind v4 via `@tailwindcss/vite` (no config file; tokens live in `src/index.css`), Leaflet for maps. Vitest config is inside `vite.config.ts`; tests sit beside their component.

## Known gaps

- **Auth is not real.** Anyone can send `x-role: admin`. Nothing is protected until Better Auth lands.
- **All four nav tabs render for every role.** Role-based navigation is unbuilt.
- **No chat backend.** `ChatChannel` is a UI shell over local state.
- **Postgres adapters are unverified against a live database** — the conformance suite skips without `TEST_DATABASE_URL`.
