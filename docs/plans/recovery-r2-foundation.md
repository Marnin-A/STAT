# R2 — trusted backend and hosted persistence

2026-10-28 amendment: [mobile-first web demo](./recovery-web-demo.md) supersedes older delivery/scope assumptions below. Calmer redesign; notes first/chat later; profiles/contacts included; anonymous SOS approved with fraud policy unresolved; desktop adaptations approved in principle. Review A → guarded C → B. Do not treat the historical Stitch appearance, Android-first acceptance or old scope questions below as current decisions.

Status: proposed. Dependency: R0. Synthetic regression work can start before hosted credentials.

## Red–Green–Refactor steps

1. Add failing regressions for spoofed identity, anonymous tracking, intake discovery, foreign-agency acceptance, citizen data leakage, terminal unit release and repeat-note deduplication.
2. Establish explicit config loading/validation for development/runtime/scripts, approved browser origins or same-origin proxy, health/readiness and structured redacted logs. Production must reject missing persistence/auth configuration; mocks require an explicit demo mode.
3. Before any DB suite, enforce disposable target identity/search path and reject dev/production targets. Verify hosted schema/grants/API exposure and least-privileged runtime credentials. Restore TLS server verification.
4. Add migration ledger/checksums/locking and transaction handling. Make seeds repeatable with stable natural keys. Run against a disposable hosted target, then approved development migrations.
5. Implement the existing Better Auth choice unless the user explicitly changes it. Validate sessions server-side; load roles/memberships from storage. Define citizen ownership/anonymous receipt, responder assignments and hospital membership separately.
6. Centralize resource authorization for HTTP, WebSocket and dashboard/hospital streams. Intake access must not mean every authenticated citizen can read every unassigned case. Agency routing/claim and mutual aid require explicit authorization.
7. Introduce an incident-command module whose small interface owns command validation, authorization, version checks, deduplication, transaction commit and post-commit publication. Test failure at each write, not only the success path.
8. Make reservation/events/status/dispatch/outbox atomic. Prevent version gaps and concurrent accept/reject; release assignment consistently on reject/cancel/resolution. Apply agency, vehicle/capability and assignment rules.
9. Use atomic idempotency claims with scoped stable keys and request fingerprints. Handle uncertain delivery and concurrent retries without duplicate notes/SOS. Do not permanently cache transient failures as decided business outcomes.
10. Share runtime request/response validation at the wire seam; add real contract checks and separate test TypeScript checks. Repair rate-limit window expiry and complete-stream agency selection.
11. Run conformance plus adversarial concurrency/failure tests on isolated hosted Postgres. Verify state survives API restart. Adopt indexed geographic queries when ranking is implemented; do not call JS full-table scans PostGIS ranking.
12. Split route registration/composition and domain storage adapters where this improves locality. Preserve the existing event/state behavior covered by tests.

## Exit evidence

- All listed regressions reproduce before repair and pass after.
- Forged headers/query roles cannot grant access; HTTP and realtime negative access tests pass.
- Concurrent retries and injected write failures preserve command invariants.
- Postgres tests genuinely execute on a verified disposable target; required CI does not disguise skipped validation.
- Hosted persistence/restart and secure configuration verified separately from in-memory checks.

## Unresolved questions

- Separate disposable target agreed; project/configuration still needs provision and verification.
- Initial agency/hospital memberships and staff login method?
- Anonymous receipt lifetime/active-incident session policy?

## Next steps

Write R2 summary; update checkpoint; connect the R3 medical journey.
