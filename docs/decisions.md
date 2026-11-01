# STAT — Design Decisions Log

One line per decision. Newest on top. Rationale terse.

## 2026-11-01 (realistic synthetic demo users)
- User requests populated demo users for every group: citizen, responder, dispatcher, hospital_staff and admin.
- Synthetic personas have coherent medical/staff profiles and a shared linked response dataset. Fictional labels/emails/contact identifiers only; no real accounts or hosted writes.
- Persona selector is explicitly demo-only, not authentication; disabled whenever a real API URL is configured. It is collapsed to keep core SOS uncluttered.
- In-memory scenarios reset on reload or explicit reset. Switching/resetting also clears mounted pending demo request state. Real profile persistence/auth/tracking remain separate work.

## 2026-11-01 (implementation approved)
- Implement Quiet Confidence in React across medical roles; one citizen/responder Android app, dispatcher/hospital web.
- Track the assigned responder phone, not dispatch operator. Explicit active-assignment start; background/screen-lock foreground service; no off-duty/reboot guarantee.
- Incident-scoped citizen/hospital access, authorized agency dispatch; location/freshness/accuracy only, no route or ETA.
- Real sharing requires Better Auth and server-owned assignments/receipt ownership. No role-header shortcut accepted.
- First delivered source slice: citizen shell/Home/Activity/Profile/receipt. Staff/auth/tracking/native remain incomplete. No real tracking enabled.

## 2026-10-28 (visual revision — no red primary action)

- **Red-led design rejected.** User explicitly rejects the red medical-help button and requests a less generic theme via UI/UX Pro Max. This supersedes the earlier red-SOS allowance.
- **Quiet Confidence proposed, not approved.** Midnight plum / soft lilac / warm ivory; integrated action tile, quieter secondary tools. Five code-native citizen reference states replace the default local review. Exact palette/layout awaits feedback; no application or backend implementation.
- **Scope and safety unchanged.** Anonymous-capable SOS, optional location, human dispatch approval, explicit delivery state and consent remain required. Old Stitch/screens preserved; staff reskin is a later design pass.

## 2026-10-28 (second decision round — all five approved)

- **Calm visual direction approved.** Off-white/white surfaces, soft rounded cards, generous spacing and muted teal; red reserved for SOS/critical states. Actual draft screens still need visual review.
- **Citizen navigation approved.** Home / Activity / Profile. Medical ID and contacts under Profile with a Home shortcut; SOS and active incident directly reachable. Settings/help secondary.
- **Fraud policy: receive first, flag/review.** No mandatory login/OTP before SOS; deduplicate retries, offer optional callback verification, flag suspicious patterns with reasons/audit. Missing GPS/shared IP/unverified number or AI sentiment alone must not cause rejection or clinical downgrading.
- **Saved profiles require sign-in.** SOS remains anonymous-capable. Sharing relevant profile data is explicit and incident-scoped to assigned care staff; first release includes profiles and emergency contacts.
- **Automation boundary approved for first demo.** Automate intake processing and offer labelled AI summaries/routing suggestions; dispatcher approval still required. Autonomous dispatch is separate future evaluated scope. Real AI integration and clinical/operations reviewer availability remain unresolved.

## 2026-10-28 (web demo and redesign — user confirmed)

- **Redo the visual design.** Calmer, more appealing and intuitive; core features immediately reachable, secondary features progressively disclosed. The attached health-app image is visual inspiration, not a functional specification.
- **Desktop adaptations approved in principle.** Propose dispatcher/hospital layouts using the new visual direction; obtain screen approval before implementation. Preserve old Stitch screens as historical references, not the new visual acceptance baseline.
- **Missing states/deviations may be proposed.** Document additions and important copy/navigation changes for review; no silent redesign.
- **Communication: persisted incident notes first.** Two-way incident chat moves to future work.
- **Citizen SOS without mandatory login.** Fraud-control policy remains unresolved; accepting anonymous SOS does not authorize automatic dispatch.
- **Medical profiles and family/emergency contacts: first release.** Account, consent, sharing and minimum-field details still need agreement.
- **Separate disposable hosted Supabase project approved.** Connection/configuration and target verification still outstanding; never run destructive tests on development data.
- **Initial delivery: mobile-focused web demo with closed synthetic-data testing.** Citizen/responder also run in the browser initially; dispatcher/hospital remain web. Android packaging follows later; one Android app remains the eventual target.
- **Review order: design (A) → connected SOS/dispatch slice (C) → comprehensive backend hardening (B).** The connected slice still requires its minimum security/persistence safeguards; synthetic data does not justify a publicly insecure API.
- **Automation-first aspiration, not approved autonomous clinical policy.** Explore AI sentiment assistance and human escalation. Clinical reviewer availability, model evaluation, escalation rules and dispatch authority remain unresolved; no approval to reject/downgrade SOS using sentiment or deploy autonomous clinical decisions.

## 2026-10-02 (recovery scope — user confirmed)

- **Design authority: Stitch.** Project `15243493749593154645`, Rapid Response Network. Existing written plans are subordinate references, not substitutes for the design.
- **Surfaces: one Android app plus web views.** Android serves citizens/responders; dispatcher/hospital views run on web. No separate Android role apps.
- **First release: medical SOS → dispatch → responder → hospital handoff.** Security/fire and broader integrations do not determine this slice's completion.
- **Hosted Supabase retained.** User supplies private connection/auth configuration when required; no local Supabase stack.

## 2026-08-28 (M8 retention)

- **Vitals retention redacts, it does not delete.** The NDPA obligation is to stop holding patient data; the audit trail depends on an append-only log. Deleting rows would tear holes in the version sequence every projection folds over, so the `TelemetryRecorded` event survives — who took vitals, on which incident, when — and its payload is emptied. The readings are gone; the timeline is intact.
- **The job is idempotent** (`payload <> '{}'`), so a cron that double-fires or a retried run costs nothing and reports no phantom work.

## 2026-08-28 (M5 realtime + M6 offline)

- **Reconnect means refetch.** The incident channel has no replay, so `useIncidentChannel` calls `onResync` on every connect and the screen reloads the read model. Without it a dropped socket leaves the UI silently stale — the most dangerous failure mode in a live response.
- **Application close codes are terminal.** 4001/4003/4004 stop the backoff loop; an unauthorized socket will still be unauthorized in a second, and retrying only costs a responder battery and data.
- **A malformed frame must never blank the screen.** Parse before calling `setState` — React runs a state updater during render, where a throw escapes the handler's catch. (A test caught this; it was a real bug.)
- **Dashboard refetches on a revision bump** rather than patching the list from event payloads. Cheaper to reason about, and the list is agency-scoped and small.
- **`NetworkError` requeues, `ApiError` does not.** The request that never landed is worth retrying; the one the server decided on is spent. This is why the two error classes exist.
- **Per-command rejections surface in the UI.** A command the server refused is work the responder believes happened — the banner says so instead of dropping it silently.
- **Offline queue keys and timestamps are stamped at capture**, not at drain. The server orders by `occurredAt` and dedupes by `key`, so a double drain is a no-op and actions replay in the order they happened.
- **SSE cannot carry headers.** `useDashboardStream` will only authenticate once the session is a cookie or URL token (M4); against today's header stub the server sees it as anonymous.

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
