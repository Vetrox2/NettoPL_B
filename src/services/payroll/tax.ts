import type { PayrollConfig } from '@/config/payroll2026'
import { roundPln } from '@/services/money'

/** Flat monthly tax-deductible costs (KUP). */
export function monthlyKup(commuting: boolean, config: PayrollConfig): number {
  return commuting ? config.kup.commutingMonthly : config.kup.standardMonthly
}

/** Monthly tax-reducing amount resulting from PIT-2 (equal parts, split between payers). */
export function monthlyReducingAmount(config: PayrollConfig): number {
  const { annualReducingAmount, pit2Payers } = config.tax
  if (pit2Payers <= 0) return 0
  return annualReducingAmount / config.monthsInYear / pit2Payers
}

/**
 * Monthly tax base: taxable revenue − deductible social contributions − KUP,
 * floored at 0 and rounded to whole PLN.
 */
export function calculateTaxBase(
  taxableRevenue: number,
  deductibleSocial: number,
  kup: number,
): number {
  return roundPln(Math.max(0, taxableRevenue - deductibleSocial - kup))
}

export interface PitAdvance {
  readonly pit: number
  /** True in the month the cumulative base first goes above the bracket threshold. */
  readonly crossedThreshold: boolean
}

/**
 * PIT advance for one month. The cumulative tax base splits this month's base
 * between the lower and upper bracket. Rounded to whole PLN, minimum 0.
 */
export function calculatePitAdvance(
  taxBase: number,
  cumulativeTaxBaseBefore: number,
  reducingAmount: number,
  config: PayrollConfig,
): PitAdvance {
  const { lowerRate, upperRate, bracketThreshold } = config.tax
  const roomInLowerBracket = Math.max(0, bracketThreshold - cumulativeTaxBaseBefore)
  const lowerPart = Math.min(taxBase, roomInLowerBracket)
  const upperPart = taxBase - lowerPart

  const tax = lowerPart * lowerRate + upperPart * upperRate - reducingAmount
  const crossedThreshold =
    cumulativeTaxBaseBefore <= bracketThreshold &&
    cumulativeTaxBaseBefore + taxBase > bracketThreshold

  return { pit: Math.max(0, roundPln(tax)), crossedThreshold }
}
