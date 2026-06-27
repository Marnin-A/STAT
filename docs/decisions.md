# STAT — Design Decisions Log

One line per decision. Newest on top. Rationale terse.

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
