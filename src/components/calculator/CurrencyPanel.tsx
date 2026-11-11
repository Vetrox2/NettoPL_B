import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { currencyName, formatIsoDate, formatRate } from '@/services/format'
import type { NbpProgress } from '@/services/currency'
import type { RateResolution } from '@/state/exchangeRates'

export interface CurrencyPanelProps<C extends string> {
  currencies: readonly C[]
  salaryCurrency: C
  displayCurrency: C
  /** One entry per foreign currency in use. */
  rates: readonly RateResolution[]
  sourceLabel: string
  sourceUrl: string
  onSalaryCurrencyChange(value: C): void
  onDisplayCurrencyChange(value: C): void
  onManualRateChange(code: string, value: string): void
  onRetry(code: string): void
}

function CurrencySelect<C extends string>(props: {
  id: string
  label: string
  value: C
  currencies: readonly C[]
  onChange(value: C): void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Select value={props.value} onValueChange={(v) => props.onChange(v as C)}>
        <SelectTrigger id={props.id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.currencies.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="font-medium">{c}</span>
              <span className="text-muted-foreground">{currencyName(c)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function progressText(progress: NbpProgress | null): string {
  if (!progress) return 'Fetching the latest NBP rate…'
  switch (progress.type) {
    case 'request':
      return progress.attempt === 1
        ? progress.stage === 'current'
          ? 'Fetching the latest NBP rate…'
          : 'Current rate unavailable. Checking recent NBP tables…'
        : `Retrying (attempt ${progress.attempt} of ${progress.maxAttempts})…`
    case 'retryWait':
      return `Request failed. Retrying in ${(progress.delayMs / 1000).toLocaleString('en')} s…`
    case 'fallback':
      return 'Current rate unavailable. Checking recent NBP tables…'
  }
}

function RateStatus({
  rate,
  sourceLabel,
  sourceUrl,
  onManualRateChange,
  onRetry,
}: {
  rate: RateResolution
  sourceLabel: string
  sourceUrl: string
  onManualRateChange(code: string, value: string): void
  onRetry(code: string): void
}) {
  const { code, state, effective } = rate

  if (!state || state.status === 'loading') {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" />
        <span>
          {code}: {progressText(state?.status === 'loading' ? state.progress : null)}
        </span>
      </div>
    )
  }

  if (state.status === 'success') {
    const nbp = state.rate
    return (
      <div className="space-y-0.5 text-sm" data-testid={`rate-${code}`}>
        <p className="font-medium tabular-nums">
          1 {code} = {formatRate(nbp.mid)} PLN
        </p>
        <p className="text-muted-foreground text-xs">
          Effective {formatIsoDate(nbp.effectiveDate)} · table {nbp.tableNo}
          {nbp.via === 'history' && ' · from historical data'}
        </p>
        <p className="text-muted-foreground text-xs">
          Source:{' '}
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {sourceLabel}
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-3" data-testid={`rate-${code}`}>
      <p className="flex items-start gap-2 text-sm">
        <AlertCircle className="text-destructive mt-0.5 size-4 shrink-0" />
        <span>Could not get the {code} rate from NBP. Enter the rate yourself to continue.</span>
      </p>
      <div className="flex items-center gap-2">
        <Label htmlFor={`manual-rate-${code}`} className="shrink-0 text-sm font-normal">
          1 {code} =
        </Label>
        <Input
          id={`manual-rate-${code}`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 4,3895"
          value={rate.manualRateText}
          onChange={(e) => onManualRateChange(code, e.target.value)}
          aria-invalid={Boolean(rate.manualRateError)}
          className="h-8 w-28 tabular-nums"
        />
        <span className="text-sm">PLN</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onRetry(code)}>
          <RotateCcw /> Retry
        </Button>
      </div>
      {rate.manualRateError ? (
        <p className="text-destructive text-xs">{rate.manualRateError}</p>
      ) : effective?.origin === 'manual' ? (
        <p className="text-muted-foreground text-xs tabular-nums">
          Using your rate: 1 {code} = {formatRate(effective.value)} PLN (source: entered manually)
        </p>
      ) : null}
    </div>
  )
}

export function CurrencyPanel<C extends string>(props: CurrencyPanelProps<C>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency</CardTitle>
        <CardDescription>Converted at the latest NBP average rate. Tax is always calculated in PLN.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <CurrencySelect
            id="salary-currency"
            label="Salary paid in"
            value={props.salaryCurrency}
            currencies={props.currencies}
            onChange={props.onSalaryCurrencyChange}
          />
          <CurrencySelect
            id="display-currency"
            label="Show net in"
            value={props.displayCurrency}
            currencies={props.currencies}
            onChange={props.onDisplayCurrencyChange}
          />
        </div>
        <AnimatePresence initial={false}>
          {props.rates.map((rate) => (
            <motion.div
              key={rate.code}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <RateStatus
                rate={rate}
                sourceLabel={props.sourceLabel}
                sourceUrl={props.sourceUrl}
                onManualRateChange={props.onManualRateChange}
                onRetry={props.onRetry}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
