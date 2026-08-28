# STAT — Design Decisions Log

One line per decision. Newest on top. Rationale terse.

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
