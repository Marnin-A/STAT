import type { ApiClient } from './api'
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

const DELAY_MS = 300

function delay(ms: number = DELAY_MS): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateId(): string {
  return crypto.randomUUID()
}

const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    agencyId: 'agency-medical',
    type: 'medical',
    priority: 'critical',
    status: 'dispatched',
    location: { lat: 6.5244, lng: 3.3792, address: 'Victoria Island, Lagos' },
    reporterId: 'user-001',
    assignedUnitIds: ['unit-amb-001'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 2,
  },
  {
    id: 'inc-002',
    agencyId: 'agency-security',
    type: 'security',
    priority: 'serious',
    status: 'triaging',
    location: { lat: 6.4541, lng: 3.3947, address: 'Lekki Phase 1, Lagos' },
    reporterId: 'user-002',
    assignedUnitIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'inc-003',
    agencyId: 'agency-fire',
    type: 'fire',
    priority: 'critical',
    status: 'en_route',
    location: { lat: 6.5950, lng: 3.3350, address: 'Ikeja GRA, Lagos' },
    reporterId: 'user-003',
    assignedUnitIds: ['unit-fire-001'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 3,
  },
]

const mockUnits: Unit[] = [
  {
    id: 'unit-amb-001',
    agencyId: 'agency-medical',
    type: 'ambulance',
    callSign: 'AMB-01',
    homeStation: 'Victoria Island Station',
    status: 'busy',
    location: { lat: 6.5200, lng: 3.3800 },
    capabilities: ['ALS', 'defibrillator', 'oxygen'],
    currentIncidentId: 'inc-001',
  },
  {
    id: 'unit-pol-001',
    agencyId: 'agency-security',
    type: 'police',
    callSign: 'POL-14',
    homeStation: 'Lekki Station',
    status: 'available',
    location: { lat: 6.4500, lng: 3.3900 },
    capabilities: ['armed_response', 'body_cam'],
  },
  {
    id: 'unit-fire-001',
    agencyId: 'agency-fire',
    type: 'fire',
    callSign: 'FIRE-07',
    homeStation: 'Ikeja Fire Station',
    status: 'busy',
    location: { lat: 6.5900, lng: 3.3400 },
    capabilities: ['hazmat', 'ladder', 'rescue'],
    currentIncidentId: 'inc-003',
  },
]

const mockHospitals: Hospital[] = [
  {
    id: 'hosp-001',
    name: 'Lagos University Teaching Hospital',
    location: { lat: 6.5015, lng: 3.3892 },
    specialties: ['cardiology', 'trauma', 'neurology'],
    bedAvailability: 12,
  },
  {
    id: 'hosp-002',
    name: 'Reddington Hospital',
    location: { lat: 6.5280, lng: 3.3750 },
    specialties: ['cardiology', 'emergency', 'surgery'],
    bedAvailability: 8,
  },
]

export class MockApiClient implements ApiClient {
  private incidents = [...mockIncidents]
  private units = [...mockUnits]
  private hospitals = [...mockHospitals]
  private dispatches: Dispatch[] = []
  private telemetry: TelemetrySample[] = []

  async createIncident(data: CreateIncidentDTO, _idempotencyKey: string): Promise<Incident> {
    await delay()
    const incident: Incident = {
      id: generateId(),
      agencyId: `agency-${data.type}`,
      type: data.type,
      priority: 'serious',
      status: 'created',
      location: data.location,
      reporterId: 'user-current',
      assignedUnitIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    }
    this.incidents.push(incident)
    return incident
  }

  async getIncident(id: string): Promise<Incident> {
    await delay()
    const incident = this.incidents.find(i => i.id === id)
    if (!incident) throw new Error(`Incident ${id} not found`)
    return incident
  }

  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    await delay()
    let result = [...this.incidents]
    if (filters?.status) result = result.filter(i => i.status === filters.status)
    if (filters?.type) result = result.filter(i => i.type === filters.type)
    if (filters?.priority) result = result.filter(i => i.priority === filters.priority)
    return result
  }

  async transitionIncident(id: string, status: IncidentStatus, version: number): Promise<Incident> {
    await delay()
    const incident = this.incidents.find(i => i.id === id)
    if (!incident) throw new Error(`Incident ${id} not found`)
    if (incident.version !== version) throw new Error('Version conflict')
    incident.status = status
    incident.version++
    incident.updatedAt = new Date().toISOString()
    return incident
  }

  async addIncidentNote(_id: string, _note: string): Promise<void> {
    await delay()
  }

  async getAvailableUnits(params?: UnitQuery): Promise<Unit[]> {
    await delay()
    let result = this.units.filter(u => u.status === 'available')
    if (params?.type) result = result.filter(u => u.type === params.type)
    return result
  }

  async dispatchUnit(incidentId: string, unitId: string): Promise<Dispatch> {
    await delay()
    const dispatch: Dispatch = {
      id: generateId(),
      incidentId,
      unitId,
      dispatcherId: 'user-current',
      status: 'pending',
      dispatchedAt: new Date().toISOString(),
    }
    this.dispatches.push(dispatch)
    return dispatch
  }

  async acceptDispatch(dispatchId: string): Promise<Dispatch> {
    await delay()
    const dispatch = this.dispatches.find(d => d.id === dispatchId)
    if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`)
    dispatch.status = 'accepted'
    dispatch.acceptedAt = new Date().toISOString()
    return dispatch
  }

  async rejectDispatch(dispatchId: string): Promise<Dispatch> {
    await delay()
    const dispatch = this.dispatches.find(d => d.id === dispatchId)
    if (!dispatch) throw new Error(`Dispatch ${dispatchId} not found`)
    dispatch.status = 'rejected'
    return dispatch
  }

  async submitTriageAnswers(_incidentId: string, _answers: TriageAnswer[]): Promise<TriageScore> {
    await delay()
    return {
      score: 85,
      level: 'critical',
      flags: ['cardiac_arrest', 'unconscious'],
      recommendations: ['immediate_cpr', 'defibrillator', 'als_unit'],
    }
  }

  async getTriage(incidentId: string): Promise<Triage> {
    await delay()
    return {
      incidentId,
      questions: [
        { id: 'q1', text: 'Is the patient conscious?', type: 'yes_no' },
        { id: 'q2', text: 'Is the patient breathing?', type: 'yes_no' },
        { id: 'q3', text: 'Describe the emergency', type: 'text' },
      ],
      answers: [],
    }
  }

  async recordTelemetry(incidentId: string, sample: Omit<TelemetrySample, 'id' | 'recordedAt'>): Promise<TelemetrySample> {
    await delay()
    const telemetrySample: TelemetrySample = {
      ...sample,
      id: generateId(),
      incidentId,
      recordedAt: new Date().toISOString(),
    }
    this.telemetry.push(telemetrySample)
    return telemetrySample
  }

  async getLatestTelemetry(incidentId: string): Promise<TelemetrySample[]> {
    await delay()
    return this.telemetry.filter(t => t.incidentId === incidentId).slice(-5)
  }

  async getTelemetryHistory(incidentId: string, from?: string, to?: string): Promise<TelemetrySample[]> {
    await delay()
    let result = this.telemetry.filter(t => t.incidentId === incidentId)
    if (from) result = result.filter(t => t.capturedAt >= from)
    if (to) result = result.filter(t => t.capturedAt <= to)
    return result
  }

  async selectHospital(incidentId: string, hospitalId: string): Promise<void> {
    await delay()
    const incident = this.incidents.find(i => i.id === incidentId)
    if (incident) incident.hospitalId = hospitalId
  }

  async alertHospital(_incidentId: string): Promise<void> {
    await delay()
  }

  async getHospitalActiveIncidents(): Promise<Incident[]> {
    await delay()
    return this.incidents.filter(i => i.hospitalId && i.status !== 'resolved')
  }

  async getHospitals(): Promise<Hospital[]> {
    await delay()
    return this.hospitals
  }
}
