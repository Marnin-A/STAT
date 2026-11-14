# STAT — Quiet Confidence visual refresh

## Outcome / scope

Replace the rejected red-led review with a distinctive, quiet mobile-first visual study. Sources: user request to remove red primary action, supplied health-app inspiration, agreed anonymous SOS and Home/Activity/Profile navigation. This is a cosmetic reference, not application implementation. No API, authentication, clinical, notification, storage or dispatch changes.

Public review seam: rendered `drafts/review.html` and linked standalone screens. Cosmetic verification: before/after visual inspection, rendered contrast/geometry and actual link/disclosure use where browser access permits. No new simulated submission state machine; no product tests claimed.

| ID | Expected observable result | Evidence needed |
|---|---|---|
| Q1 | Plum/ivory/lilac family, no red primary action, more deliberate typography and action composition | Before/after render; actual colors |
| Q2 | One clear help action on Home; no login/location gate; quieter Medical ID and three labelled navigation items | Render / links |
| Q3 | Home, received, uncertain, Activity and Profile share tokens; explicit synthetic preview; no request is sent | Inspect copy / network-capable source |
| Q4 | Profile secondary tools use native disclosure; critical state not hidden; receipt does not claim dispatch | Render / disclosure |
| Q5 | Responsive 360/390/412/768/1440 and landscape; 200% text; no clipping; 48px targets; keyboard focus; reduced motion | Real browser geometry / interaction |
| Q6 | Essential text ≥7:1, normal text ≥4.5:1; colors not sole state cue; SVG icons / zero external dependencies | Pair calculations / source / render |
| Q7 | Old gallery and original Stitch resources preserved; application unchanged | File/diff inspection |

## Initial evidence — RED

Existing saved Home PNG inspected before changes: red rectangular `Request medical help`, cool grey canvas, repeated nested white cards. Does not meet Q1. Current gallery contains the same rejected image. Existing guide explicitly requires red SOS, contradicting latest user request. No accepted screenshot baseline will be silently updated.

## Final evidence

Source checks: all local links/assets exist across six new HTML files; no scripts/forms/external dependencies. Nine actual CSS-token contrast pairs meet explicit thresholds (action 13.57:1; supporting text 5.80:1). Q3/Q6/Q7 pass at source/file scope. Q1/Q2/Q4/Q5 remain UNVERIFIED: browser navigation/log checks timed out; no final render, geometry, keyboard or zoom evidence. Exact visual approval is the user's decision.

See [run details](../../design/calm-web/REVIEW.md). No app/backend tests/build/CI or release proof claimed. No accepted screenshot baseline updated.
