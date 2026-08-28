-- STAT core schema.
--
-- Reconciled against the M1 wire contract (`packages/shared/src/types.ts`).
-- An earlier draft of this file encoded the frontend's vocabulary for units;
-- the enums below are the frozen ones.
--
-- Everything the domain treats as a port has a table here. The event log is
-- the source of truth; read models are folded from it.

create extension if not exists postgis;

-- ---------------------------------------------------------------- agencies
-- Per-agency tenancy (decision 10). Admin-provisioned, no self-serve.
create table if not exists agencies (
  id   text primary key,
  name text not null,
  type text not null check (type in ('police', 'fire', 'medical'))
);

-- ----------------------------------------------------------- incident log
-- Append-only. Source of truth for every incident.
--
-- UNIQUE (incident_id, version) IS the optimistic lock: a concurrent append
-- at the same version raises 23505, which the adapter maps to
-- VersionConflictError. The in-memory store checks the same invariant by
-- hand; this one cannot be raced.
create table if not exists incident_events (
  id          uuid primary key,
  incident_id uuid not null,
  agency_id   text not null,
  version     integer not null check (version > 0),
  type        text not null,
  actor_id    text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  payload     jsonb not null,
  unique (incident_id, version)
);

-- Streams are always read whole and in order.
create index if not exists incident_events_stream_idx
  on incident_events (incident_id, version);

-- The agency-scoped list folds every stream for one agency in a single query.
create index if not exists incident_events_agency_idx
  on incident_events (agency_id, incident_id, version);

-- 90-day vitals retention (NDPA) needs to find expired telemetry cheaply.
create index if not exists incident_events_telemetry_idx
  on incident_events (type, occurred_at)
  where type = 'TelemetryRecorded';

-- ------------------------------------------------------------- rate limits
-- SOS abuse signals keyed by device / ip / coarse location (decision: fail-open).
create table if not exists sos_rate_limit (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

-- ------------------------------------------------------------ idempotency
-- Mutation result cached by key so a retry on a flaky link returns the
-- original response instead of creating a second incident.
create table if not exists idempotency_keys (
  key        text primary key,
  response   jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idempotency_keys_created_idx on idempotency_keys (created_at);

-- ------------------------------------------------------------------ units
-- `location` is PostGIS geography so nearest-unit ranking runs in the
-- database instead of loading every unit into the API process.
create table if not exists units (
  id           uuid primary key default gen_random_uuid(),
  agency_id    text not null references agencies (id),
  type         text not null check (type in ('ambulance', 'police', 'fire', 'rescue')),
  call_sign    text not null,
  status       text not null default 'available'
                 check (status in ('available', 'standby', 'assigned', 'out_of_service')),
  location     geography(point, 4326),
  capabilities text[] not null default '{}',
  updated_at   timestamptz not null default now()
);

create index if not exists units_location_idx on units using gist (location);
create index if not exists units_agency_status_idx on units (agency_id, status);

-- -------------------------------------------------------------- dispatches
create table if not exists dispatches (
  id            uuid primary key default gen_random_uuid(),
  incident_id   uuid not null,
  unit_id       uuid not null references units (id),
  agency_id     text not null,
  dispatcher_id text not null,
  responder_id  text,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dispatches_incident_idx on dispatches (incident_id);
create index if not exists dispatches_unit_idx on dispatches (unit_id);

-- --------------------------------------------------------------- hospitals
-- `webhook_url` is deployment config and never leaves the server.
create table if not exists hospitals (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location       geography(point, 4326) not null,
  capabilities   text[] not null default '{}',
  available_beds integer not null default 0 check (available_beds >= 0),
  webhook_url    text,
  updated_at     timestamptz not null default now()
);

create index if not exists hospitals_location_idx on hospitals using gist (location);

-- -------------------------------------------------------- PHI access audit
-- Every read of vitals / triage / handoff (NDPA). Append-only.
create table if not exists phi_access_log (
  id          bigserial primary key,
  actor_id    text not null,
  role        text not null,
  incident_id uuid not null,
  resource    text not null check (resource in ('vitals', 'triage', 'handoff')),
  at          timestamptz not null default now()
);

create index if not exists phi_access_log_incident_idx on phi_access_log (incident_id, at desc);
