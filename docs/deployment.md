# Vercel deployment — multiple services

## Project setup
Import this Git repository as **one Vercel project**, with Root Directory `.` (the repository root), not apps/mobile. Use Vercel Services support and a current Vercel CLI. The repository pins Node 22.x and pnpm 10.20.0; existing CI also uses Node 22 / pnpm 10.

Root `vercel.json` defines:
- mobile: apps/mobile, Vite; builds its browser bundle into dist. This does not build or distribute an Android APK.
- backend: apps/api, Fastify; explicit src/vercel.ts entrypoint and matching local dev command.
- /api/:path* → backend FIRST; all other paths → mobile.
- Mobile service rewrites SPA deep links to /index.html. Framework static assets remain served by the mobile service.

Vercel passes the original path into a service. The hosted Fastify app strips /api for its existing handlers and keeps the query string. Standalone app.ts still uses the original unprefixed routes.

Official references: [Services configuration](https://vercel.com/docs/services/config-reference), [routing](https://vercel.com/docs/services/routing), [Fastify](https://vercel.com/docs/frameworks/backend/fastify), [WebSockets](https://vercel.com/docs/functions/websockets).

## Environment and operating modes
**Synthetic frontend demo:** leave VITE_API_URL unset. Demo personas remain local/in-memory. The backend returns JSON 503 while no hosted database connection is configured; it never accepts requests into the standalone in-memory emergency store.

**Connected private staging:** set VITE_API_URL=/api for the mobile build. Add DATABASE_POOL_URL (runtime pooled connection) and DATABASE_URL (migration/direct connection) as private server configuration through Vercel settings. The backend prefers DATABASE_POOL_URL. Keep secrets out of the repository and NEVER prefix DB credentials with VITE_. Confirm service environment scoping in the project's dashboard.

Provision/apply reviewed Supabase migrations separately before enabling connected traffic. Do not run seed, retention, destructive conformance or migrations automatically during every preview/build. Use a separate disposable target for tests. No database configuration or data was accessed by this change.

The configured /api/health endpoint is liveness only: with DB settings absent it returns 503; with a configured app it returns 200 but does NOT prove the connection or migrations work. Check the actual authorized persistence path independently.

For local multi-service routing, use a current Vercel CLI from the repository root (`vercel dev -L`, if supported). pnpm dev remains the independent Vite development server; it does not proxy /api by itself.

## Safety / remaining work
This is deployment configuration, not approval to expose real emergency data. Protect Preview AND Production deployments until real authentication and server-owned incident/agency/unit access replace the development role-header/query stubs. Do not set VITE_DEV_* identity headers as a substitute for real auth.

The existing PostgreSQL connector still relaxes certificate validation; verified TLS remains a release requirement. Realtime bus/notification state is process-local. Vercel can serve WebSockets, but reconnects can land on another instance and streams are duration-limited. Use external pub/sub coordination before claiming cross-instance realtime reliability. Existing EventSource auth is also unfinished.

Retention scheduling, production monitoring, provider integrations, actual Android background tracking, profile persistence and remaining staff workflows are not implemented by this configuration.

## Verification / handoff
Focused config and HTTP tests exercise actual prefixed SOS/query handling, standalone compatibility, unknown-route 404 and missing-DB refusal. Both package builds and API typecheck must pass.

A real deployment still needs Vercel project access, appropriate Services availability, private environment settings, and checks of /, /profile, an incident deep link, generated asset URLs, /api/health and an authenticated persistence flow. No deployment/link/domain change/push performed here. Schema validation and local gates are not hosted proof.
