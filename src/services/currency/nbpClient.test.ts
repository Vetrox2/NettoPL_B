import { describe, expect, it, vi } from 'vitest'
import { NBP_CONFIG } from '@/config/currency'
import { fromPln, toPln } from './convert'
import { createNbpClient, NbpUnavailableError, retryDelays, shiftIsoDate, type NbpProgress } from './nbpClient'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const notFound = () => new Response('404 NotFound - Not Found - Brak danych', { status: 404 })

const EUR_CURRENT = {
  table: 'A', currency: 'euro', code: 'EUR',
  rates: [{ no: '219/A/NBP/2026', effectiveDate: '2026-11-10', mid: 4.3895 }],
}
const EUR_HISTORY = {
  table: 'A', currency: 'euro', code: 'EUR',
  rates: [
    { no: '217/A/NBP/2026', effectiveDate: '2026-11-06', mid: 4.4001 },
    { no: '219/A/NBP/2026', effectiveDate: '2026-11-10', mid: 4.3895 },
    { no: '218/A/NBP/2026', effectiveDate: '2026-11-09', mid: 4.3950 },
  ],
}

// 2026-11-11 12:00 in Warsaw (a public holiday: no table that day).
const NOW = () => new Date('2026-11-11T11:00:00Z')

type Handler = (url: string) => Response | Promise<Response>

function setup(handler: Handler) {
  const calls: string[] = []
  const sleeps: number[] = []
  const progress: NbpProgress[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push(url)
    expect(init?.headers).toBeUndefined() // must stay a CORS "simple" request
    return handler(url)
  })
  const client = createNbpClient({
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async (ms) => { sleeps.push(ms) },
    now: NOW,
  })
  const get = (code = 'EUR') => client.getLatestRate(code, { onProgress: (p) => progress.push(p) })
  return { calls, sleeps, progress, get }
}

const isCurrent = (url: string) => url.endsWith('/rates/a/eur/?format=json')
const isHistory = (url: string) => url.endsWith('/rates/a/eur/2026-10-28/2026-11-11/?format=json')

describe('NBP client', () => {
  it('uses the documented current-rate endpoint of table A', async () => {
    const t = setup(() => json(EUR_CURRENT))
    await expect(t.get('EUR')).resolves.toEqual({
      code: 'EUR', mid: 4.3895, effectiveDate: '2026-11-10', tableNo: '219/A/NBP/2026', via: 'current',
    })
    expect(t.calls).toEqual(['https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json'])
    expect(t.sleeps).toEqual([])
  })

  it('retries transient failures with increasing delays', async () => {
    let n = 0
    const t = setup(() => (++n < 3 ? json({}, 503) : json(EUR_CURRENT)))
    const rate = await t.get()
    expect(rate.via).toBe('current')
    expect(t.calls).toHaveLength(3)
    expect(t.sleeps).toEqual([500, 1000])
    expect(t.progress.filter((p) => p.type === 'request')).toHaveLength(3)
  })

  it('retries network errors and timeouts too', async () => {
    let n = 0
    const t = setup(() => {
      n++
      if (n === 1) throw new TypeError('Failed to fetch')
      if (n === 2) throw new DOMException('The operation timed out.', 'TimeoutError')
      return json(EUR_CURRENT)
    })
    await expect(t.get()).resolves.toMatchObject({ mid: 4.3895 })
    expect(t.sleeps).toEqual([500, 1000])
  })

  it('falls back to historical rates after all retries fail, taking the most recent one', async () => {
    const t = setup((url) => (isCurrent(url) ? json({}, 500) : isHistory(url) ? json(EUR_HISTORY) : notFound()))
    await expect(t.get()).resolves.toEqual({
      code: 'EUR', mid: 4.3895, effectiveDate: '2026-11-10', tableNo: '219/A/NBP/2026', via: 'history',
    })
    expect(t.calls.filter(isCurrent)).toHaveLength(NBP_CONFIG.retry.attempts)
    expect(t.calls.filter(isHistory)).toHaveLength(1)
    expect(t.progress).toContainEqual({ type: 'fallback' })
  })

  it('does not retry a 404 on the current endpoint, goes straight to history', async () => {
    const t = setup((url) => (isCurrent(url) ? notFound() : json(EUR_HISTORY)))
    await expect(t.get()).resolves.toMatchObject({ via: 'history' })
    expect(t.calls.filter(isCurrent)).toHaveLength(1)
    expect(t.sleeps).toEqual([])
  })

  it('treats a malformed response as a failure', async () => {
    const t = setup((url) => (isCurrent(url) ? json({ rates: [{ mid: 'x' }] }) : json(EUR_HISTORY)))
    await expect(t.get()).resolves.toMatchObject({ via: 'history' })
  })

  it('throws NbpUnavailableError when everything fails', async () => {
    const t = setup(() => { throw new TypeError('Failed to fetch') })
    const error = await t.get().catch((e) => e)
    expect(error).toBeInstanceOf(NbpUnavailableError)
    expect(error.code).toBe('EUR')
    expect(error.causes.map((c: { kind: string }) => c.kind)).toEqual(['network', 'network'])
    // retries on both the current and the historical request
    expect(t.calls).toHaveLength(NBP_CONFIG.retry.attempts * 2)
    expect(t.sleeps).toEqual([500, 1000, 500, 1000])
  })

  it('an empty history window is a failure too', async () => {
    const t = setup((url) => (isCurrent(url) ? notFound() : notFound()))
    await expect(t.get()).rejects.toBeInstanceOf(NbpUnavailableError)
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    const client = createNbpClient({
      fetch: (async () => { controller.abort(); throw new DOMException('aborted', 'AbortError') }) as unknown as typeof fetch,
      sleep: async () => {},
      now: NOW,
    })
    await expect(client.getLatestRate('EUR', { signal: controller.signal })).rejects.toMatchObject({ kind: 'aborted' })
  })
})

describe('helpers', () => {
  it('retry delays grow exponentially', () => {
    expect(retryDelays({ ...NBP_CONFIG, retry: { attempts: 4, baseDelayMs: 250, backoffFactor: 2 } })).toEqual([250, 500, 1000])
  })

  it('shifts ISO dates across month/year boundaries', () => {
    expect(shiftIsoDate('2026-01-03', -14)).toBe('2025-12-20')
    expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('conversion', () => {
  it('converts both ways at PLN-per-unit rates', () => {
    expect(toPln(5000, 4.3895)).toBe(21947.5)
    expect(fromPln(17371.97, 4.3895)).toBe(3957.62)
    expect(toPln(1_000_000, 0.012109)).toBe(12109)
  })

  it('rejects invalid rates', () => {
    expect(() => toPln(1, 0)).toThrow(RangeError)
    expect(() => fromPln(1, Number.NaN)).toThrow(RangeError)
  })
})
