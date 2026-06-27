# Phase 2: Citizen SOS

## Goal

Citizen triggers SOS → haptic + GPS → incident created → triage tracking view.

## Deliverables

- [ ] Dashboard page (SOS button, emergency type selection, GPS status)
- [ ] TriageTracking page (AI triage q's, progress tracker, vitals, map)
- [ ] UI: ActionButton, StatusStrip, VitalCard, ProgressTracker, MapPlaceholder
- [ ] Hooks: useGeolocation, useHaptics
- [ ] TDD: SOS flow, triage navigation, vitals display

## Steps

### 1. Hooks

- `useGeolocation`: Capacitor Geolocation, returns lat/lng/address/loading/error
- `useHaptics`: Capacitor Haptics, impact/notification methods

### 2. UI Components (TDD each)

- `ActionButton`: 64px min height, primary/secondary variants, icon slot
- `StatusStrip`: 8px left border, color by priority (critical/serious/stable)
- `VitalCard`: label, value, unit, trend arrow, critical highlight
- `ProgressTracker`: 3 steps (Dispatched → En Route → Arriving), active state
- `MapPlaceholder`: Leaflet map container, center on location, marker

### 3. Dashboard Page

- SOS button (pulse-ring animation)
- Emergency type selector (Medical/Security/Fire)
- GPS status indicator (loading/acquired/error)
- Location display
- SOS flow: press → haptic → GPS → POST /incidents → navigate to /triage/:id

### 4. TriageTracking Page

- Progress tracker (incident status)
- AI triage questionnaire (questions from API, submit answers)
- Vitals cards (HR, SpO2, BP, RR with trends)
- Map placeholder (incident location)
- Status updates

## Exit criteria

- SOS button triggers haptic + GPS capture
- Incident created via mock API
- Navigate to TriageTracking
- Triage questions display + submit
- Vitals render with trend arrows
- All TDD green

## Unresolved

None blocking.
