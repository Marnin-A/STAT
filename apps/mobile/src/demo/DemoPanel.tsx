import { Link } from "react-router-dom";
import type { Role } from "@stat/shared";
import { useDemo } from "./DemoProvider";
import { roleLabels } from "./fixtures";
export function DemoPanel() {
  const demo = useDemo();
  if (!demo) return null;
  return (
    <details className="data-panel demo-controls">
      <summary>Synthetic demo users · {roleLabels[demo.user.role]}</summary>
      <p>
        No real accounts, sign-in, messages or live tracking. Selecting a
        persona is not authentication. Reload resets scenario data.
      </p>
      <label htmlFor="demo-persona">Demo persona</label>
      <select
        id="demo-persona"
        value={demo.user.role}
        onChange={(e) => demo.select(e.target.value as Role)}
      >
        {demo.users.map((user) => (
          <option key={user.id} value={user.role}>
            {roleLabels[user.role]} — {user.name}
          </option>
        ))}
      </select>
      <nav aria-label="Demo tools">
        <Link className="quiet-link" to="/profile">
          View populated profile
        </Link>
        <Link className="quiet-link" to="/demo">
          Role scenario
        </Link>
        <button className="secondary-action" onClick={demo.reset}>
          Reset demo data
        </button>
      </nav>
    </details>
  );
}
