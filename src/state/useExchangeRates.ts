import { useCallback, useEffect, useReducer, useRef } from 'react'
import { toast } from 'sonner'
import type { NbpClient } from '@/services/currency'
import { ratesReducer, type RatesState } from './exchangeRates'

/**
 * Loads the latest NBP rate for every currency in `codes` (once per session),
 * tracks loading/progress/error state and raises a toast when a rate cannot be
 * obtained. All network access goes through the injected client.
 */
export function useExchangeRates(codes: readonly string[], client: NbpClient) {
  const [rates, dispatch] = useReducer(ratesReducer, {} as RatesState)
  const inflight = useRef(new Map<string, AbortController>())
  const settled = useRef(new Set<string>())

  const load = useCallback(
    (code: string) => {
      const controller = new AbortController()
      const { signal } = controller
      inflight.current.set(code, controller)
      dispatch({ type: 'loading', code })

      client
        .getLatestRate(code, {
          signal,
          onProgress: (progress) => {
            if (!signal.aborted) dispatch({ type: 'progress', code, progress })
          },
        })
        .then((rate) => {
          if (signal.aborted) return
          settled.current.add(code)
          dispatch({ type: 'success', code, rate })
        })
        .catch((error: unknown) => {
          if (signal.aborted) return
          settled.current.add(code)
          const message = error instanceof Error ? error.message : 'Unknown error'
          dispatch({ type: 'error', code, message })
          toast.error('Currency conversion failed', {
            id: `nbp-${code}`,
            description: `Could not get the ${code} rate from NBP. Enter the rate manually to continue.`,
          })
        })
        .finally(() => {
          if (inflight.current.get(code) === controller) inflight.current.delete(code)
        })
    },
    [client],
  )

  const key = codes.join(',')
  useEffect(() => {
    for (const code of key.split(',').filter(Boolean)) {
      if (!inflight.current.has(code) && !settled.current.has(code)) load(code)
    }
  }, [key, load])

  // Abort everything on unmount.
  useEffect(() => {
    const map = inflight.current
    return () => {
      for (const controller of map.values()) controller.abort()
      map.clear()
    }
  }, [])

  const retry = useCallback(
    (code: string) => {
      inflight.current.get(code)?.abort()
      settled.current.delete(code)
      toast.dismiss(`nbp-${code}`)
      load(code)
    },
    [load],
  )

  return { rates, retry }
}
