# User decisions

## 2026-11-14 — Complete emergency demo

The user must be able to request help as the test citizen, then switch through all relevant demo accounts and perform each required action on that same request. A static role snapshot is insufficient.

Implementation: extend the existing medical SOS journey with manual dispatch, responder acceptance/scene/transport, hospital readiness/handoff and admin fleet/audit controls. Preserve the same-tab scenario through account switches and refresh. Keep synthetic workflows disabled for a configured backend.

Walkthrough: [demo users](../docs/demo-users.md). Acceptance/evidence: [emergency flow](../docs/verification/features/emergency-demo-flow.md). Earlier architecture decisions remain in [docs/decisions.md](../docs/decisions.md).

## 2026-11-14 — Ordered demo guidance

User requires actions in the correct order, with the next action highlighted at each step. One current request drives an 11-step walkthrough and next-account switch. Background cases are read-only. Sample vitals precede hospital selection as a demo checkpoint; optional response inputs remain phase-limited.
