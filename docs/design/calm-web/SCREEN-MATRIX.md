# STAT Calm Response — screen/state matrix

Date: 2026-10-28. Status: proposed screen coverage, actual visuals awaiting approval. Direction and the five policy choices are approved. No workflow below is implemented by this artifact.

| Actor / state | Draft | Next permitted intent | Missing evidence |
|---|---|---|---|
| Anonymous citizen, idle | 01 Home | Submit SOS without mandatory account/GPS/OTP | Sending, repeat-tap and permission behavior |
| Citizen, server receipt / review pending | 02 Request received | Add optional contact/location; state-aware owner cancellation | Copy cleanup, real receipt/ownership, cancel confirmation |
| Citizen, receipt uncertain | 03 Delivery not confirmed | Check existing receipt then retry same logical request | Actual idempotent recovery/offline states |
| Citizen, request list | 04 Activity | Open own active incident | Ownership/recovery, empty/error states |
| Citizen, signed out | 05 Profile | Sign in to save profile/contact information; anonymous SOS remains accessible | Chosen login flow, errors/cancel/recovery |
| Citizen, signed in | 06 Medical ID/contacts | Edit own self-reported information; explicitly share for one incident | Field rules, dependent consent, real auth/save/sharing tests |
| Assigned responder, accepted | 07 Current task | Start response; advance only after authorized acknowledgement | True mobile render; en-route/on-scene/transport/handoff states |
| Dispatcher, unassigned intake | 08 Intake | Review flag and proposed unit; approve dispatch | Real staff membership, concurrency, empty/error/revoked states |
| Receiving hospital, transporting scenario | 09 Hospital fallback | Prepare; mark ready; acknowledge only after arrival | Render check, actual checklist/readiness/arrival/handoff contracts |

## Invariants

- Request received is not Dispatched; uncertain receipt is not success.
- An unverified callback or sentiment is not a fraud/clinical verdict.
- Stored-profile sign-in must not gate SOS.
- Saved medical data is self-reported and not automatically shared with all staff.
- Proposed unit is not an assigned unit until human dispatch approval succeeds.
- Responder accepted is not En route before the Start response command succeeds.
- Missing observations remain unknown; notes are not real-time chat.
- Separate screen studies show different hypothetical stages of DEMO-1042, not a running synchronized case.

## Unresolved questions

- Actual screen approval; active-request copy and hospital render.
- Later: clinical protocol/reviewers; detailed consent and transitions; memberships/auth; delivery/offline policy.

## Next steps

Review and close visual gaps; freeze accepted references; implement and test real state transitions.
