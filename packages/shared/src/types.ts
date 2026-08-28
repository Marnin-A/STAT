// STAT wire contract. Single source of truth for every shape that crosses the
// network. `@stat/api` imports these as `import type` only — the package holds
// runtime values (MockApiClient) that the API must never pull in, and type-only
// imports erase at compile time so `dist/` never resolves this package.
//
// Changing anything here changes both halves. Contract tests in
// `apps/api/src/contract.test.ts` prove the server still satisfies it.

// ---------------------------------------------------------------- enums

export type IncidentType = 'medical' | 'security' | 'fire' | 'hazard'

export type IncidentStatus =
  | 'created'
  | 'triaging'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'transporting'
  | 'resolved'
  | 'cancelled'

export type Priority = 'critical' | 'serious' | 'stable'

/** Vehicle/crew vocabulary. Map to incident types with `?for=` on the units query. */
export type UnitType = 'ambulance' | 'police' | 'fire' | 'rescue'

/**
 * `available` <-> `assigned` is the atomic reserve/release pair dispatch relies
 * on. `standby` is held-but-not-dispatchable; `out_of_service` is off the board.
 */
export type UnitStatus = 'available' | 'standby' | 'assigned' | 'out_of_service'

export type Role = 'citizen' | 'responder' | 'dispatcher' | 'hospital_staff' | 'admin'

export type AgencyType = 'police' | 'fire' | 'medical'

export type DispatchStatus = 'pending' | 'accepted' | 'rejected'

// ---------------------------------------------------------------- geo

export interface GeoPoint {
  lat: number
  lng: number
}

/** A point with an optional human label. Storage and queries use GeoPoint. */
export interface Location extends GeoPoint {
  address?: string
}

// ---------------------------------------------------------------- incident

export interface IncidentNote {
  id: string
  actorId: string | null
  text: string
  at: string
}

/**
 * The incident read model — a fold over the event log, not a stored row.
 *
 * `version` is the count of events in the stream. Every mutation that takes an
 * `expectedVersion` reads it from here; without it a client cannot transition
 * an incident at all.
 *
 * `reporterId` is deliberately absent: it lives in the event log for audit but
 * is not exposed on the read path.
 */
export interface Incident {
  id: string
  agencyId: string
  type: IncidentType
  priority: Priority
  status: IncidentStatus
  location: GeoPoint | null
  assignedUnitIds: string[]
  hospitalId: string | null
  hospitalAlerted: boolean
  riskScore: number
  flagged: boolean
  notes: IncidentNote[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateIncidentDTO {
  type: IncidentType
  location: GeoPoint | null
  /** Stable per-install id. Drives abuse scoring and rate limits. */
  deviceId: string
  /** Omitted on citizen SOS: the server assumes `critical` until triage says otherwise. */
  priority?: Priority
  /** Omitted by citizens; the server files the incident under `unassigned`. */
  agencyId?: string
  /** Client capture time. Defaults to server time when absent. */
  occurredAt?: string
}

export interface IncidentFilters {
  status?: IncidentStatus
  type?: IncidentType
}

// ---------------------------------------------------------------- units

export interface Unit {
  id: string
  agencyId: string
  type: UnitType
  callSign: string
  status: UnitStatus
  location: GeoPoint | null
  capabilities: string[]
  updatedAt: string
}

export interface RankedUnit extends Unit {
  distanceKm: number
  etaMinutes: number
}

/** `near` is required — the server ranks by distance and has nothing to rank without it. */
export interface UnitQuery {
  near: GeoPoint
  /** Filter to one vehicle type. */
  type?: UnitType
  /** Filter to the types that can serve an incident type. Mutually exclusive with `type`. */
  for?: IncidentType
  limit?: number
}

export interface Dispatch {
  id: string
  incidentId: string
  unitId: string
  dispatcherId: string
  status: DispatchStatus
  dispatchedAt: string
  acceptedAt: string | null
}

// ---------------------------------------------------------------- triage

export interface TriageQuestion {
  id: string
  text: string
  type: 'yes_no' | 'multiple_choice'
  options?: string[]
}

export interface TriageAnswer {
  questionId: string
  value: string | boolean
}

export interface TriageScore {
  /** 0-100. */
  score: number
  level: Priority
  flags: string[]
  recommendations: string[]
}

export interface Triage {
  incidentId: string
  questions: TriageQuestion[]
  answers: TriageAnswer[]
  score: TriageScore | null
}

// ---------------------------------------------------------------- telemetry

/** What a responder submits. Server stamps the rest. */
export interface TelemetryInput {
  kind: string
  capturedAt: string
  payload: Record<string, unknown>
  patientId?: string
  unitId?: string
}

export interface TelemetrySample extends TelemetryInput {
  id: string
  incidentId: string
  recordedAt: string
}

export interface TelemetryQuery {
  limit?: number
  /** ISO bounds on `capturedAt`. */
  from?: string
  to?: string
}

// ---------------------------------------------------------------- hospital

export interface Hospital {
  id: string
  name: string
  location: GeoPoint
  capabilities: string[]
  availableBeds: number
  updatedAt: string
}

export interface RankedHospital extends Hospital {
  distanceKm: number
}

export interface HospitalQuery {
  near: GeoPoint
  capability?: string
  limit?: number
}

// ---------------------------------------------------------------- offline

/** One queued mutation drained through `POST /incidents/:id/replay`. */
export interface ReplayCommand {
  /** Per-command idempotency key. Replaying the same key is a no-op. */
  key: string
  occurredAt: string
  kind: 'status' | 'triage' | 'vitals' | 'note'
  payload: Record<string, unknown>
}

export interface ReplayResult {
  key: string
  applied: boolean
  error: string | null
}

// ---------------------------------------------------------------- errors

/** `code` values a `DomainError` can put on the wire. */
export type ApiErrorCode =
  | 'INVALID_TRANSITION'
  | 'VERSION_CONFLICT'
  | 'FORBIDDEN'
  | 'RATE_LIMIT_BLOCKED'
  | 'UNIT_UNAVAILABLE'
  | 'DISPATCH_CONFLICT'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'INTERNAL'

export interface ApiErrorBody {
  error: ApiErrorCode
  message: string
}
