# STAT — Design Decisions Log

One line per decision. Newest on top. Rationale terse.

## 2026-08-28 (M3 persistence)

- **Postgres adapters mirror the in-memory ones one-for-one**, chosen at startup from `DATABASE_POOL_URL`/`DATABASE_URL`. No domain code knows which it got.
- **`UNIQUE (incident_id, version)` IS the optimistic lock.** A 23505 becomes `VersionConflictError` — the same outcome the in-memory store reaches by comparing lengths, but unraceable.
- **Atomic unit reserve is a single conditional UPDATE** (`where id = $1 and status = 'available'`). Never a read-then-write; that is what stops double assignment under concurrency.
- **Conformance suite is the safety net for the whole swap.** It already earned its keep: it caught the in-memory idempotency store overwriting on a repeat `set` where Postgres keeps the first response. First-write-wins is correct (a retry must get the original response) and the in-memory store was fixed to match.
- **No projection table yet.** `list()` folds streams, but adapters may implement the optional `loadByAgency` to do it in one query instead of one round trip per incident. Postgres does. A materialised read model is the next optimisation, not a correctness need.
- **In-memory fallback is loud.** Starting without a connection string prints a warning: silently losing every incident on restart should never be a surprise.
- **Migrations are idempotent and runnable without the Supabase CLI** (`pnpm db:migrate`), so CI and a bare machine can both apply them.

## 2026-08-28 (M2 real transport)

- **`HttpApiClient` lives in `@stat/shared`, beside `MockApiClient`.** Both implement the one `ApiClient`; putting the real client there lets the API's integration test drive the *shipping* client against a real socket rather than a test double.
- **`ApiError` vs `NetworkError` is a deliberate split.** `ApiError` is the server rejecting on merit (never blind-retry); `NetworkError` is the request never arriving (the offline queue retries exactly this). M6 depends on the distinction.
- **Transport chosen from `VITE_API_URL`.** Set = real backend, unset = MockApiClient. Tests inject a client and take neither branch.
- **Interim principal headers in `api/session.ts`** (`VITE_DEV_*`). No security whatsoever — one place to swap for a bearer token at M4.
- **Tests excluded from the API build.** `tsconfig` now excludes `*.test.ts`, so `dist/` ships no test code and no stray runtime import of `@stat/shared`.

## 2026-08-28 (M1 contract freeze)

- **`backend/` -> `apps/api`.** One workspace, one lockfile, one install. Backend can now import the shared contract.
- **`@stat/shared` is the single wire contract, imported type-only by the API.** The package also holds `MockApiClient` (runtime code the API must never pull in); `import type` erases at compile time, so `dist/` has no reference and the package needs no build step or ordering.
- **UI view-models are not wire types.** `Vital`/`ChatMessage` moved to `apps/mobile/src/types/ui.ts`. The contract holds only what the API actually sends.
- **`UnitType` = vehicle vocabulary** (`ambulance|police|fire|rescue`), matching the DB seed. Incident->unit mapping lives server-side; clients pass `?for=<incidentType>` and never encode the table.
- **`UnitStatus` = `available|standby|assigned|out_of_service`.** Preserves the atomic `available`<->`assigned` reserve/release pair dispatch depends on; drops the redundant `busy`/`offline` naming.
- **Read model exposes `version`.** Without it a client cannot supply `expectedVersion` and cannot transition an incident at all.
- **`POST /incidents` returns the Incident, not a create receipt.** The client needs `version` immediately for its next mutation.
- **Untriaged SOS defaults to `priority: critical`.** Fail-safe: over-triage is recoverable, under-triage is not.
- **An SOS with no GPS fix is still filed** (`location: null`). A dispatcher can work a located-later incident; they cannot work one that was never filed.
- **`deviceId` is a per-install UUID in Preferences** (`useDeviceId`), not a fingerprint. Clearing app data mints a new one — the intended NDPA trade.
- **Protocol questionnaire has no free-text questions.** Every answer must be scoreable by the deterministic rules.
- **Contract tests are the gate.** `apps/api/src/contract.test.ts` implements `ApiClient` over `app.inject()`, so interface drift is a compile error, not a runtime surprise.

## 2026-08-28

- **Supabase: hosted project, no local stack.** Managed project on the platform; migrations via `supabase link` + `db push`. No Docker/`supabase start`. Connection strings supplied through gitignored `.env`.
- **Supabase used as managed Postgres, not as a BaaS.** Fastify is the only DB client; the mobile app never talks to Supabase directly. Security boundary is API RBAC, not RLS. Service role key stays server-side, never `VITE_`-prefixed. Better Auth (not Supabase Auth/GoTrue) still owns identity — reaffirmed now that GoTrue is sitting in the same project.

## 2026-06-27 (Frontend)

- **Monorepo: pnpm workspaces** (`apps/mobile` + `packages/shared`). Clean separation, shared types.
- **Android first**, iOS later. Faster iteration, no Xcode needed initially.
- **Maps: Leaflet** (free, no API key). Good enough for unit tracking + incident location.
- **Frontend API: TypeScript interface + mock impl**. Swap to real backend when ready.
- **Capacitor plugins**: geolocation, haptics, status-bar, preferences, push, camera.
- **TDD mandatory**: Vitest + Testing Library. Red-Green-Refactor per component.

## 2026-06-27 (Backend)

- **App name STAT** (was PULSE). Rebrand.
- **Database: Supabase** (managed Postgres + PostGIS + Storage + Realtime). Low ops, fast MVP, one platform.
- **Backend: Fastify + TypeScript**, modular monolith. Light framework; module boundaries via folders; mounts Better Auth.
- **Auth: Better Auth + access-control (RBAC) plugin**, backed by Supabase Postgres. Capacitor plugin = bearer + offline session. Roles: citizen, responder, dispatcher, hospital_staff, admin.
- **Tenancy: per-agency tenants.** Police/fire/medical = separate agencies + dispatch authorities. Rows carry `agency_id`. Cross-agency only via mutual-aid flag. Agencies admin-provisioned.
- **Platform: Vite + Capacitor** (web build in native shell). Plugins: Preferences, Background Geolocation, Push (FCM/APNs), Better Auth Capacitor.
- **Compliance: no HIPAA; Nigeria NDPA 2023 / NDPR.** Not a US app.
- **Market: Nigeria first.** Weak/intermittent 2G-3G → offline-first, small payloads.
- **Scale target: 10,000 responders.** Monolith stays correct.
- **SMS / voice / OTP: Africa's Talking.** Suspicious-SOS verify = SMS OTP.
- **Device fingerprint: `@fingerprintjs/fingerprintjs`** for abuse signals.
- **Telemetry deferred.** v1 = responder manual vitals entry. No MQTT/vitals-stream/citizen telemetry in v1.
- **Hospital integration: dashboard/webhook first.** OpenMRS (EMR) + DHIS2 (gov reporting) later; FHIR R4 deferred (real endpoints rare in Nigeria).
- **Dispatch authority rules.** Citizen SOS needs dispatcher approval; system auto-selects unit, dispatcher accepts/rejects; dispatcher can pull units off lower-priority; hospital can reroute; citizen cancels own; type-priority by responder type.
- **Unit auto-select v1 simple** (distance, eta, type match, capability, availability, agency match). Full ~26-weight model later.
- **SOS abuse: fail-open.** Accept + flag risk + dispatcher decides. Hard-block only obvious automated spam. `SOSAccepted`/`SOSFlagged` + `risk_score`.
- **Vitals retention: 90 days.**
- **Incident source of truth: append-only event log + read models** (CQRS-lite). Audit is core requirement.
- **AI triage: deterministic protocol first, LLM enrichment second.** AI never blocks emergency flow.
