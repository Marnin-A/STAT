# R1 — calm redesign and role layouts

2026-10-28 amendment: [mobile-first web demo](./recovery-web-demo.md) supersedes older delivery/scope assumptions below. Calmer redesign; notes first/chat later; profiles/contacts included; anonymous SOS and receive-first flag/review fraud policy approved; desktop adaptations approved in principle. Review A → guarded C → B. Do not treat the historical Stitch appearance, Android-first acceptance or old scope questions below as current decisions.

Status: proposed. Dependency: R0. Can run alongside R2 without hosted credentials.

## Red–Green–Refactor steps

1. First obtain approval of new draft screens using the proposed calm design guide. Then add failing layout/interaction tests for the approved SOS/navigation/state designs, undersized targets, role layouts and false Dispatched state. Baselines must represent approved new screens, not the old rejected appearance or current broken output.
2. Centralize approved typography, border, spacing, radius and interaction-state rules. Reuse good controls; repair hover contrast, persistent labels and motion behavior.
3. Implement the approved calm citizen SOS, tracking, profile and emergency-contact composition. Include approved pending/error/offline states; haptics/location failures must not conceal delivery status.
4. Build role-aware layouts: citizen/responder mobile-web shell, dispatcher case/map/action workspace, hospital queue/case/preparation workspace. R2 supplies real session enforcement; hiding navigation alone is not security.
5. Implement the new medical responder hierarchy and approved navigation/hospital actions. Provide explicit missing-data states rather than fictional readings.
6. Produce screen states using labelled synthetic fixtures in a dedicated test/demo harness. Do not make a production build silently operate on fixtures.
7. Verify 360/390/412px phone widths and approved desktop widths, font loading, safe-area/keyboard behavior, approved 64px emergency/48px secondary target geometry and critical-action spacing, contrast and reduced motion.
8. Refactor page duplication only after the behavior/visual tests pass. Record screenshots and intentional deviations for user approval.

## Exit evidence

- User approves medical-path layouts, profiles/contacts, supplementary states and desktop adaptations.
- Controls have specified behaviors/states; no unexplained inert action.
- Visual/interaction/accessibility checks pass. Screenshot assertions have human-reviewed baselines.
- Security/fire demos preserved outside medical acceptance.

## Unresolved questions

- Actual screen variants and detailed typography/geometry approved?
- Direction/navigation and saved-profile identity/sharing already agreed; verify generated copy follows them.

## Next steps

Write R1 summary; update checkpoint; integrate R2 identities and R3 commands.
