# Synthetic demo personas
Outcome: one populated synthetic persona for every Role: citizen, responder, dispatcher, hospital_staff, admin. Coherent medical profiles, contacts, agency/unit/receiving-hospital relations, active/history scenarios and notes.

Public seams: injected demo API and React persona selection/profile/workspace; these extend the approved React/API test seams. In-memory only. No real account provisioning, emails, SMS, hosted DB writes or changes to auth.

Acceptance:
1. Five unique complete synthetic identities, non-deliverable example.test emails and non-dialable contact labels.
2. Assigned incident/unit/dispatch/hospital/actors agree; only medical fixtures in this demo.
3. Selector and reset appear only without a real API URL. Injected/API mode never substitutes demo identities for auth.
4. Profile and role workspace reflect selection; switching/reset clears pending demo SOS context without altering backend sessions. Reload resets in-memory scenarios.
5. Mutations do not alter fixture templates or another fresh demo instance.

Proof: failing fixture/public React tests → implementation → suite/build checks. Browser visuals, live auth and providers not proved by fixtures.

Local evidence: all five roles/profile selection, linked fixture API, fresh-instance reset isolation, disabled/configured-backend mode and mounted pending-SOS clearing tested. 92 mobile tests + 169 API tests pass; both builds pass; 20 hosted checks skipped. Actual browser geometry/keyboard and native/provider verification unperformed. No hosted connection or credentials accessed.
