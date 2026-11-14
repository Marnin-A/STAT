import { useDemo } from "./DemoProvider";
import { roleLabels } from "./fixtures";
export function DemoProfile() {
  const demo = useDemo();
  if (!demo) return null;
  return (
    <>
      <section className="intro">
        <span className="eyebrow">
          {roleLabels[demo.user.role]} · Fictional persona
        </span>
        <h1>{demo.user.name}</h1>
        <p>{demo.user.email}</p>
      </section>
      <section className="data-panel">
        <h2>
          {demo.user.role === "citizen"
            ? "Medical ID & contacts"
            : "Staff profile"}
        </h2>
        <p>Synthetic test data — not verified clinical or staff information.</p>
        <dl className="data-grid">
          {demo.user.details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="sharing">
        <h2>No real information shared</h2>
        <p>
          All fields are fictional. Saving, staff authentication, consent
          enforcement and notifications are separate implementation work.
        </p>
      </section>
    </>
  );
}
