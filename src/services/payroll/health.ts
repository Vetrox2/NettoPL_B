import type { PayrollConfig } from '@/config/payroll2026'
import { roundGrosz } from '@/services/money'

/** Health contribution: rate × (gross − employee social contributions). Never deductible. */
export function calculateHealthContribution(
  gross: number,
  socialTotal: number,
  config: PayrollConfig,
): number {
  return roundGrosz(Math.max(0, gross - socialTotal) * config.health.rate)
}
