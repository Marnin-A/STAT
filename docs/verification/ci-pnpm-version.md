# PR 3 CI toolchain fix

Current diagnostic at a9414a1: both jobs failed in pnpm setup, before tests. Workflow version 10 conflicted with packageManager pnpm@10.20.0. Billing is no longer the reported blocker.

Fix: remove duplicate version inputs from both jobs; package.json owns pnpm version. Verified v5 action manifests for checkout, setup-node and pnpm/action-setup use node24. Application Node remains 22. Pin ubuntu-24.04 to avoid unrequested ubuntu-latest image migration. Trade-off: image/action major updates now require explicit review.

Regression: standalone Node test checks both jobs' pnpm version source, action versions, cache ordering and runner image. Observed two duplicate-version failures before changes, two passing checks after. This validates configuration, not actual hosted action execution. Local node --test subprocess isolation was unavailable; direct node:test execution provides the same assertions without child processes.

No application, secrets, DB conformance guard or access-policy changes. Existing PostgreSQL gate still requires a disposable TEST_DATABASE_URL. Hosted result must be checked on the new head after push; no live/database success inferred from local checks.
