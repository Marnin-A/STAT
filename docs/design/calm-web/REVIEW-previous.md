# STAT Calm Response — draft review

Date: 2026-10-28. Verdict: draft pack delivered, partially verified. **Not an approved implementation baseline or a working emergency service.** No application code changed.

Open [the gallery](drafts/review.html), or use the saved images below. The gallery uses images rather than remote preview scripts for the eight Stitch exports; hospital is offline-capable HTML. See [source manifest](manifest.json), [screen/state matrix](SCREEN-MATRIX.md), [approved guide](DESIGN.md) and [provider notes](stitch-notes.md).

## Draft inventory

| # | Screen | Local artifact | Origin |
|---|---|---|---|
| 01 | Home | [Image](drafts/01-home-refined.png) · [HTML](drafts/01-home-refined.html) | Stitch export |
| 02 | Request received | [Image](drafts/02-active-awaiting-dispatch.png) · [HTML](drafts/02-active-awaiting-dispatch.html) | Stitch export |
| 03 | Delivery not confirmed | [Image](drafts/03-delivery-uncertain.png) · [HTML](drafts/03-delivery-uncertain.html) | Stitch export |
| 04 | Activity | [Image](drafts/04-activity.png) · [HTML](drafts/04-activity.html) | Stitch export |
| 05 | Profile · signed out | [Image](drafts/05-profile-signed-out.png) · [HTML](drafts/05-profile-signed-out.html) | Stitch export |
| 06 | Medical ID & contacts | [Image](drafts/06-medical-id-contacts.png) · [HTML](drafts/06-medical-id-contacts.html) | Stitch export |
| 07 | Responder task | [Image](drafts/07-responder-task.png) · [HTML](drafts/07-responder-task.html) | Stitch export |
| 08 | Dispatcher intake | [Image](drafts/08-dispatcher-intake.png) · [HTML](drafts/08-dispatcher-intake.html) | Stitch export |
| 09 | Hospital preparation | [HTML](drafts/09-hospital-preparation.html) | Hand-authored fallback; render unverified |

All cases are synthetic. Buttons in exported HTML are visual studies, not connected workflows. The original Stitch project was not modified. New resource project: `4730804965782160371`; its canvas/list API returned DESIGN.md only despite generated screen resources being retrievable. Do not promise that every draft is visible on that canvas; the local exports are the review package.

## Evidence against the outcome contract

| Criterion | Status | Evidence / boundary |
|---|---|---|
| V1 — anonymous Home | PASS | Home image shows one red medical-help CTA, no-account helper, optional location and a quieter Medical ID shortcut. |
| V2 — navigation | PASS | Citizen images show labelled Home/Activity/Profile; Activity links the active request; role-specific responder navigation is separate. Static appearance only. |
| V3 — delivery honesty | PASS | Received/awaiting-review image says no responder assigned; uncertain-delivery image explicitly says receipt is unconfirmed and not to assume help is coming. No phone fallback remains in the corrected uncertain-delivery export. |
| V4 — profile privacy | PASS | Signed-out image asks for sign-in to save; Medical ID shows self-reported/unknown fields and sharing OFF for one incident/assigned care team. No runtime enforcement is claimed. |
| V5 — dispatcher boundary | PASS | Dispatcher image has explicit approval, non-guilt callback flag, collapsed illustrative/not-connected AI and no fake ETA/vitals. |
| V6 — responder/hospital | UNVERIFIED | Original responder image has accepted/not-yet-en-route and Start response, no false observations. Hospital HTML exists but its render could not be checked. |
| V7 — quiet coherent family | FAIL | Most corrected images use calm sans-serif/teal styling. Active-request draft still contains unnecessary server/queue prose and an unsupported future telemetry label; its simplification request failed. Do not approve that copy as a baseline. |
| V8 — provenance | PASS | Eight retrievable Stitch resources and one explicitly manual fallback; exact local file hashes and image sizes recorded in manifest. Only the new project received mutations. Canvas visibility is an explicit limitation. |
| V9 — final render coverage | UNVERIFIED | Eight saved Stitch renders inspected, including corrected font/phone/copy issues. Browser automation repeatedly timed out, so live reflow, clipping at all widths and hospital render remain unchecked. |

The PASS entries above apply to the saved visual artifacts only. Auth, ownership, saving, notifications, AI/provider calls, delivery/retry durability, real dispatch and native behavior remain unimplemented/unverified by this task.

## Corrections and limitations

- Home location helper was clipped; a refined layout wraps it and separates Share location.
- Generator added unverified emergency numbers and an invented voice fallback. Removed by corrective edit; no real number selected.
- Generator added offline encryption and automatic contact-notification promises. Removed; these are not implemented capabilities.
- Profile loaded `Geist` but configured `Geist Sans` without fallback, causing serif rendering. Corrected the family name and fallbacks; final screenshot is sans-serif. Exact type/spacing still need screen approval.
- A narrower responder refinement highlighted En route while also saying not yet en route. Rejected it; retained the original state-consistent resource. That retained image has a wide capture; gallery displays the central layout at readable scale, not proof of mobile reflow.
- Dispatcher refinement removes policy/developer prose, unapproved hold action and fake sync/telemetry promises; AI is collapsed and labelled illustrative.
- Hospital generation and active-request simplification returned transport errors. Failed requests were not blindly repeated. Hospital is a separate hand-authored fallback; active-request copy still needs correction.
- Browser checks failed with navigation/focus-control timeouts. No responsive, keyboard, measured runtime contrast, target geometry or interaction pass is claimed.
- No product tests/builds rerun: product code unchanged. Reference HTML is not application implementation. All 18 gallery assets exist and have recorded SHA-256 hashes; document checks are separate from product tests.

## Review request

Review the overall calm direction and Home/Activity/Profile/Medical ID/dispatcher composition. Identify visual changes before implementation. Active-request copy and hospital render must be fixed/checked before accepting a complete baseline. Supplemental workflow states and clinical/operations review remain later explicit gates.

## Next steps

1. User reviews actual drafts; keep scope decisions already approved.
2. Trim active-request copy and complete hospital/mobile render checks when browser/Stitch tooling is healthy.
3. Approve the screen/state baseline; implement A with meaningful failing tests.
4. Continue guarded C → B. Request private configuration only at real integration.
