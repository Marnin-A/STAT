# Synthetic demo users
Open http://127.0.0.1:5174/profile. Expand **Synthetic demo users**, choose a persona. **Role scenario** opens /demo with related cases and notes; **Reset demo data** restores the initial fixture set.

| Group | Persona | Synthetic email |
|---|---|---|
| Citizen | Amara Bello | amara.bello@example.test |
| Responder | Chidi Nwosu | chidi.nwosu@example.test |
| Dispatcher | Bisola Akinwale | bisola.akinwale@example.test |
| Hospital staff | Dr. Nneka Adeyemi | nneka.adeyemi@example.test |
| Administrator | Musa Danjuma | musa.danjuma@example.test |

No passwords or real sign-in: these are local personas, not provisioned accounts. All identities, qualifications, medical details, contact labels and facilities are fictional. Contact labels intentionally cannot be dialled. No notifications/emails are sent.

Citizen: demographics, languages, self-reported blood group/allergy/condition/medication, two contacts and sample insurance. Staff: agency/facility, staff identifiers, synthetic credentials, duties, shifts, contact labels, equipment/capacity and assignment details. Admin: organisation, agency, membership/fleet/facility summary.

Linked snapshot: demo-medical-active → accepted demo-dispatch-01 → demo-ambulance-01 → demo-hospital-01. Also awaiting-review and completed cases, a spare ambulance, actor-attributed notes and one fictional receiving hospital. Fixed scenario time: 1 November 2026. Coordinates and capacity are static sample data, never live tracking or availability.

Persona selection changes profile and descriptive role workspace, not authorization. All personas explore the same synthetic dataset. It does not implement staff authentication, role-isolated backend access, live sharing, saved profiles or the remaining staff redesign.

State is in memory; switching personas preserves shared scenario mutations but clears that persona view's pending request context. Reset/reload restores scenarios; reload defaults to citizen. Historical fixture templates and new mock instances are independent. Tests injecting an ApiClient retain that client; default legacy MockApiClient fixtures remain unchanged unless a seed is explicitly supplied.

With VITE_API_URL configured, the demo provider/panel/profile substitution is disabled even if enabled was requested. No database seed/migration/account-provider calls performed.
