import { useMemo, useReducer, type ReactNode } from 'react'
import { payrollConfig } from '@/config/payroll2026'
import { convertNetFigures, nbpClient, type NbpClient } from '@/services/currency'
import { calculateYear, summarizeYear } from '@/services/payroll'
import { CalculatorContext, type CalculatorContextValue } from './calculatorContext'
import { calculatorReducer, currenciesNeeded, initialFormState, parseForm } from './calculatorState'
import { convertSalaryInput, resolveRate } from './exchangeRates'
import { useExchangeRates } from './useExchangeRates'

interface CalculatorProviderProps {
  children: ReactNode
  /** Exchange-rate client; injectable for tests. */
  rateClient?: NbpClient
}

/** Owns the form and exchange-rate state and derives the calculation result from them. */
export function CalculatorProvider({ children, rateClient = nbpClient }: CalculatorProviderProps) {
  const [form, dispatch] = useReducer(calculatorReducer, initialFormState)
  const needed = useMemo(() => currenciesNeeded(form), [form])
  const { rates, retry } = useExchangeRates(needed, rateClient)

  const value = useMemo<CalculatorContextValue>(() => {
    const resolve = (code: string) =>
      needed.includes(code) ? resolveRate(code, rates[code], form.manualRates[code] ?? '') : null
    const salaryRate = resolve(form.salaryCurrency)
    const displayRate = resolve(form.displayCurrency)

    const parsed = parseForm(form)
    const { input, conversion } = parsed.input
      ? convertSalaryInput(parsed.input, form.salaryCurrency, salaryRate)
      : { input: null, conversion: { status: 'none' } as const }

    const result = input ? calculateYear(input, payrollConfig) : null
    const summary = result ? summarizeYear(result, payrollConfig) : null
    const display =
      result && summary && displayRate?.effective
        ? convertNetFigures(result, summary, form.displayCurrency, displayRate.effective.value)
        : null

    return {
      form,
      errors: parsed.errors,
      result,
      summary,
      config: payrollConfig,
      currency: { salaryRate, displayRate, salaryConversion: conversion, display },
      actions: {
        setGross: (value) => dispatch({ type: 'setGross', value }),
        setNonCashBenefits: (value) => dispatch({ type: 'setNonCashBenefits', value }),
        setYouthRelief: (value) => dispatch({ type: 'setYouthRelief', value }),
        setCommuting: (value) => dispatch({ type: 'setCommuting', value }),
        setKup50: (value) => dispatch({ type: 'setKup50', value }),
        setCopyrightPercent: (value) => dispatch({ type: 'setCopyrightPercent', value }),
        setApplyStandardKupWhenFullCopyright: (value) =>
          dispatch({ type: 'setApplyStandardKupWhenFullCopyright', value }),
        setSalaryCurrency: (value) => dispatch({ type: 'setSalaryCurrency', value }),
        setDisplayCurrency: (value) => dispatch({ type: 'setDisplayCurrency', value }),
        setManualRate: (code, value) => dispatch({ type: 'setManualRate', code, value }),
        retryRate: retry,
      },
    }
  }, [form, needed, rates, retry])

  return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>
}
