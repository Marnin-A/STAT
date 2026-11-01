# STAT recovery master plan

Updated: 2026-10-28. Status: both user decision rounds recorded; visual drafts await review. Application implementation not started.

The [web demo amendment](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-web-demo.md) governs delivery order and changed scope. Preserve the technical safeguards below; older Android-first and strict visual-restoration assumptions no longer govern the first demo.

## Outcome

First delivery: a mobile-focused web application for closed synthetic-data testing, including citizen/responder browser views and desktop dispatcher/hospital adaptations. Eventual Android citizen/responder app remains in scope, after the web demo. The full medical journey remains SOS through dispatch, responder care/transport and acknowledged hospital handoff; human dispatch approval remains required for the initial demo; unattended dispatch is future scope.

Authority order: latest confirmed user decisions and the new screen approvals take precedence over historical visuals. [Stitch](https://stitch.withgoogle.com/projects/15243493749593154645), [assessment](/home/marnin/Work/TPOM/STAT/docs/project-assessment.md), [historical design capture](/home/marnin/Work/TPOM/STAT/docs/design/DESIGN.md), [proposed calm design](/home/marnin/Work/TPOM/STAT/docs/design/calm-web/DESIGN.md), and confirmed entries in [decisions](/home/marnin/Work/TPOM/STAT/docs/decisions.md). This plan supersedes older completion claims and time estimates; historical plans remain preserved.

## Milestones

| Phase | Deliverable | Exit proof |
|---|---|---|
| [R0 — agree baseline](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r0-baseline.md) | Frozen new screen/state matrix and revised web-demo scope | User approves references, deviations and missing workflow states. |
| [R1 — redesign](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r1-design.md) | Approved calm role layouts and reusable controls | Phone/web visual review, real geometry/contrast checks and interaction tests pass. |
| [R2 — trusted backend](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r2-foundation.md) | Auth, ownership, transactions, safe hosted persistence | Spoofing/cross-role/concurrent retry/fault tests fail before fixes and pass after; isolated DB persistence verified. |
| [R3 — medical journey](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r3-medical.md) | Every required control operates on real incident data | Multi-user responsive-web journey completes through handoff and unit release; no hidden mock data. |
| [R4 — weak-network reliability](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r4-reliability.md) | Durable offline work, authorized live updates and delivery | Browser reload/network/concurrency/reconnect checks show no lost or duplicated commands; native/push evidence remains a later gate. |
| [R5 — controlled release](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-r5-release.md) | Restricted web staging first; Android packaging and supervised pilot later | Closed synthetic web acceptance recorded; native/clinical/operational gates retained before Android/pilot. |

Review order: A (R1 appearance) → C (narrow SOS/intake slice with its R2 safeguards) → B (remaining R2 hardening). Full R3 still depends on R1/R2 acceptance. Then web R4/R5; native delivery and real pilot follow separately. A connected demo cannot defer its minimum authentication, authorization, persistence or test-target protections.

## Delivery rules

- One isolated `feature/*` worktree per implementation session; preserve unrelated changes.
- Functional changes use Red–Green–Refactor. Tests exercise public module interfaces and real user behavior, not fabricated green assertions.
- Add regressions for known failures before repairs. Report existing failures/warnings; do not silently skip them.
- Separate demo/test fixtures from release operation. Missing configuration must not silently select mocks or in-memory persistence.
- Keep domain behavior that works. Deepen modules at the authorization, incident-command, persistence and offline-sync seams; do not add pass-through layers or microservices.
- Each phase closes only on its acceptance evidence. Write `recovery-rN-summary.md`; update/clear active work in [checkpoint](/home/marnin/Work/TPOM/STAT/docs/plans/recovery-checkpoint.md). Failed/skipped checks stay visible.
- Plans are currently ignored by Git. Explicitly retain/track approved planning artifacts during R0; saving a local file is not publication.
- Use synthetic data until release safeguards and clinical/security approvals are in place.

## Scope guard

Preserve references for security/fire, but exclude those operational workflows from the first medical release. iOS, body-camera streaming, hazard feeds, sensor ECG/MQTT, volunteer marketplace, external EMR integration are later scope. Intake automation and AI assistance are approved in principle with human dispatch approval retained; actual model integration, evaluation and clinical governance remain unresolved and must not be assumed to be implemented.

Persisted incident notes and handoff acknowledgement are first-release scope; two-way chat is future work. Medical profiles and family/emergency contacts are included, with sign-in for saving/sync and explicit incident-scoped sharing approved. Minimum fields, dependent/third-party consent and notification channels still need agreement. Anonymous first SOS and receive-first flag/review fraud controls are approved. Unimplemented affordances must be clearly unavailable or removed from demo navigation with approval.

After the medical pilot: create separate security/police and fire/hazard plans using the preserved Stitch references. Each must define its own authority, data sources, responder actions and multi-agency acceptance journey. This recovery plan establishes the first release; it does not claim the broader STAT product is finished at R5.

## Inputs by gate

| When | Required input |
|---|---|
| R0/R1 | Review actual calm screen drafts/states and necessary copy changes; direction, navigation and desktop adaptation approach agreed. |
| R2 live checks | Hosted dev connection(s); strictly disposable hosted test target; auth secret/origins and staffing/membership fixture model. Supply privately, not in chat. |
| R3 clinical acceptance | Approved triage protocol, qualified reviewer, pilot dispatch number and minimum handoff fields. |
| R4 delivery | Web delivery/reconnect requirements first; native FCM/device inputs later. SMS only if explicitly retained. |
| R5 web / later pilot | Restricted synthetic web staging host/access first. Signing/Play, pilot partners and clinical/operations/privacy owners required at native/operational gates. |

No local Supabase installation required. First fix environment loading, test-target safety and migration handling; do not run the existing truncating suite against the development project.

## Unresolved questions

Actual screen review and supplementary state coverage. Later: clinical/operations reviewer availability, detailed profile/contact consent, staff membership/auth, private test target, provider integration and staging access. The five second-round policy proposals are now approved.

## Next steps

1. Generate and inspect separate new draft screens using the approved calm brief.
2. Obtain visual feedback; complete R0 screen/state mapping.
3. Deliver A → C → B with per-phase evidence and minimum C safeguards.
4. Request private hosted/auth configuration when C/R2 reaches real integration; no secrets in chat.
