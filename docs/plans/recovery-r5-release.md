# R5 — closed web testing, then Android/pilot

2026-10-28 amendment: [mobile-first web demo](./recovery-web-demo.md) supersedes older delivery/scope assumptions below. Calmer redesign; notes first/chat later; profiles/contacts included; anonymous SOS approved with fraud policy unresolved; desktop adaptations approved in principle. Review A → guarded C → B. Do not treat the historical Stitch appearance, Android-first acceptance or old scope questions below as current decisions.

Status: proposed. Dependencies: R1–R4 acceptance.

## First gate — closed synthetic web testing

1. Restrict staging to invited testers; use only synthetic patients, contacts and incidents. No real dispatch/SMS/voice or other external effects without separate approval.
2. Verify responsive citizen/responder and desktop dispatch/hospital sessions against the real secured API/database; include reload, uncertain delivery, retries, access denial and reconnect.
3. Clearly label demo data and any simulated AI; record defects and reviewer feedback. No implied emergency-service availability or operational readiness.
4. Record the closed-web acceptance evidence separately. Native/clinical/operational checks below remain mandatory at their later gates, not requirements for a static screen review.

## Later gate — Android and operational pilot

1. Deploy an approved staging configuration: secure transport, real identity/database, separate test data, health/readiness, redacted logs, delivery/replay metrics and alerting.
2. Build/sync/package Android reproducibly. Verify runtime permissions, GPS denial/timeouts, notifications, background/resume behavior, offline persistence, safe areas and keyboard on physical devices. Browser tests do not certify native behavior.
3. Run the four-role journey on staging across actual devices/web sessions. Include network loss, API restart, duplicate submission, revoked session, wrong-role access and provider outage.
4. Review effective table exposure/grants, tenant/assignment/hospital isolation, data at rest/device storage, retention, access audits, backups, restore and rollback. Qualified privacy/security owners approve policy and operational handling.
5. Obtain clinical/operations approval of triage wording, fallback contact, dispatch authority, handoff protocol and staff training.
6. Prepare signing custody, installable build/internal testing distribution and store documentation where required. Agree ownership of credentials and release approval.
7. Establish pilot agency/hospital, on-call owner, monitoring/runbook and fallback procedure. Test with supervised synthetic drills before authorizing real emergency operation.
8. Collect real operational evidence against agreed latency/reliability targets. Do not treat the PRD's unverified population/mortality figures or illustrative metrics as measured product outcomes.
9. Record release evidence, known risks and explicit go/no-go. Retain recovery/rollback capability.

## Exit evidence

- Signed Android build installs and passes the medical journey; web roles use the same trusted backend.
- Required persistence/security/native/provider checks executed, not skipped.
- Clinical, operational and privacy/security approval recorded.
- Controlled pilot authorized with named owners and verified fallback.

## Unresolved questions

- Hosting/domain and signing/distribution access?
- Pilot agency/hospital and operational owner?
- Clinical/privacy/security sign-off owners?

## Next steps

Write R5 summary; update checkpoint; begin supervised pilot only after explicit approval.
