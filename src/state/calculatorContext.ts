import { createContext, useContext } from 'react'
import type { CurrencyCode } from '@/config/currency'
import type { PayrollConfig } from '@/config/payroll2026'
import type { DisplayFigures } from '@/services/currency'
import type { ResultSummary, YearResult } from '@/services/payroll'
import type { CalculatorFormState, FormErrors } from './calculatorState'
import type { RateResolution, SalaryConversion } from './exchangeRates'

export interface CalculatorActions {
  setGross(value: string): void
  setNonCashBenefits(value: string): void
  setYouthRelief(value: boolean): void
  setCommuting(value: boolean): void
  setKup50(value: boolean): void
  setCopyrightPercent(value: string): void
  setApplyStandardKupWhenFullCopyright(value: boolean): void
  setSalaryCurrency(value: CurrencyCode): void
  setDisplayCurrency(value: CurrencyCode): void
  setManualRate(code: string, value: string): void
  retryRate(code: string): void
}

export interface CurrencyState {
  /** Rate for the salary currency, or null when the salary is in PLN. */
  readonly salaryRate: RateResolution | null
  /** Rate for the display currency, or null when the result is shown in PLN only. */
  readonly displayRate: RateResolution | null
  readonly salaryConversion: SalaryConversion
  /** Net result converted into the display currency, when a rate is available. */
  readonly display: DisplayFigures | null
}

export interface CalculatorContextValue {
  readonly form: CalculatorFormState
  readonly errors: FormErrors
  /** Null while the form is invalid or a needed exchange rate is missing. */
  readonly result: YearResult | null
  readonly summary: ResultSummary | null
  readonly config: PayrollConfig
  readonly currency: CurrencyState
  readonly actions: CalculatorActions
}

export const CalculatorContext = createContext<CalculatorContextValue | null>(null)

export function useCalculator(): CalculatorContextValue {
  const ctx = useContext(CalculatorContext)
  if (!ctx) throw new Error('useCalculator must be used inside <CalculatorProvider>')
  return ctx
}
