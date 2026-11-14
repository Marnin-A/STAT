import type {
  Incident,
  CreateIncidentDTO,
  IncidentFilters,
  IncidentNote,
  IncidentStatus,
  RankedUnit,
  UnitQuery,
  Dispatch,
  TriageAnswer,
  TriageQuestion,
  TriageScore,
  Triage,
  IncidentType,
  TelemetryInput,
  TelemetrySample,
  TelemetryQuery,
  RankedHospital,
  HospitalQuery,
  ReplayCommand,
  ReplayResult,
} from './types'

/**
 * Every call the app can make. `MockApiClient` and `HttpApiClient` both
 * implement it; `apps/api/src/contract.test.ts` proves the server does too.
 *
 * Mutations that change incident state take `expectedVersion`, read from
 * `Incident.version`. A mismatch is a `VERSION_CONFLICT` — refetch and retry.
 */
export interface ApiClient {
  // -------------------------------------------------------------- incidents
  /** `idempotencyKey` must be stable across retries of the same SOS press. */
  createIncident(data: CreateIncidentDTO, idempotencyKey: string): Promise<Incident>
  getIncident(id: string): Promise<Incident>
  listIncidents(filters?: IncidentFilters): Promise<Incident[]>
  transitionIncident(id: string, status: IncidentStatus, expectedVersion: number): Promise<Incident>
  addIncidentNote(id: string, text: string): Promise<IncidentNote>

  // -------------------------------------------------------------- dispatch
  getAvailableUnits(query: UnitQuery): Promise<RankedUnit[]>
  dispatchUnit(incidentId: string, unitId: string, expectedVersion: number): Promise<Dispatch>
  acceptDispatch(dispatchId: string): Promise<Dispatch>
  rejectDispatch(dispatchId: string): Promise<Dispatch>

  // -------------------------------------------------------------- triage
  getTriageQuestions(type: IncidentType): Promise<TriageQuestion[]>
  submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore>
  getTriage(incidentId: string): Promise<Triage>

  // -------------------------------------------------------------- telemetry
  recordTelemetry(incidentId: string, sample: TelemetryInput): Promise<TelemetrySample>
  getTelemetry(incidentId: string, query?: TelemetryQuery): Promise<TelemetrySample[]>

  // -------------------------------------------------------------- hospital
  getHospitals(query: HospitalQuery): Promise<RankedHospital[]>
  selectHospital(incidentId: string, hospitalId: string): Promise<Incident>
  alertHospital(incidentId: string): Promise<Incident>
  getHospitalActiveIncidents(): Promise<Incident[]>

  // -------------------------------------------------------------- offline
  /** Drain a responder's offline queue. One failed command never aborts the batch. */
  replay(incidentId: string, commands: ReplayCommand[]): Promise<ReplayResult[]>
}
