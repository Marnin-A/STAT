import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../api/ApiProvider";
import { useGeolocation } from "../hooks/useGeolocation";
import { useDeviceId } from "../hooks/useDeviceId";
import { useHaptics } from "../hooks/useHaptics";
import { Icon } from "../components/ui/Icon";
import type { CreateIncidentDTO } from "@stat/shared";
const pendingKey = "stat_pending_medical_sos";
type Pending = { key: string; data: CreateIncidentDTO };
function readPending(): Pending | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
    return p?.key && p?.data?.type === "medical" ? p : null;
  } catch {
    return null;
  }
}
export function Dashboard() {
  const api = useApi(),
    navigate = useNavigate(),
    deviceId = useDeviceId();
  const {
    location,
    loading,
    error: gpsError,
    getCurrentPosition,
  } = useGeolocation();
  const { impactHeavy, notificationSuccess } = useHaptics();
  const pending = useRef<Pending | null>(readPending());
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false),
    [uncertain, setUncertain] = useState(Boolean(pending.current));
  const [storageWarning, setStorageWarning] = useState(false);
  async function submit() {
    if (busy.current || !deviceId) return;
    busy.current = true;
    setSubmitting(true);
    try {
      pending.current ??= {
        key: crypto.randomUUID(),
        data: {
          type: "medical",
          location: location ?? null,
          deviceId,
          occurredAt: new Date().toISOString(),
        },
      };
      try {
        sessionStorage.setItem(pendingKey, JSON.stringify(pending.current));
      } catch {
        setStorageWarning(true);
      }
      void Promise.resolve()
        .then(() => impactHeavy())
        .catch(() => {});
      const incident = await api.createIncident(
        pending.current.data,
        pending.current.key,
      );
      try {
        sessionStorage.removeItem(pendingKey);
        sessionStorage.setItem("stat_active_incident_id", incident.id);
      } catch {
        /* acknowledgement is still valid */
      }
      pending.current = null;
      void Promise.resolve()
        .then(() => notificationSuccess())
        .catch(() => {});
      navigate("/triage/" + incident.id);
    } catch {
      setUncertain(true);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }
  return (
    <>
      <section className="intro">
        <h1>
          Help starts
          <br />
          right here.
        </h1>
        <p>
          Start a medical request.
          <br />
          You can add the details after.
        </p>
      </section>
      {uncertain && (
        <section role="alert" className="status-card warning">
          <h2>Delivery isn't confirmed.</h2>
          <p>
            Don't assume help is on the way. Retry checks the same request, not
            a new one.
          </p>
        </section>
      )}
      <button
        className="action-panel"
        onClick={submit}
        disabled={submitting || !deviceId}
        aria-label={uncertain ? "Retry same request" : "Request medical help"}
      >
        <span className="action-orbit" />
        <span className="action-top">
          <span className="eyebrow">Medical SOS</span>
          <span className="medical-symbol">
            <Icon name="star" />
          </span>
        </span>
        <span className="action-bottom">
          <span>
            <span className="action-title">
              {submitting ? (
                "Sending request…"
              ) : uncertain ? (
                "Retry same request"
              ) : (
                <>
                  Request
                  <br />
                  medical help
                </>
              )}
            </span>
            <span className="action-helper">
              {deviceId ? "No account needed" : "Preparing this device…"}
            </span>
          </span>
          <span className="action-arrow">
            <Icon name="arrow" />
          </span>
        </span>
      </button>
      {storageWarning && (
        <p role="status">
          This browser cannot preserve the pending request after closing. Keep
          this page open.
        </p>
      )}
      <details className="location">
        <summary>
          <Icon name="pin" />
          <span className="summary-text">
            <strong>
              {location ? "Location available" : "Location not shared"}
            </strong>
            <small>Optional. Never required to send.</small>
          </span>
        </summary>
        <div className="details-body">
          <button
            className="secondary-action"
            disabled={loading}
            onClick={() => void getCurrentPosition()}
          >
            {loading ? "Finding location…" : "Share location"}
          </button>
          {gpsError && (
            <p role="status">
              Location unavailable. You can still request help.
            </p>
          )}
        </div>
      </details>
      <div className="section-label">
        <span className="eyebrow">A little preparation</span>
      </div>
      <Link className="shortcut" to="/profile">
        <span className="shortcut-icon">
          <Icon name="id" />
        </span>
        <span className="shortcut-copy">
          <strong>Your Medical ID</strong>
          <small>Health details &amp; people to contact</small>
        </span>
        <Icon name="chevron" />
      </Link>
    </>
  );
}
