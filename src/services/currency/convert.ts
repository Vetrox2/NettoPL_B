import { roundGrosz } from '@/services/money'

/**
 * Pure conversions using an NBP-style rate: PLN per 1 unit of foreign currency.
 * The origin of the rate (API or typed by the user) is irrelevant here.
 */

/** Foreign amount → PLN, rounded to 0.01. */
export function toPln(amount: number, plnPerUnit: number): number {
  assertRate(plnPerUnit)
  return roundGrosz(amount * plnPerUnit)
}

/** PLN amount → foreign currency, rounded to 0.01. */
export function fromPln(amountPln: number, plnPerUnit: number): number {
  assertRate(plnPerUnit)
  return roundGrosz(amountPln / plnPerUnit)
}

function assertRate(rate: number): void {
  if (!Number.isFinite(rate) || rate <= 0) throw new RangeError(`Invalid exchange rate: ${rate}`)
}
