import type { MonthEvent } from '@/services/payroll'

/** Display labels for month events (presentation only). */
export const EVENT_LABELS: Record<MonthEvent, { short: string; long: string }> = {
  zusCapReached: {
    short: 'ZUS cap',
    long: 'Annual pension & disability base cap reached: from now on those contributions stop.',
  },
  taxThresholdCrossed: {
    short: '32% bracket',
    long: 'Cumulative tax base crossed the threshold: the excess is taxed at the upper rate.',
  },
  youthLimitExceeded: {
    short: 'Youth limit',
    long: 'Youth-relief revenue limit exceeded: only the excess is taxed this month.',
  },
  kup50LimitReached: {
    short: 'KUP 50% limit',
    long: 'Annual author’s-costs limit reached: only the remainder applies this month, none afterwards.',
  },
}
