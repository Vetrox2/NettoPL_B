import { BASE_CURRENCY } from '@/config/currency'
import { toPln, type NbpProgress, type NbpRate } from '@/services/currency'
import { parseRate } from '@/services/format'
import type { PayrollInput } from '@/services/payroll'

/** Loading / result state of one currency's NBP rate. */
export type RateState =
  | { readonly status: 'loading'; readonly progress: NbpProgress | null }
  | { readonly status: 'success'; readonly rate: NbpRate }
  | { readonly status: 'error'; readonly message: string }

export type RatesState = Readonly<Record<string, RateState>>

export type RatesAction =
  | { type: 'loading'; code: string }
  | { type: 'progress'; code: string; progress: NbpProgress }
  | { type: 'success'; code: string; rate: NbpRate }
  | { type: 'error'; code: string; message: string }

export function ratesReducer(state: RatesState, action: RatesAction): RatesState {
  switch (action.type) {
    case 'loading':
      return { ...state, [action.code]: { status: 'loading', progress: null } }
    case 'progress':
      return state[action.code]?.status === 'loading'
        ? { ...state, [action.code]: { status: 'loading', progress: action.progress } }
        : state
    case 'success':
      return { ...state, [action.code]: { status: 'success', rate: action.rate } }
    case 'error':
      return { ...state, [action.code]: { status: 'error', message: action.message } }
  }
}

/** The rate actually used for a conversion, whatever its origin. */
export type EffectiveRate =
  | { readonly origin: 'nbp'; readonly value: number; readonly nbp: NbpRate }
  | { readonly origin: 'manual'; readonly value: number }

export interface RateResolution {
  readonly code: string
  readonly state: RateState | undefined
  /** Null while loading, or after a failure until a valid manual rate is typed. */
  readonly effective: EffectiveRate | null
  readonly manualRateText: string
  readonly manualRateError?: string
}

const INVALID_RATE = 'Enter a positive rate, e.g. 4,3895'

/**
 * Decide which rate to use for a currency: the NBP rate when available,
 * otherwise (only after the API failed) a manual rate typed by the user.
 */
export function resolveRate(code: string, state: RateState | undefined, manualRateText: string): RateResolution {
  if (state?.status === 'success') {
    return { code, state, effective: { origin: 'nbp', value: state.rate.mid, nbp: state.rate }, manualRateText }
  }
  if (state?.status === 'error') {
    const manual = parseRate(manualRateText)
    return {
      code,
      state,
      effective: manual === null ? null : { origin: 'manual', value: manual },
      manualRateText,
      ...(manual === null && manualRateText.trim() !== '' && { manualRateError: INVALID_RATE }),
    }
  }
  return { code, state, effective: null, manualRateText }
}

export type SalaryConversion =
  | { readonly status: 'none' } // salary in PLN
  | {
      readonly status: 'converted'
      /** Gross in the salary currency. */
      readonly amount: number
      /** Gross converted to PLN (what the calculation uses). */
      readonly plnAmount: number
      readonly currency: string
      readonly rate: EffectiveRate
    }
  | { readonly status: 'pending'; readonly reason: 'loading' | 'needsManualRate'; readonly currency: string }

/**
 * Turn the gross typed in the salary currency into a PLN payroll input.
 * PLN input passes through untouched, so existing calculations are unchanged.
 */
export function convertSalaryInput(
  input: PayrollInput,
  currency: string,
  resolution: RateResolution | null,
): { input: PayrollInput | null; conversion: SalaryConversion } {
  if (currency === BASE_CURRENCY || !resolution) return { input, conversion: { status: 'none' } }
  if (!resolution.effective) {
    const reason = resolution.state?.status === 'error' ? 'needsManualRate' : 'loading'
    return { input: null, conversion: { status: 'pending', reason, currency } }
  }
  const plnAmount = toPln(input.grossMonthly, resolution.effective.value)
  return {
    input: { ...input, grossMonthly: plnAmount },
    conversion: { status: 'converted', amount: input.grossMonthly, plnAmount, currency, rate: resolution.effective },
  }
}
