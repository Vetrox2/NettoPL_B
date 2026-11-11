import type { PayrollConfig } from '@/config/payroll2026'
import { roundGrosz } from '@/services/money'
import type { Kup50Input, PayrollInput, PayrollWarning } from './types'

export interface Kup50Result {
  readonly kup50: number
  /** True in the month the cumulative KUP 50% reaches the annual limit. */
  readonly limitReached: boolean
}

/**
 * KUP 50% for one month, on the taxable part only.
 *
 * Base = taxable copyright gross − its proportional share of employee social
 * contributions. Health contribution, standard KUP and PIT are not subtracted.
 * The result is capped so the cumulative amount never exceeds the annual limit.
 *
 * @param taxableShare share of the month's revenue that is taxable (youth relief), 1 otherwise
 */
export function calculateKup50(
  gross: number,
  socialTotal: number,
  taxableShare: number,
  settings: Kup50Input,
  cumulativeKup50Before: number,
  config: PayrollConfig,
): Kup50Result {
  const share = settings.copyrightShare * taxableShare
  if (share <= 0) return { kup50: 0, limitReached: false }

  const { rate, annualLimit } = config.kup50
  const copyrightGross = gross * share
  const copyrightSocial = roundGrosz(socialTotal * share)
  const uncapped = roundGrosz(rate * Math.max(0, copyrightGross - copyrightSocial))
  const room = Math.max(0, roundGrosz(annualLimit - cumulativeKup50Before))
  const kup50 = Math.min(uncapped, room)

  return {
    kup50,
    limitReached: cumulativeKup50Before < annualLimit && cumulativeKup50Before + kup50 >= annualLimit,
  }
}

/**
 * Whether standard KUP applies alongside KUP 50%. It is dropped only when the
 * whole gross is copyright remuneration and the option says so.
 */
export function standardKupApplies(settings: Kup50Input | null): boolean {
  if (!settings) return true
  return settings.copyrightShare < 1 || settings.applyStandardKupWhenFullCopyright
}

/** Non-blocking validation. Warnings never change the calculation. */
export function validatePayrollInput(input: PayrollInput, config: PayrollConfig): PayrollWarning[] {
  const warnings: PayrollWarning[] = []
  if (input.kup50) {
    const nonCopyrightGross = roundGrosz(input.grossMonthly * (1 - input.kup50.copyrightShare))
    if (nonCopyrightGross < config.minimumWage) {
      warnings.push({ kind: 'belowMinimumWage', nonCopyrightGross, minimumWage: config.minimumWage })
    }
  }
  return warnings
}
