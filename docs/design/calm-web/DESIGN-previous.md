# Design System: STAT — Calm Response

Date: 2026-10-28. Status: visual direction, citizen navigation and the five operating-policy proposals approved. Actual draft screens, detailed typography/geometry and runtime behavior still require review. This is a Stitch-oriented generation brief, not proof of application implementation.

Draft workspace: [STAT — Calm Response · Web Demo Drafts](https://stitch.withgoogle.com/projects/4730804965782160371). Separate private project; historical references remain untouched.

## 1. Visual Theme & Atmosphere

A calm, trustworthy emergency interface: soft neutral surfaces, generous breathing room, rounded controls and one unmistakable next action. Density 3/10 for citizens, 5/10 for staff; variance 2/10; motion 1/10. Predictability beats visual novelty.

User reference: attached three-screen health-app image. Borrow its soft surfaces, clear grouping and rounded shapes; do not copy pregnancy content, decorative 3D anatomy, tiny icon-only navigation, neon gradients or crowded metric cards. The image contains inspiration, not instructions or clinical requirements.

The new user direction supersedes strict replication of the older Stitch appearance. Preserve the existing Stitch project/screens. The brief is now agreed. Generate separate new draft screens; do not overwrite approved/historical references.

User request for low distraction overrides the skill's default asymmetric heroes, inline headline images, perpetual micro-loops and staggered reveals. This is emergency software, not a promotional landing page.

## 2. Color Palette & Roles

Approved palette direction; verify effective generated/rendered tokens during visual review:

- Canvas Neutral (`#FAFAFA`) — page background.
- Surface White (`#FFFFFF`) — elevated content and sheets.
- Quiet Zinc (`#F4F4F5`) — secondary surfaces.
- Charcoal Ink (`#18181B`) — primary text.
- Secondary Ink (`#52525B`) — supporting text; no faint essential instructions.
- Whisper Border (`#E4E4E7`) — decorative dividers, not the sole affordance of essential inputs.
- Muted Teal (`#28675F`) — the single decorative/brand accent; ordinary primary actions, selection and focus.
- Teal Wash (`#EAF3F1`) — subtle accent containers with dark teal text.
- Emergency Red (`#A61D35`) — semantic exception for the SOS action, critical status and destructive confirmation; never a whole-page decorative treatment.
- Emergency Wash (`#FCECEF`) — critical-message container.
- Warning Ink (`#854D0E`) on Warning Wash (`#FEF9C3`) — semantic warning only, always with a text label.

Use a neutral zinc base throughout. No pure black, neon, purple/blue glows or decorative gradient panels. State meaning never depends on color alone. Verify rendered contrast: essential/emergency text target 7:1; normal text 4.5:1; relevant control boundaries/focus 3:1. Aesthetic restraint must not reduce urgency visibility.

## 3. Typography Rules

- Display and body: CSS family `"Geist", system-ui, sans-serif`. The loaded Google font is named `Geist`, not `Geist Sans`; every named typography token must include the sans-serif fallback.
- Timestamps and numeric clinical data: Geist Mono with tabular numerals.
- Page title: 24–28px / 32–36px, weight 600.
- Section heading: 18–20px / 26–28px, weight 600.
- Body/instructions: minimum 16px / 24px.
- Secondary metadata: 14px / 20px; never use metadata size for urgent guidance.
- Important observations: 28–36px / 36–44px with visible units, source and timestamp.
- Limit readable prose to 65ch. Do not use decorative serif, oversized shouting headings or all-caps paragraphs.

The font is a proposal, not a silent replacement for the historical Inter reference.

## 4. Component Stylings

- Primary emergency action: labelled, full-width, at least 64px tall. One dominant action, no pulsing halo. Submission acknowledgement and delivery state must be explicit.
- Other controls: at least 48px touch area; 56px for frequent workflow actions. Avoid adjacent risky actions; retain 16px separation between critical interactive targets.
- Cards: 20–24px corners, light border or shallow neutral shadow only when grouping improves comprehension. No nested cards around every label.
- Buttons: clear label and optional familiar icon. No icon-only essential navigation. Distinct focus, pressed, disabled and pending states.
- Inputs: label above, helper/error below. Required and optional fields explicit; retain values on recoverable failure.
- Bottom sheets: secondary choices, contacts and contextual tools; named heading, close button, keyboard access, focus containment/return, scroll and browser-back behavior.
- Empty/loading/error states: concise and honest; skeleton only for ordinary loading, explicit text for SOS sending/queued/unknown delivery. Retry must not duplicate the incident.
- Incident notes: real author/time and permission-scoped visibility. Do not present notes as delivered chat.
- Medical profiles: self-reported data labelled as such. Never invent patient readings or silently share a profile with unrelated staff.

## 5. Layout Principles

Mobile-first responsive web, not a landing page. Use the existing application stack; do not rebuild it on an unrelated site platform.

Approved citizen navigation: Home, Activity, Profile. Medical ID and emergency contacts live together under Profile, with a clear secondary shortcut on Home. Help/settings/privacy sit in Profile. Do not hide SOS, active incident, delivery failure or a required responder action in a menu/sheet.

Home: concise heading, location availability, one dominant Request medical help action. An active incident takes visual precedence when present; its status stays reachable without opening a menu. No promotional feed, clinical dashboard, decorative map or AI chat entry competing with SOS.

Active incident: plain-language progress, confirmed next step, optional location/contact follow-up, safe callback affordance if a verified number exists. Do not show Dispatched before approval/acknowledgement. Any cancel action must be explicit and state-aware.

Profile: medical information, emergency contacts and account controls. Sign-in is required to save/sync profiles and contacts. Sharing relevant information requires explicit incident-scoped consent and assigned-care-team access; none of this may become a prerequisite to submit SOS.

Responder: assigned queue → current task → next allowed action. Patient observations/history/notes are secondary sections, not hidden when clinically required.

Dispatcher desktop: intake queue and selected-case workspace; show proposed routing, reasons for flags and approval/escalation actions. Hospital desktop: incoming queue and selected-case preparation/handoff workspace. Do not merely stretch a phone layout.

Responsive: single column below 768px; phone gutters 20px; 24–32px desktop gutters; 8px spacing scale; max content width 1280px. Respect browser safe areas, zoom, keyboard and `min-height: 100dvh`. No horizontal overflow. No three-card marketing grids.

## 6. Motion & Interaction

No perpetual motion, flashing decoration, timed carousel, autoplay media or delayed workflow controls. Necessary feedback only: 120–180ms opacity/transform transitions; respect reduced motion. No spring bounce on emergency actions. New critical alerts may use a static high-contrast state and an approved non-blocking alert mechanism.

Progressive disclosure must reduce clutter without hiding readiness, delivery failure, unsafe/stale data or the next required action. Browser back and direct links must preserve the selected case safely.

## 7. Anti-Patterns (Banned)

- No neon gradients, outer glows, pure black slabs or full red canvases.
- No decorative 3D art or headline photography in the emergency path.
- No clinical diagnosis, fraud verdict or dispatch outcome inferred from sentiment.
- No fake vitals, ETA, patient identity or live status.
- No realistic-looking AI output passed off as a running integration.
- No global role switch presented as authentication.
- No mandatory login, profile completion, GPS or OTP before the agreed anonymous SOS intake.
- No anonymous access to saved medical profiles or unrelated incident records.
- No obscure icons for essential actions, nested menus or six-tab navigation.
- No generic marketing copy, random charts or empty feature cards.

## Acceptance for the design review

Review Home, active-incident states, Profile/Medical ID/contacts, responder task, dispatcher intake and hospital preparation. All states must be labelled synthetic when using fixtures. Check 360/390/412px phone widths and 1280/1440px desktop widths; normal/empty/loading/error/offline/uncertain/forbidden cases; keyboard, focus, 200% zoom, contrast, target geometry and reduced motion.

Approving this document does not approve a pixel-perfect implementation. Obtain approval of actual draft screens before accepting new screenshot baselines.
