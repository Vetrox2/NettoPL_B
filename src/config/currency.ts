/**
 * Currency conversion settings: NBP API endpoint, retry/fallback policy and
 * the currencies offered in the UI.
 */

export interface NbpConfig {
  /** Base URL of the public NBP Web API (https only). */
  readonly baseUrl: string
  /** Exchange-rate table with average rates. */
  readonly table: 'a'
  /** Human-readable source shown next to the rate. */
  readonly sourceLabel: string
  readonly sourceUrl: string
  /** Per-request timeout. */
  readonly requestTimeoutMs: number
  /** Retries for transient failures (network, timeout, 5xx, 429). */
  readonly retry: {
    /** Total attempts per request, including the first one. */
    readonly attempts: number
    /** Delay before the first retry; doubles on each subsequent retry. */
    readonly baseDelayMs: number
    readonly backoffFactor: number
  }
  /** Historical fallback: how many days back to look for the last published rate. */
  readonly historyLookbackDays: number
  /** Time zone in which NBP publishes rates (used to compute "today"). */
  readonly timeZone: string
}

export const NBP_CONFIG: NbpConfig = {
  baseUrl: 'https://api.nbp.pl/api',
  table: 'a',
  sourceLabel: 'NBP, table A (average rates)',
  sourceUrl: 'https://api.nbp.pl/',
  requestTimeoutMs: 8_000,
  retry: {
    attempts: 3,
    baseDelayMs: 500,
    backoffFactor: 2,
  },
  // Longest gap without a table (e.g. Christmas + weekend) is well under this.
  historyLookbackDays: 14,
  timeZone: 'Europe/Warsaw',
}

export const BASE_CURRENCY = 'PLN'

/** Foreign currencies offered in the UI (all published in NBP table A). */
export const FOREIGN_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK', 'JPY', 'CAD', 'AUD', 'UAH', 'HUF',
] as const

export type CurrencyCode = typeof BASE_CURRENCY | (typeof FOREIGN_CURRENCIES)[number]

export const CURRENCIES: readonly CurrencyCode[] = [BASE_CURRENCY, ...FOREIGN_CURRENCIES]
