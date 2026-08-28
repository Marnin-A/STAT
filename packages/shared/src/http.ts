import type { ApiClient } from './api'
import type {
  ApiErrorBody,
  ApiErrorCode,
  CreateIncidentDTO,
  Dispatch,
  GeoPoint,
  HospitalQuery,
  Incident,
  IncidentFilters,
  IncidentNote,
  IncidentStatus,
  IncidentType,
  RankedHospital,
  RankedUnit,
  ReplayCommand,
  ReplayResult,
  TelemetryInput,
  TelemetryQuery,
  TelemetrySample,
  Triage,
  TriageAnswer,
  TriageQuestion,
  TriageScore,
  UnitQuery,
} from './types'

/**
 * A `DomainError` that made it back across the wire.
 *
 * `code` is the server's stable identifier — switch on it, never on `message`.
 * `VERSION_CONFLICT` in particular is routine, not exceptional: refetch the
 * incident and retry with the version it hands back.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** True when retrying the same request unchanged could succeed. */
  get isRetryable(): boolean {
    return this.status >= 500 || this.code === 'INTERNAL'
  }

  /** True when the client is out of date and should refetch before retrying. */
  get isStale(): boolean {
    return this.code === 'VERSION_CONFLICT'
  }
}

/**
 * Raised when the request never reached the server — offline, DNS, timeout.
 *
 * Named `reason` rather than `cause` so the class stays portable across the
 * app's ES2020 lib and the API's ES2022 one, where `Error.cause` exists.
 */
export class NetworkError extends Error {
  constructor(readonly reason: unknown) {
    super('network request failed')
    this.name = 'NetworkError'
  }
}

export interface HttpApiClientOptions {
  baseUrl: string
  /**
   * Headers identifying the caller, resolved per request.
   *
   * Today this returns the `x-user-id` / `x-role` / `x-agency-id` stub headers
   * the server's `resolvePrincipal` reads. M4 swaps the body of this callback
   * for a bearer token and nothing at the call sites changes.
   */
  authHeaders?: () => Record<string, string> | Promise<Record<string, string>>
  /** Defaults to the global `fetch`. Injected in tests. */
  fetch?: typeof globalThis.fetch
  /** Per-request timeout. Weak-network markets need this short and explicit. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000

function geo(point: GeoPoint): string {
  return `lat=${point.lat}&lng=${point.lng}`
}

function query(parts: Array<string | null>): string {
  const kept = parts.filter((p): p is string => p !== null)
  return kept.length ? `?${kept.join('&')}` : ''
}

/**
 * `ApiClient` over HTTP. The client the app actually ships with.
 *
 * Every mutation carries an `Idempotency-Key` so a retry on a flaky 2G
 * connection can never create a second incident.
 */
export class HttpApiClient implements ApiClient {
  private readonly baseUrl: string
  private readonly authHeaders: NonNullable<HttpApiClientOptions['authHeaders']>
  private readonly doFetch: typeof globalThis.fetch
  private readonly timeoutMs: number

  constructor(options: HttpApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.authHeaders = options.authHeaders ?? (() => ({}))
    this.doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(await this.authHeaders()),
    }
    if (opts.body !== undefined) headers['content-type'] = 'application/json'
    if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    let res: Response
    try {
      res = await this.doFetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      })
    } catch (cause) {
      // Distinct from ApiError on purpose: the offline queue retries this,
      // and must not retry a request the server already rejected on merit.
      throw new NetworkError(cause)
    } finally {
      clearTimeout(timer)
    }

    const text = await res.text()
    const body = text ? (JSON.parse(text) as unknown) : null

    if (!res.ok) {
      const err = (body ?? {}) as Partial<ApiErrorBody>
      throw new ApiError(res.status, err.error ?? 'INTERNAL', err.message ?? res.statusText)
    }
    return body as T
  }

  // ------------------------------------------------------------- incidents

  createIncident(data: CreateIncidentDTO, idempotencyKey: string): Promise<Incident> {
    return this.call('POST', '/incidents', { body: data, idempotencyKey })
  }

  getIncident(id: string): Promise<Incident> {
    return this.call('GET', `/incidents/${id}`)
  }

  listIncidents(filters?: IncidentFilters): Promise<Incident[]> {
    return this.call(
      'GET',
      `/incidents${query([
        filters?.status ? `status=${filters.status}` : null,
        filters?.type ? `type=${filters.type}` : null,
      ])}`,
    )
  }

  transitionIncident(
    id: string,
    status: IncidentStatus,
    expectedVersion: number,
  ): Promise<Incident> {
    return this.call('POST', `/incidents/${id}/status`, { body: { status, expectedVersion } })
  }

  addIncidentNote(id: string, text: string): Promise<IncidentNote> {
    return this.call('POST', `/incidents/${id}/notes`, { body: { text } })
  }

  // -------------------------------------------------------------- dispatch

  getAvailableUnits(q: UnitQuery): Promise<RankedUnit[]> {
    return this.call(
      'GET',
      `/units/available${query([
        geo(q.near),
        q.type ? `type=${q.type}` : null,
        q.for ? `for=${q.for}` : null,
        q.limit ? `limit=${q.limit}` : null,
      ])}`,
    )
  }

  dispatchUnit(incidentId: string, unitId: string, expectedVersion: number): Promise<Dispatch> {
    return this.call('POST', `/incidents/${incidentId}/dispatch`, {
      body: { unitId, expectedVersion },
    })
  }

  acceptDispatch(dispatchId: string): Promise<Dispatch> {
    return this.call('POST', `/dispatches/${dispatchId}/accept`)
  }

  rejectDispatch(dispatchId: string): Promise<Dispatch> {
    return this.call('POST', `/dispatches/${dispatchId}/reject`)
  }

  // ---------------------------------------------------------------- triage

  getTriageQuestions(type: IncidentType): Promise<TriageQuestion[]> {
    return this.call('GET', `/triage/questions?type=${type}`)
  }

  submitTriageAnswers(incidentId: string, answers: TriageAnswer[]): Promise<TriageScore> {
    return this.call('POST', `/incidents/${incidentId}/triage`, { body: { answers } })
  }

  getTriage(incidentId: string): Promise<Triage> {
    return this.call('GET', `/incidents/${incidentId}/triage`)
  }

  // ------------------------------------------------------------- telemetry

  recordTelemetry(incidentId: string, sample: TelemetryInput): Promise<TelemetrySample> {
    return this.call('POST', `/incidents/${incidentId}/vitals`, { body: sample })
  }

  getTelemetry(incidentId: string, q?: TelemetryQuery): Promise<TelemetrySample[]> {
    return this.call(
      'GET',
      `/incidents/${incidentId}/vitals${query([
        q?.limit ? `limit=${q.limit}` : null,
        q?.from ? `from=${encodeURIComponent(q.from)}` : null,
        q?.to ? `to=${encodeURIComponent(q.to)}` : null,
      ])}`,
    )
  }

  // -------------------------------------------------------------- hospital

  getHospitals(q: HospitalQuery): Promise<RankedHospital[]> {
    return this.call(
      'GET',
      `/hospitals${query([
        geo(q.near),
        q.capability ? `capability=${q.capability}` : null,
        q.limit ? `limit=${q.limit}` : null,
      ])}`,
    )
  }

  selectHospital(incidentId: string, hospitalId: string): Promise<Incident> {
    return this.call('POST', `/incidents/${incidentId}/hospital`, { body: { hospitalId } })
  }

  alertHospital(incidentId: string): Promise<Incident> {
    return this.call('POST', `/incidents/${incidentId}/hospital/alert`)
  }

  getHospitalActiveIncidents(): Promise<Incident[]> {
    return this.call('GET', '/hospital/incidents')
  }

  // --------------------------------------------------------------- offline

  replay(incidentId: string, commands: ReplayCommand[]): Promise<ReplayResult[]> {
    return this.call('POST', `/incidents/${incidentId}/replay`, { body: { commands } })
  }
}
