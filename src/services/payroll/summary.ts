import { payrollConfig, type PayrollConfig } from '@/config/payroll2026'
import type { MonthEvent, YearResult } from './types'

export interface LimitProgress {
  readonly key: MonthEvent
  readonly label: string
  readonly limit: number
  readonly reached: number
  /** 0–1, clamped. */
  readonly ratio: number
  /** Month (1–12) in which the limit was crossed, or null. */
  readonly crossedInMonth: number | null
}

export interface ResultSummary {
  readonly firstMonthNet: number
  readonly minMonthlyNet: number
  readonly maxMonthlyNet: number
  readonly averageMonthlyNet: number
  readonly annualNet: number
  readonly annualGross: number
  /** Share of gross the employee keeps (0–1). */
  readonly netRatio: number
  readonly limits: readonly LimitProgress[]
}

function monthOf(result: YearResult, event: MonthEvent): number | null {
  return result.months.find((m) => m.events.includes(event))?.month ?? null
}

/** Derive headline numbers and limit progress from a year result. */
export function summarizeYear(
  result: YearResult,
  config: PayrollConfig = payrollConfig,
): ResultSummary {
  const nets = result.months.map((m) => m.net)
  const last = result.months.at(-1)?.cumulative ?? { zusBase: 0, taxBase: 0, youthRevenue: 0, kup50: 0 }

  const progress = (
    key: MonthEvent,
    label: string,
    limit: number,
    reached: number,
  ): LimitProgress => ({
    key,
    label,
    limit,
    reached,
    ratio: limit > 0 ? Math.min(1, reached / limit) : 0,
    crossedInMonth: monthOf(result, key),
  })

  const limits: LimitProgress[] = [
    progress('zusCapReached', 'ZUS cap (pension + disability base)', config.zus.annualCap, last.zusBase),
    progress(
      'taxThresholdCrossed',
      `${Math.round(config.tax.upperRate * 100)}% tax threshold (cumulative tax base)`,
      config.tax.bracketThreshold,
      last.taxBase,
    ),
  ]
  if (result.input.youthRelief) {
    limits.push(
      progress(
        'youthLimitExceeded',
        'Youth relief limit (revenue incl. benefits)',
        config.youthRelief.revenueLimit,
        last.youthRevenue,
      ),
    )
  }
  if (result.input.kup50) {
    limits.push(
      progress(
        'kup50LimitReached',
        `KUP ${Math.round(config.kup50.rate * 100)}% annual cost limit`,
        config.kup50.annualLimit,
        last.kup50,
      ),
    )
  }

  const annualGross = result.totals.gross
  return {
    firstMonthNet: nets[0] ?? 0,
    minMonthlyNet: nets.length ? Math.min(...nets) : 0,
    maxMonthlyNet: nets.length ? Math.max(...nets) : 0,
    averageMonthlyNet: nets.length ? result.totals.net / nets.length : 0,
    annualNet: result.totals.net,
    annualGross,
    netRatio: annualGross > 0 ? result.totals.net / annualGross : 0,
    limits,
  }
}
