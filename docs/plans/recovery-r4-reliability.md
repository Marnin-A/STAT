# R4 — offline, realtime and notifications

2026-10-28 amendment: [mobile-first web demo](./recovery-web-demo.md) supersedes older delivery/scope assumptions below. Calmer redesign; notes first/chat later; profiles/contacts included; anonymous SOS approved with fraud policy unresolved; desktop adaptations approved in principle. Review A → guarded C → B. Do not treat the historical Stitch appearance, Android-first acceptance or old scope questions below as current decisions.

Status: proposed. Dependencies: R2 + R3.

## Red–Green–Refactor steps

1. Add failing tests for missing replay acknowledgements, enqueue-during-drain, parallel drain, storage corruption, app restart, expired auth, account switch and transient API errors.
2. Replace per-hook queue ownership with one sync module/provider at a real persistence seam. Persist an account-scoped journal/cache with schema version, startup readiness, stable command keys and original capture times.
3. Wire actual screen mutations into the queue. Show pending/acknowledged/rejected states; retain new enqueues during drain. Only explicit acknowledgement removes a command; uncertain/missing responses remain pending.
4. Separate terminal business rejection, session refresh required and transient failure. Store rejected commands durably with resolution/escalation UI. Do not report every error as “rejected by dispatch.”
5. Define replay conflict/assignment/session-grace rules. Preserve occurred/captured time versus server record time; order observations correctly and prevent late offline samples replacing newer readings.
6. Authenticate incident, dispatcher and hospital feeds without caller-controlled roles or long-lived credentials in query strings. Add catch-up/cursor or race-safe snapshot/stream resync, bounded buffers, heartbeat and revocation handling.
7. Wire all medical surfaces to authorized updates. Reconnect refreshes case queues as well as detail; clear stale subscriptions on case/account changes.
8. Publish only after command commit via the outbox. Single-node operation is acceptable for a controlled release; verify cross-node fanout before enabling multiple API instances.
9. Implement device registration, token updates/removal, provider notifier, delivery retries/expiry and permission-denial fallback. No patient data in push payloads. SMS/voice/OTP only if first-release scope requires them.
10. Add access-audit coverage and retention read-path tests: snapshots, clinical data, hospital views and authorized stream delivery. Redacted telemetry must not return malformed empty observations.
11. Run Android airplane-mode/restart/reconnect scenarios, network interruption after commit, concurrent mutations and actual push delivery on test devices.

## Exit evidence

- Offline clinical/status/notes work survives restart; reconnect produces no loss or duplicate effect.
- Account changes do not expose or replay another account's data.
- Conflicts/rejections remain visible and recoverable.
- Distinct devices receive authorized updates; stale/disconnected state is honest.
- Real provider delivery demonstrated. Supplying provider keys alone does not close the phase.

## Unresolved questions

- Approved offline active-incident session/grace policy?
- Later native gate: test devices and FCM configuration?
- Optional contact verification/notification channels included in the web demo?

## Next steps

Write R4 summary; update checkpoint; proceed to R5 controlled release.
