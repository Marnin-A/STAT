import {
  MockApiClient, type MockSnapshot, type Role, type CreateIncidentDTO,
  type IncidentStatus, type Incident, type TelemetryInput, type TriageAnswer,
  type IncidentFilters, type ReplayCommand,
} from '@stat/shared';
import { createDemoData } from './fixtures';
import { nextDemoStep, type DemoStepId } from './flow';

export interface DemoAudit {
  id: string; actorId: string; role: Role; incidentId: string | null; text: string; at: string;
}
export interface DemoSnapshot {
  data: MockSnapshot;
  requests: [string, string][];
  ready: string[];
  arrived: string[];
  audit: DemoAudit[];
}
const actors = Object.fromEntries(createDemoData().users.map(u => [u.role, u.id]));
const ended = (i: Incident) => ['resolved', 'cancelled'].includes(i.status);

/** Synthetic same-tab scenario. Role checks guide a demo, not authentication. */
export class DemoApiClient extends MockApiClient {
  private role: Role = 'citizen';
  private requests: Map<string, string>;
  private ready: Set<string>;
  private arrived: Set<string>;
  private audit: DemoAudit[];
  private listeners = new Set<() => void>();
  private revision = 0;
  busy = false;
  private pendingRequests = new Map<string, Promise<Incident>>();

  constructor(saved?: DemoSnapshot) {
    super(saved?.data ?? createDemoData());
    this.requests = new Map(saved?.requests ?? []);
    this.ready = new Set(saved?.ready ?? []);
    this.arrived = new Set(saved?.arrived ?? []);
    this.audit = saved?.audit ? structuredClone(saved.audit) : [];
  }
  setRole(role: Role) {
    if (this.busy) throw new Error('Wait for the current action to finish.');
    this.role = role;
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getRevision = () => this.revision;
  private changed() { this.revision++; this.listeners.forEach(fn => fn()); }
  snapshot(): DemoSnapshot {
    return { data: this.exportSnapshot(), requests: [...this.requests], ready: [...this.ready], arrived: [...this.arrived], audit: structuredClone(this.audit) };
  }
  journey() {
    const state = this.snapshot();
    const id = state.requests.slice(-1)[0]?.[1];
    const incident = state.data.incidents.find(i => i.id === id);
    return { incident, step: nextDemoStep(state, incident) };
  }
  canSubmitTriage(id: string) {
    const { incident } = this.journey();
    return incident?.id === id && (
      (['citizen', 'dispatcher'].includes(this.role) && ['created', 'triaging'].includes(incident.status)) ||
      (this.role === 'responder' && incident.status === 'on_scene')
    );
  }
  canAddNote(id: string) {
    const { incident } = this.journey();
    if (incident?.id !== id || ended(incident)) return false;
    if (['citizen', 'dispatcher'].includes(this.role)) return ['created', 'triaging'].includes(incident.status);
    if (this.role === 'responder') return ['en_route', 'on_scene', 'transporting'].includes(incident.status);
    return this.role === 'hospital_staff' && incident.hospitalAlerted;
  }
  private currentJourney(id: string) {
    this.require(this.journey().incident?.id === id, 'Sample and previous cases are read-only. Continue the current demo walkthrough.');
  }
  private requireStep(id: string, expected: DemoStepId) {
    this.currentJourney(id);
    const { step } = this.journey();
    this.require(step.id === expected, `Next demo action: ${step.label}.`);
  }
  isReady(id: string) { return this.ready.has(id); }
  hasArrived(id: string) { return this.arrived.has(id); }
  isCitizenRequest(id: string) { return id.startsWith('demo-medical-') || [...this.requests.values()].includes(id); }
  private allow(...roles: Role[]) {
    if (!roles.includes(this.role)) throw new Error('Switch to the relevant demo account for this action.');
  }
  private require(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
  }
  private async mutate<T>(run: () => Promise<T>): Promise<T> {
    this.require(!this.busy, 'Another action is in progress. Refresh and try again.');
    this.busy = true; this.changed();
    try { return await run(); }
    finally { this.busy = false; this.changed(); }
  }
  private async log(incidentId: string | null, text: string) {
    const at = new Date().toISOString();
    this.audit.push({ id: crypto.randomUUID(), actorId: actors[this.role], role: this.role, incidentId, text, at });
    if (incidentId) await super.addIncidentNote(incidentId, text, actors[this.role]);
  }
  private async current(id: string, version?: number) {
    const incident = await super.getIncident(id);
    this.require(version === undefined || version === incident.version, 'This case changed. Refresh before trying again.');
    return incident;
  }
  override async createIncident(data: CreateIncidentDTO, key: string): Promise<Incident> {
    this.allow('citizen');
    const pending = this.pendingRequests.get(key);
    if (pending) return pending;
    const previous = this.requests.get(key);
    if (previous) return this.getIncident(previous);
    const task = this.mutate(async () => {
      const current = this.journey().incident;
      this.require(!current || ended(current), 'Finish the current demo walkthrough before starting another request.');
      this.require(data.type === 'medical', 'This demo journey supports medical requests.');
      const incident = await super.createIncident(data, key);
      this.requests.set(key, incident.id);
      await this.log(incident.id, 'Medical help requested. Awaiting dispatcher review.');
      return super.getIncident(incident.id);
    });
    this.pendingRequests.set(key, task);
    void task.finally(() => this.pendingRequests.delete(key)).catch(() => { });
    return task;
  }
  override async listIncidents(filters?: IncidentFilters) {
    return (await super.listIncidents(filters)).filter(i => !filters?.type || i.type === filters.type);
  }
  override dispatchUnit(id: string, unitId: string, version: number) {
    return this.mutate(async () => {
      this.allow('dispatcher');
      const incident = await this.current(id, version);
      this.require(['created', 'triaging'].includes(incident.status), 'Only an awaiting-review case can be dispatched.');
      const unit = this.exportSnapshot().units.find(u => u.id === unitId);
      this.require(unit?.status === 'available' && unit.type === 'ambulance', 'Choose an available demo ambulance.');
      this.requireStep(id, 'assign');
      const dispatch = await super.dispatchUnit(id, unitId, version, actors[this.role]);
      await super.transitionIncident(id, 'dispatched', 0);
      await this.log(id, `${unit.callSign} assigned. Awaiting responder acceptance.`);
      return dispatch;
    });
  }
  private dispatch(id: string) {
    const dispatch = this.exportSnapshot().dispatches?.find(d => d.id === id);
    this.require(dispatch?.status === 'pending', 'This assignment has already been handled.');
    return dispatch;
  }
  override acceptDispatch(id: string) {
    return this.mutate(async () => {
      this.allow('responder');
      const pending = this.dispatch(id);
      const incident = await this.current(pending.incidentId);
      this.require(incident.status === 'dispatched', 'The case is no longer awaiting acceptance.');
      this.requireStep(incident.id, 'accept');
      const dispatch = await super.acceptDispatch(id);
      await super.transitionIncident(incident.id, 'en_route', 0);
      await this.log(incident.id, 'Assignment accepted. Responder en route.');
      return dispatch;
    });
  }
  override rejectDispatch(id: string) {
    return this.mutate(async () => {
      this.allow('responder');
      const pending = this.dispatch(id);
      this.requireStep(pending.incidentId, 'accept');
      const dispatch = await super.rejectDispatch(id);
      await super.transitionIncident(pending.incidentId, 'triaging', 0);
      await this.log(pending.incidentId, 'Assignment declined. Returned to dispatcher queue; ambulance released.');
      return dispatch;
    });
  }
  override transitionIncident(id: string, status: IncidentStatus, version: number) {
    return this.mutate(async () => {
      const incident = await this.current(id, version);
      this.currentJourney(id);
      if (status === 'cancelled') {
        this.allow('citizen');
        this.require(this.isCitizenRequest(id) && ['created', 'triaging'].includes(incident.status), 'Only your unassigned request can be cancelled.');
      } else if (status === 'on_scene') {
        this.allow('responder');
        this.require(incident.status === 'en_route', 'Accept the assignment before marking arrival.');
        this.requireStep(id, 'scene');
      } else if (status === 'transporting') {
        this.allow('responder');
        this.require(incident.status === 'on_scene' && incident.hospitalAlerted && this.ready.has(id), 'Arrive on scene and wait for hospital readiness before transport.');
        this.requireStep(id, 'transport');
      } else if (status === 'resolved') {
        this.allow('hospital_staff');
        this.require(incident.status === 'transporting' && this.arrived.has(id) && this.ready.has(id), 'Wait for hospital arrival before completing handoff.');
        this.requireStep(id, 'handoff');
      } else throw new Error('Use the next action for this demo case.');
      await super.transitionIncident(id, status, version);
      if (status === 'resolved') for (const unitId of incident.assignedUnitIds) super.setUnitStatus(unitId, 'available');
      await this.log(id, status === 'resolved' ? 'Patient received; hospital handoff completed. Case resolved; ambulance released.' : `Case status: ${status.replace(/_/g, ' ')}.`);
      return super.getIncident(id);
    });
  }
  override submitTriageAnswers(id: string, answers: TriageAnswer[]) {
    return this.mutate(async () => {
      this.allow('citizen', 'dispatcher', 'responder');
      const incident = await this.current(id);
      this.currentJourney(id);
      this.require(!ended(incident), 'This case has ended.');
      this.require(this.canSubmitTriage(id), 'Save response questions before dispatch or while the responder is on scene.');
      this.require(answers.length > 0, 'Answer at least one response question.');
      const score = await super.submitTriageAnswers(id, answers);
      await this.log(id, `Response questions saved. Sample protocol priority: ${score.level}.`);
      return score;
    });
  }
  override addIncidentNote(id: string, text: string) {
    return this.mutate(async () => {
      this.allow('citizen', 'dispatcher', 'responder', 'hospital_staff');
      const incident = await this.current(id);
      this.currentJourney(id);
      this.require(!ended(incident), 'This case has ended.');
      this.require(this.canAddNote(id), 'Add handoff notes during your account’s part of the response.');
      this.require(text.trim() && text.trim().length <= 2000, 'Enter a note of 1–2000 characters.');
      const note = await super.addIncidentNote(id, text.trim(), actors[this.role]);
      this.audit.push({ ...note, actorId: actors[this.role], role: this.role, incidentId: id });
      return note;
    });
  }
  override recordTelemetry(id: string, input: TelemetryInput) {
    return this.mutate(async () => {
      this.allow('responder');
      const incident = await this.current(id);
      this.require(['on_scene', 'transporting'].includes(incident.status), 'Arrive on scene before recording sample vitals.');
      this.requireStep(id, 'vitals');
      const { heartRate, spo2 } = input.payload;
      this.require(typeof heartRate === 'number' && Number.isFinite(heartRate) && heartRate >= 1 && heartRate <= 300 && typeof spo2 === 'number' && Number.isFinite(spo2) && spo2 >= 1 && spo2 <= 100, 'Enter heart rate 1–300 and SpO2 1–100.');
      const sample = await super.recordTelemetry(id, input);
      await this.log(id, `Manual sample vitals recorded: pulse ${heartRate} bpm; SpO2 ${spo2}%.`);
      return sample;
    });
  }
  override selectHospital(id: string, hospitalId: string) {
    return this.mutate(async () => {
      this.allow('responder');
      const incident = await this.current(id);
      this.require(incident.status === 'on_scene' && !incident.hospitalAlerted, 'Select the receiving hospital while on scene, before sending the alert.');
      this.require(this.exportSnapshot().hospitals.some(h => h.id === hospitalId && h.availableBeds > 0), 'Choose an available demo hospital.');
      this.requireStep(id, 'hospital');
      await super.selectHospital(id, hospitalId);
      this.ready.delete(id);
      await this.log(id, 'Demo Mainland Care Centre selected for handoff.');
      return super.getIncident(id);
    });
  }
  override alertHospital(id: string) {
    return this.mutate(async () => {
      this.allow('responder');
      const incident = await this.current(id);
      this.require(incident.status === 'on_scene' && incident.hospitalId, 'Select a hospital before sending a pre-arrival alert.');
      this.require(!incident.hospitalAlerted, 'Hospital already alerted.');
      this.requireStep(id, 'alert');
      await super.alertHospital(id);
      await this.log(id, 'Pre-arrival alert sent to the demo hospital queue.');
      return super.getIncident(id);
    });
  }
  override async getHospitalActiveIncidents() {
    return (await super.getHospitalActiveIncidents()).filter(i => i.hospitalAlerted);
  }
  confirmHospitalReady(id: string) {
    return this.mutate(async () => {
      this.allow('hospital_staff');
      const incident = await this.current(id);
      this.require(!ended(incident) && incident.hospitalAlerted && incident.hospitalId === 'demo-hospital-01', 'This case is not in your incoming queue.');
      this.require(!this.ready.has(id), 'Readiness already confirmed.');
      this.requireStep(id, 'ready');
      this.ready.add(id);
      await this.log(id, 'Hospital ready. Receiving bay and team confirmed.');
    });
  }
  arriveAtHospital(id: string) {
    return this.mutate(async () => {
      this.allow('responder');
      const incident = await this.current(id);
      this.require(incident.status === 'transporting' && !this.arrived.has(id), 'Start transport before recording hospital arrival.');
      this.requireStep(id, 'arrival');
      this.arrived.add(id);
      await this.log(id, 'Arrived at the hospital. Awaiting receiving staff handoff.');
    });
  }
  setFleetAvailability(unitId: string, available: boolean) {
    return this.mutate(async () => {
      this.allow('admin');
      const unit = this.exportSnapshot().units.find(u => u.id === unitId);
      this.require(unit && unit.status !== 'assigned', 'An assigned ambulance cannot be taken out of service.');
      const { step } = this.journey();
      this.require(step.id === 'complete' || (step.id === 'fleet' && available), 'Follow the current walkthrough. Fleet changes are available after handoff, or to restore blocked dispatch.');
      super.setUnitStatus(unitId, available ? 'available' : 'out_of_service');
      await this.log(null, `${unit.callSign}: ${available ? 'available' : 'out of service'}.`);
    });
  }
  override async replay(_id: string, _commands: ReplayCommand[]): Promise<never> {
    throw new Error('Use the demo workspace actions to update this scenario.');
  }
}
