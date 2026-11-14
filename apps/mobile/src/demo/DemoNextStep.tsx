import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from './DemoProvider';
import { roleLabels } from './fixtures';

export function DemoNextStep() {
  const demo = useDemo();
  const navigate = useNavigate();
  if (!demo) return null;
  const { incident, step } = demo.api.journey();
  const complete = step.id === 'complete', cancelled = step.id === 'cancelled';
  const role = complete && demo.user.role === 'admin' ? 'admin' : step.role;
  const instruction = complete && role === 'admin' ? 'Inspect the attributed action audit and released ambulance. The walkthrough is complete.' : step.help;
  const person = demo.users.find(u => u.role === role)!;
  const path = ['request', 'cancelled'].includes(step.id) ? '/#demo-next-action'
    : complete && role === 'citizen' ? '/triage/' + incident!.id
    : '/demo#demo-next-action';
  return <section className="demo-next-step" aria-label="Next demo step" aria-live="polite">
    <span className="eyebrow">{complete ? 'Walkthrough complete' : cancelled ? 'Walkthrough cancelled' : `Step ${step.number} of 11`} · {roleLabels[role]}</span>
    <h2>{complete && role === 'admin' ? 'Review the action audit' : step.label}</h2>
    <p>{instruction}</p>
    <progress aria-label="Demo progress" max={11} value={complete ? 11 : step.number - 1} />
    {demo.api.busy ? <p role="status">Saving this step. Please wait…</p>
      : demo.user.role !== role ? <button className="demo-next-action secondary-action" onClick={() => { demo.select(role); navigate(['request', 'cancelled'].includes(step.id) ? '/' : '/demo'); }}>Switch to {roleLabels[role]} — {person.name}</button>
      : <Link className="demo-next-action secondary-action" to={path}>{complete ? role === 'admin' ? 'Open action audit' : 'Open completed request' : 'Open current task'}</Link>}
    {incident && <small className="case-id">Following request {incident.id}</small>}
    {complete && demo.user.role !== 'admin' && <button className="quiet-link" onClick={() => { demo.select('admin'); navigate('/demo'); }}>Review as Administrator</button>}
  </section>;
}
