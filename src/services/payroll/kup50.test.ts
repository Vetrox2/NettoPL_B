import { describe, expect, it } from 'vitest'
import { PAYROLL_CONFIG_2026, type PayrollConfig } from '@/config/payroll2026'
import { calculateYear, summarizeYear, type PayrollInput, type YearResult } from './index'

const input = (overrides: Partial<PayrollInput> = {}): PayrollInput => ({
  grossMonthly: 10_000,
  youthRelief: false,
  commuting: false,
  nonCashBenefitsMonthly: 0,
  kup50: null,
  ...overrides,
})

const kup50 = (copyrightShare: number, applyStandardKupWhenFullCopyright = true) => ({
  copyrightShare,
  applyStandardKupWhenFullCopyright,
})

const grosz = (v: number) => Math.round(v * 100)

function expectInvariants(result: YearResult) {
  for (const m of result.months) {
    expect(grosz(m.pension + m.disability + m.sickness + m.health + m.pit + m.net)).toBe(grosz(m.gross))
  }
  for (const key of Object.keys(result.totals) as (keyof typeof result.totals)[]) {
    expect(grosz(result.totals[key])).toBe(grosz(result.months.reduce((acc, m) => acc + m[key], 0)))
  }
}

describe('test vector C: 10,000 PLN, copyright 60%, KUP 250, PIT-2', () => {
  const result = calculateYear(input({ kup50: kup50(0.6) }))

  it('every month', () => {
    for (const row of result.months) {
      expect(row).toMatchObject({
        pension: 976, disability: 150, sickness: 245, health: 776.61,
        kup: 250, kup50: 2588.7, taxBase: 5790, pit: 395, net: 7457.39,
      })
    }
  })

  it('without KUP 50%', () => {
    const row = calculateYear(input()).months[0]
    expect(row).toMatchObject({ pit: 705, net: 7147.39 })
  })

  it('totals and PIT saving', () => {
    expect(result.totals).toMatchObject({ kup50: 31064.4, taxBase: 69480, pit: 4740, net: 89488.68 })
    expect(result.kup50Comparison).toEqual({ pitWithout: 8460, netWithout: 85768.68, pitSaving: 3720, netGain: 3720 })
    expectInvariants(result)
  })
})

describe('test vector D: 30,000 PLN, copyright 80%, KUP 250, PIT-2', () => {
  const result = calculateYear(input({ grossMonthly: 30_000, kup50: kup50(0.8) }))
  const m = result.months

  it('months 1–7', () => {
    for (const row of m.slice(0, 7)) {
      expect(row).toMatchObject({
        pension: 2928, disability: 450, sickness: 735, health: 2329.83,
        kup50: 10354.8, taxBase: 15282, pit: 1534, net: 22023.17,
      })
    }
  })

  it('month 8 crosses the 120k tax threshold', () => {
    expect(m[7]).toMatchObject({ kup50: 10354.8, taxBase: 15282, pit: 1985, net: 21572.17 })
    expect(m[7].events).toEqual(['taxThresholdCrossed'])
  })

  it('month 9', () => {
    expect(m[8]).toMatchObject({ pit: 4590, net: 18967.17 })
  })

  it('month 10 reaches the ZUS cap, so KUP 50% rises', () => {
    expect(m[9]).toMatchObject({
      pension: 1229.76, disability: 189, sickness: 735, health: 2506.16,
      kup50: 11138.5, taxBase: 16458, pit: 4967, net: 20373.08,
    })
    expect(m[9].events).toEqual(['zusCapReached'])
  })

  it('month 11', () => {
    expect(m[10]).toMatchObject({
      pension: 0, disability: 0, sickness: 735, health: 2633.85,
      kup50: 11706, taxBase: 17309, pit: 5239, net: 21392.15,
    })
  })

  it('month 12 reaches the KUP 50% limit: only the remainder applies', () => {
    expect(m[11]).toMatchObject({ kup50: 3962.3, taxBase: 25053, pit: 7717, net: 18914.15 })
    expect(m[11].events).toEqual(['kup50LimitReached'])
    expect(m[11].cumulative.kup50).toBe(120_000)
  })

  it('totals', () => {
    expect(result.totals).toMatchObject({
      gross: 360_000, pension: 27581.76, disability: 4239, sickness: 8820, health: 28742.33,
      kup50: 120_000, taxBase: 196358, pit: 35236, net: 255380.91,
    })
    expectInvariants(result)
  })

  it('cost limit and tax threshold are separate counters', () => {
    expect(m[11].cumulative.taxBase).toBe(196358)
    const s = summarizeYear(result)
    expect(s.limits.find((l) => l.key === 'kup50LimitReached')?.crossedInMonth).toBe(12)
    expect(s.limits.find((l) => l.key === 'taxThresholdCrossed')?.crossedInMonth).toBe(8)
  })

  it('after the limit only standard KUP applies', () => {
    const r = calculateYear(input({ grossMonthly: 50_000, kup50: kup50(1) }))
    const after = r.months.filter((row) => row.cumulative.kup50 >= 120_000 && !row.events.includes('kup50LimitReached'))
    expect(after.length).toBeGreaterThan(0)
    for (const row of after) expect(row).toMatchObject({ kup50: 0, kup: 250 })
    expect(r.totals.kup50).toBe(120_000)
  })
})

describe('standard KUP with 100% copyright', () => {
  it('applies by default', () => {
    expect(calculateYear(input({ kup50: kup50(1) })).months[0].kup).toBe(250)
  })

  it('is dropped when the option is off', () => {
    const row = calculateYear(input({ kup50: kup50(1, false) })).months[0]
    expect(row.kup).toBe(0)
    // 10000 − 1371 − 0.5 × (10000 − 1371) = 4314.5 → 4315
    expect(row.kup50).toBe(4314.5)
    expect(row.taxBase).toBe(4315)
  })

  it('the option has no effect below 100%', () => {
    expect(calculateYear(input({ kup50: kup50(0.99, false) })).months[0].kup).toBe(250)
  })
})

describe('KUP 50% with youth relief', () => {
  const result = calculateYear(input({ grossMonthly: 8000, youthRelief: true, kup50: kup50(0.5) }))
  const m = result.months

  it('no KUP 50% and no limit usage while exempt', () => {
    for (const row of m.slice(0, 10)) {
      expect(row).toMatchObject({ kup50: 0, taxStatus: 'exempt' })
      expect(row.cumulative.kup50).toBe(0)
    }
  })

  it('month the limit is exceeded: KUP 50% only on the taxable copyright part', () => {
    // Taxable share 2472/8000. Copyright part 1236, its social round2(169.4556) = 169.46,
    // KUP 50% = round2(0.5 × 1066.54) = 533.27. Base 2472 − 338.91 − 250 − 533.27 → 1350.
    expect(m[10]).toMatchObject({ kup50: 533.27, taxBase: 1350, pit: 0 })
    expect(m[10].cumulative.kup50).toBe(533.27)
  })

  it('afterwards normal rules with the counter starting at 0', () => {
    // 0.5 × (4000 − 548.40) = 1725.80; base 8000 − 1096.80 − 250 − 1725.80 → 4927; PIT 291
    expect(m[11]).toMatchObject({ kup50: 1725.8, taxBase: 4927, pit: 291 })
    expect(m[11].cumulative.kup50).toBe(2259.07)
    expectInvariants(result)
  })
})

describe('KUP 50% off', () => {
  it('produces no comparison, warning or KUP 50% values', () => {
    const r = calculateYear(input())
    expect(r.kup50Comparison).toBeNull()
    expect(r.warnings).toEqual([])
    expect(r.totals.kup50).toBe(0)
    expect(summarizeYear(r).limits.some((l) => l.key === 'kup50LimitReached')).toBe(false)
  })

  it('0% copyright share equals KUP 50% off', () => {
    const off = calculateYear(input())
    const zero = calculateYear(input({ kup50: kup50(0) }))
    expect(zero.months).toEqual(off.months)
  })
})

describe('minimum wage warning', () => {
  it('warns when the non-copyright part is below the minimum wage, without changing the result', () => {
    const r = calculateYear(input({ kup50: kup50(0.6) })) // 10,000 × 0.4 = 4,000 < 4,806
    expect(r.warnings).toEqual([{ kind: 'belowMinimumWage', nonCopyrightGross: 4000, minimumWage: 4806 }])
    expect(r.months[0].pit).toBe(395) // test vector C unchanged
  })

  it('no warning at or above the minimum wage', () => {
    expect(calculateYear(input({ kup50: kup50(0.5) })).warnings).toEqual([]) // 5,000
    expect(calculateYear(input({ grossMonthly: 30_000, kup50: kup50(0.8) })).warnings).toEqual([]) // 6,000
  })
})

describe('configuration', () => {
  it('KUP 50% rate and limit come from the config', () => {
    const config: PayrollConfig = { ...PAYROLL_CONFIG_2026, kup50: { rate: 0.2, annualLimit: 1000 } }
    const r = calculateYear(input({ kup50: kup50(0.6) }), config)
    expect(r.months[0].kup50).toBe(1000) // round2(0.2 × 5177.40) = 1035.48 → capped at 1000
    expect(r.months[1].kup50).toBe(0)
    expect(r.months[0].events).toContain('kup50LimitReached')
  })
})
