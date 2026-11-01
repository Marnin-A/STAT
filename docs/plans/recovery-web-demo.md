# STAT — mobile-first web demo recovery

Date: 2026-10-28. Status: both decision rounds confirmed; generate/review visual drafts next. No application implementation in this update.

This amendment supersedes Android-first delivery, strict restoration of the old Stitch look, and unconfirmed scope questions in the 2026-10-02 plans. Keep their technical safeguards. Approved design direction: [Calm Response](../design/calm-web/DESIGN.md). Confirmed decisions: [log](../decisions.md).

## Confirmed scope

- Calmer redesign; core actions direct, secondary features progressively disclosed.
- Desktop adaptations and missing states may be proposed, then reviewed.
- Notes first; incident chat later.
- Anonymous SOS allowed; receive-first, deduplicate and flag/review fraud policy approved. Verification optional after intake; no sentiment-only rejection.
- Medical profiles and emergency/family contacts included; sign-in for saving/sync, explicit incident-scoped sharing with assigned care staff.
- Separate disposable hosted Supabase project agreed; not yet supplied/verified.
- Closed synthetic-data web testing first, including citizen/responder mobile-browser views. Android later.
- Review order A → C → B. Intake automation and labelled AI assistance approved in principle; human dispatch approval retained. Actual AI integration and autonomous clinical/dispatch decisions are not approved by this scope.

## Milestones and separate phase plans

| Milestone | Phase plan | Acceptance |
|---|---|---|
| A: approve the new appearance and navigation | R0 + R1 | Actual new screen/state set reviewed; critical actions discoverable; design tokens/contrast/geometry and deviations agreed. |
| C: connected SOS → dispatcher demo | Narrow R2 prerequisites + R3 intake slice | Separate citizen/dispatcher sessions use the real HTTP client/API and isolated persistent records; refresh/retry does not lose or duplicate the SOS; anonymous owner cannot access others; no hidden mocks. |
| B: comprehensive backend hardening | Remaining R2 | Real auth, stored role/membership checks, atomic commands, idempotency, TLS and verified disposable database tests; negative/concurrency/fault/restart evidence recorded. |
| Complete the medical demo | Remaining R3 | Responder, hospital, notes, profile/contact controls and acknowledged handoff work on the same record across role sessions. |
| Reliable closed web test | Web-relevant R4 + R5 | Network/reload/session/error/access checks pass; synthetic-only restricted staging; known limitations visible. |
| Native/pilot follow-up | Native R4 + R5 addendum | Android permissions, storage, delivery, signing and physical-device evidence; clinical/privacy/operational approvals before real emergencies. |

C cannot be called integrated if it only exchanges fixtures. Any earlier click-through is clearly a prototype. C's minimum security and persistence work cannot be postponed merely to satisfy the review order. Full R3 integration depends on R2 acceptance.

For each implementation phase: start with meaningful failing tests, implement, refactor, record actual evidence, write a phase summary and replace checkpoint active work. No phase is complete because this document exists.

## Approved anti-abuse policy — thresholds and implementation still to verify

1. Accept the first SOS without an account or forced OTP; store a scoped tracking receipt and explicit delivery state.
2. Deduplicate retries of the same request. Flag potentially related reports; never silently merge distinct people at one location.
3. Use bounded device/network/request-pattern signals for review and infrastructure abuse controls. A shared IP, new device, missing GPS or missing callback alone is not proof of fraud.
4. Offer a verified callback/contact after intake; OTP proves control of a number, not that the emergency is genuine. An unreachable user must not automatically lose the report.
5. Separate suspected-abuse flags from clinical priority. Staff see reasons, can override, and leave an audit trail. Escalation must retain a visible owner/queue.
6. Isolate obvious automated floods without blanket-blocking legitimate shared-network users. Exact thresholds, recovery paths and evaluation fixtures need tests before release.

No real agency is contacted from a synthetic demo. Label demo mode and disabled real-world escalation clearly.

## Approved initial automation boundary — integration/evaluation still outstanding

Automate intake bookkeeping, acknowledgements, permitted notifications and routing suggestions. AI may propose summaries, extract reported facts and flag review needs; retain original reports, distinguish inferred text and expose failures. Sentiment is optional context, never a truth detector, clinical severity score or sole reason to reject/downgrade an SOS.

Preserve deterministic, clinically reviewed rules for medical priority. The user approved retaining human dispatch approval for the initial demo; autonomous dispatch remains separate future evaluated scope. No real dispatch, diagnosis or suppression is authorized by this plan.

AI failure, timeout, low confidence, missing answers or unsupported language must not block intake or disappear from the review queue. Define who receives escalation and what happens when no reviewer acknowledges it. Clinical/privacy/operations reviewer availability remains unanswered.

Rationale: WHO identifies inaccurate/biased health AI output and automation bias, and calls for stakeholder involvement and well-defined evaluated tasks. This informs the proposed safeguards; it does not clinically validate STAT. [WHO guidance summary](https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models).

## Current design-review gate

All five second-round proposals accepted. New screen drafts and state coverage remain subject to visual review. See [draft outcome contract](../verification/features/calm-web-design-drafts.md).

No further backend/clinical-provider choice is required to create these synthetic visual drafts.

## Later gates

- Clinical/operations/privacy reviewers and the triage/handoff protocol.
- Profile fields, dependent/third-party consent, contact notification channels.
- Staff login/provisioning, hospital/agency memberships and demo actors.
- Real AI integration versus labelled simulation; provider, supported languages, evaluation and data handling.
- Anonymous receipt recovery/lifetime; offline/session policy.
- Restricted web staging host/access; real escalation contacts and pilot ownership.
- Android/push/signing inputs only when native work starts.

## Next steps

1. Record approved answers; complete the proposed screen/state inventory.
2. Create draft screens in the separate Calm Response Stitch project; preserve the old project.
3. Inspect the generated appearance/copy and record draft review evidence; keep runtime claims unverified.
4. Review actual citizen/active/profile screens and dispatcher/hospital adaptations.
5. Implement A using TDD and approved baselines; then C with minimum backend safeguards; then finish B.
6. Request private hosted/auth configuration only when the connected slice or database validation needs it.
