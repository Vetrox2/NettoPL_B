import { describe, expect, it } from 'vitest'
import { calculatorReducer, initialFormState, parseForm } from './calculatorState'

describe('calculator form state', () => {
  it('parses a valid form into a payroll input', () => {
    const state = calculatorReducer(initialFormState, { type: 'setGross', value: '12 500,50' })
    expect(parseForm(state)).toEqual({
      input: { grossMonthly: 12500.5, nonCashBenefitsMonthly: 0, youthRelief: false, commuting: false, kup50: null },
      errors: {},
    })
  })

  it('reports an invalid gross amount', () => {
    const state = calculatorReducer(initialFormState, { type: 'setGross', value: 'abc' })
    const parsed = parseForm(state)
    expect(parsed.input).toBeNull()
    expect(parsed.errors.gross).toBeDefined()
  })

  it('ignores non-cash benefits unless the youth relief is on', () => {
    let state = calculatorReducer(initialFormState, { type: 'setNonCashBenefits', value: '300' })
    expect(parseForm(state).input?.nonCashBenefitsMonthly).toBe(0)
    state = calculatorReducer(state, { type: 'setYouthRelief', value: true })
    expect(parseForm(state).input?.nonCashBenefitsMonthly).toBe(300)
  })

  it('toggles options', () => {
    const state = calculatorReducer(initialFormState, { type: 'setCommuting', value: true })
    expect(parseForm(state).input?.commuting).toBe(true)
  })

  it('KUP 50%: off by default, percentage becomes a share when on', () => {
    expect(parseForm(initialFormState).input?.kup50).toBeNull()
    let state = calculatorReducer(initialFormState, { type: 'setKup50', value: true })
    state = calculatorReducer(state, { type: 'setCopyrightPercent', value: '60' })
    expect(parseForm(state).input?.kup50).toEqual({ copyrightShare: 0.6, applyStandardKupWhenFullCopyright: true })
    state = calculatorReducer(state, { type: 'setApplyStandardKupWhenFullCopyright', value: false })
    expect(parseForm(state).input?.kup50?.applyStandardKupWhenFullCopyright).toBe(false)
  })

  it('KUP 50%: invalid percentage is an error only while KUP 50% is on', () => {
    let state = calculatorReducer(initialFormState, { type: 'setCopyrightPercent', value: '150' })
    expect(parseForm(state).errors).toEqual({})
    state = calculatorReducer(state, { type: 'setKup50', value: true })
    expect(parseForm(state)).toMatchObject({ input: null, errors: { copyrightPercent: expect.any(String) } })
  })
})
