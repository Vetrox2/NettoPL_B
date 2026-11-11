import { sumMoney } from '@/services/money'
import type { ResultSummary, YearResult } from '@/services/payroll'
import { fromPln } from './convert'

/** Net figures converted from PLN into a display currency. */
export interface DisplayFigures {
  readonly currency: string
  readonly rate: number
  readonly firstMonthNet: number
  readonly minMonthlyNet: number
  readonly maxMonthlyNet: number
  readonly averageMonthlyNet: number
  /** Sum of the converted months, so a table total equals the sum of its rows. */
  readonly annualNet: number
  /** Net per month, same order as `result.months`. */
  readonly monthlyNet: readonly number[]
}

/** Convert the final net result into another currency. Pure. */
export function convertNetFigures(
  result: YearResult,
  summary: ResultSummary,
  currency: string,
  rate: number,
): DisplayFigures {
  const monthlyNet = result.months.map((m) => fromPln(m.net, rate))
  return {
    currency,
    rate,
    firstMonthNet: fromPln(summary.firstMonthNet, rate),
    minMonthlyNet: fromPln(summary.minMonthlyNet, rate),
    maxMonthlyNet: fromPln(summary.maxMonthlyNet, rate),
    averageMonthlyNet: fromPln(summary.averageMonthlyNet, rate),
    annualNet: sumMoney(monthlyNet),
    monthlyNet,
  }
}
