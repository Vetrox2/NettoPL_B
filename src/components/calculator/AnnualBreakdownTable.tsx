import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatMoney, formatPercent, monthName } from '@/services/format'
import type { MonthRow, YearTotals } from '@/services/payroll'
import { EVENT_LABELS } from './labels'

export interface AnnualBreakdownTableProps {
  months: readonly MonthRow[]
  totals: YearTotals
  /** Show the cumulative youth-relief revenue column. */
  showYouthRevenue: boolean
  /** Show the KUP 50% column and its running total. */
  showKup50: boolean
  /** Net per month in another currency, shown as an extra column. */
  convertedNet?: { currency: string; monthly: readonly number[]; total: number }
  /** Contribution rates, shown in the column hints. */
  rates: { pension: number; disability: number; sickness: number; health: number }
}

type MoneyKey =
  | 'gross' | 'pension' | 'disability' | 'sickness' | 'health' | 'kup' | 'kup50' | 'taxBase' | 'pit' | 'net'

const pct = (rate: number) => `${formatPercent(rate, 2).replace(/,?0+%$/, '%')}`

const columns = (
  rates: AnnualBreakdownTableProps['rates'],
  showKup50: boolean,
): ReadonlyArray<{ key: MoneyKey; label: string; hint: string }> => [
  { key: 'gross', label: 'Gross', hint: 'Cash gross salary (brutto)' },
  { key: 'pension', label: 'Pension', hint: `Emerytalna, ${pct(rates.pension)}, stops at the annual cap` },
  { key: 'disability', label: 'Disability', hint: `Rentowa, ${pct(rates.disability)}, stops at the annual cap` },
  { key: 'sickness', label: 'Sickness', hint: `Chorobowa, ${pct(rates.sickness)}, no cap` },
  { key: 'health', label: 'Health', hint: `Zdrowotna, ${pct(rates.health)} of gross minus social contributions` },
  { key: 'kup', label: 'Work costs', hint: 'Tax-deductible costs (KUP)' },
  ...(showKup50
    ? [{ key: 'kup50' as const, label: 'KUP 50%', hint: 'Author’s costs: 50% of copyright gross minus its share of social contributions' }]
    : []),
  { key: 'taxBase', label: 'Tax base', hint: 'Taxable revenue − social contributions − KUP, whole PLN' },
  { key: 'pit', label: 'PIT', hint: 'Income tax advance, whole PLN' },
  { key: 'net', label: 'Net', hint: 'Gross − contributions − PIT' },
]

/** Fades the value in whenever it changes. */
function AnimatedValue({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.25 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="inline-block"
    >
      {formatMoney(value)}
    </motion.span>
  )
}

function HeadWithHint({ label, hint, className }: { label: string; hint: string; className?: string }) {
  return (
    <TableHead className={cn('text-right', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted underline-offset-4">{label}</span>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TableHead>
  )
}

function MonthLabel({ row }: { row: MonthRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{monthName(row.month)}</span>
      {row.taxStatus === 'exempt' && <Badge variant="outline">PIT exempt</Badge>}
      {row.events.map((event) => (
        <Tooltip key={event}>
          <TooltipTrigger asChild>
            <Badge className="cursor-help">{EVENT_LABELS[event].short}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{EVENT_LABELS[event].long}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function AnnualBreakdownTable({
  months,
  totals,
  showYouthRevenue,
  showKup50,
  rates,
  convertedNet,
}: AnnualBreakdownTableProps) {
  const COLUMNS = columns(rates, showKup50)
  const runningColumns = 2 + (showKup50 ? 1 : 0) + (showYouthRevenue ? 1 : 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Year at a glance</CardTitle>
        <CardDescription>
          Month by month: how each gross payment splits into contributions, tax and net pay. Σ columns are running totals
          since January.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Month</TableHead>
              {COLUMNS.map((c) => (
                <HeadWithHint key={c.key} label={c.label} hint={c.hint} className={c.key === 'net' ? 'font-semibold' : undefined} />
              ))}
              {convertedNet && (
                <HeadWithHint
                  label={`Net (${convertedNet.currency})`}
                  hint={`Net converted to ${convertedNet.currency} at the rate shown in the Currency panel`}
                />
              )}
              <HeadWithHint label="Σ ZUS base" hint="Cumulative pension & disability base (annual cap)" className="border-l" />
              <HeadWithHint label="Σ tax base" hint="Cumulative taxable base (bracket threshold)" />
              {showKup50 && <HeadWithHint label="Σ KUP 50%" hint="Cumulative author’s costs (annual limit)" />}
              {showYouthRevenue && (
                <HeadWithHint label="Σ youth revenue" hint="Cumulative gross + non-cash benefits (youth-relief limit)" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((row) => (
              <TableRow key={row.month} className={cn(row.events.length > 0 && 'bg-primary/5')}>
                <TableCell>
                  <MonthLabel row={row} />
                </TableCell>
                {COLUMNS.map((c) => (
                  <TableCell key={c.key} className={cn('text-right', c.key === 'net' && 'font-semibold')}>
                    <AnimatedValue value={row[c.key]} />
                  </TableCell>
                ))}
                {convertedNet && (
                  <TableCell className="text-right">
                    <AnimatedValue value={convertedNet.monthly[row.month - 1] ?? 0} />
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground border-l text-right">
                  {formatMoney(row.cumulative.zusBase)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right">{formatMoney(row.cumulative.taxBase)}</TableCell>
                {showKup50 && (
                  <TableCell className="text-muted-foreground text-right">{formatMoney(row.cumulative.kup50)}</TableCell>
                )}
                {showYouthRevenue && (
                  <TableCell className="text-muted-foreground text-right">
                    {formatMoney(row.cumulative.youthRevenue)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell>TOTAL</TableCell>
              {COLUMNS.map((c) => (
                <TableCell key={c.key} className="text-right">
                  <AnimatedValue value={totals[c.key]} />
                </TableCell>
              ))}
              {convertedNet && (
                <TableCell className="text-right">
                  <AnimatedValue value={convertedNet.total} />
                </TableCell>
              )}
              <TableCell className="border-l" colSpan={runningColumns} />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  )
}
