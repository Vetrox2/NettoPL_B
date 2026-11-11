import { AnimatePresence } from 'motion/react'
import { AnnualBreakdownTable } from '@/components/calculator/AnnualBreakdownTable'
import { CurrencyPanel } from '@/components/calculator/CurrencyPanel'
import { LimitsPanel } from '@/components/calculator/LimitsPanel'
import { NetResult } from '@/components/calculator/NetResult'
import { Kup50SavingNotice } from '@/components/calculator/Kup50SavingNotice'
import { RefundNotice } from '@/components/calculator/RefundNotice'
import { SalaryForm } from '@/components/calculator/SalaryForm'
import { Card, CardContent } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BASE_CURRENCY, CURRENCIES, NBP_CONFIG } from '@/config/currency'
import { formatMoney, formatRate, formatWhole } from '@/services/format'
import { monthlyReducingAmount, type PayrollWarning } from '@/services/payroll'
import { CalculatorProvider } from '@/state/CalculatorProvider'
import { useCalculator, type CurrencyState } from '@/state/calculatorContext'

function describeWarning(warning: PayrollWarning): string {
  switch (warning.kind) {
    case 'belowMinimumWage':
      return `The non-copyright part (${formatMoney(warning.nonCopyrightGross)} PLN) is below the minimum wage of ${formatMoney(warning.minimumWage)} PLN. The calculation is unchanged.`
  }
}

function grossHint(currency: CurrencyState): string | undefined {
  const c = currency.salaryConversion
  if (c.status !== 'converted') return undefined
  const origin = c.rate.origin === 'manual' ? 'your rate' : 'NBP rate'
  return `= ${formatMoney(c.plnAmount)} PLN at ${formatRate(c.rate.value)} PLN/${c.currency} (${origin})`
}

function pendingMessage(currency: CurrencyState): string | null {
  const c = currency.salaryConversion
  if (c.status !== 'pending') return null
  return c.reason === 'loading'
    ? `Getting the ${c.currency} rate from NBP…`
    : `Currency conversion failed. Enter the ${c.currency} rate in the Currency panel to continue.`
}

/** Container: reads state from context and passes plain props to presentational components. */
function Calculator() {
  const { form, errors, result, summary, config, currency, actions } = useCalculator()
  const foreignRates = [currency.salaryRate, currency.displayRate].filter(
    (r, i, all): r is NonNullable<typeof r> => r !== null && all.findIndex((x) => x?.code === r.code) === i,
  )
  const display = currency.display

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* DOM order = mobile order (form, result, limits, table); grid placement handles desktop. */}
      <div className="space-y-6 lg:col-start-1 lg:row-start-1">
        <SalaryForm
          grossCurrency={form.salaryCurrency}
          grossHint={grossHint(currency)}
          grossText={form.grossText}
          nonCashBenefitsText={form.nonCashBenefitsText}
          youthRelief={form.youthRelief}
          commuting={form.commuting}
          grossError={errors.gross}
          nonCashBenefitsError={errors.nonCashBenefits}
          kupStandard={config.kup.standardMonthly}
          kupCommuting={config.kup.commutingMonthly}
          youthLimit={formatWhole(config.youthRelief.revenueLimit)}
          onGrossChange={actions.setGross}
          onNonCashBenefitsChange={actions.setNonCashBenefits}
          onYouthReliefChange={actions.setYouthRelief}
          onCommutingChange={actions.setCommuting}
          kup50={form.kup50}
          copyrightPercentText={form.copyrightPercentText}
          copyrightPercentError={errors.copyrightPercent}
          showStandardKupOption={result?.input.kup50?.copyrightShare === 1}
          applyStandardKupWhenFullCopyright={form.applyStandardKupWhenFullCopyright}
          kup50Warning={result?.warnings.map(describeWarning).join(' ') || undefined}
          kup50Limit={formatWhole(config.kup50.annualLimit)}
          onKup50Change={actions.setKup50}
          onCopyrightPercentChange={actions.setCopyrightPercent}
          onApplyStandardKupWhenFullCopyrightChange={actions.setApplyStandardKupWhenFullCopyright}
        />
        <CurrencyPanel
          currencies={CURRENCIES}
          salaryCurrency={form.salaryCurrency}
          displayCurrency={form.displayCurrency}
          rates={foreignRates}
          sourceLabel={NBP_CONFIG.sourceLabel}
          sourceUrl={NBP_CONFIG.sourceUrl}
          onSalaryCurrencyChange={actions.setSalaryCurrency}
          onDisplayCurrencyChange={actions.setDisplayCurrency}
          onManualRateChange={actions.setManualRate}
          onRetry={actions.retryRate}
        />
      </div>

      <div className="min-w-0 space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {result && summary ? (
          <>
            <NetResult
              firstMonthNet={summary.firstMonthNet}
              minMonthlyNet={summary.minMonthlyNet}
              maxMonthlyNet={summary.maxMonthlyNet}
              averageMonthlyNet={summary.averageMonthlyNet}
              annualNet={summary.annualNet}
              annualGross={summary.annualGross}
              netRatio={summary.netRatio}
              converted={
                display && display.currency !== BASE_CURRENCY
                  ? {
                      currency: display.currency,
                      firstMonthNet: display.firstMonthNet,
                      annualNet: display.annualNet,
                      averageMonthlyNet: display.averageMonthlyNet,
                    }
                  : undefined
              }
              breakdown={[
                { label: 'Social security (ZUS)', amount: result.totals.socialTotal },
                { label: 'Health contribution', amount: result.totals.health },
                { label: 'Income tax (PIT)', amount: result.totals.pit },
                { label: 'Net pay', amount: result.totals.net },
              ]}
            />
            <AnimatePresence>
              {result.kup50Comparison && (
                <Kup50SavingNotice
                  key="kup50"
                  pitSaving={result.kup50Comparison.pitSaving}
                  pitWith={result.totals.pit}
                  pitWithout={result.kup50Comparison.pitWithout}
                  netGain={result.kup50Comparison.netGain}
                  kup50Total={result.totals.kup50}
                />
              )}
              {result.refund && (
                <RefundNotice
                  key="refund"
                  refund={result.refund.refund}
                  unusedAmount={result.refund.unusedAmount}
                  monthsWithTaxableIncome={result.refund.monthsWithTaxableIncome}
                  annualReducingAmount={config.tax.annualReducingAmount}
                  monthlyReducingAmount={monthlyReducingAmount(config)}
                  year={config.year}
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center">
              {pendingMessage(currency) ?? 'Enter a valid gross salary to see the calculation.'}
            </CardContent>
          </Card>
        )}
      </div>

      {summary && (
        <div className="lg:col-start-1 lg:row-start-2">
          <LimitsPanel limits={summary.limits} />
        </div>
      )}

      {result && (
        <div className="min-w-0 lg:col-span-2">
          <AnnualBreakdownTable
            months={result.months}
            totals={result.totals}
            showYouthRevenue={result.input.youthRelief}
            showKup50={result.input.kup50 !== null}
            convertedNet={
              display ? { currency: display.currency, monthly: display.monthlyNet, total: display.annualNet } : undefined
            }
            rates={{
              pension: config.zus.pensionRate,
              disability: config.zus.disabilityRate,
              sickness: config.zus.sicknessRate,
              health: config.health.rate,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <CalculatorProvider>
      <TooltipProvider delayDuration={150}>
        <div className="bg-background min-h-svh">
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
            <header className="mb-8 space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Netto<span className="text-primary/60">PL</span>
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Polish gross-to-net salary calculator for an employment contract in 2026. See what lands in your account
                each month and where the rest goes.
              </p>
            </header>
            <Calculator />
            <footer className="text-muted-foreground mt-10 text-xs">
              Estimates only. Assumes PIT-2 is filed with one employer and the same gross every month. All calculations
              run in your browser; exchange rates come from the public NBP API (api.nbp.pl).
            </footer>
          </main>
          <Toaster richColors position="top-right" />
        </div>
      </TooltipProvider>
    </CalculatorProvider>
  )
}
