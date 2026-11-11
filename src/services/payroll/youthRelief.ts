import type { PayrollConfig } from '@/config/payroll2026'

export interface YouthReliefShare {
  /** Fraction (0–1) of this month's revenue that is taxable. */
  readonly taxableShare: number
  /** True in the month the annual limit is exceeded. */
  readonly limitExceeded: boolean
}

/**
 * Taxable share of the month's revenue under the youth relief.
 * Revenue = cash gross + non-cash benefits, with no deductions. Only the part
 * above the annual limit is taxable.
 */
export function youthReliefShare(
  monthRevenue: number,
  cumulativeRevenueBefore: number,
  config: PayrollConfig,
): YouthReliefShare {
  const limit = config.youthRelief.revenueLimit
  if (cumulativeRevenueBefore >= limit) return { taxableShare: 1, limitExceeded: false }

  const after = cumulativeRevenueBefore + monthRevenue
  if (after <= limit || monthRevenue <= 0) return { taxableShare: 0, limitExceeded: false }

  return { taxableShare: (after - limit) / monthRevenue, limitExceeded: true }
}
