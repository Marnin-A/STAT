# STAT — Quiet Confidence review · study 02

Date: 2026-10-28. **Cosmetic reference delivered; browser verification incomplete. Not an approved application baseline.**

[Open the current gallery](drafts/review.html) · [Open Home directly](drafts/quiet-home.html) · [Design guide](DESIGN.md).

## Changed
- Midnight-plum action, soft lilac, warm ivory; no red primary/SOS button.
- One integrated medical-help tile instead of nested white/red cards.
- Quieter optional location and Medical ID; consistent Home / Activity / Profile capsule.
- Native disclosures for secondary Profile tools. No decorative motion or remote dependencies.
- Five coherent local reference states: Home, received, delivery unconfirmed, Activity, Profile/Medical ID.

These are hand-authored HTML/CSS references, not Stitch exports. Original projects and earlier image/source files remain untouched. Responder/dispatch/hospital remain [previous studies](drafts/previous-gallery.html), not part of this new render family yet.

## Evidence
| Criterion | Status | Bound |
|---|---|---|
| Q1: visual direction | UNVERIFIED | Source replaces red with plum/lilac; before image inspected. Final browser render and subjective approval not obtained. |
| Q2: priority/navigation | UNVERIFIED | Source has one help tile, no auth/GPS prerequisite and three labelled links. Runtime visual hierarchy remains unchecked. |
| Q3: honest reference states | PASS | Five local pages marked disconnected/synthetic. No scripts, forms, storage or external resources in the new review/screens. Help link opens a static example only. |
| Q4: secondary disclosure | UNVERIFIED | Native details/summary in source; no runtime keyboard/disclosure evidence. Receipt explicitly says no responder assigned. |
| Q5: responsive/accessibility | UNVERIFIED | CSS includes narrow/wide breakpoints, ≥48px designed targets, safe-area support, focus styles and reduced motion. Browser automation timed out; no measured geometry/zoom/focus pass. |
| Q6: static colors/assets | PASS (source) | Nine calculated pairs pass their thresholds; action 13.57:1, supporting text 5.80:1. SVG line icons and zero external font/script/image dependencies. Not rendered contrast proof. |
| Q7: preservation/scope | PASS (files) | Previous gallery/guide/review archived; old PNGs/HTML/manifest unchanged. App code and both Stitch projects untouched. |

No product tests, CI, hosted database, auth, API, dispatch, saving, location or native verification claimed. Cosmetic work used the inspected red Home image as the failing reference; source checks do not establish final visual correctness.

## Verification details
Node read the six new HTML files and actual shared CSS. All relative href/src targets exist; rejected script/form/remote-resource content. Calculated linear-sRGB contrast for actual CSS tokens: ink/canvas 13.51; muted/canvas 5.80; on-primary/primary 13.57; lilac/primary 9.44; primary/lilac 9.44; lilac-ink/wash 8.53; sage-ink/sage 8.13; warning/wash 7.93; focus/canvas 5.45. Thresholds: essential ≥7, normal ≥4.5, focus ≥3.

The existing loopback server is healthy outside the shell network sandbox; initial sandbox probe falsely looked unavailable. Browser tab navigation then timed out; its subsequent availability/log check also timed out. No final browser screenshot, clipping, zoom or keyboard result is claimed.

## Run
`python3 -m http.server 4173 --bind 127.0.0.1 --directory /home/marnin/Work/TPOM/STAT/docs/design/calm-web/drafts`

Existing server already serves this directory. Use [current local gallery](http://127.0.0.1:4173/review.html) or open the HTML file directly. Each standalone page works without internet.

## Remaining
Visual feedback → verify actual mobile/desktop render and disclosures → reskin staff views → implement accepted app UI. The user-mandated no-red direction is recorded; exact visual approval is still pending. R0/R1 not complete.

Historical results: [previous review](REVIEW-previous.md), [previous guide](DESIGN-previous.md), [Stitch export manifest](manifest.json). Old V1–V9 evidence applies only to those older artifacts.
