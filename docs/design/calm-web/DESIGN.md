# STAT — Quiet Confidence
Date: 2026-10-28. Visual study 02. **No red primary action is user-directed; exact plum/lilac layout is proposed, not approved.**

## Direction
Warm ivory, midnight plum and soft lilac. Distinctive without neon or emergency-red branding. Typography and a single integrated action surface establish urgency; wording/icon/position carry meaning, not color alone. No pulse, glow, carousel, stock imagery or decorative clinical data.

UI/UX Pro Max informed semantic HTML, contrast, hierarchy, mobile-first sizing, labelled navigation, consistent SVG line icons, restrained motion and progressive disclosure. Its generated healthcare/emergency bundles included irrelevant marketing layouts and unsuitable type/palette suggestions. Those were not applied or persisted. Colors below are a custom proposal, not a claimed matched emergency palette.

## Tokens
Actual source: [quiet-theme.css](drafts/quiet-theme.css).

| Role | Color |
|---|---|
| Canvas | `#F6F3ED` |
| Surface | `#FFFEFA` |
| Ink | `#292438` |
| Supporting text | `#625C6D` |
| Primary / action | `#352842` |
| On primary | `#FFFEFA` |
| Lilac | `#DED1F0` |
| Lilac ink / wash | `#4C3764` / `#EEE7F5` |
| Privacy / secondary sage | `#344A3B` / `#E8EEE5` |
| Warning ink / wash | `#60400f` / `#F5EBD6` |
| Focus | `#74549A` |

No red brand, SOS or primary-action fill. Unconfirmed delivery uses an amber-tinted message, warning icon and explicit copy. A later destructive/error treatment needs separate review; this decision is not permission to suppress critical errors.

Calculated static text contrast: action 13.57:1; lilac on plum 9.44:1; ink on canvas 13.51:1; muted on canvas 5.80:1; warning 7.93:1. No claim of measured runtime contrast.

## Type / geometry
System sans stack: `"Inter", "Segoe UI", Arial, sans-serif`. Inter is optional, not downloaded; no remote fonts/scripts. 40px/1.08 mobile title (36px at narrow widths), 30px action, 20px section, 16px body, 14px supporting, 12px metadata. Essential text never metadata-sized.

24px phone gutters (20px below 375px); 4/8px spacing rhythm. 28px hero and 22px secondary surfaces. Main action is one integrated plum tile, not a white card containing another colored button. Lilac arrow is part of the same link, not another target.

## Composition
- Home: short heading → single medical-help tile → optional location disclosure → quiet Medical ID shortcut.
- Primary navigation: Home / Activity / Profile. Plum navigation capsule, lilac current tab; labels always visible.
- Request: acknowledged sample → awaiting human review → no responder assigned. No invented ETA, telemetry or queue guarantees.
- Delivery uncertainty: separate warning view. Never suggest help has been dispatched.
- Profile: self-reported/unknown fields; sharing OFF; contacts, account/privacy and preferences in native disclosures.
- Activity: visibly synthetic active-case example; no fake historical records.

This round revises five citizen-facing reference states. Responder, dispatcher and hospital studies are archived references, **not newly reskinned or verified**. Apply the accepted tokens to them during the next design pass, not silently to the live application.

## Behavior / limits
[Review](drafts/review.html) is a code-native visual study, not a Stitch export or connected application. Direct Home: [quiet-home.html](drafts/quiet-home.html). Plain local links and native `details`; no JavaScript, forms, storage, location permission, API calls or provider requests. Every screen is marked as disconnected. Opening the help tile only navigates to an explicitly synthetic receipt example.

Anonymous SOS remains the agreed future behavior; real receipt, retry deduplication, account requirements, consent/access control, saving and dispatch remain separate implementation work. Sharing is descriptive only, not enforced by this preview.

Touch/navigation targets are designed at ≥48px. No fixed overlays; navigation stays in document flow. Safe-area bottom inset, native zoom and reduced-motion styles are retained. Browser automation timed out; responsive geometry, actual focus/keyboard, 200% zoom and screen-reader results remain unverified.

## Provenance / next
Previous guide retained as [DESIGN-previous.md](DESIGN-previous.md); previous gallery as [previous-gallery.html](drafts/previous-gallery.html). Old image/source files and both Stitch projects untouched. This revision does not reset their historical hashes or claim old V1–V9 results for the new screens.

Next: inspect actual preview → approve/refine direction → reskin staff states → implement accepted application UI with functional tests. No phase complete from this cosmetic pass.
