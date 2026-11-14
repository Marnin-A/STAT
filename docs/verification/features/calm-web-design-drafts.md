# STAT calm web design drafts — outcome contract

Date: 2026-10-28. Baseline: c56a9e7. Scope: visual Stitch drafts only, not application implementation.
User approved Q1–Q5: calm teal style, Home/Activity/Profile, receive-first abuse review, sign-in for saved profiles and incident-scoped sharing, AI assistance with human dispatch approval.

## Actors and outcome

Citizen: request medical help without login; see honest status; find optional medical ID/contacts.
Responder: find the assigned case and next action. Dispatcher: review intake and approve a proposed assignment. Hospital: see incoming case and prepare/acknowledge handoff.
Deliverable: separate new Stitch draft project, screen/state inventory and a human-readable review record. Preserve the historical project/screens. Synthetic data only, no real agencies contacted.

## Acceptance criteria

| ID | Trigger / review subject | Expected result | Basis / proof |
|---|---|---|---|
| V1 | Open Home draft | One dominant labelled SOS action; no login/GPS/OTP prerequisite; no competing dashboard or decorative map | Approved Q1/Q3; screenshot and exported structure |
| V2 | Inspect citizen navigation | Labelled Home, Activity, Profile; active incident visible; Medical ID/contacts easy to find | Approved Q2; screenshots |
| V3 | Inspect active and uncertain-delivery drafts | Awaiting approval distinct from dispatched; uncertain delivery never claims success/failure; safe retry intent explicit | Existing delivery rules; screenshots/copy |
| V4 | Inspect profile drafts | Sign-in required for saved/synced medical data; self-reported data and scoped sharing shown in signed-in view | Approved Q4; screenshots/copy |
| V5 | Inspect dispatcher draft | Approval action and review flags; AI suggestions labelled illustrative; sentiment never a fraud/clinical verdict | Approved Q3/Q5; screenshot/copy |
| V6 | Inspect responder/hospital drafts | Assigned/incoming case, notes instead of chat, missing vitals explicit, next required action prominent | Confirmed medical scope; screenshots |
| V7 | Inspect visual family | Soft zinc/white surfaces, muted teal, restrained red, Geist, labelled controls, no decorative motion/marketing clutter | Approved design brief; screenshots/source tokens |
| V8 | Inspect artifact provenance | Draft/synthetic status clear; original project/screens unchanged; screen IDs and generation outcomes recorded | Preservation requirement; project inventories |
| V9 | Inspect new screens | No obvious clipped/overlapping text or required action; full render review per screen | Visual artifact acceptance; screenshots |

## Verification boundary

Stitch screenshots/HTML establish draft appearance only. Browser-width/reflow, focus/keyboard, touch geometry, runtime contrast, real auth, persistence, SOS delivery, AI/provider integration and Android behavior remain UNVERIFIED until implemented and exercised. No fake unit tests for a design-only artifact. App regressions/builds are not rerun because product code is unchanged. Exact screen approval remains the user's decision.

## Next steps

Generate and inspect drafts; correct material visual/copy failures; record evidence per criterion and request visual feedback. Implementation follows approved screens with mandatory meaningful TDD.

## Run result — 2026-10-28

See [draft review](../../design/calm-web/REVIEW.md). Eight Stitch images/HTML exports plus one manual hospital fallback preserved. V1–V5 and V8 pass only static inspection; V7 fails active-request copy fidelity; V6/V9 remain unverified where the hospital/browser proof is missing. Overall: partially verified draft pack, not a completed product feature or approved baseline.
