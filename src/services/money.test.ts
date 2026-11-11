import { describe, expect, it } from 'vitest'
import { formatMoney, parseAmount } from './format'
import { roundGrosz, roundPln } from './money'

describe('rounding', () => {
  it('rounds half up despite floating-point noise', () => {
    expect(roundGrosz(21572.5 * 0.09)).toBe(1941.53)
    expect(roundGrosz(23531.74 * 0.09)).toBe(2117.86)
    expect(roundPln(21322.5)).toBe(21323)
    expect(roundPln(2258.49)).toBe(2258)
    expect(roundPln(-0.5)).toBe(-1)
  })
})

describe('parseAmount', () => {
  it.each([
    ['8000', 8000],
    ['8 000', 8000],
    ['8000,50', 8000.5],
    ['8000.5', 8000.5],
    ['0', 0],
  ])('%s → %s', (text, value) => expect(parseAmount(text)).toBe(value))

  it.each(['', 'abc', '-100', '1,234,5', '1.001', '99999999'])('rejects %j', (text) =>
    expect(parseAmount(text)).toBeNull(),
  )
})

describe('formatMoney', () => {
  it('uses Polish formatting with grouping', () => {
    expect(formatMoney(8000).replace(/\s/g, ' ')).toBe('8 000,00')
  })
})
