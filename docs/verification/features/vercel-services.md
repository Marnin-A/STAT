# Vercel Services
Scope: configure one Vercel project with mobile Vite and backend Fastify services. No deployment, hosted migration, credential access, auth redesign or push.

Public seams: root deployment configuration and Fastify HTTP ingress (existing approved API test boundary).
Acceptance:
- Correct monorepo roots, deterministic workspace install, per-service builds and mobile dist output.
- /api/* exclusively backend; SPA routes/assets exclusively mobile, with SPA deep-link fallback.
- Vercel entrypoint actually starts Fastify when imported by the platform; original local entrypoint unchanged.
- /api prefix reaches existing API handlers with queries intact; standalone paths still work.
- Hosted backend without database refuses mutations, never silently stores emergency records in memory.
- Default frontend remains synthetic; connected preview explicitly sets VITE_API_URL=/api, protected-access only.
Proof: focused failing config/API tests, API typecheck and both builds; official schema validation where available. Hosted deployment/runtime/auth/realtime evidence separate and unverified.

## Evidence
- Initial config regression failed on missing vercel.json; prefixed HTTP regression failed before adapter; missing-database regression failed before hosted bootstrap.
- Final focused config, routing, hosted refusal and neighboring app checks: 15 tests pass. Standalone API behavior preserved.
- Clean frozen-lockfile install, API typecheck and both builds pass in a Node 22 execution environment (22.23.5 observed). Initial host-Node-24 engine warnings resolved by target-runtime check.
- vercel.json validates against the live official schema using Draft 7 semantics. The upstream document advertises Draft 4 but includes newer keywords; Draft-4 meta-schema checking fails on that upstream document, not this config. No fields were removed to make validation pass.
- Built src/vercel entrypoint booted with database variables explicitly removed; actual loopback GET /api/health returned JSON SERVICE_UNAVAILABLE / HTTP 503. No database or credentials accessed.
- No Vercel CLI deployment, account linking, live ingress/asset checks, hosted persistence or cross-instance realtime verification. Deployment requires project access/environment settings; no push performed.
