import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney, formatWhole, monthName } from '@/services/format'
import type { LimitProgress } from '@/services/payroll'

export interface LimitsPanelProps {
  limits: readonly LimitProgress[]
}

export function LimitsPanel({ limits }: LimitsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual limits</CardTitle>
        <CardDescription>Running totals at the end of the year</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.map((limit) => (
          <div key={limit.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{limit.label}</span>
              {limit.crossedInMonth ? (
                <Badge variant="secondary">crossed in {monthName(limit.crossedInMonth)}</Badge>
              ) : (
                <Badge variant="outline">not reached</Badge>
              )}
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={limit.label}
              aria-valuemin={0}
              aria-valuemax={limit.limit}
              aria-valuenow={Math.min(limit.reached, limit.limit)}
            >
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={false}
                animate={{ width: `${limit.ratio * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatMoney(limit.reached)} / {formatWhole(limit.limit)} PLN
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
