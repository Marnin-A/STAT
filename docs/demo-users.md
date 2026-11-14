# Synthetic emergency walkthrough

Run `pnpm dev` without `VITE_API_URL`, then open the displayed local URL. Open the floating **Demo** button to access guidance, account selection and reset. The **Next demo step** card shows the step number, current instruction, progress and correct account. Follow **Open current task** to focus the highlighted control, or use **Switch to …** when another account must act. **Demo persona** is inside the floating popup on every page. The popup closes after an account change or navigation; reopen **Demo** for the next instruction. Selecting an account opens its workspace; on Profile it keeps the selected profile visible. No passwords needed.

| Account | Persona | Part in the journey |
|---|---|---|
| Citizen | Amara Bello | Request help, answer optional questions, add notes, follow status, cancel before assignment |
| Dispatcher | Bisola Akinwale | Review the incoming case and assign an available ambulance |
| Responder | Chidi Nwosu | Accept/decline, arrive on scene, enter sample vitals, select/alert hospital, transport and record arrival |
| Hospital staff | Dr. Nneka Adeyemi | Review incoming notes/vitals, confirm readiness, receive patient and complete handoff |
| Administrator | Musa Danjuma | Manage unassigned fleet availability and review the attributed action audit |

## Complete a new request

1. Select **Citizen**, open **Home**, press **Request medical help**. The receipt shows the new request ID. GPS is optional; no location permission is needed to finish the simulation. Optional response questions and handoff notes are available on the receipt.
2. Select **Dispatcher**. Your new request is the current walkthrough. Background sample cases are collapsed and read-only. On that request, press **Assign DEMO AMB-02**. It becomes **Awaiting responder acceptance**. AMB-01 belongs to the pre-existing sample case.
3. Select **Responder**. On the same request, press **Accept assignment**, then **Arrived on scene**. Enter sample heart rate / SpO2 and press **Save sample vitals**. This demo checkpoint must precede hospital selection; it is not clinical guidance. Handoff notes are shared with the other accounts.
4. Press **Select Demo Mainland Care Centre**, then **Alert receiving hospital**.
5. Select **Hospital staff**. Review that incoming request and its recorded vitals/notes. Press **Confirm hospital ready**.
6. Select **Responder**. Press **Start transport**, then **Arrived at hospital**.
7. Select **Hospital staff**. Press **Complete patient handoff**. The request leaves the incoming queue; the ambulance becomes available again.
8. Select **Citizen**, open **Activity → Open your request**. The same request is **resolved**. Select **Administrator** to inspect the action audit and fleet controls.

Wait for an action to finish before switching accounts; the selector is disabled while saving. Buttons expose only the relevant next step. Later lifecycle actions stay hidden and are also rejected by the demo API. A second active walkthrough is blocked. Optional questions and notes are limited to their applicable response phases. **Role scenario** opens the current workspace from any screen; staff Home, Triage, Dispatch and Hospital entries also open it.

Declining an assignment returns the current case to dispatcher review and releases the ambulance. If dispatch is blocked by unavailable fleet, follow the prompted Administrator step to restore an unassigned ambulance. General fleet controls unlock after handoff. Assigned ambulances cannot be taken out of service. Citizen cancellation is available only before dispatch. Errors preserve the current step for correction; stale incident versions require refresh.

## Persistence and reset

One same-tab session shares the synthetic scenario across all accounts. The selected account, requests, assignments, manual vitals, notes, readiness, arrival, audit and derived next step survive refresh and navigation through sessionStorage. No cross-tab/device synchronization. Blocked storage displays a memory-only warning; the workflow still works while the tab remains open. Malformed saved state falls back to fresh fixtures.

**Reset demo data** restores the original sample cases, clears new requests/pending retry context and returns to Home or the role workspace. Use it to repeat the full journey. Account switching clears pending unacknowledged SOS context but preserves acknowledged requests. **Activity** retains the citizen's latest request across role switches.

## Scope

These are fictional local personas, not real authenticated accounts. Emails use `example.test`; contact labels cannot be dialled. Coordinates and hospital capacity are sample data. Manually entered vitals are simulation values, without clinical advice. No emergency messages, emails, location broadcasts or provider notifications are sent. Demo role checks guide actions; they are not backend authorization.

With `VITE_API_URL` configured, synthetic personas and their workflows remain disabled. This walkthrough covers the app's medical SOS entry point. Real authentication, production dispatch, native tracking and other emergency types require separate implementation and live verification.
