import { describe, expect, it } from 'vitest'
import { PAYROLL_CONFIG_2026, type PayrollConfig } from '@/config/payroll2026'
import { calculateYear, summarizeYear, type PayrollInput, type YearResult } from './index'

const input = (overrides: Partial<PayrollInput> = {}): PayrollInput => ({
  grossMonthly: 8000,
  youthRelief: false,
  commuting: false,
  nonCashBenefitsMonthly: 0,
  kup50: null,
  ...overrides,
})

const grosz = (v: number) => Math.round(v * 100)

function expectInvariants(result: YearResult) {
  for (const m of result.months) {
    // gross = contributions + tax + net, exactly to the grosz.
    expect(grosz(m.pension + m.disability + m.sickness + m.health + m.pit + m.net)).toBe(grosz(m.gross))
  }
  const keys = Object.keys(result.totals) as (keyof typeof result.totals)[]
  for (const key of keys) {
    const sum = result.months.reduce((acc, m) => acc + m[key], 0)
    expect(grosz(result.totals[key])).toBe(grosz(sum))
  }
  const t = result.totals
  expect(grosz(t.pension + t.disability + t.sickness + t.health + t.pit + t.net)).toBe(grosz(t.gross))
}

describe('test vector A: 25,000 PLN, KUP 250, PIT-2, no youth relief', () => {
  const result = calculateYear(input({ grossMonthly: 25_000 }))
  const m = result.months

  it('months 1–5', () => {
    for (const row of m.slice(0, 5)) {
      expect(row).toMatchObject({
        pension: 2440, disability: 375, sickness: 612.5, health: 1941.53, pit: 2259, net: 17371.97,
      })
      expect(row.taxBase).toBe(21323)
    }
  })

  it('month 6 crosses the 120k threshold', () => {
    expect(m[5]).toMatchObject({ health: 1941.53, pit: 3846, net: 15784.97 })
    expect(m[5].events).toEqual(['taxThresholdCrossed'])
  })

  it('months 7–11', () => {
    for (const row of m.slice(6, 11)) {
      expect(row).toMatchObject({ pit: 6523, net: 13107.97 })
      expect(row.events).toEqual([])
    }
  })

  it('month 12 reaches the ZUS cap', () => {
    expect(m[11]).toMatchObject({
      pension: 741.76, disability: 114, sickness: 612.5, health: 2117.86, pit: 7150, net: 14263.88,
    })
    expect(m[11].events).toEqual(['zusCapReached'])
    expect(m[11].cumulative.zusBase).toBe(282_600)
  })

  it('totals', () => {
    expect(result.totals).toMatchObject({
      gross: 300_000, pension: 27581.76, disability: 4239, sickness: 7350,
      health: 23474.69, pit: 54906, net: 182448.55,
    })
    expect(result.refund).toBeNull()
  })

  it('invariants hold', () => expectInvariants(result))
})

describe('test vector B: 8,000 PLN, KUP 250, PIT-2, no youth relief', () => {
  const result = calculateYear(input())

  it('every month is identical', () => {
    for (const row of result.months) {
      expect(row).toMatchObject({
        pension: 780.8, disability: 120, sickness: 196, health: 621.29, pit: 498, net: 5783.91,
      })
      expect(row.events).toEqual([])
    }
  })

  it('invariants hold', () => expectInvariants(result))
})

describe('commuting KUP', () => {
  it('uses 300 PLN and lowers PIT', () => {
    const row = calculateYear(input({ commuting: true })).months[0]
    expect(row.kup).toBe(300)
    // 8000 − 1096.80 − 300 = 6603.2 → 6603; 6603 × 12% − 300 = 492.36 → 492
    expect(row.taxBase).toBe(6603)
    expect(row.pit).toBe(492)
  })
})

describe('youth relief', () => {
  it('8,000 PLN: exempt until November, partial in November, taxable in December', () => {
    const result = calculateYear(input({ youthRelief: true }))
    const m = result.months

    for (const row of m.slice(0, 10)) {
      expect(row).toMatchObject({ taxStatus: 'exempt', pit: 0, kup: 0, taxBase: 0, reducingAmount: 0 })
      // ZUS and health are still charged.
      expect(row).toMatchObject({ pension: 780.8, health: 621.29, net: 6281.91 })
    }

    // Revenue 88,000 > 85,528 → excess 2,472 taxable.
    // 2472 − 1096.80 × (2472/8000) − 250 = 1883.09 → 1883; 1883 × 12% − 300 < 0 → PIT 0
    expect(m[10]).toMatchObject({ taxStatus: 'partiallyExempt', taxBase: 1883, kup: 250, reducingAmount: 300, pit: 0 })
    expect(m[10].events).toContain('youthLimitExceeded')
    // Bracket threshold counter starts at 0 when the limit is exceeded.
    expect(m[10].cumulative.taxBase).toBe(1883)

    expect(m[11]).toMatchObject({ taxStatus: 'taxable', taxBase: 6653, pit: 498, net: 5783.91 })
    expect(m[11].cumulative.taxBase).toBe(1883 + 6653)

    // 3600 − 2 × 300 unused = 3000, capped at PIT paid (498).
    expect(result.refund).toEqual({ unusedAmount: 3000, refund: 498, monthsWithTaxableIncome: 2 })
    expectInvariants(result)
  })

  it('non-cash benefits count toward the limit but not toward ZUS / health / net', () => {
    const result = calculateYear(input({ youthRelief: true, nonCashBenefitsMonthly: 500 }))
    const m = result.months
    expect(m[0]).toMatchObject({ pension: 780.8, health: 621.29, net: 6281.91 })
    expect(m[9].cumulative.youthRevenue).toBe(85_000)

    // Revenue 93,500 → excess 7,972; share = 7972 / 8500.
    // 8000 × share − 1096.80 × share − 250 = 6224.39 → 6224; × 12% − 300 = 446.88 → 447
    expect(m[10]).toMatchObject({ taxBase: 6224, pit: 447 })
    expect(m[10].events).toContain('youthLimitExceeded')
    expectInvariants(result)
  })

  it('never exceeding the limit: no PIT, full reducing amount unused but refund capped at 0', () => {
    const result = calculateYear(input({ grossMonthly: 5000, youthRelief: true }))
    expect(result.totals.pit).toBe(0)
    expect(result.refund).toEqual({ unusedAmount: 3600, refund: 0, monthsWithTaxableIncome: 0 })
  })

  it('exempt revenue does not count toward the 120k bracket threshold', () => {
    const result = calculateYear(input({ grossMonthly: 25_000, youthRelief: true }))
    // Limit exceeded in April: 14,472 taxable → base 12,238 (counter starts at 0).
    expect(result.months[3].events).toContain('youthLimitExceeded')
    expect(result.months[3].cumulative.taxBase).toBe(12_238)
    // 12,238 + 5 × 21,323 = 118,853 after September → threshold crossed in October, not June.
    expect(result.months[8].cumulative.taxBase).toBe(118_853)
    expect(result.months[9].events).toContain('taxThresholdCrossed')
    expect(result.months.filter((r) => r.events.includes('taxThresholdCrossed'))).toHaveLength(1)
    expectInvariants(result)
  })
})

describe('configuration drives the result', () => {
  const base = PAYROLL_CONFIG_2026
  const withTax = (tax: Partial<PayrollConfig['tax']>): PayrollConfig => ({ ...base, tax: { ...base.tax, ...tax } })

  it('changing the pension rate changes contributions, health, PIT and net', () => {
    const changed: PayrollConfig = { ...base, zus: { ...base.zus, pensionRate: 0.1 } }
    const a = calculateYear(input()).months[0]
    const b = calculateYear(input(), changed).months[0]
    expect(b.pension).toBe(800)
    expect(b.health).not.toBe(a.health)
    expect(b.net).toBeLessThan(a.net)
  })

  it('changing KUP config changes the tax base', () => {
    const changed: PayrollConfig = { ...base, kup: { standardMonthly: 0, commutingMonthly: 0 } }
    expect(calculateYear(input(), changed).months[0].taxBase).toBe(6903)
  })

  it('no PIT-2 means no monthly reducing amount', () => {
    const row = calculateYear(input(), withTax({ pit2Payers: 0 })).months[0]
    expect(row.reducingAmount).toBe(0)
    expect(row.pit).toBe(798)
  })

  it('PIT-2 with 2 payers halves the reducing amount', () => {
    expect(calculateYear(input(), withTax({ pit2Payers: 2 })).months[0].reducingAmount).toBe(150)
  })

  it('a lower threshold is crossed earlier', () => {
    const result = calculateYear(input(), withTax({ bracketThreshold: 20_000 }))
    expect(result.months[3].events).toContain('taxThresholdCrossed')
  })
})

describe('summary', () => {
  it('reports headline numbers and the month each limit was crossed', () => {
    const s = summarizeYear(calculateYear(input({ grossMonthly: 25_000 })))
    expect(s.firstMonthNet).toBe(17371.97)
    expect(s.minMonthlyNet).toBe(13107.97)
    expect(s.annualNet).toBe(182448.55)
    expect(s.limits.find((l) => l.key === 'zusCapReached')?.crossedInMonth).toBe(12)
    expect(s.limits.find((l) => l.key === 'taxThresholdCrossed')?.crossedInMonth).toBe(6)
    expect(s.limits.some((l) => l.key === 'youthLimitExceeded')).toBe(false)
  })
})

describe('edge cases', () => {
  it('zero gross gives all zeros', () => {
    const result = calculateYear(input({ grossMonthly: 0 }))
    expect(result.totals.net).toBe(0)
    expect(result.totals.pit).toBe(0)
    expectInvariants(result)
  })

  it.each([1, 333.33, 4666, 12_345.67, 99_999.99, 1_000_000])('invariants hold for %s PLN', (gross) => {
    for (const youthRelief of [false, true]) {
      for (const commuting of [false, true]) {
        expectInvariants(calculateYear(input({ grossMonthly: gross, youthRelief, commuting, nonCashBenefitsMonthly: 123.45 })))
      }
    }
  })
})
