import { SlidingNumber } from '@/components/animate-ui/primitives/texts/sliding-number'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney, formatPercent } from '@/services/format'

export interface NetResultProps {
  firstMonthNet: number
  minMonthlyNet: number
  maxMonthlyNet: number
  averageMonthlyNet: number
  annualNet: number
  annualGross: number
  netRatio: number
  /** Annual totals of where the gross goes. */
  breakdown: ReadonlyArray<{ label: string; amount: number }>
  /** The same net figures in another currency, if one was chosen. */
  converted?: {
    currency: string
    firstMonthNet: number
    annualNet: number
    averageMonthlyNet: number
  }
}

function Converted({ value, currency }: { value: number; currency: string }) {
  return (
    <span className="text-muted-foreground block text-xs font-normal tabular-nums">
      ≈ {formatMoney(value)} {currency}
    </span>
  )
}

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <SlidingNumber
      number={Math.round(value * 100) / 100}
      decimalPlaces={2}
      decimalSeparator=","
      thousandSeparator={' '}
      className={className}
    />
  )
}

export function NetResult(props: NetResultProps) {
  const varies = props.minMonthlyNet !== props.maxMonthlyNet

  return (
    <Card>
      <CardHeader>
        <CardDescription>Net pay in January (na rękę)</CardDescription>
        <CardTitle className="flex items-baseline gap-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          <Money value={props.firstMonthNet} />
          <span className="text-muted-foreground text-lg font-normal">PLN</span>
        </CardTitle>
        {props.converted && (
          <p className="text-xl font-medium tabular-nums" data-testid="converted-net">
            ≈ <Money value={props.converted.firstMonthNet} />{' '}
            <span className="text-muted-foreground text-base font-normal">{props.converted.currency}</span>
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {varies ? (
            <>
              Varies during the year from <strong className="text-foreground tabular-nums">{formatMoney(props.minMonthlyNet)}</strong> to{' '}
              <strong className="text-foreground tabular-nums">{formatMoney(props.maxMonthlyNet)}</strong> PLN. See the table below.
            </>
          ) : (
            'The same every month of the year.'
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">Net per year</dt>
            <dd className="text-lg font-semibold tabular-nums">
              <Money value={props.annualNet} />
              {props.converted && <Converted value={props.converted.annualNet} currency={props.converted.currency} />}
            </dd>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">Average net per month</dt>
            <dd className="text-lg font-semibold tabular-nums">
              <Money value={props.averageMonthlyNet} />
              {props.converted && (
                <Converted value={props.converted.averageMonthlyNet} currency={props.converted.currency} />
              )}
            </dd>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">You keep of gross</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatPercent(props.netRatio)}</dd>
          </div>
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-medium">Where the yearly gross goes</h3>
          <ul className="divide-y text-sm">
            {props.breakdown.map((item) => (
              <li key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="flex gap-3 tabular-nums">
                  <span>{formatMoney(item.amount)}</span>
                  <span className="text-muted-foreground w-14 text-right">
                    {props.annualGross > 0 ? formatPercent(item.amount / props.annualGross) : '–'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
