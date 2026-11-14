import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../api/ApiProvider";
import type { Incident, Triage, TriageAnswer } from "@stat/shared";
import { useDemo } from "../demo/DemoProvider";
import { DemoCase } from "../demo/DemoCase";
export function TriageTracking() {
  const demo = useDemo();
  const { id } = useParams<{ id: string; }>(),
    api = useApi();
  const [incident, setIncident] = useState<Incident | null>(null),
    [error, setError] = useState(false),
    [triage, setTriage] = useState<Triage | null>(null);
  const [answers, setAnswers] = useState<TriageAnswer[]>([]),
    [feedback, setFeedback] = useState(""),
    [sending, setSending] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { setIncident(null); setTriage(null); setAnswers([]); }, [api, id]);
  useEffect(() => {
    let active = true;
    if (demo?.api.busy) return;
    setError(false);
    if (id) {
      api
        .getIncident(id)
        .then((i) => {
          if (active) setIncident(i);
        })
        .catch(() => {
          if (active) setError(true);
        });
      api
        .getTriage(id)
        .then((t) => {
          if (active) { setTriage(t); setAnswers(previous => previous.length ? previous : t.answers); }
        })
        .catch(() => { });
    }
    return () => {
      active = false;
    };
  }, [api, id, revision, demo?.revision]);
  if (error)
    return (
      <section role="alert" className="status-card warning">
        <h1>Request unavailable.</h1>
        <p>
          Could not refresh this request. This does not confirm help is coming.
        </p>
        <button
          className="secondary-action"
          onClick={() => setRevision((v) => v + 1)}
        >
          Try refresh
        </button>
      </section>
    );
  if (!incident) return <p role="status">Loading request…</p>;
  const pending = ["created", "triaging"].includes(incident.status);
  const ended = ["resolved", "cancelled"].includes(incident.status);
  return (
    <>
      <Link className="back" to="/">
        Back to Home
      </Link>
      <section className="intro">
        <span className="eyebrow">Request {incident.id.slice(0, 8)}</span>
        <h1>
          {pending
            ? "Request received."
            : ended
              ? "Request ended."
              : "Your response."}
        </h1>
        <p>
          {pending
            ? "Waiting for a dispatcher to review it."
            : incident.status.replace(/_/g, " ")}
        </p>
      </section>
      <section className="status-card">
        <h2>{pending ? "Awaiting review" : "Reported status"}</h2>
        <p>
          {incident.assignedUnitIds.length === 0
            ? "No responder has been assigned yet."
            : "Assigned unit: " + incident.assignedUnitIds.join(", ")}
        </p>
      </section>
      {incident.assignedUnitIds.length > 0 && !ended && (
        <section className="data-panel">
          <h2>Responder location</h2>
          <p>
            Live location is not connected yet. No current position is
            available.
          </p>
        </section>
      )}
      <button
        className="secondary-action"
        onClick={() => setRevision((v) => v + 1)}
      >
        Refresh status
      </button>
      {demo && <Link className="shortcut" to="/demo">Continue demo workflow · switch accounts above</Link>}
      {demo && <DemoCase incident={incident} />}
      {!ended && (!demo || (id && demo.api.canSubmitTriage(id))) && <details className="profile-tools">
        <summary>Optional response questions</summary>
        {triage?.questions.length ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!id) return;
              setSending(true);
              try {
                const result = await api.submitTriageAnswers(id, answers);
                setFeedback(
                  "Answers received. Protocol result: " + result.level,
                );
              } catch {
                setFeedback("Answers not confirmed. Please try again.");
              } finally {
                setSending(false);
              }
            }}
          >
            {triage.questions
              .filter((q) => q.type === "yes_no")
              .map((q) => (
                <fieldset key={q.id}>
                  <legend>{q.text}</legend>
                  {[true, false].map((value) => (
                    <label
                      key={String(value)}
                      style={{
                        display: "inline-flex",
                        padding: 12,
                        minHeight: 48,
                        gap: 8,
                      }}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={
                          answers.find((a) => a.questionId === q.id)?.value ===
                          value
                        }
                        onChange={() =>
                          setAnswers((prev) => [
                            ...prev.filter((a) => a.questionId !== q.id),
                            { questionId: q.id, value },
                          ])
                        }
                      />
                      {value ? "Yes" : "No"}
                    </label>
                  ))}
                </fieldset>
              ))}
            <button
              className="secondary-action"
              disabled={sending || demo?.api.busy || answers.length === 0}
            >
              Send answers
            </button>
            <p role="status">{feedback}</p>
          </form>
        ) : (
          <p>
            Questions are not available. Your request does not depend on these
            answers.
          </p>
        )}
      </details>}
      <Link className="shortcut" to="/profile">
        Your Medical ID &amp; contacts
      </Link>
    </>
  );
}
