import type { ApiClient } from './api'
import type {
  CreateIncidentDTO,
  HospitalQuery,
  Dispatch,
  GeoPoint,
  Hospital,
  Incident,
  IncidentFilters,
  IncidentNote,
  IncidentStatus,
  IncidentType,
  RankedHospital,
  RankedUnit,
  ReplayCommand,
  ReplayResult,
  TelemetryInput,
  TelemetryQuery,
  TelemetrySample,
  Triage,
  TriageAnswer,
  TriageQuestion,
  TriageScore,
  Unit,
  UnitQuery,
} from './types'

/**
 * In-memory `ApiClient` for tests and for running the app with no backend.
 * Seeded with the same Lagos agencies and call signs as the database seed so
 * screenshots match between mock and real runs.
 *
 * It is a stand-in, not a simulator: scoring is a crude approximation of the
 * server's protocol rules, and it never rejects on version conflicts.
 */

const DELAY_MS = 300

function delay(ms: number = DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function id(): string {
  return crypto.randomUUID()
}

const EARTH_RADIUS_KM = 6371
const AVG_SPEED_KMH = 40

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const UNITS_FOR: Record<IncidentType, string[]> = {
  medical: ['ambulance'],
  security: ['police'],
  fire: ['fire', 'rescue'],
  hazard: ['fire', 'rescue'],
}

const QUESTIONS: Record<IncidentType, TriageQuestion[]> = {
  medical: [
    { id: 'med-conscious', text: 'Is the patient conscious?', type: 'yes_no' },
    { id: 'med-breathing', text: 'Is the patient breathing normally?', type: 'yes_no' },
    { id: 'med-bleeding', text: 'Is there severe bleeding?', type: 'yes_no' },
  ],
  security: [
    { id: 'sec-weapon', text: 'Is a weapon involved?', type: 'yes_no' },
    { id: 'sec-injured', text: 'Is anyone injured?', type: 'yes_no' },
  ],
  fire: [
    { id: 'fire-trapped', text: 'Is anyone trapped inside?', type: 'yes_no' },
    { id: 'fire-spreading', text: 'Is the fire spreading?', type: 'yes_no' },
  ],
  hazard: [
    { id: 'haz-chemical', text: 'Are chemicals involved?', type: 'yes_no' },
    { id: 'haz-evacuated', text: 'Has the area been evacuated?', type: 'yes_no' },
  ],
}

// Crude stand-in for the server's rule table: a "yes" on the first question of
// each protocol is the dangerous answer except for the two inverted ones.
const INVERTED = new Set(['med-conscious', 'med-breathing', 'haz-evacuated'])

function scoreAnswers(answers: TriageAnswer[]): TriageScore {
  let score = 0
  const flags: string[] = []
  for (const a of answers) {
    const dangerous = INVERTED.has(a.questionId) ? a.value === false : a.value === true
    if (dangerous) {
      score += 40
      flags.push(a.questionId)
    }
  }
  score = Math.min(100, score)
  return {
    score,
    level: score >= 70 ? 'critical' : score >= 40 ? 'serious' : 'stable',
    flags,
    recommendations: flags.length ? ['Escalate to nearest available unit'] : [],
  }
}

const now = () => new Date().toISOString()

function seedIncident(over: Partial<Incident>): Incident {
  return {
    id: id(),
    agencyId: 'agency-medical',
    type: 'medical',
    priority: 'critical',
    status: 'created',
    location: { lat: 6.5244, lng: 3.3792 },
    assignedUnitIds: [],
    hospitalId: null,
    hospitalAlerted: false,
    riskScore: 0,
    flagged: false,
    notes: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
    ...over,
  }
}

export class MockApiClient implements ApiClient {
  private incidents: Incident[] = [
    seedIncident({
      id: 'inc-001',
      type: 'medical',
      priority: 'critical',
      status: 'dispatched',
      assignedUnitIds: ['unit-amb-001'],
      version: 3,
    }),
    seedIncident({
      id: 'inc-002',
      agencyId: 'agency-security',
      type: 'security',
      priority: 'serious',
      status: 'triaging',
      location: { lat: 6.4281, lng: 3.4219 },
      version: 2,
    }),
    seedIncident({
      id: 'inc-003',
      agencyId: 'agency-fire',
      type: 'fire',
      priority: 'critical',
      status: 'en_route',
      location: { lat: 6.6018, lng: 3.3515 },
      assignedUnitIds: ['unit-fire-001'],
      version: 4,
    }),
  ]

  private units: Unit[] = [
    {
      id: 'unit-amb-001',
      agencyId: 'agency-medical',
      type: 'ambulance',
      callSign: 'AMB-01',
      status: 'assigned',
      location: { lat: 6.52, lng: 3.38 },
      capabilities: ['ALS', 'defibrillator', 'oxygen'],
      updatedAt: now(),
    },
    {
      id: 'unit-amb-002',
      agencyId: 'agency-medical',
      type: 'ambulance',
      callSign: 'AMB-02',
      status: 'available',
      location: { lat: 6.595, lng: 3.335 },
      capabilities: ['BLS', 'oxygen'],
      updatedAt: now(),
    },
    {
      id: 'unit-pol-014',
      agencyId: 'agency-security',
      type: 'police',
      callSign: 'POL-14',
      status: 'available',
      location: { lat: 6.45, lng: 3.39 },
      capabilities: ['armed_response', 'body_cam'],
      updatedAt: now(),
    },
    {
      id: 'unit-fire-001',
      agencyId: 'agency-fire',
      type: 'fire',
      callSign: 'FIRE-07',
      status: 'available',
      location: { lat: 6.59, lng: 3.34 },
      capabilities: ['hazmat', 'ladder', 'rescue'],
      updatedAt: now(),
    },
  ]

  private hospitals: Hospital[] = [
    {
      id: 'hosp-001',
      name: 'Lagos University Teaching Hospital',
      location: { lat: 6.5175, lng: 3.3619 },
      capabilities: ['trauma', 'cardiac', 'burn'],
      availableBeds: 12,
      updatedAt: now(),
    },
    {
      id: 'hosp-002',
      name: 'Reddington Hospital Victoria Island',
      location: { lat: 6.4318, lng: 3.4219 },
      capabilities: ['cardiac', 'stroke'],
      availableBeds: 4,
      updatedAt: now(),
    },
  ]

  private dispatches: Dispatch[] = []
  private triage = new Map<string, TriageAnswer[]>()
  private telemetry = new Map<string, TelemetrySample[]>()
  private replayed = new Set<string>()

  private find(incidentId: string): Incident {
    const found = this.incidents.find((i) => i.id === incidentId)
    if (!found) throw new Error(`incident ${incidentId} not found`)
    return found
  }

  private touch(incident: Incident): Incident {
    incident.version += 1
    incident.updatedAt = now()
    return { ...incident }
  }

  // ------------------------------------------------------------- incidents

  async createIncident(data: CreateIncidentDTO, _idempotencyKey: string): Promise<Incident> {
    await delay()
    const incident = seedIncident({
      id: id(),
      agencyId: data.agencyId ?? 'unassigned',
      type: data.type,
      priority: data.priority ?? 'critical',
      status: 'created',
      location: data.location,
    })
    this.incidents = [incident, ...this.incidents]
    return { ...incident }
  }

  async getIncident(incidentId: string): Promise<Incident> {
    await delay(100)
    return { ...this.find(incidentId) }
  }

  async listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    await delay()
    const list = filters?.status
      ? this.incidents.filter((i) => i.status === filters.status)
      : this.incidents
    return list.map((i) => ({ ...i }))
  }

  async transitionIncident(
    incidentId: string,
    status: IncidentStatus,
    _expectedVersion: number,
  ): Promise<Incident> {
    await delay(150)
    const incident = this.find(incidentId)
    incident.status = status
    return this.touch(incident)
  }

  async addIncidentNote(incidentId: string, text: string): Promise<IncidentNote> {
    await delay(100)
    const incident = this.find(incidentId)
    const note: IncidentNote = { id: id(), actorId: 'mock-user', text, at: now() }
    incident.notes = [...incident.notes, note]
    this.touch(incident)
    return note
  }

  // -------------------------------------------------------------- dispatch

  async getAvailableUnits(query: UnitQuery): Promise<RankedUnit[]> {
    await delay()
    const types = query.type ? [query.type] : query.for ? UNITS_FOR[query.for] : null
    return this.units
      .filter((u) => u.status === 'available' && u.location !== null)
      .filter((u) => !types || types.includes(u.type))
      .map((u) => {
        const distanceKm = haversineKm(u.location as GeoPoint, query.near)
        return { ...u, distanceKm, etaMinutes: (distanceKm / AVG_SPEED_KMH) * 60 }
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, query.limit ?? Infinity)
  }

  async dispatchUnit(
    incidentId: string,
    unitId: string,
    _expectedVersion: number,
  ): Promise<Dispatch> {
    await delay()
    const incident = this.find(incidentId)
    const unit = this.units.find((u) => u.id === unitId)
    if (!unit) throw new Error(`unit ${unitId} not found`)

    unit.status = 'assigned'
    incident.assignedUnitIds = [...incident.assignedUnitIds, unitId]
    this.touch(incident)

    const dispatch: Dispatch = {
      id: id(),
      incidentId,
      unitId,
      dispatcherId: 'mock-dispatcher',
      status: 'pending',
      dispatchedAt: now(),
      acceptedAt: null,
    }
    this.dispatches.push(dispatch)
    return { ...dispatch }
  }

  private resolveDispatch(dispatchId: string): Dispatch {
    const found = this.dispatches.find((d) => d.id === dispatchId)
    if (!found) throw new Error(`dispatch ${dispatchId} not found`)
    return found
  }

  async acceptDispatch(dispatchId: string): Promise<Dispatch> {
    await delay(150)
    const dispatch = this.resolveDispatch(dispatchId)
    dispatch.status = 'accepted'
    dispatch.acceptedAt = now()
    return { ...dispatch }
  }

  async rejectDispatch(dispatchId: string): Promise<Dispatch> {
    await delay(150)
    const dispatch = this.resolveDispatch(dispatchId)
    dispatch.status = 'rejected'

    const unit = this.units.find((u) => u.id === dispatch.unitId)
    if (unit) unit.status = 'available'

    const incident = this.incidents.find((i) => i.id === dispatch.incidentId)
    if (incident) {
      incident.assignedUnitIds = incident.assignedUnitIds.filter((u) => u !== dispatch.unitId)
      this.touch(incident)
    }
    return { ...dispatch }
  }

  // ---------------------------------------------------------------- triage

  async getTriageQuestions(type: IncidentType): Promise<TriageQuestion[]> {
    await delay(100)
    return QUESTIONS[type].map((q) => ({ ...q }))
  }

  async submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore> {
    await delay()
    const incident = this.find(incidentId)
    this.triage.set(incidentId, answers)

    const score = scoreAnswers(answers)
    incident.priority = score.level
    if (incident.status === 'created') incident.status = 'triaging'
    this.touch(incident)
    return score
  }

  async getTriage(incidentId: string): Promise<Triage> {
    await delay(100)
    const incident = this.find(incidentId)
    const answers = this.triage.get(incidentId) ?? []
    return {
      incidentId,
      questions: QUESTIONS[incident.type].map((q) => ({ ...q })),
      answers,
      score: answers.length ? scoreAnswers(answers) : null,
    }
  }

  // ------------------------------------------------------------- telemetry

  async recordTelemetry(incidentId: string, sample: TelemetryInput): Promise<TelemetrySample> {
    await delay(100)
    this.find(incidentId)
    const stored: TelemetrySample = { ...sample, id: id(), incidentId, recordedAt: now() }
    this.telemetry.set(incidentId, [...(this.telemetry.get(incidentId) ?? []), stored])
    return { ...stored }
  }

  async getTelemetry(incidentId: string, query?: TelemetryQuery): Promise<TelemetrySample[]> {
    await delay(100)
    const from = query?.from ? Date.parse(query.from) : -Infinity
    const to = query?.to ? Date.parse(query.to) : Infinity
    return [...(this.telemetry.get(incidentId) ?? [])]
      .filter((s) => {
        const at = Date.parse(s.capturedAt)
        return at >= from && at <= to
      })
      .reverse()
      .slice(0, query?.limit ?? 20)
  }

  // -------------------------------------------------------------- hospital

  async getHospitals(query: HospitalQuery): Promise<RankedHospital[]> {
    await delay()
    return this.hospitals
      .filter((h) => h.availableBeds > 0)
      .filter((h) => !query.capability || h.capabilities.includes(query.capability))
      .map((h) => ({ ...h, distanceKm: haversineKm(h.location, query.near) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, query.limit ?? Infinity)
  }

  async selectHospital(incidentId: string, hospitalId: string): Promise<Incident> {
    await delay(150)
    const incident = this.find(incidentId)
    incident.hospitalId = hospitalId
    return this.touch(incident)
  }

  async alertHospital(incidentId: string): Promise<Incident> {
    await delay(150)
    const incident = this.find(incidentId)
    incident.hospitalAlerted = true
    return this.touch(incident)
  }

  async getHospitalActiveIncidents(): Promise<Incident[]> {
    await delay()
    return this.incidents
      .filter((i) => i.hospitalId !== null && i.status !== 'resolved' && i.status !== 'cancelled')
      .map((i) => ({ ...i }))
  }

  // --------------------------------------------------------------- offline

  async replay(incidentId: string, commands: ReplayCommand[]): Promise<ReplayResult[]> {
    await delay()
    const ordered = [...commands].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    const results: ReplayResult[] = []

    for (const command of ordered) {
      if (this.replayed.has(command.key)) {
        results.push({ key: command.key, applied: false, error: null })
        continue
      }
      try {
        switch (command.kind) {
          case 'status':
            await this.transitionIncident(incidentId, command.payload.status as IncidentStatus, 0)
            break
          case 'triage':
            await this.submitTriageAnswers(incidentId, command.payload.answers as TriageAnswer[])
            break
          case 'vitals':
            await this.recordTelemetry(incidentId, command.payload as unknown as TelemetryInput)
            break
          case 'note':
            await this.addIncidentNote(incidentId, String(command.payload.text))
            break
        }
        this.replayed.add(command.key)
        results.push({ key: command.key, applied: true, error: null })
      } catch (err) {
        // One failure never stops the batch.
        results.push({ key: command.key, applied: false, error: (err as Error).message })
      }
    }
    return results
  }
}
