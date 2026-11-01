import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Incident } from "@stat/shared";
import { useDemo } from "./DemoProvider";
import { roleLabels } from "./fixtures";
export function DemoWorkspace() {
  const demo = useDemo();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  useEffect(() => {
    let active = true;
    setIncidents([]);
    if (demo)
      demo.api.listIncidents({ type: "medical" }).then((data) => {
        if (active) setIncidents(data);
      });
    return () => {
      active = false;
    };
  }, [demo?.api]);
  if (!demo)
    return (
      <section className="data-panel">
        <h1>Demo unavailable</h1>
        <p>Synthetic personas are disabled when using a backend.</p>
      </section>
    );
  const active = incidents.find((i) => i.id === "demo-medical-active");
  const descriptions = {
    citizen:
      "Your sample medical requests, contacts and self-reported profile.",
    responder:
      "Assigned to DEMO AMB-01. Active case accepted; sample status is en route. Native location publishing is not connected.",
    dispatcher:
      "Demo agency queue: one case awaiting review and one assigned response. No automatic dispatch or live fleet tracking.",
    hospital_staff:
      "Demo Mainland Care Centre: one incoming case; four beds in the sample snapshot. No live capacity or clinical feed.",
    admin:
      "Five demo personas, two ambulances and one receiving facility. No real membership or account provisioning.",
  };
  return (
    <>
      <section className="intro">
        <span className="eyebrow">
          Synthetic scenario · {roleLabels[demo.user.role]}
        </span>
        <h1>{roleLabels[demo.user.role]} workspace</h1>
        <p>{descriptions[demo.user.role]}</p>
      </section>
      <section className="data-panel">
        <h2>Linked response</h2>
        <dl className="data-grid">
          {[
            ["Patient", "Amara Bello — fictional"],
            ["Responder", "Chidi Nwosu · DEMO AMB-01"],
            ["Dispatcher", "Bisola Akinwale"],
            ["Receiving clinician", "Dr. Nneka Adeyemi"],
            ["Hospital", "Demo Mainland Care Centre"],
            ["Dispatch", "demo-dispatch-01 · accepted"],
            ["Scenario time", "1 November 2026 · fixed synthetic snapshot"],
            ["Tracking", "Not connected; sample coordinates only"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="data-panel">
        <h2>
          {demo.user.role === "citizen" ? "Request history" : "Scenario cases"}
        </h2>
        {incidents.length === 0 ? (
          <p role="status">Loading sample cases…</p>
        ) : (
          incidents
            .filter(
              (i) =>
                demo.user.role !== "hospital_staff" ||
                i.hospitalId === "demo-hospital-01",
            )
            .map((i) => (
              <Link className="shortcut" key={i.id} to={"/triage/" + i.id}>
                <span className="shortcut-copy">
                  <strong>{i.id}</strong>
                  <small>
                    {i.status.replace(/_/g, " ")} · {i.priority}
                  </small>
                </span>
              </Link>
            ))
        )}
      </section>
      <section className="data-panel">
        <h2>Incident notes — synthetic</h2>
        {active?.notes.map((note) => (
          <article key={note.id}>
            <h3>
              {demo.users.find((u) => u.id === note.actorId)?.name ??
                "Demo staff"}
            </h3>
            <p>{note.text}</p>
            <small>{note.at}</small>
          </article>
        ))}
      </section>
    </>
  );
}
