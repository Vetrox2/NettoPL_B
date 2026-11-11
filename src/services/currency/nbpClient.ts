import { NBP_CONFIG, type NbpConfig } from '@/config/currency'

/** A published NBP average rate. */
export interface NbpRate {
  readonly code: string
  /** PLN per 1 unit of the currency. */
  readonly mid: number
  /** Publication date of the table, YYYY-MM-DD. */
  readonly effectiveDate: string
  /** Table number, e.g. "219/A/NBP/2026". */
  readonly tableNo: string
  /** How the rate was obtained. */
  readonly via: 'current' | 'history'
}

export type NbpErrorKind =
  | 'notFound' // 404: no data for the query (e.g. no table published that day)
  | 'badRequest' // 400: invalid query
  | 'http' // other HTTP error (5xx, 429 …)
  | 'network' // fetch rejected (offline, blocked, CORS …)
  | 'timeout'
  | 'invalidResponse'
  | 'aborted'

export class NbpError extends Error {
  readonly kind: NbpErrorKind
  readonly status?: number
  constructor(kind: NbpErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'NbpError'
    this.kind = kind
    this.status = status
  }
}

/** Thrown when the current rate, all retries and the historical fallback failed. */
export class NbpUnavailableError extends Error {
  readonly code: string
  readonly causes: readonly NbpError[]
  constructor(code: string, causes: readonly NbpError[]) {
    super(`Could not get the ${code} exchange rate from NBP`)
    this.name = 'NbpUnavailableError'
    this.code = code
    this.causes = causes
  }
}

export type NbpProgress =
  | { readonly type: 'request'; readonly stage: 'current' | 'history'; readonly attempt: number; readonly maxAttempts: number }
  | { readonly type: 'retryWait'; readonly stage: 'current' | 'history'; readonly attempt: number; readonly delayMs: number }
  | { readonly type: 'fallback' }

export interface FetchRateOptions {
  readonly signal?: AbortSignal
  readonly onProgress?: (progress: NbpProgress) => void
}

export interface NbpClient {
  /** Latest published table-A average rate, with retries and a historical fallback. */
  getLatestRate(code: string, options?: FetchRateOptions): Promise<NbpRate>
}

export interface NbpClientDeps {
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  readonly now?: () => Date
  readonly config?: NbpConfig
}

const RETRYABLE: ReadonlySet<NbpErrorKind> = new Set(['http', 'network', 'timeout', 'invalidResponse'])

export const isRetryable = (error: NbpError): boolean =>
  RETRYABLE.has(error.kind) && (error.kind !== 'http' || error.status === undefined || error.status >= 500 || error.status === 429)

/** Delays before retry n (1-based): base, base×factor, base×factor² … */
export function retryDelays(config: NbpConfig): number[] {
  const { attempts, baseDelayMs, backoffFactor } = config.retry
  return Array.from({ length: Math.max(0, attempts - 1) }, (_, i) => baseDelayMs * backoffFactor ** i)
}

/** YYYY-MM-DD of `date` in the given time zone. */
export function isoDateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Shift a YYYY-MM-DD date by whole days (calendar arithmetic, UTC-safe). */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

const defaultSleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new NbpError('aborted', 'Aborted'))
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new NbpError('aborted', 'Aborted'))
    }, { once: true })
  })

interface RawRatesResponse {
  code?: unknown
  rates?: Array<{ no?: unknown; effectiveDate?: unknown; mid?: unknown }>
}

/** Validate an NBP `exchangerates/rates` response and return its entries, oldest first. */
function parseRates(body: unknown, code: string): Omit<NbpRate, 'via'>[] {
  const raw = body as RawRatesResponse
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.rates)) {
    throw new NbpError('invalidResponse', 'Unexpected NBP response shape')
  }
  return raw.rates.map((r) => {
    if (
      typeof r.mid !== 'number' || !Number.isFinite(r.mid) || r.mid <= 0 ||
      typeof r.effectiveDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.effectiveDate) ||
      typeof r.no !== 'string'
    ) {
      throw new NbpError('invalidResponse', 'Unexpected NBP rate entry')
    }
    return { code, mid: r.mid, effectiveDate: r.effectiveDate, tableNo: r.no }
  })
}

export function createNbpClient(deps: NbpClientDeps = {}): NbpClient {
  const config = deps.config ?? NBP_CONFIG
  const doFetch = deps.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const sleep = deps.sleep ?? defaultSleep
  const now = deps.now ?? (() => new Date())

  /**
   * One GET with a timeout. No custom headers: the API does not answer CORS
   * preflight requests, so the request must stay "simple" (format via query).
   */
  async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(config.requestTimeoutMs)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    let response: Response
    try {
      response = await doFetch(`${config.baseUrl}${path}?format=json`, { signal: combined })
    } catch (e) {
      if (signal?.aborted) throw new NbpError('aborted', 'Aborted')
      if (timeout.aborted) throw new NbpError('timeout', 'NBP request timed out')
      throw new NbpError('network', e instanceof Error ? e.message : 'Network error')
    }
    if (response.status === 404) throw new NbpError('notFound', 'No data', 404)
    if (response.status === 400) throw new NbpError('badRequest', 'Bad request', 400)
    if (!response.ok) throw new NbpError('http', `HTTP ${response.status}`, response.status)
    try {
      return await response.json()
    } catch {
      throw new NbpError('invalidResponse', 'Response is not JSON')
    }
  }

  /** Run a request, retrying transient failures with exponentially growing delays. */
  async function withRetry<T>(
    stage: 'current' | 'history',
    run: () => Promise<T>,
    options: FetchRateOptions,
  ): Promise<T> {
    const delays = retryDelays(config)
    const maxAttempts = delays.length + 1
    for (let attempt = 1; ; attempt++) {
      options.onProgress?.({ type: 'request', stage, attempt, maxAttempts })
      try {
        return await run()
      } catch (e) {
        const error = e instanceof NbpError ? e : new NbpError('network', String(e))
        if (attempt >= maxAttempts || !isRetryable(error)) throw error
        const delayMs = delays[attempt - 1]
        options.onProgress?.({ type: 'retryWait', stage, attempt, delayMs })
        await sleep(delayMs, options.signal)
      }
    }
  }

  async function getLatestRate(code: string, options: FetchRateOptions = {}): Promise<NbpRate> {
    const c = code.toLowerCase()
    const t = config.table
    const causes: NbpError[] = []

    // 1. Current rate = the last published table.
    try {
      const body = await withRetry('current', () => getJson(`/exchangerates/rates/${t}/${c}/`, options.signal), options)
      const latest = parseRates(body, code.toUpperCase()).at(-1)
      if (latest) return { ...latest, via: 'current' }
      causes.push(new NbpError('invalidResponse', 'Empty rates list'))
    } catch (e) {
      if (e instanceof NbpError && e.kind === 'aborted') throw e
      causes.push(e as NbpError)
    }

    // 2. Historical fallback: every table published in the lookback window; take the most recent.
    options.onProgress?.({ type: 'fallback' })
    const end = isoDateInZone(now(), config.timeZone)
    const start = shiftIsoDate(end, -config.historyLookbackDays)
    try {
      const body = await withRetry(
        'history',
        () => getJson(`/exchangerates/rates/${t}/${c}/${start}/${end}/`, options.signal),
        options,
      )
      const latest = parseRates(body, code.toUpperCase())
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
        .at(-1)
      if (latest) return { ...latest, via: 'history' }
      causes.push(new NbpError('notFound', 'No rates in the lookback window'))
    } catch (e) {
      if (e instanceof NbpError && e.kind === 'aborted') throw e
      causes.push(e as NbpError)
    }

    throw new NbpUnavailableError(code.toUpperCase(), causes)
  }

  return { getLatestRate }
}

/** Default client used by the app. */
export const nbpClient: NbpClient = createNbpClient()
