import { expect, it } from 'vitest';
import { DemoApiClient } from './emergency';

it('retains a citizen request and retry identity across session restore', async () => {
  const api = new DemoApiClient();
  const input = { type: 'medical' as const, location: null, deviceId: 'demo-test' };
  const first = await api.createIncident(input, 'request-1');
  const retry = await api.createIncident(input, 'request-1');
  expect(retry.id).toBe(first.id);
  expect(first.status).toBe('created');
  const restored = new DemoApiClient(api.snapshot());
  restored.setRole('dispatcher');
  expect((await restored.listIncidents()).filter(i => i.id === first.id)).toHaveLength(1);
  expect((await restored.getIncident(first.id)).location).toBeNull();
  restored.setRole('citizen');
  expect((await restored.createIncident(input, 'request-1')).id).toBe(first.id);
});

it('hands the same request through dispatch, responder, hospital and closure', async () => {
  const api = new DemoApiClient();
  let incident = await api.createIncident({ type: 'medical', location: null, deviceId: 'test' }, 'journey');
  api.setRole('dispatcher');
  const dispatch = await api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version);
  expect((await api.getIncident(incident.id)).status).toBe('dispatched');
  expect(api.snapshot().data.units.find(u => u.id === 'demo-ambulance-02')?.status).toBe('assigned');
  api.setRole('responder');
  await api.acceptDispatch(dispatch.id);
  incident = await api.getIncident(incident.id);
  expect(incident.status).toBe('en_route');
  incident = await api.transitionIncident(incident.id, 'on_scene', incident.version);
  await api.recordTelemetry(incident.id, { kind: 'manual_vitals', capturedAt: '2026-11-14T10:00:00Z', payload: { heartRate: 88, spo2: 97 } });
  await api.addIncidentNote(incident.id, 'Sample handoff: patient conscious.');
  await api.selectHospital(incident.id, 'demo-hospital-01');
  await api.alertHospital(incident.id);
  api.setRole('hospital_staff');
  expect((await api.getHospitalActiveIncidents()).map(i => i.id)).toContain(incident.id);
  expect((await api.getTelemetry(incident.id))[0].payload).toEqual({ heartRate: 88, spo2: 97 });
  await api.confirmHospitalReady(incident.id);
  api.setRole('responder');
  incident = await api.getIncident(incident.id);
  incident = await api.transitionIncident(incident.id, 'transporting', incident.version);
  await api.arriveAtHospital(incident.id);
  api.setRole('hospital_staff');
  incident = await api.getIncident(incident.id);
  await api.transitionIncident(incident.id, 'resolved', incident.version);
  api.setRole('citizen');
  expect((await api.getIncident(incident.id)).status).toBe('resolved');
  expect((await api.getHospitalActiveIncidents()).map(i => i.id)).not.toContain(incident.id);
  expect(api.snapshot().data.units.find(u => u.id === 'demo-ambulance-02')?.status).toBe('available');
  const restored = new DemoApiClient(api.snapshot());
  expect(restored.isReady(incident.id)).toBe(true);
  expect(restored.hasArrived(incident.id)).toBe(true);
  expect((await restored.getTelemetry(incident.id))[0].payload).toEqual({ heartRate: 88, spo2: 97 });
  expect((await restored.getIncident(incident.id)).notes).toEqual(expect.arrayContaining([
    expect.objectContaining({ actorId: 'demo-responder', text: 'Sample handoff: patient conscious.' }),
    expect.objectContaining({ actorId: 'demo-hospital', text: expect.stringContaining('handoff') }),
  ]));
}, 20000);

it('rejects invalid roles, stale dispatch and transport before hospital readiness', async () => {
  const api = new DemoApiClient();
  let incident = await api.createIncident({ type: 'medical', location: null, deviceId: 'test' }, 'guarded');
  await expect(api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version)).rejects.toThrow(/Switch/);
  api.setRole('dispatcher');
  await expect(api.dispatchUnit(incident.id, 'demo-ambulance-02', 0)).rejects.toThrow(/changed/);
  const assignment = await api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version);
  await expect(api.dispatchUnit(incident.id, 'demo-ambulance-01', incident.version)).rejects.toThrow();
  api.setRole('responder');
  await api.acceptDispatch(assignment.id);
  await expect(api.acceptDispatch(assignment.id)).rejects.toThrow(/already/);
  incident = await api.getIncident(incident.id);
  incident = await api.transitionIncident(incident.id, 'on_scene', incident.version);
  await expect(api.transitionIncident(incident.id, 'transporting', incident.version)).rejects.toThrow(/readiness/);
  api.setRole('hospital_staff');
  await expect(api.confirmHospitalReady(incident.id)).rejects.toThrow(/incoming/);
  await expect(api.transitionIncident(incident.id, 'resolved', incident.version)).rejects.toThrow(/arrival/);
  api.setRole('admin');
  await expect(api.setFleetAvailability('demo-ambulance-02', false)).rejects.toThrow(/assigned/);
  expect((await api.getIncident(incident.id)).status).toBe('on_scene');
}, 15000);

it('returns declined assignments to the queue and respects admin fleet availability', async () => {
  const saved = new DemoApiClient().snapshot();
  saved.data.units.find(u => u.id === 'demo-ambulance-02')!.status = 'out_of_service';
  const api = new DemoApiClient(saved);
  const incident = await api.createIncident({ type: 'medical', location: null, deviceId: 'test' }, 'declined');
  api.setRole('dispatcher');
  await expect(api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version)).rejects.toThrow(/available/);
  api.setRole('admin');
  await api.setFleetAvailability('demo-ambulance-02', true);
  api.setRole('dispatcher');
  const assignment = await api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version);
  api.setRole('responder');
  await api.rejectDispatch(assignment.id);
  const queued = await api.getIncident(incident.id);
  expect(queued.status).toBe('triaging');
  expect(queued.assignedUnitIds).toEqual([]);
  api.setRole('citizen');
  await api.transitionIncident(incident.id, 'cancelled', queued.version);
  expect((await api.getIncident(incident.id)).status).toBe('cancelled');
  expect(api.snapshot().data.units.find(u => u.id === 'demo-ambulance-02')?.status).toBe('available');
}, 15000);

it('coalesces simultaneous SOS retries into one request', async () => {
  const api = new DemoApiClient();
  const input = { type: 'medical' as const, location: null, deviceId: 'test' };
  const [first, second] = await Promise.all([api.createIncident(input, 'same'), api.createIncident(input, 'same')]);
  expect(first.id).toBe(second.id);
  expect((await api.listIncidents()).filter(i => !i.id.startsWith('demo-'))).toHaveLength(1);
});

it('requires the sample assessment before hospital selection and prevents a second active walkthrough', async () => {
  const api = new DemoApiClient();
  let incident = await api.createIncident({ type: 'medical', location: null, deviceId: 'test' }, 'ordered');
  await expect(api.createIncident({ type: 'medical', location: null, deviceId: 'test' }, 'skip-ahead')).rejects.toThrow(/current.*walkthrough/i);
  await expect(api.transitionIncident('demo-medical-awaiting', 'cancelled', 1)).rejects.toThrow(/read-only/);
  api.setRole('admin');
  await expect(api.setFleetAvailability('demo-ambulance-02', false)).rejects.toThrow(/current walkthrough/);
  expect(api.snapshot().data.units.find(u => u.id === 'demo-ambulance-02')?.status).toBe('available');
  api.setRole('dispatcher');
  const assignment = await api.dispatchUnit(incident.id, 'demo-ambulance-02', incident.version);
  api.setRole('citizen');
  await expect(api.submitTriageAnswers(incident.id, [{ questionId: 'med-conscious', value: true }])).rejects.toThrow(/before dispatch/);
  api.setRole('admin');
  await expect(api.setFleetAvailability('demo-ambulance-01', false)).rejects.toThrow();
  api.setRole('responder');
  await api.acceptDispatch(assignment.id);
  incident = await api.getIncident(incident.id);
  await api.transitionIncident(incident.id, 'on_scene', incident.version);
  await expect(api.selectHospital(incident.id, 'demo-hospital-01')).rejects.toThrow(/vitals/i);
  expect((await api.getIncident(incident.id)).hospitalId).toBeNull();
}, 10000);
