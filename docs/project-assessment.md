# STAT recovery assessment

Date: 2026-10-02. Inspected commit: `c56a9e7`. Assessment only; no application changes.

## Verdict

Recoverable prototype. The medical response journey is incomplete, the security model is a development stub, and the UI is not a faithful implementation of Stitch. Earlier milestone completion labels overstate readiness.

Keep the React/Vite/Capacitor and Fastify foundations, shared client contract, incident state machine, event projection, and useful existing tests. Repair incrementally; a blanket rewrite would discard working domain behavior without fixing the missing product decisions.

## Confirmed target

- Design authority: [Rapid Response Network in Stitch](https://stitch.withgoogle.com/projects/15243493749593154645).
- One Android app: citizen and responder views.
- Web: dispatcher and hospital views.
- First release: medical SOS → dispatch → responder → hospital handoff.
- Hosted Supabase; no local Supabase stack. Credentials supplied through private environment configuration when required.

## Verified baseline

| Check | Evidence |
|---|---|
| Build | API TypeScript and mobile TypeScript/Vite builds pass. |
| Tests | 169 API + 88 mobile = 257 pass; 20 Postgres conformance tests skipped. |
| Typecheck | Root command checks API production source only. Mobile is checked during build; API tests are excluded. |
| Browser | Current SOS reviewed at 390×844; hospital reviewed at phone and desktop widths. Hospital checklist target measured 52px, below the design's 64px rule. |
| Design access | Read-only MCP initialization, project retrieval and screen inventory succeeded. HTML inspected for all eight designs and the PRD. SOS and medical screenshot thumbnails inspected. |
| Not verified | Hosted database, real identity, provider delivery, native Android build/device behavior, full-resolution pixel comparisons, deployed operation. |

The initial socket-test attempt hit sandbox listen restrictions. The permitted rerun passed. That restriction was environmental, not a repository defect.

## Structure

- `apps/mobile`: all eight screens in one unguarded route tree; currently also contains the prospective web views.
- `apps/api`: Fastify routes, domain modules, in-memory/Postgres adapters, migration and retention scripts.
- `packages/shared`: wire types, HTTP client and mock client. Runtime validation is not yet a reliable shared contract.
- `docs`: useful intent, but several plans/checkpoints contradict current code or each other.

## Release-blocking findings

| Finding | Evidence and consequence | Recovery |
|---|---|---|
| Identity is spoofable | [auth.ts:24](/home/marnin/Work/TPOM/STAT/apps/api/src/identity/auth.ts:24) trusts caller-supplied user/role/agency headers. WebSockets trust matching query parameters. No release-safe authentication. | R2: server-verified sessions, membership and resource authorization. |
| SOS ownership/discovery broken | Anonymous creation returns 201, subsequent read returns 401. An agency dispatcher cannot discover the default unassigned SOS. An unrelated authenticated citizen can read an unassigned incident. [app.ts:116](/home/marnin/Work/TPOM/STAT/apps/api/src/app.ts:116), [auth.ts:44](/home/marnin/Work/TPOM/STAT/apps/api/src/identity/auth.ts:44). | R2/R3: owner-scoped anonymous receipt/session; explicit intake routing and claim rules. |
| Dispatch authorization/lifecycle broken | Probe: another agency's responder accepted a dispatch with 200. Resolving an incident left its unit assigned. Accept/reject checks role, not assignment ownership. [app.ts:318](/home/marnin/Work/TPOM/STAT/apps/api/src/app.ts:318), [service.ts:30](/home/marnin/Work/TPOM/STAT/apps/api/src/dispatch/service.ts:30). | R2: assignment membership, atomic commands, terminal cleanup and failure-path tests. |
| Mutation retries unsafe | Probe: identical note requests with the same idempotency key saved two notes. SOS/replay use separate lookup, side effect and key storage; other mutation routes lack equivalent protection. | R2: atomic command deduplication, request fingerprints and stable retry keys. |
| Core controls absent | Dispatch is a map, not an approval/assignment workflow. Responder cannot accept/reject or progress status/select hospital. Hospital has no real case queue or readiness/handoff action. | R1 defines approved states; R3 wires all controls to real records. |
| Patient information is fabricated | Medical/tracking vitals, diagnoses and ETAs are fixed examples. Hospital “Live Telemetry” and chat are local fixtures; Confirm Ready has no handler. Medical analysis submits empty answers, which can display a Stable score. [MedicalIncident.tsx:37](/home/marnin/Work/TPOM/STAT/apps/mobile/src/pages/MedicalIncident.tsx:37), [HospitalPreArrival.tsx:28](/home/marnin/Work/TPOM/STAT/apps/mobile/src/pages/HospitalPreArrival.tsx:28). | R3: actual manual observations, explicit unknown/unavailable states and approved clinical protocol. |
| SOS failure behavior unsafe | Haptic failure occurs outside the submission catch; submission failure is swallowed; newly created incidents highlight Dispatched. [Dashboard.tsx:25](/home/marnin/Work/TPOM/STAT/apps/mobile/src/pages/Dashboard.tsx:25), [TriageTracking.tsx:12](/home/marnin/Work/TPOM/STAT/apps/mobile/src/pages/TriageTracking.tsx:12). | R3: haptics cannot block reporting; pending/error/uncertain delivery states and resumable receipt. |

These probes used synthetic in-memory fixtures, not a hosted database or real patient data. Other risks below are source findings, not claims that every race was reproduced.

## Reliability gaps

- **Offline is partial infrastructure.** No screen enqueues a mutation. Each hook instance owns separate state over one storage key. Missing replay acknowledgements count as success; a drain can overwrite newly queued work; all API errors discard commands, including transient failures. Queue storage is not account-scoped. [useOfflineQueue.ts:69](/home/marnin/Work/TPOM/STAT/apps/mobile/src/hooks/useOfflineQueue.ts:69).
- **Realtime is partial.** EventSource cannot supply the development auth headers required by the server. Dispatch, responder and hospital views lack live consumers. Event bus and notifier remain in-memory even with Postgres. Reconnect needs authorization-aware catch-up, bounded buffering and hospital-specific scoping.
- **Separate web/API origins are unconfigured.** An OPTIONS probe returned 404 with no allow-origin header. Supply explicit CORS or a same-origin proxy; do not infer a working browser transport from API injection tests.
- **Persistence is not proven.** Postgres tests skip; their setup truncates tables without an enforced disposable-database identity. Do not point them at the supplied development project.
- **Persistence correctness needs repair.** Dispatch reservation, events, status and dispatch record are separate writes. Event append uniqueness does not verify the current head or prevent version gaps. Rate-limit counts never expire. Migration scripts replay every file without a ledger; seed identifiers permit duplicate seeded entities.
- **Hosted security needs inspection.** TLS certificate verification is disabled. API RBAC alone is insufficient unless hosted table exposure, grants and DB roles are deliberately constrained. Actual public exposure has not been verified.
- **Configuration is incomplete.** API startup/scripts read process environment but do not load the promised app .env automatically. Missing API URL selects mock UI; missing database configuration starts an in-memory backend. Release configuration must fail closed instead.
- **Data lifecycle needs end-to-end tests.** Offline capture time versus replay time, out-of-order vitals, rejected-command recovery, redacted telemetry reads and access logging across snapshots/streams remain unresolved.
- **Notifications need implementation, not just keys.** Native registration hook is unused; production notifier/device registry/delivery handling are absent.

## Stitch fidelity

The retrieved project has eight MOBILE screen records and one zero-size DESKTOP record titled “Pulse App PRD.” The PRD is not a desktop mockup.

| Stitch screen | Existing implementation | Gap |
|---|---|---|
| SOS Dashboard (Citizen) | Dashboard | Large direct Medical Emergency action replaced by selectors + circular SOS. Location card and secondary contact/profile affordances omitted. |
| Active Emergencies Triage | TriageList | Simplified case presentation; filters/actions do not consistently meet touch rules. Role/intake behavior missing. |
| AI Triage & Tracking | TriageTracking | Different hierarchy/question flow; synthetic vitals/ETA; no real cancel/call-responder flow. Pending-dispatch state missing from both implementation and reference. |
| Medical Responder Active Incident | MedicalIncident | Reference navigation, history and hospital-link controls replaced/omitted; static cardiac-arrest content and six fixture vitals. |
| Responder Dispatch Map | DispatchMap | Synthetic central incident marker; no real intake/case selection/assignment panel. Retrieved HTML export has no visible body content; use screenshot plus approved workflow supplement. |
| Hospital Pre-Arrival | HospitalPreArrival | Patient header/countdown/bed action differ; live data, selection and preparation state not persisted. Desktop adaptation absent. |
| Security Responder Tactical View | SecurityTactical | Preserve reference; outside first medical release acceptance. |
| Fire & Hazard Incident View | FireHazard | Preserve reference; outside first medical release acceptance. |

Most named palette values and Inter were copied correctly. Fidelity failures concern composition, hierarchy, states and controls—not merely colors. Examples: 36px vitals rather than 48px emergency display; 8–12px interactive spacing instead of 16px; secondary hover label contrast about 3.06:1 instead of 4.5:1. Repeated vital/alert flashing also conflicts with Stitch's restriction to new-incident alerts.

The references still say PULSE and include fictional US locations and clinical examples. Preserve the already documented STAT rebrand, but do not turn reference placeholders into real data. `Call Dispatch` currently uses `tel:911`; the pilot dispatch number must be confirmed rather than guessed.

This is structural/source comparison, not an eight-screen pixel-diff certification. Freeze full-resolution references and review allowed deviations before visual acceptance.

## Why existing checks missed this

Unit/module tests exercise useful behavior but do not prove the multi-role UI journey. Contract test helpers cast decoded JSON to a generic type, and tests are excluded from the TypeScript production check: the documented “route drift is a compile error” guarantee is overstated. CI can report the Postgres job successful after skipping it. No browser journey or visual regression gate was found.

## What can start / what is needed

- **Now:** freeze design references, approve missing states, restore UI composition, add meaningful failing regressions, repair test/configuration safety using synthetic data.
- **Before R2 live validation:** hosted development and strictly isolated disposable test connections, auth configuration, provisioned role/agency/hospital fixtures. Never paste secrets into chat.
- **Before clinical acceptance:** protocol and qualified reviewer; incomplete answers must not manufacture reassurance.
- **Before pilot:** operational agency/hospital contacts, verified dispatch number, hosting/push/signing access and privacy/security sign-off.

Implementation order and acceptance gates: [recovery master plan](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-master.md).
