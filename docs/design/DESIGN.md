# Design system: STAT / Rapid Response Network

Historical capture. On 2026-10-28 the user requested a calmer redesign. Preserve this reference; it is no longer the proposed visual acceptance baseline. See [new proposed design system](./calm-web/DESIGN.md). No replacement screens or tokens are approved yet.

Captured 2026-10-02 from [Stitch project 15243493749593154645](https://stitch.withgoogle.com/projects/15243493749593154645). Implementation guide, not authorization to regenerate or edit Stitch.

## 1. Visual theme and atmosphere

Professional, urgent, reliable. Controlled urgency through predictable hierarchy and strong hit areas. Functional clarity over decoration. Retain the existing STAT rebrand; PULSE remains in the historical design exports.

This adapts the Stitch design-document workflow to the user's authoritative design. Generic skill defaults—new fonts, asymmetric hero layouts, single-accent palettes and perpetual motion—must not override it.

## 2. Color palette and roles

- Emergency Primary: `#b80035`; emergency container: `#e11d48`; white foreground. Reserve emergency emphasis for SOS, critical alerts and life-threatening updates.
- Stability Secondary: `#3755c3`; secondary container: `#708cfd`; container foreground: `#00217a`. Administrative/secondary actions, with verified state contrast.
- Canvas: `#f7f9fb`; primary content: `#ffffff`; tonal surfaces: `#f2f4f6`, `#eceef0`, `#e6e8ea`, `#e0e3e5`.
- Main text: `#191c1e`; secondary text: `#5c3f40`; outline: `#906f70`; soft outline: `#e5bdbe`.
- Error: `#ba1a1a`; error container: `#ffdad6`; foreground: `#93000a`.
- Severity strips: red/yellow/green plus explicit text; color is never the only status cue.

The project also declares primary/secondary/neutral overrides (`#e11d48`, `#1e40af`, `#f8fafc`) that conflict with some named values. The HTML uses the named palette. Preserve captured values; reconcile effective rendered values against approved reference screenshots in R0. Do not silently “correct” the palette.

Critical-data contrast target: 7:1. Secondary labels: 4.5:1, including hover, focus and pressed states. White on the existing secondary-container hover color does not meet the label target.

## 3. Typography

Inter throughout, as explicitly specified by Stitch.

| Role | Size / line height | Weight |
|---|---|---|
| Emergency display | 48 / 56px | 800 |
| Large headline | 32 / 40px | 700 |
| Mobile large headline | 24 / 32px | 700 |
| Medium headline | 20 / 28px | 700 |
| Instruction/body large | 18 / 28px | 500 |
| Body | 16 / 24px | 400 |
| Bold metadata | 14 / 20px | 700 |
| Small metadata | 12 / 16px | 600 |

Use uppercase tracked metadata selectively. Critical numbers must remain glanceable. Do not shrink instructions into metadata styling.

## 4. Components

- Primary actions/selectors: at least 64px tall, with at least 16px between adjacent interactive targets.
- Borders: 2px structural; reference critical emphasis may use 3px. Severity strip: 8px.
- Shape: default 4px radius; larger controls 8px. Captured scale also includes 2/6/12px and full-pill values.
- Inputs: persistent labels, visible validation, explicit unknown/missing values.
- States: loading, empty, failure, forbidden, stale, offline, queued, rejected, completed. A missing reading is not zero.
- SOS: reproduce the large direct Medical Emergency affordance; do not redesign it into a generic circular control.
- Case actions: do not show dispatch/arrival/readiness unless the corresponding command is acknowledged.
- Fixture data: restricted to explicit demos/tests. Do not label fixture vitals, chat, diagnoses or ETA as live.

## 5. Layout

8px spacing base. Stacks: 8/16/32px. Gutter: 16px. Side margins: 20px mobile, 40px desktop.

Emergency workflows remain predictable single-column stacks. Desktop dispatcher/hospital adaptations require approval: case queue, selected case and action/context panel, with no stretched phone-only layout or role-inappropriate bottom navigation.

The inventory reports eight 780px-wide MOBILE exports; do not equate export pixels with CSS viewport width without checking capture scale. Visual verification should cover approved phone widths, safe areas, keyboard behavior and desktop widths. No desktop design exists in this project snapshot.

## 6. Motion and interaction

Restrained. Flashing reserved for new-incident alerts, not every vital card or continuous hospital page. Respect reduced-motion settings. Prefer transform/opacity for necessary feedback; avoid decorative perpetual loops.

Haptics are optional feedback, never a prerequisite for SOS delivery. Request permission at the relevant action and provide a denial/failure path.

## 7. Anti-patterns

- No silent redesign or substitute font/palette.
- No fictional vitals, ETA, diagnoses, patient identity or operational status.
- No claims of immediate dispatch while approval is pending.
- No decorative flashing of old/acknowledged alerts.
- No active control without a real action, or unexplained unavailable feature.
- No reference phone number treated as a verified pilot contact.
- No visual baseline accepted solely because snapshot tests pass.

## Screen inventory

| Title | Screen ID | App reference |
|---|---|---|
| SOS Dashboard (Citizen) | f27347bc9ae341af94ffe42e4f1d9a97 | Dashboard |
| Active Emergencies Triage | de7fa59bce7e47268356f828fe89af70 | TriageList |
| AI Triage & Tracking | 40e4ebc35ebd4685b4697ff4678bddac | TriageTracking |
| Medical Responder Active Incident | 04e5af75a95842d291a1fcdc22172dae | MedicalIncident |
| Responder Dispatch Map | 237386b46e21478f8f9faec6a7b4b125 | DispatchMap |
| Hospital Pre-Arrival | 793bc4793f92450186bad9088d4f097f | HospitalPreArrival |
| Security Responder Tactical View | 3e7077335478478687e6d63e74f935a0 | SecurityTactical |
| Fire & Hazard Incident View | d300c974af3a406c9f3c9b2251690720 | FireHazard |

`27e9218256724636b146302e87095be7` is the Pulse App PRD, not a desktop mockup. Medical release acceptance uses the first six screen references; security/fire remain deferred.
