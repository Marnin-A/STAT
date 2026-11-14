import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Incident } from '@stat/shared';
import { useDemo } from './DemoProvider';

const labels: Record<Incident['status'], string> = {
  created: 'Awaiting dispatcher review', triaging: 'Awaiting dispatcher review',
  dispatched: 'Awaiting responder acceptance', en_route: 'Responder en route',
  on_scene: 'Responder on scene', transporting: 'Transporting to hospital',
  resolved: 'Handoff complete', cancelled: 'Request cancelled',
};
export function DemoCase({ incident }: { incident: Incident; }) {
  const demo = useDemo()!;
  const { api, user } = demo;
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [note, setNote] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const data = api.snapshot().data;
  const dispatch = data.dispatches?.find(d => d.incidentId === incident.id && d.status === 'pending');
  const journey = api.journey();
  const interactive = journey.incident?.id === incident.id;
  const step = journey.step;
  const ownStep = interactive && step.role === user.role;
  const active = !['resolved', 'cancelled'].includes(incident.status);
  const ready = api.isReady(incident.id), arrived = api.hasArrived(incident.id);
  const samples = data.telemetry?.find(([id]) => id === incident.id)?.[1] ?? [];
  const hospital = data.hospitals.find(h => h.id === incident.hospitalId);
  async function run(action: () => Promise<unknown>, success = 'Action saved.') {
    setError(''); setFeedback('');
    try { await action(); setFeedback(success); }
    catch (err) { setError(err instanceof Error ? err.message : 'Action failed. Please try again.'); }
  }
  function action(label: string, fn: () => Promise<unknown>, primary = true): ReactNode {
    return <button className={primary && ownStep ? "secondary-action demo-next-action" : "secondary-action"} id={primary && ownStep ? "demo-next-action" : undefined} aria-describedby={primary && ownStep ? "demo-next-instruction" : undefined} disabled={api.busy || !interactive} onClick={() => void run(fn)}>{label}</button>;
  }
  return <article className="data-panel demo-case" aria-label={'Request ' + incident.id}>
    <header>
      <span className="eyebrow">{incident.id.startsWith('demo-') ? 'Sample case' : 'Your demo request'} · {incident.priority}</span>
      <h2>{labels[incident.status]}</h2>
      <p className="case-id">{incident.id}</p>
    </header>
    <dl className="data-grid">
      <div>
        <dt>Citizen</dt>
        <dd>Amara Bello · fictional</dd>
      </div>
      <div>
        <dt>Ambulance</dt>
        <dd>{incident.assignedUnitIds.map(id => data.units.find(u => u.id === id)?.callSign ?? id).join(', ') || 'Not assigned'}</dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>{incident.location ? `${incident.location.lat}, ${incident.location.lng} · sample coordinates` : 'Not shared · dispatcher can coordinate by notes'}</dd>
      </div>
      <div>
        <dt>Receiving hospital</dt>
        <dd>{hospital?.name ?? 'Not selected'}</dd>
      </div>
    </dl>
    {hospital && <p className="demo-handoff">{ready ? 'Hospital ready' : incident.hospitalAlerted ? 'Awaiting hospital readiness' : 'Hospital not yet alerted'}{arrived ? ' · Patient at hospital' : ''}</p>}
    {interactive && user.role === 'citizen' && <>
      <Link className="quiet-link" to={'/triage/' + incident.id}>View request status &amp; response questions</Link>
      {['created', 'triaging'].includes(incident.status) && <details><summary>Alternative: cancel this request</summary>{action('Cancel this request', () => api.transitionIncident(incident.id, 'cancelled', incident.version), false)}</details>}
    </>}
    {interactive && user.role === 'dispatcher' && step.id === 'assign' && <section aria-label="Dispatch actions" className="demo-actions">
      <p>Review the request. Assign an available ambulance; the responder must accept.</p>
      {data.units.filter(u => u.status === 'available' && u.type === 'ambulance').map((unit, index) => <span key={unit.id}>{action('Assign ' + unit.callSign, () => api.dispatchUnit(incident.id, unit.id, incident.version), index === 0)}</span>)}
      {!data.units.some(u => u.status === 'available' && u.type === 'ambulance') && <p role="status">No available ambulance. Complete an active handoff, or switch to Administrator to restore an unassigned unit.</p>}
      <Link className="quiet-link" to={'/triage/' + incident.id}>Review response questions</Link>
    </section>}
    {interactive && user.role === 'responder' && active && <section aria-label="Responder actions" className="demo-actions">
      {dispatch && step.id === 'accept' && <>{action('Accept assignment', () => api.acceptDispatch(dispatch.id))}<details><summary>Alternative: decline this assignment</summary>{action('Decline assignment', () => api.rejectDispatch(dispatch.id), false)}</details></>}
      {step.id === 'scene' && action('Arrived on scene', () => api.transitionIncident(incident.id, 'on_scene', incident.version))}
      {step.id === 'vitals' && <form id="demo-next-action" tabIndex={-1} className="demo-form demo-vitals-step" onSubmit={e => { e.preventDefault(); void run(() => api.recordTelemetry(incident.id, { kind: 'manual_vitals', capturedAt: new Date().toISOString(), payload: { heartRate: Number(heartRate), spo2: Number(spo2) } }), 'Sample vitals saved.'); }}>
        <h3>Manual sample vitals</h3>
        <p>Simulation values only.</p>
        <label>Heart rate (bpm)<input type="number" min="1" max="300" required value={heartRate} onChange={e => setHeartRate(e.target.value)} />
        </label>
        <label>SpO2 (%)<input type="number" min="1" max="100" required value={spo2} onChange={e => setSpo2(e.target.value)} />
        </label>
        <button className="secondary-action demo-next-action" aria-describedby="demo-next-instruction" disabled={api.busy}>Save sample vitals</button>
      </form>}
      {incident.status === 'on_scene' && <>
        {step.id === 'hospital' && data.hospitals.filter(h => h.availableBeds > 0).map(h => <span key={h.id}>{action('Select ' + h.name, () => api.selectHospital(incident.id, h.id))}</span>)}
        {step.id === 'alert' && action('Alert receiving hospital', () => api.alertHospital(incident.id))}
        {incident.hospitalAlerted && !ready && <p role="status">Switch to Hospital staff to confirm readiness.</p>}
        {step.id === 'transport' && action('Start transport', () => api.transitionIncident(incident.id, 'transporting', incident.version))}
      </>}
      {step.id === 'arrival' && action('Arrived at hospital', () => api.arriveAtHospital(incident.id))}
      {arrived && <p>Switch to Hospital staff to complete the patient handoff.</p>}
      {!incident.assignedUnitIds.length && <p>Awaiting dispatcher assignment.</p>}
    </section>}
    {interactive && user.role === 'hospital_staff' && active && incident.hospitalAlerted && <section aria-label="Hospital actions" className="demo-actions">
      {step.id === 'ready' && action('Confirm hospital ready', () => api.confirmHospitalReady(incident.id))}
      {ready && !arrived && <p>Receiving team ready. Switch to Responder to record transport and arrival.</p>}
      {step.id === 'handoff' && action('Complete patient handoff', () => api.transitionIncident(incident.id, 'resolved', incident.version))}
    </section>}
    {samples.length > 0 && <section aria-label="Recorded sample vitals">
      <h3>Recorded sample vitals</h3>{[...samples].reverse().map(s => <p key={s.id}>{String(s.payload.heartRate)} bpm · SpO2 {String(s.payload.spo2)}%<br />
        <small>Manually entered · {new Date(s.capturedAt).toLocaleString()}</small>
      </p>)}</section>}
    {api.canAddNote(incident.id) && <form className="demo-form" onSubmit={e => { e.preventDefault(); void run(async () => { await api.addIncidentNote(incident.id, note); setNote(''); }, 'Note saved to the shared handoff.'); }}>
      <p>Optional details for the shared handoff.</p>
      <label>Handoff note<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Sample details for the next team" />
      </label>
      <button className="secondary-action" disabled={api.busy || !note.trim()}>Save handoff note</button>
    </form>}
    {api.busy && <p role="status">Saving demo action…</p>}
    {error && <p role="alert">{error}</p>}{feedback && <p role="status">{feedback}</p>}
    <details className="demo-timeline">
      <summary>Shared incident timeline · {incident.notes.length} entries</summary>
      {incident.notes.length ? incident.notes.map(n => <div className="timeline-entry" key={n.id}>
        <strong>{demo.users.find(u => u.id === n.actorId)?.name ?? 'Demo staff'}</strong>
        <p>{n.text}</p>
        <small>{new Date(n.at).toLocaleString()}</small>
      </div>) : <p>No notes yet.</p>}
    </details>
  </article>;
}
