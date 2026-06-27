# Phase 1: Frontend Foundation

## Goal

Scaffold monorepo, Capacitor Android, layout shell, API interface with mock, TDD setup.

## Deliverables

- [ ] Worktree `feature/stat-mobile`
- [ ] pnpm workspace (`apps/mobile`, `packages/shared`)
- [ ] Vite + React + TS + Tailwind (Stitch tokens)
- [ ] Capacitor init (Android only)
- [ ] `packages/shared`: types, ApiClient interface, MockApiClient
- [ ] Layout: TopAppBar, BottomNavBar, AppLayout (safe-area-inset)
- [ ] Vitest + Testing Library
- [ ] TDD: layout renders, nav links work, safe-area CSS

## Steps

### 1. Scaffold monorepo

```bash
cd worktrees/stat-mobile
pnpm init
# create apps/mobile, packages/shared
# pnpm-workspace.yaml
```

### 2. Vite + React + TS

```bash
cd apps/mobile
pnpm create vite . --template react-ts
pnpm add react-router-dom
pnpm add -D tailwindcss postcss autoprefixer
pnpm tailwindcss init -p
```

Configure `tailwind.config.js` with Stitch tokens (colors, typography, spacing, radius).

### 3. Capacitor

```bash
pnpm add @capacitor/core @capacitor/cli
pnpm cap init STAT com.stat.mobile --web-dir dist
pnpm cap add android
pnpm add @capacitor/geolocation @capacitor/haptics @capacitor/status-bar @capacitor/preferences
```

### 4. packages/shared

```bash
cd packages/shared
pnpm init
# src/types.ts, src/api.ts, src/mock.ts
```

Types: Incident, Unit, Vital, TriageQuestion, ChatMessage, IncidentStatus, Priority, Agency, Hospital, Dispatch, TelemetrySample.

ApiClient interface: all endpoints from backend contract.

MockApiClient: in-memory data, async delays, implements interface.

### 5. Layout components

- TopAppBar: STAT logo, CALL DISPATCH button (`tel:` link)
- BottomNavBar: 4 items (Dashboard, Triage, Dispatch, Hospital)
- AppLayout: wrapper with `env(safe-area-inset-top/bottom)` padding

### 6. TDD

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Tests:
- TopAppBar renders STAT branding
- BottomNavBar renders 4 nav items
- AppLayout applies safe-area padding
- Navigation links route correctly

## Exit criteria

- `pnpm dev` runs Vite dev server
- `pnpm cap open android` opens emulator
- Layout renders with safe-area padding
- `pnpm test` green
- Mock API client returns data

## Checkpoint

After completion, write `docs/plans/phase-1-checkpoint.md`:
- What shipped
- What's next (Phase 2: citizen SOS)

## Unresolved

None blocking.
