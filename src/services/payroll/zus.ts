import type { PayrollConfig } from '@/config/payroll2026'
import { roundGrosz } from '@/services/money'

export interface SocialContributions {
  readonly pension: number
  readonly disability: number
  readonly sickness: number
  readonly total: number
  /** Amount of this month's gross used as the pension/disability base. */
  readonly cappedBase: number
}

/**
 * Employee social contributions for one month. Pension and disability are
 * charged only on the part of gross that still fits under the annual cap;
 * sickness is always charged on the full gross.
 */
export function calculateSocialContributions(
  gross: number,
  cumulativeZusBaseBefore: number,
  config: PayrollConfig,
): SocialContributions {
  const { pensionRate, disabilityRate, sicknessRate, annualCap } = config.zus
  const roomUnderCap = Math.max(0, annualCap - cumulativeZusBaseBefore)
  const cappedBase = Math.min(gross, roomUnderCap)

  const pension = roundGrosz(cappedBase * pensionRate)
  const disability = roundGrosz(cappedBase * disabilityRate)
  const sickness = roundGrosz(gross * sicknessRate)

  return {
    pension,
    disability,
    sickness,
    total: roundGrosz(pension + disability + sickness),
    cappedBase,
  }
}
