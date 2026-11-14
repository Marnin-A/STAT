import { Link, useNavigate, useLocation } from "react-router-dom";
import type { Role } from "@stat/shared";
import { useDemo } from "./DemoProvider";
import { roleLabels } from "./fixtures";
export function DemoPanel() {
  const demo = useDemo();
  const navigate = useNavigate(), location = useLocation();
  if (!demo) return null;
  return (
    <details open className="data-panel demo-controls">
      <summary>Synthetic demo users · {roleLabels[demo.user.role]}</summary>
      <p>
        No real accounts, sign-in, messages or live tracking. Selecting a
        persona is not authentication. Progress survives refresh in this tab.
      </p>
      <label htmlFor="demo-persona">Demo persona</label>
      <select
        id="demo-persona"
        value={demo.user.role}
        disabled={demo.api.busy}
        onChange={(e) => { demo.select(e.target.value as Role); if (location.pathname !== "/profile") navigate("/demo"); }}
      >
        {demo.users.map((user) => (
          <option key={user.id} value={user.role}>
            {roleLabels[user.role]} — {user.name}
          </option>
        ))}
      </select>
      {demo.storageWarning && <p role="alert">Demo storage unavailable. Keep this tab open; refresh will lose progress.</p>}
      <nav aria-label="Demo tools">
        <Link className="quiet-link" to="/profile">
          View populated profile
        </Link>
        <Link className="quiet-link" to="/demo">
          Role scenario
        </Link>
        <button className="secondary-action" onClick={() => { demo.reset(); if (location.pathname !== "/profile") navigate(demo.user.role === "citizen" ? "/" : "/demo"); }} disabled={demo.api.busy}>
          Reset demo data
        </button>
      </nav>
    </details>
  );
}
