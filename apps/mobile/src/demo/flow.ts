import type { Incident, Role } from '@stat/shared';
import type { DemoSnapshot } from './emergency';

export type DemoStepId = 'request' | 'assign' | 'accept' | 'scene' | 'vitals' | 'hospital' | 'alert' | 'ready' | 'transport' | 'arrival' | 'handoff' | 'complete' | 'cancelled' | 'fleet';
export interface DemoStep {
  id: DemoStepId;
  number: number;
  role: Role;
  label: string;
  help: string;
}
const steps: Record<DemoStepId, DemoStep> = {
  request: { id: 'request', number: 1, role: 'citizen', label: 'Request medical help', help: 'Start one new medical request as the demo citizen.' },
  assign: { id: 'assign', number: 2, role: 'dispatcher', label: 'Assign an available ambulance', help: 'Review this request, then assign the available ambulance.' },
  accept: { id: 'accept', number: 3, role: 'responder', label: 'Accept assignment', help: 'The assigned responder must accept before travelling to the scene.' },
  scene: { id: 'scene', number: 4, role: 'responder', label: 'Arrived on scene', help: 'Record arrival before assessing the sample patient.' },
  vitals: { id: 'vitals', number: 5, role: 'responder', label: 'Save sample vitals', help: 'Enter sample heart rate and SpO2 before selecting the receiving hospital. This is a demo checkpoint.' },
  hospital: { id: 'hospital', number: 6, role: 'responder', label: 'Select the receiving hospital', help: 'Select Demo Mainland Care Centre after recording the sample assessment.' },
  alert: { id: 'alert', number: 7, role: 'responder', label: 'Alert receiving hospital', help: 'Send the selected hospital a pre-arrival alert.' },
  ready: { id: 'ready', number: 8, role: 'hospital_staff', label: 'Confirm hospital ready', help: 'Review the incoming notes and sample vitals, then confirm the receiving team is ready.' },
  transport: { id: 'transport', number: 9, role: 'responder', label: 'Start transport', help: 'Hospital readiness is confirmed. Begin the demo transport.' },
  arrival: { id: 'arrival', number: 10, role: 'responder', label: 'Arrived at hospital', help: 'Record hospital arrival before receiving staff can complete handoff.' },
  handoff: { id: 'handoff', number: 11, role: 'hospital_staff', label: 'Complete patient handoff', help: 'Receive the sample patient. This resolves the request and releases the ambulance.' },
  complete: { id: 'complete', number: 11, role: 'citizen', label: 'Review your completed request', help: 'The handoff is complete. Review the citizen receipt, then switch to Administrator to inspect the audit.' },
  cancelled: { id: 'cancelled', number: 1, role: 'citizen', label: 'Start a new walkthrough', help: 'This request was cancelled. Start a new medical request or reset the demo.' },
  fleet: { id: 'fleet', number: 2, role: 'admin', label: 'Restore an available ambulance', help: 'Dispatch is blocked. Make an unassigned ambulance available, then return to Dispatcher.' },
};

/** One ordering shared by command guards, guidance and action highlighting. */
export function nextDemoStep(state: DemoSnapshot, incident?: Incident): DemoStep {
  if (!incident) return steps.request;
  switch (incident.status) {
    case 'created':
    case 'triaging': return state.data.units.some(u => u.type === 'ambulance' && u.status === 'available') ? steps.assign : steps.fleet;
    case 'dispatched': return steps.accept;
    case 'en_route': return steps.scene;
    case 'on_scene': {
      const samples = state.data.telemetry?.find(([id]) => id === incident.id)?.[1] ?? [];
      if (!samples.length) return steps.vitals;
      if (!incident.hospitalId) return steps.hospital;
      if (!incident.hospitalAlerted) return steps.alert;
      return state.ready.includes(incident.id) ? steps.transport : steps.ready;
    }
    case 'transporting': return state.arrived.includes(incident.id) ? steps.handoff : steps.arrival;
    case 'resolved': return steps.complete;
    case 'cancelled': return steps.cancelled;
  }
}
