# Emergency demo flow

Outcome: switch the five synthetic personas to complete one newly requested medical emergency, with the same incident visible throughout. Existing medical SOS is the entry point. No backend or emergency-provider changes.

Preconditions: VITE_API_URL unset. Session-local synthetic data, sample coordinates only. Demo role checks guide simulation; they are not authentication. Public test seams: rendered app/account selector and demo API, extending existing persona tests.

| ID | Action | Expected result | Proof |
|---|---|---|---|
| 1 | Citizen requests help, retries same key | One created incident; active request preserved across account switches and browser reload | API + React journey |
| 2 | Dispatcher reviews and assigns available ambulance | Same case dispatched, pending responder assignment, unit reserved exactly once; reject returns to queue | API + React journey |
| 3 | Responder accepts and arrives on scene | Correct assignment becomes en route, then on scene; can record handoff notes and manual sample vitals | API + React journey |
| 4 | Responder selects/alerts hospital; hospital staff confirms ready | Linked case appears in hospital queue with notes/vitals; readiness visible to responder | API + React journey |
| 5 | Responder transports and records arrival; hospital completes handoff | Resolved case visible to citizen/admin; unit released and intake removed | API + React journey |
| 6 | Admin reviews audit/fleet and changes unassigned unit availability | Attributed actions visible; unavailable units cannot be dispatched; assigned units cannot be removed | API + React journey |
| 7 | Invalid role/order, stale version, double click, no GPS, storage error, reset | No invalid transition or duplicate side effect; usable feedback; reset restores fixtures; configured API disables demo | API + React + focused existing tests |

Persistence: same-tab sessionStorage, surviving refresh/navigation; no cross-device or cross-tab synchronization promised. Storage failure reports memory-only operation. Explicit reset removes new requests and restores the original fixture set. All sample vitals are manually entered simulation values.

Verification commands: mobile Vitest, mobile build; shared client changes also require API suite/typecheck. Browser walkthrough at mobile and desktop sizes. Evidence recorded below after checks.

## Verification — 14 November 2026

Local feature branch: `feature/emergency-demo-flow`, based on `8eb8960`. Synthetic demo only; no configured backend, provider or DB changes.

| Criteria | Status | Evidence |
|---|---|---|
| 1–6 | PASS | `emergency.test.ts`: same-ID retry/restore, complete handoff, actor notes/manual vitals, unit reserve/release, rejection/cancellation and admin availability. `EmergencyJourney.test.tsx`: real App routes + account selector carry a new request through all five personas to citizen resolution and admin audit. |
| 7 | PASS | Invalid role/order/version, premature transport/handoff, duplicate acceptance/SOS and unavailable fleet tests. React remount/reset, blocked/corrupt storage, existing disabled/configured-backend persona tests. No-GPS request completes in both React and browser journeys. |
| Browser journey | PASS | Chrome on local port 5175: new SOS → dispatcher AMB-02 assignment → responder acceptance/scene/manual pulse 88/SpO2 97 → select/alert hospital → hospital readiness → transport/arrival → refresh → hospital handoff → admin audit/fleet toggle → citizen Activity resolves same request. |
| Layout | PASS | Inspected 375×812 portrait, 812×375 landscape and desktop. No horizontal overflow in measured mobile layouts. Existing light theme; no new motion. |

Mobile: 104 tests pass. API: 172 pass, 20 DB-dependent checks skipped. Mobile production build and API typecheck pass. Initial realtime API failures were sandbox local-port restrictions; rerunning with local networking passed. Initial new tests reproduced missing dispatch state and corrupt-storage crash before fixes. Header test now supplies its router context after replacing full-page navigation with links.

Browser artifacts: `emergency-flow-mobile.png`, `emergency-flow-desktop.png` in this chat's visualization directory. These show the completed citizen receipt. Hosted CI/deployment and real provider/DB/native behavior unverified.

Cause/fix: static fixtures exposed no staff commands; role changes replaced the active citizen ID. A guarded demo client now advances shared incident/assignment/fleet state, records actor notes/audit and persists session snapshots. Trade-off: browser-local simulation, deliberate manual account switching and fixed sample facility capacity; no real account authorization or external emergency services.

## Ordered walkthrough refinement

User requirement: allow actions only in their correct order; highlight the next action/account at every step.

Acceptance: one current walkthrough; background/previous cases read-only; lifecycle order is request → assign → accept → scene → sample vitals → hospital selection → alert → readiness → transport → hospital arrival → handoff. The vitals checkpoint is a demonstration choice, not clinical guidance. Optional questions/notes and cancel/decline remain valid only in their applicable phases. Display a step count, progress, next instruction, highlighted current control and direct next-account switch; preserve guidance on refresh. Admin availability changes during a live journey are limited to restoring a fleet-blocked dispatch. Replay/start-over follows handoff or cancellation.

Proof: focused command regression for premature hospital selection/second active request; actual App interaction for guidance, next-account switching and hidden future controls; existing full-journey and persistence checks; browser inspection of the highlighted instruction/control.

Ordered refinement evidence: 106 mobile tests pass, including full account-switch journey, next-step cue, direct account switch, accessible highlighted action, vitals prerequisite, hidden later controls, duplicate active-request refusal and existing persistence/alternative paths. TypeScript and mobile production build pass. Chrome preview on port 5176 exercised all 11 steps using the guided account switches, reloaded at step 11 with the correct instruction preserved, and verified citizen resolution/admin audit. At 375×812 the step-8 instruction and account-switch button fit without horizontal overflow. Screenshot: `guided-next-step-mobile.png` in this chat's visualization directory. Real-backend workflows unchanged; no deployment performed.

## Floating demo tools

User requests the step guidance and synthetic data controls hidden behind a floating popup. Default: closed; launcher appears only in synthetic demo mode. Popup contains existing guidance/persona/reset tools, closes on navigation/account changes, Escape, Close or backdrop; traps keyboard focus and restores it on dismissal. Underlying workflow and its hidden accessible next-action description remain intact. Verify focused popup interactions, the full account-switch journey and mobile open/closed layout.

Popup evidence: 109 mobile tests pass; TypeScript/mobile production build pass. Focused checks cover closed-by-default controls, Escape, focus loop/return, account selection persistence, non-demo suppression and the full emergency journey through popup account switches. Chrome at 375×812 verified scrollable popup with visible Close control, default closed page, and request → popup Dispatcher switch → visible assignment action with popup dismissed. Screenshots: `demo-popup-open.png`, `demo-popup-closed.png` in this chat's visualization directory.
