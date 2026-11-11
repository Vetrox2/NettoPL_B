import { BASE_CURRENCY, type CurrencyCode } from '@/config/currency'
import { parseAmount, parsePercentShare } from '@/services/format'
import type { PayrollInput } from '@/services/payroll'

/** Raw form state as typed by the user. */
export interface CalculatorFormState {
  readonly grossText: string
  readonly nonCashBenefitsText: string
  readonly youthRelief: boolean
  readonly commuting: boolean
  readonly kup50: boolean
  /** Percentage of gross that is copyright remuneration, as typed (0–100). */
  readonly copyrightPercentText: string
  readonly applyStandardKupWhenFullCopyright: boolean
  /** Currency the salary is paid in; the gross is converted to PLN before the calculation. */
  readonly salaryCurrency: CurrencyCode
  /** Currency the final net result is also shown in (PLN = no conversion). */
  readonly displayCurrency: CurrencyCode
  /** Manual rates typed after an NBP failure, keyed by currency code. */
  readonly manualRates: Readonly<Record<string, string>>
}

export type CalculatorAction =
  | { type: 'setGross'; value: string }
  | { type: 'setNonCashBenefits'; value: string }
  | { type: 'setYouthRelief'; value: boolean }
  | { type: 'setCommuting'; value: boolean }
  | { type: 'setKup50'; value: boolean }
  | { type: 'setCopyrightPercent'; value: string }
  | { type: 'setApplyStandardKupWhenFullCopyright'; value: boolean }
  | { type: 'setSalaryCurrency'; value: CurrencyCode }
  | { type: 'setDisplayCurrency'; value: CurrencyCode }
  | { type: 'setManualRate'; code: string; value: string }

export const initialFormState: CalculatorFormState = {
  grossText: '8000',
  nonCashBenefitsText: '0',
  youthRelief: false,
  commuting: false,
  kup50: false,
  copyrightPercentText: '50',
  applyStandardKupWhenFullCopyright: true,
  salaryCurrency: BASE_CURRENCY,
  displayCurrency: BASE_CURRENCY,
  manualRates: {},
}

export function calculatorReducer(
  state: CalculatorFormState,
  action: CalculatorAction,
): CalculatorFormState {
  switch (action.type) {
    case 'setGross':
      return { ...state, grossText: action.value }
    case 'setNonCashBenefits':
      return { ...state, nonCashBenefitsText: action.value }
    case 'setYouthRelief':
      return { ...state, youthRelief: action.value }
    case 'setCommuting':
      return { ...state, commuting: action.value }
    case 'setKup50':
      return { ...state, kup50: action.value }
    case 'setCopyrightPercent':
      return { ...state, copyrightPercentText: action.value }
    case 'setApplyStandardKupWhenFullCopyright':
      return { ...state, applyStandardKupWhenFullCopyright: action.value }
    case 'setSalaryCurrency':
      return { ...state, salaryCurrency: action.value }
    case 'setDisplayCurrency':
      return { ...state, displayCurrency: action.value }
    case 'setManualRate':
      return { ...state, manualRates: { ...state.manualRates, [action.code]: action.value } }
  }
}

export interface FormErrors {
  readonly gross?: string
  readonly nonCashBenefits?: string
  readonly copyrightPercent?: string
}

export interface ParsedForm {
  /** Null when the form has errors. */
  readonly input: PayrollInput | null
  readonly errors: FormErrors
}

const INVALID_AMOUNT = 'Enter an amount, e.g. 8000 or 8 000,50'
const INVALID_PERCENT = 'Enter a percentage from 0 to 100'

/** Foreign currencies whose NBP rate the form currently needs. */
export function currenciesNeeded(state: CalculatorFormState): string[] {
  return [...new Set([state.salaryCurrency, state.displayCurrency])].filter((c) => c !== BASE_CURRENCY)
}

/**
 * Validate the raw form and turn it into a calculation input.
 * `grossMonthly` is in the salary currency; see `convertSalaryInput`.
 */
export function parseForm(state: CalculatorFormState): ParsedForm {
  const gross = parseAmount(state.grossText)
  // Non-cash benefits only matter (and are only shown) with the youth relief.
  const nonCash = state.youthRelief
    ? state.nonCashBenefitsText.trim() === '' ? 0 : parseAmount(state.nonCashBenefitsText)
    : 0
  // The copyright share only matters (and is only shown) with KUP 50%.
  const copyrightShare = state.kup50 ? parsePercentShare(state.copyrightPercentText) : 0

  const errors: FormErrors = {
    ...(gross === null && { gross: INVALID_AMOUNT }),
    ...(nonCash === null && { nonCashBenefits: INVALID_AMOUNT }),
    ...(copyrightShare === null && { copyrightPercent: INVALID_PERCENT }),
  }
  if (gross === null || nonCash === null || copyrightShare === null) return { input: null, errors }

  return {
    input: {
      grossMonthly: gross,
      nonCashBenefitsMonthly: nonCash,
      youthRelief: state.youthRelief,
      commuting: state.commuting,
      kup50: state.kup50
        ? { copyrightShare, applyStandardKupWhenFullCopyright: state.applyStandardKupWhenFullCopyright }
        : null,
    },
    errors,
  }
}
