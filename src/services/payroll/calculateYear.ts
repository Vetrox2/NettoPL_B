import { payrollConfig, type PayrollConfig } from '@/config/payroll2026'
import { roundGrosz, sumMoney } from '@/services/money'
import { calculateHealthContribution } from './health'
import { calculateKup50, standardKupApplies, validatePayrollInput } from './kup50'
import { calculatePitAdvance, calculateTaxBase, monthlyKup, monthlyReducingAmount } from './tax'
import type {
  Kup50Comparison,
  MonthCumulative,
  MonthEvent,
  MonthRow,
  PayrollInput,
  ReducingAmountRefund,
  TaxStatus,
  YearResult,
  YearTotals,
} from './types'
import { youthReliefShare } from './youthRelief'
import { calculateSocialContributions } from './zus'

const EMPTY_CUMULATIVE: MonthCumulative = { zusBase: 0, taxBase: 0, youthRevenue: 0, kup50: 0 }

/** Calculate a single month given the running totals at the end of the previous month. */
export function calculateMonth(
  month: number,
  input: PayrollInput,
  before: MonthCumulative,
  config: PayrollConfig = payrollConfig,
): MonthRow {
  const gross = input.grossMonthly
  const nonCashBenefits = input.nonCashBenefitsMonthly
  const events: MonthEvent[] = []

  // 1–2. Social contributions, with the annual pension/disability cap.
  const social = calculateSocialContributions(gross, before.zusBase, config)
  const zusBase = before.zusBase + social.cappedBase
  if (before.zusBase < config.zus.annualCap && zusBase >= config.zus.annualCap) {
    events.push('zusCapReached')
  }

  // 3. Health contribution.
  const health = calculateHealthContribution(gross, social.total, config)

  // Youth relief: which share of this month's revenue is taxable.
  const monthRevenue = gross + nonCashBenefits
  const youth = input.youthRelief
    ? youthReliefShare(monthRevenue, before.youthRevenue, config)
    : { taxableShare: 1, limitExceeded: false }
  if (youth.limitExceeded) events.push('youthLimitExceeded')
  const youthRevenue = input.youthRelief ? before.youthRevenue + monthRevenue : 0
  const share = youth.taxableShare
  const taxStatus: TaxStatus = share >= 1 ? 'taxable' : share > 0 ? 'partiallyExempt' : 'exempt'

  // 4–5. Tax base and PIT advance, on the taxable part only. Exempt revenue
  // never enters the cumulative base used for the bracket threshold, nor the
  // KUP 50% limit.
  let kup = 0
  let kup50 = 0
  let reducingAmount = 0
  let taxBase = 0
  let pit = 0
  let cumulativeTaxBase = before.taxBase
  let cumulativeKup50 = before.kup50
  if (share > 0) {
    kup = standardKupApplies(input.kup50) ? monthlyKup(input.commuting, config) : 0
    if (input.kup50) {
      const copyright = calculateKup50(gross, social.total, share, input.kup50, before.kup50, config)
      kup50 = copyright.kup50
      cumulativeKup50 = roundGrosz(before.kup50 + kup50)
      if (copyright.limitReached) events.push('kup50LimitReached')
    }
    reducingAmount = monthlyReducingAmount(config)
    taxBase = calculateTaxBase(gross * share, social.total * share, kup + kup50)
    const advance = calculatePitAdvance(taxBase, before.taxBase, reducingAmount, config)
    pit = advance.pit
    if (advance.crossedThreshold) events.push('taxThresholdCrossed')
    cumulativeTaxBase = before.taxBase + taxBase
  }

  // 6. Net.
  const net = roundGrosz(gross - social.total - health - pit)

  return {
    month,
    gross,
    nonCashBenefits,
    pension: social.pension,
    disability: social.disability,
    sickness: social.sickness,
    socialTotal: social.total,
    health,
    kup,
    kup50,
    taxBase,
    reducingAmount,
    pit,
    net,
    taxStatus,
    cumulative: { zusBase, taxBase: cumulativeTaxBase, youthRevenue, kup50: cumulativeKup50 },
    events,
  }
}

export function sumTotals(months: readonly MonthRow[]): YearTotals {
  const sum = (pick: (m: MonthRow) => number) => sumMoney(months.map(pick))
  return {
    gross: sum((m) => m.gross),
    nonCashBenefits: sum((m) => m.nonCashBenefits),
    pension: sum((m) => m.pension),
    disability: sum((m) => m.disability),
    sickness: sum((m) => m.sickness),
    socialTotal: sum((m) => m.socialTotal),
    health: sum((m) => m.health),
    kup: sum((m) => m.kup),
    kup50: sum((m) => m.kup50),
    taxBase: sum((m) => m.taxBase),
    reducingAmount: sum((m) => m.reducingAmount),
    pit: sum((m) => m.pit),
    net: sum((m) => m.net),
  }
}

/**
 * Unused part of the annual tax-reducing amount, returned in the annual tax
 * return. Capped at PIT actually paid (annual tax cannot be negative).
 */
export function calculateReducingAmountRefund(
  months: readonly MonthRow[],
  config: PayrollConfig = payrollConfig,
): ReducingAmountRefund {
  const monthsWithTaxableIncome = months.filter((m) => m.taxStatus !== 'exempt').length
  const used = monthlyReducingAmount(config) * monthsWithTaxableIncome
  const unusedAmount = roundGrosz(Math.max(0, config.tax.annualReducingAmount - used))
  const pitPaid = sumMoney(months.map((m) => m.pit))
  return { unusedAmount, refund: Math.min(unusedAmount, pitPaid), monthsWithTaxableIncome }
}

/** Full-year, month-by-month gross-to-net calculation. Pure: no side effects. */
export function calculateYear(
  input: PayrollInput,
  config: PayrollConfig = payrollConfig,
): YearResult {
  const months: MonthRow[] = []
  let cumulative = EMPTY_CUMULATIVE
  for (let month = 1; month <= config.monthsInYear; month++) {
    const row = calculateMonth(month, input, cumulative, config)
    months.push(row)
    cumulative = row.cumulative
  }

  const totals = sumTotals(months)
  return {
    input,
    months,
    totals,
    refund: input.youthRelief ? calculateReducingAmountRefund(months, config) : null,
    kup50Comparison: input.kup50 ? compareWithoutKup50(input, totals, config) : null,
    warnings: validatePayrollInput(input, config),
  }
}

/** Annual PIT saving from KUP 50%: the same salary recalculated without it. */
function compareWithoutKup50(
  input: PayrollInput,
  totals: YearTotals,
  config: PayrollConfig,
): Kup50Comparison {
  const without = calculateYear({ ...input, kup50: null }, config).totals
  return {
    pitWithout: without.pit,
    netWithout: without.net,
    pitSaving: roundGrosz(without.pit - totals.pit),
    netGain: roundGrosz(totals.net - without.net),
  }
}
