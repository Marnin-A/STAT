# STAT Frontend — Master Plan

Mobile-first emergency response app. Vite + React + Capacitor. Android first.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (Stitch design tokens)
- React Router v6
- Capacitor (Android)
- Leaflet (maps)
- Vitest + Testing Library (TDD mandatory)

## Monorepo (pnpm workspaces)

```
/
├── apps/
│   └── mobile/
│       ├── src/
│       │   ├── components/layout/   TopAppBar, BottomNavBar, AppLayout
│       │   ├── components/ui/       StatusStrip, VitalCard, IncidentCard, ActionButton, ProgressTracker, MapPlaceholder, ChatChannel, BentoCard
│       │   ├── pages/               Dashboard, TriageList, TriageTracking, MedicalIncident, SecurityTactical, FireHazard, DispatchMap, HospitalPreArrival
│       │   ├── hooks/               useGeolocation, useHaptics, useApi, useWebSocket
│       │   ├── api/                 client.ts (real), mock.ts
│       │   └── App.tsx
│       ├── capacitor.config.ts
│       └── android/
├── packages/
│   └── shared/
│       └── src/
│           ├── types.ts
│           ├── api.ts               ApiClient interface
│           └── mock.ts              MockApiClient
└── docs/plans/
```

## API Contract

Matches backend (`docs/plans/backend-system-design.md`):

```typescript
interface ApiClient {
  createIncident(data: CreateIncidentDTO, idempotencyKey: string): Promise<Incident>
  getIncident(id: string): Promise<Incident>
  listIncidents(filters?: IncidentFilters): Promise<Incident[]>
  transitionIncident(id: string, status: IncidentStatus, version: number): Promise<Incident>
  getAvailableUnits(params: UnitQuery): Promise<Unit[]>
  dispatchUnit(incidentId: string, unitId: string): Promise<Dispatch>
  acceptDispatch(dispatchId: string): Promise<Dispatch>
  rejectDispatch(dispatchId: string): Promise<Dispatch>
  submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore>
  getTriage(incidentId: string): Promise<Triage>
  recordTelemetry(incidentId: string, sample: TelemetrySample): Promise<void>
  getLatestTelemetry(incidentId: string): Promise<TelemetrySample[]>
  selectHospital(incidentId: string, hospitalId: string): Promise<void>
  alertHospital(incidentId: string): Promise<void>
  getHospitalActiveIncidents(): Promise<Incident[]>
}
```

Backend endpoints (from `backend-system-design.md`):
- `POST /incidents` (Idempotency-Key required)
- `GET /incidents/:id`
- `GET /incidents?status=active`
- `POST /incidents/:id/status`
- `POST /incidents/:id/notes`
- `GET /units/available?near=lat,lng&type=ambulance`
- `POST /incidents/:id/dispatch`
- `POST /dispatches/:id/accept`
- `POST /dispatches/:id/reject`
- `POST /incidents/:id/triage/answers`
- `POST /incidents/:id/triage/score`
- `GET /incidents/:id/triage`
- `POST /incidents/:id/telemetry`
- `GET /incidents/:id/telemetry/latest`
- `GET /incidents/:id/telemetry?from=&to=`
- `POST /incidents/:id/hospital/select`
- `POST /incidents/:id/hospital/alert`
- `GET /hospital/incidents/active`

WebSocket channels:
- `/vitals/:incidentId` (telemetry stream)
- `/chat/:incidentId`
- `/units` (positions)

## Routes

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/triage` | TriageList |
| `/triage/:id` | TriageTracking |
| `/triage/medical/:id` | MedicalIncident |
| `/dispatch` | SecurityTactical |
| `/dispatch/fire/:id` | FireHazard |
| `/dispatch/map` | DispatchMap |
| `/hospital` | HospitalPreArrival |

## Capacitor Plugins

- `@capacitor/geolocation` (GPS)
- `@capacitor/haptics` (vibration)
- `@capacitor/local-notifications`
- `@capacitor/push-notifications` (FCM)
- `@capacitor/camera` (body cam)
- `@capacitor/status-bar`
- `@capacitor/preferences` (offline cache)

## Native Bridges

- GPS: Capacitor Geolocation
- Haptics: Capacitor Haptics
- Dialer: `tel:` deep link
- Push: FCM via Capacitor push
- Camera: Capacitor Camera plugin

## Phases

1. **Foundation** (`phase-1-frontend-foundation.md`): scaffold, Capacitor, layout, API interface, TDD setup
2. **Citizen SOS** (`phase-2-citizen-sos.md`): Dashboard + TriageTracking + SOS flow
3. **Responder Dispatch** (`phase-3-responder-dispatch.md`): TriageList, DispatchMap, MedicalIncident, SecurityTactical, FireHazard
4. **Hospital + Native** (`phase-4-hospital-native.md`): HospitalPreArrival, push, camera, offline, Android build

## Design Tokens

From Stitch (see `docs/plans/stat-implementation.md` for full token list):
- Primary: `#b80035` (Emergency Red)
- Secondary: `#3755c3` (Stability Blue)
- Surface: `#f7f9fb`
- Font: Inter
- Touch target: 64px min
- Border: 2px solid (no shadows)
- Status strip: 8px left border (red=critical, amber=serious, green=stable)

## TDD

Red-Green-Refactor per component. No fake tests. Test behavior via public interface.

## Next steps

1. Phase 1: scaffold + layout + API interface
2. Phase 2: citizen SOS vertical slice
3. Phase 3: responder views + dispatch map
4. Phase 4: hospital + native polish + build
