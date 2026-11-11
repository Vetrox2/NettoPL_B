/** KUP 50% (copyright costs) settings. */
export interface Kup50Input {
  /** Share of gross (0–1) that is copyright remuneration. */
  readonly copyrightShare: number
  /** Whether standard KUP still applies when the whole gross is copyright remuneration. */
  readonly applyStandardKupWhenFullCopyright: boolean
}

export interface PayrollInput {
  /** Cash gross salary per month (PLN). */
  readonly grossMonthly: number
  /** Employee is under 26 and the youth relief (zero PIT) applies. */
  readonly youthRelief: boolean
  /** Workplace in a different town than the place of residence (higher KUP). */
  readonly commuting: boolean
  /**
   * Gross value of non-cash benefits per month (medical care, insurance …).
   * Counts only toward the youth-relief revenue limit.
   */
  readonly nonCashBenefitsMonthly: number
  /** KUP 50% settings, or null when KUP 50% is off. */
  readonly kup50: Kup50Input | null
}

export type MonthEvent =
  | 'zusCapReached'
  | 'taxThresholdCrossed'
  | 'youthLimitExceeded'
  | 'kup50LimitReached'

/** How much of the month's revenue is taxable under the youth relief. */
export type TaxStatus = 'taxable' | 'partiallyExempt' | 'exempt'

export interface MonthCumulative {
  /** Pension + disability contribution base since January (cap: zus.annualCap). */
  readonly zusBase: number
  /** Taxable base since January (threshold: tax.bracketThreshold). */
  readonly taxBase: number
  /** Youth-relief revenue since January incl. non-cash benefits (limit: youthRelief.revenueLimit). */
  readonly youthRevenue: number
  /** KUP 50% cost amount since January (limit: kup50.annualLimit). */
  readonly kup50: number
}

export interface MonthRow {
  readonly month: number
  readonly gross: number
  readonly nonCashBenefits: number
  readonly pension: number
  readonly disability: number
  readonly sickness: number
  readonly socialTotal: number
  readonly health: number
  /** Standard tax-deductible costs applied this month (0 when fully exempt). */
  readonly kup: number
  /** KUP 50% (copyright costs) applied this month. */
  readonly kup50: number
  readonly taxBase: number
  /** Tax-reducing amount applied this month. */
  readonly reducingAmount: number
  readonly pit: number
  readonly net: number
  readonly taxStatus: TaxStatus
  readonly cumulative: MonthCumulative
  readonly events: readonly MonthEvent[]
}

export interface YearTotals {
  readonly gross: number
  readonly nonCashBenefits: number
  readonly pension: number
  readonly disability: number
  readonly sickness: number
  readonly socialTotal: number
  readonly health: number
  readonly kup: number
  readonly kup50: number
  readonly taxBase: number
  readonly reducingAmount: number
  readonly pit: number
  readonly net: number
}

export interface ReducingAmountRefund {
  /** Annual tax-reducing amount not used in the monthly advances. */
  readonly unusedAmount: number
  /** Expected refund in the annual return (capped at PIT actually paid). */
  readonly refund: number
  readonly monthsWithTaxableIncome: number
}

export interface Kup50Comparison {
  /** Annual PIT for the same salary without KUP 50%. */
  readonly pitWithout: number
  /** Annual net for the same salary without KUP 50%. */
  readonly netWithout: number
  /** Annual PIT saved thanks to KUP 50%. */
  readonly pitSaving: number
  /** Annual net gained thanks to KUP 50% (equals the PIT saving). */
  readonly netGain: number
}

export type PayrollWarning = { readonly kind: 'belowMinimumWage'; readonly nonCopyrightGross: number; readonly minimumWage: number }

export interface YearResult {
  readonly input: PayrollInput
  readonly months: readonly MonthRow[]
  readonly totals: YearTotals
  /** Present only when the youth relief applies. */
  readonly refund: ReducingAmountRefund | null
  /** Present only when KUP 50% is on. */
  readonly kup50Comparison: Kup50Comparison | null
  /** Non-blocking warnings; they never change the calculation. */
  readonly warnings: readonly PayrollWarning[]
}
