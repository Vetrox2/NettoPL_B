/**
 * Single source of truth for every rate, threshold and limit used by the
 * payroll calculation (tax year 2026, umowa o pracę).
 *
 * Calculation code never hard-codes these numbers — it always receives a
 * `PayrollConfig`. Change a value here and every result in the app follows.
 */

export interface PayrollConfig {
  readonly year: number
  readonly monthsInYear: number
  readonly zus: {
    /** Employee pension contribution (emerytalna). */
    readonly pensionRate: number
    /** Employee disability contribution (rentowa). */
    readonly disabilityRate: number
    /** Employee sickness contribution (chorobowa) — no annual cap. */
    readonly sicknessRate: number
    /** Annual cap on the cumulative pension + disability contribution base. */
    readonly annualCap: number
  }
  readonly health: {
    /** Health contribution rate applied to (gross − employee social contributions). */
    readonly rate: number
  }
  readonly kup: {
    /** Standard monthly tax-deductible costs. */
    readonly standardMonthly: number
    /** Monthly tax-deductible costs when commuting from another town. */
    readonly commutingMonthly: number
  }
  readonly tax: {
    readonly lowerRate: number
    readonly upperRate: number
    /** Cumulative annual tax base above which the upper rate applies. */
    readonly bracketThreshold: number
    /** Annual tax-reducing amount (lower rate × tax-free amount). */
    readonly annualReducingAmount: number
    /** Number of payers the employee filed PIT-2 with (0 = not filed). */
    readonly pit2Payers: number
  }
  readonly youthRelief: {
    /** Annual revenue limit for the under-26 exemption. */
    readonly revenueLimit: number
  }
  readonly kup50: {
    /** Copyright costs rate applied to (copyright gross − its share of social contributions). */
    readonly rate: number
    /** Annual limit of the cumulative KUP 50% cost amount. */
    readonly annualLimit: number
  }
  /** Monthly minimum wage; the non-copyright part of gross should not fall below it. */
  readonly minimumWage: number
}

export const PAYROLL_CONFIG_2026: PayrollConfig = {
  year: 2026,
  monthsInYear: 12,
  zus: {
    pensionRate: 0.0976,
    disabilityRate: 0.015,
    sicknessRate: 0.0245,
    annualCap: 282_600,
  },
  health: {
    rate: 0.09,
  },
  kup: {
    standardMonthly: 250,
    commutingMonthly: 300,
  },
  tax: {
    lowerRate: 0.12,
    upperRate: 0.32,
    bracketThreshold: 120_000,
    annualReducingAmount: 3_600,
    pit2Payers: 1,
  },
  youthRelief: {
    revenueLimit: 85_528,
  },
  kup50: {
    rate: 0.5,
    annualLimit: 120_000,
  },
  minimumWage: 4_806,
}

/** Config used by the app. Swap this to run the calculator on other rules. */
export const payrollConfig: PayrollConfig = PAYROLL_CONFIG_2026
