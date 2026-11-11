import { describe, expect, it } from 'vitest'
import { convertNetFigures, type NbpRate } from '@/services/currency'
import { calculateYear, summarizeYear, type PayrollInput } from '@/services/payroll'
import { calculatorReducer, currenciesNeeded, initialFormState, parseForm } from './calculatorState'
import { convertSalaryInput, ratesReducer, resolveRate, type RateState } from './exchangeRates'

const NBP_EUR: NbpRate = { code: 'EUR', mid: 4.3895, effectiveDate: '2026-11-10', tableNo: '219/A/NBP/2026', via: 'current' }
const success: RateState = { status: 'success', rate: NBP_EUR }
const failed: RateState = { status: 'error', message: 'down' }
const loading: RateState = { status: 'loading', progress: null }

const input: PayrollInput = {
  grossMonthly: 5000,
  youthRelief: false,
  commuting: false,
  nonCashBenefitsMonthly: 0,
  kup50: null,
}

describe('resolveRate', () => {
  it('uses the NBP rate when available, ignoring any manual text', () => {
    expect(resolveRate('EUR', success, '9').effective).toEqual({ origin: 'nbp', value: 4.3895, nbp: NBP_EUR })
  })

  it('no rate while loading', () => {
    expect(resolveRate('EUR', loading, '4,5').effective).toBeNull()
  })

  it('after a failure, accepts a manual rate', () => {
    expect(resolveRate('EUR', failed, '4,3895').effective).toEqual({ origin: 'manual', value: 4.3895 })
    expect(resolveRate('EUR', failed, '').effective).toBeNull()
    expect(resolveRate('EUR', failed, '').manualRateError).toBeUndefined()
    expect(resolveRate('EUR', failed, '-1').manualRateError).toBeDefined()
  })
})

describe('convertSalaryInput', () => {
  it('PLN salary passes through untouched', () => {
    expect(convertSalaryInput(input, 'PLN', null)).toEqual({ input, conversion: { status: 'none' } })
  })

  it('foreign salary is converted to PLN before the calculation', () => {
    const { input: converted, conversion } = convertSalaryInput(input, 'EUR', resolveRate('EUR', success, ''))
    expect(converted?.grossMonthly).toBe(21947.5)
    expect(conversion).toMatchObject({ status: 'converted', amount: 5000, plnAmount: 21947.5, currency: 'EUR' })
  })

  it('is pending while loading, and asks for a manual rate after a failure', () => {
    expect(convertSalaryInput(input, 'EUR', resolveRate('EUR', loading, ''))).toEqual({
      input: null, conversion: { status: 'pending', reason: 'loading', currency: 'EUR' },
    })
    expect(convertSalaryInput(input, 'EUR', resolveRate('EUR', failed, '')).conversion).toMatchObject({
      status: 'pending', reason: 'needsManualRate',
    })
  })

  it('a manual rate gives exactly the same result as an API rate of the same value', () => {
    const viaApi = convertSalaryInput(input, 'EUR', resolveRate('EUR', success, '')).input!
    const viaManual = convertSalaryInput(input, 'EUR', resolveRate('EUR', failed, '4,3895')).input!
    expect(viaManual).toEqual(viaApi)
    const a = calculateYear(viaApi)
    const b = calculateYear(viaManual)
    expect(b).toEqual(a)
    expect(convertNetFigures(b, summarizeYear(b), 'EUR', 4.3895)).toEqual(convertNetFigures(a, summarizeYear(a), 'EUR', 4.3895))
  })
})

describe('form currency state', () => {
  it('no currencies needed by default, so no API calls', () => {
    expect(currenciesNeeded(initialFormState)).toEqual([])
  })

  it('collects salary and display currencies, once each', () => {
    let state = calculatorReducer(initialFormState, { type: 'setSalaryCurrency', value: 'EUR' })
    state = calculatorReducer(state, { type: 'setDisplayCurrency', value: 'EUR' })
    expect(currenciesNeeded(state)).toEqual(['EUR'])
    state = calculatorReducer(state, { type: 'setDisplayCurrency', value: 'USD' })
    expect(currenciesNeeded(state)).toEqual(['EUR', 'USD'])
  })

  it('currency settings do not change the parsed input', () => {
    const state = calculatorReducer(initialFormState, { type: 'setSalaryCurrency', value: 'EUR' })
    expect(parseForm(state)).toEqual(parseForm(initialFormState))
  })
})

describe('ratesReducer', () => {
  it('tracks loading → progress → success', () => {
    let s = ratesReducer({}, { type: 'loading', code: 'EUR' })
    s = ratesReducer(s, { type: 'progress', code: 'EUR', progress: { type: 'fallback' } })
    expect(s.EUR).toEqual({ status: 'loading', progress: { type: 'fallback' } })
    s = ratesReducer(s, { type: 'success', code: 'EUR', rate: NBP_EUR })
    expect(s.EUR).toEqual(success)
    // late progress events do not overwrite a settled state
    expect(ratesReducer(s, { type: 'progress', code: 'EUR', progress: { type: 'fallback' } })).toBe(s)
  })
})
