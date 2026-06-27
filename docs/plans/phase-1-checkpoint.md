# Phase 1 Checkpoint

## Shipped

- Monorepo scaffold (pnpm workspaces: `apps/mobile`, `packages/shared`)
- Vite + React 18 + TS + Tailwind v4 (Stitch design tokens)
- Capacitor + Android platform added
- `@stat/shared`: types, `ApiClient` interface, `MockApiClient` (matches backend contract)
- Layout: TopAppBar (STAT branding + `tel:` CALL DISPATCH), BottomNavBar (4 nav items), AppLayout (safe-area-inset)
- Vitest + Testing Library setup
- TDD: 8 tests passing (layout renders, nav links, safe-area CSS)

## What's next

Phase 2: Citizen SOS vertical slice
- Dashboard page (SOS button → haptic + GPS + POST /incidents)
- TriageTracking page (AI triage q's + progress + vitals)
- UI components: ActionButton, StatusStrip, VitalCard, ProgressTracker, MapPlaceholder
