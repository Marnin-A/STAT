export type IncidentStatus =
  | 'created'
  | 'triaging'
  | 'dispatched'
  | 'en_route'
  | 'on_scene'
  | 'transporting'
  | 'resolved'
  | 'cancelled'

export type IncidentType = 'medical' | 'security' | 'fire' | 'hazard'

export type Priority = 'critical' | 'serious' | 'stable'

export type UnitType = 'ambulance' | 'police' | 'fire' | 'rescue'

export type UnitStatus = 'available' | 'standby' | 'busy' | 'offline'

export type ResponderRole = 'citizen' | 'responder' | 'dispatcher' | 'hospital_staff' | 'admin'

export interface Location {
  lat: number
  lng: number
  address?: string
}

export interface Agency {
  id: string
  name: string
  type: 'police' | 'fire' | 'medical'
}

export interface Incident {
  id: string
  agencyId: string
  type: IncidentType
  priority: Priority
  status: IncidentStatus
  location: Location
  reporterId: string
  assignedUnitIds: string[]
  hospitalId?: string
  riskScore?: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  version: number
}

export interface Unit {
  id: string
  agencyId: string
  type: UnitType
  callSign: string
  homeStation: string
  status: UnitStatus
  location: Location
  capabilities: string[]
  currentIncidentId?: string
}

export interface Patient {
  id: string
  incidentId: string
  approximateAge?: number
  sex?: 'M' | 'F' | 'unknown'
  condition?: string
  triageScore?: number
  notes: string[]
}

export interface Vital {
  label: string
  value: string | number
  unit: string
  trend: 'up' | 'down' | 'flat'
  critical?: boolean
}

export interface TelemetrySample {
  id: string
  incidentId: string
  patientId?: string
  unitId?: string
  kind: string
  capturedAt: string
  recordedAt: string
  payload: Record<string, unknown>
}

export interface TriageQuestion {
  id: string
  text: string
  type: 'yes_no' | 'multiple_choice' | 'text'
  options?: string[]
}

export interface TriageAnswer {
  questionId: string
  value: string | boolean
}

export interface TriageScore {
  score: number
  level: 'critical' | 'serious' | 'stable'
  flags: string[]
  recommendations: string[]
}

export interface Triage {
  incidentId: string
  questions: TriageQuestion[]
  answers: TriageAnswer[]
  score?: TriageScore
}

export interface ChatMessage {
  id: string
  incidentId: string
  senderId: string
  senderName: string
  message: string
  timestamp: string
  isOwn: boolean
}

export interface Dispatch {
  id: string
  incidentId: string
  unitId: string
  dispatcherId: string
  status: 'pending' | 'accepted' | 'rejected'
  dispatchedAt: string
  acceptedAt?: string
}

export interface Hospital {
  id: string
  name: string
  location: Location
  specialties: string[]
  bedAvailability: number
}

export interface CreateIncidentDTO {
  type: IncidentType
  location: Location
  description?: string
}

export interface IncidentFilters {
  status?: IncidentStatus
  type?: IncidentType
  priority?: Priority
}

export interface UnitQuery {
  near?: Location
  type?: UnitType
  available?: boolean
}
