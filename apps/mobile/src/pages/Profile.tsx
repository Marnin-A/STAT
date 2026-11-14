import { useDemo } from "../demo/DemoProvider";
import { DemoProfile } from "../demo/DemoProfile";
export function Profile() {
  const demo = useDemo();
  if (demo) return <DemoProfile />;
  return (
    <>
      <section className="intro">
        <span className="eyebrow">Your information, your choice</span>
        <h1>
          A little more
          <br />
          prepared.
        </h1>
        <p>
          Medical details and important people.
          <br />
          Kept together, out of the way.
        </p>
      </section>
      <section className="data-panel">
        <h2>Medical ID</h2>
        <p>Self-reported information</p>
        <dl className="data-grid">
          {["Blood group", "Allergies", "Conditions", "Medications"].map(
            (label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>Not provided</dd>
              </div>
            ),
          )}
        </dl>
      </section>
      <section className="sharing">
        <h2>Sharing is off</h2>
        <p>
          Saved profiles and incident-scoped sharing are not connected yet. No
          medical information is shared from this screen.
        </p>
      </section>
      <div className="profile-tools">
        {[
          [
            "Emergency contacts",
            "No saved contacts. Saving and sync are not available yet.",
          ],
          [
            "Account & privacy",
            "Browsing as guest. Sign-in is not connected yet; SOS does not require an account.",
          ],
          [
            "Help & preferences",
            "Development demo only. Do not use for real emergencies.",
          ],
        ].map(([title, text]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p className="details-body">{text}</p>
          </details>
        ))}
      </div>
    </>
  );
}
