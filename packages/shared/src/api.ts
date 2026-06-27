import type {
  Incident,
  CreateIncidentDTO,
  IncidentFilters,
  IncidentStatus,
  Unit,
  UnitQuery,
  Dispatch,
  TriageAnswer,
  TriageScore,
  Triage,
  TelemetrySample,
  Hospital,
} from './types'

export interface ApiClient {
  createIncident(data: CreateIncidentDTO, idempotencyKey: string): Promise<Incident>
  getIncident(id: string): Promise<Incident>
  listIncidents(filters?: IncidentFilters): Promise<Incident[]>
  transitionIncident(id: string, status: IncidentStatus, version: number): Promise<Incident>
  addIncidentNote(id: string, note: string): Promise<void>

  getAvailableUnits(params?: UnitQuery): Promise<Unit[]>
  dispatchUnit(incidentId: string, unitId: string): Promise<Dispatch>
  acceptDispatch(dispatchId: string): Promise<Dispatch>
  rejectDispatch(dispatchId: string): Promise<Dispatch>

  submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore>
  getTriage(incidentId: string): Promise<Triage>

  recordTelemetry(incidentId: string, sample: Omit<TelemetrySample, 'id' | 'recordedAt'>): Promise<TelemetrySample>
  getLatestTelemetry(incidentId: string): Promise<TelemetrySample[]>
  getTelemetryHistory(incidentId: string, from?: string, to?: string): Promise<TelemetrySample[]>

  selectHospital(incidentId: string, hospitalId: string): Promise<void>
  alertHospital(incidentId: string): Promise<void>
  getHospitalActiveIncidents(): Promise<Incident[]>
  getHospitals(): Promise<Hospital[]>
}
