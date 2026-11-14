# R3 — one complete medical journey

2026-10-28 amendment: [mobile-first web demo](./recovery-web-demo.md) supersedes older delivery/scope assumptions below. Calmer redesign; notes first/chat later; profiles/contacts included; anonymous SOS approved with fraud policy unresolved; desktop adaptations approved in principle. Review A → guarded C → B. Do not treat the historical Stitch appearance, Android-first acceptance or old scope questions below as current decisions.

Status: proposed. Dependencies: R1 + R2. Use synthetic records until clinical approval.

## Red–Green–Refactor steps

1. Add a failing multi-role browser journey using a real API and isolated database. No MockApiClient in this acceptance path.
2. Citizen: one-tap medical SOS, optional GPS/permission-denial path, persistent receipt and delivery/error/uncertain state. Optional haptics cannot block submission or hide successful creation.
3. Intake: route/claim unassigned SOS to authorized dispatch; show it in the live intake queue. Dispatcher reviews, chooses/approves an eligible unit and sees acknowledgement/conflicts.
4. Responder: assigned-case queue, accept/reject, navigation affordance and legal progression through en route, on scene and transporting. Non-assigned responders cannot command the case.
5. Record actual manual observations, timestamp/source and incident notes. Validate questionnaire completeness/types/duplicates; incomplete data must not become a reassuring Stable result. Label deterministic protocol accurately; no unapproved LLM/diagnosis claims.
6. Select/alert a hospital using authorized case data and real eligibility. Define preparation/readiness and handoff receipt contracts; hospital acts only on its routed cases.
7. Hospital: incoming queue, case detail, manual-observation history, persisted prep/readiness state and handoff acknowledgement. Include reroute only under an agreed authorization/state rule.
8. Resolve/close with accurate timeline and unit release. Citizen cancellation uses owner authorization and explicit transition rules.
9. Replace fixture vitals/diagnoses/ETA/chat throughout the medical path. Unknown values remain unknown; derive estimates only from a documented source. Use verified pilot dispatch contact, never the reference's example number.
10. Verify failed commands, permissions, not-found/forbidden cases, refresh/restart and repeated action requests. Recheck design baselines with real-shaped data.

## Exit evidence

- Citizen mobile web → dispatcher web → responder mobile web → hospital web demonstrably completes handoff on one persistent incident.
- Two distinct actor sessions see consistent scoped state; no manual database editing or hidden mocks required.
- Every included control has a real command or explicitly unavailable state.
- Clinical protocol and minimum handoff fields accepted by the designated reviewer before operational use.
- Cancel/reject/resolve release appropriate resources and retain a meaningful audit trail.

## Unresolved questions

- Clinical protocol/reviewer and handoff fields?
- Profile/contact minimum fields, ownership, consent and sharing? Notes first and chat later already agreed.
- Verified agency dispatch number?

## Next steps

Write R3 summary; update checkpoint; harden offline/realtime in R4.
