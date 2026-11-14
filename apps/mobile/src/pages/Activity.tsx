import { Link } from "react-router-dom";
import { useDemo } from "../demo/DemoProvider";
export function Activity() {
  const demo = useDemo();
  let id: string | null = null;
  try {
    id = sessionStorage.getItem("stat_active_incident_id");
  } catch {
    // Restricted browsers must still expose a safe path back to SOS.
  }
  if (demo) id = demo.api.snapshot().requests.slice(-1)[0]?.[1] ?? "demo-medical-active";
  return (
    <>
      <section className="intro">
        <span className="eyebrow">Your requests</span>
        <h1>At a glance.</h1>
        <p>This browser's most recently acknowledged request.</p>
      </section>
      {id ? (
        <Link className="shortcut" to={"/triage/" + id}>
          Open your request
        </Link>
      ) : (
        <section className="data-panel">
          <h2>No acknowledged request here.</h2>
          <p>
            Unconfirmed requests stay on Home so you can retry the same request.
          </p>
          <Link className="quiet-link" to="/">
            Go to Home
          </Link>
        </section>
      )}
    </>
  );
}
