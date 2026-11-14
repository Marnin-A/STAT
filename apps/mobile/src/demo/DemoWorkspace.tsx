import { useState } from 'react';
import { useDemo } from './DemoProvider';
import { roleLabels } from './fixtures';
import { DemoCase } from './DemoCase';

const descriptions = {
  citizen: 'Request medical help, add response details and follow your request through handoff.',
  dispatcher: 'Review new requests and assign an available ambulance. The responder accepts the assignment.',
  responder: 'Accept your crew’s assignment, record scene arrival and sample vitals, then coordinate hospital transport.',
  hospital_staff: 'Review incoming alerts and handoff notes, confirm readiness, then receive the patient.',
  admin: 'Review incident progress and the action audit. Manage availability of unassigned ambulances.',
};
export function DemoWorkspace() {
  const demo = useDemo();
  const [error, setError] = useState('');
  if (!demo) return <section className="data-panel">
    <h1>Demo unavailable</h1>
    <p>Synthetic personas are disabled when using a backend.</p>
  </section>;
  const { api, user } = demo;
  const state = api.snapshot();
  const journey = api.journey();
  const recoveryUnit = state.data.units.find(u => u.status !== 'assigned' && u.status !== 'available');
  const active = state.data.incidents.filter(i => !['resolved', 'cancelled'].includes(i.status));
  const cases = state.data.incidents.filter(i => {
    if (i.id !== journey.incident?.id) return false;
    if (user.role === 'hospital_staff') return i.hospitalId === 'demo-hospital-01' && i.hospitalAlerted && !['resolved', 'cancelled'].includes(i.status);
    if (user.role === 'responder') return i.assignedUnitIds.length > 0 && !['resolved', 'cancelled'].includes(i.status);
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <>
    <section className="intro">
      <span className="eyebrow">Synthetic scenario · {roleLabels[user.role]}</span>
      <h1>{roleLabels[user.role]} workspace</h1>
      <p>{descriptions[user.role]}</p>
    </section>
    {user.role === 'admin' && <>
      <section className="data-panel" aria-label="Demo fleet">
        <h2>Demo fleet</h2>
        <p>{active.length} active cases · {state.data.units.filter(u => u.status === 'available').length} available ambulances</p>
        {state.data.units.map(unit => <div className="fleet-row" key={unit.id}>
          <div>
            <strong>{unit.callSign}</strong>
            <p>{unit.status.replace(/_/g, ' ')}</p>
          </div>
          <button id={journey.step.id === 'fleet' && unit.id === recoveryUnit?.id ? 'demo-next-action' : undefined} aria-describedby={journey.step.id === 'fleet' ? 'demo-next-instruction' : undefined} className={journey.step.id === 'fleet' && unit.id === recoveryUnit?.id ? 'secondary-action demo-next-action' : 'secondary-action'} disabled={api.busy || unit.status === 'assigned' || !(journey.step.id === 'complete' || (journey.step.id === 'fleet' && unit.status !== 'available'))} onClick={async () => { setError(''); try { await api.setFleetAvailability(unit.id, unit.status !== 'available'); } catch (err) { setError((err as Error).message); } }}>{unit.status === 'available' ? 'Take ' + unit.callSign + ' out of service' : 'Make ' + unit.callSign + ' available'}</button>
        </div>)}
        {error && <p role="alert">{error}</p>}
      </section>
      <section className="data-panel" aria-label="Action audit" id={journey.step.id === 'complete' ? 'demo-next-action' : undefined} tabIndex={-1}>
        <h2>Action audit</h2>{state.audit.length ? [...state.audit].reverse().map(event => <div className="timeline-entry" key={event.id}>
          <strong>{demo.users.find(u => u.id === event.actorId)?.name} · {roleLabels[event.role]}</strong>
          <p>{event.text}</p>{event.incidentId && <small>Request {event.incidentId}</small>}<p>
            <small>{new Date(event.at).toLocaleString()}</small>
          </p>
        </div>) : <p>No new actions. Start a citizen request to record the journey here.</p>}</section>
    </>}
    <section aria-label="Scenario cases">
      <h2>{user.role === 'citizen' ? 'Current walkthrough' : user.role === 'hospital_staff' ? 'Incoming patients' : 'Scenario cases'}</h2>{cases.length ? cases.map(incident => <DemoCase key={incident.id} incident={incident} />) : <section className="data-panel">
        <p role="status">{!journey.incident ? 'Start a new request as Citizen to begin the walkthrough.' : user.role === 'responder' ? 'No current assignment. Follow the next demo step above.' : 'No incoming patient for this step. Follow the next demo step above.'}</p>
      </section>}</section>
    <details className="demo-sample-cases"><summary>Background sample cases · read-only</summary>{state.data.incidents.filter(i => i.id !== journey.incident?.id).map(i => <DemoCase key={i.id} incident={i} />)}</details>
  </>;
}
