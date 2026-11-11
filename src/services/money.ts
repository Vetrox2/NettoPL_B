/**
 * Rounding helpers. Half-away-from-zero ("0.50 and above rounds up"), with a
 * tiny epsilon to absorb binary floating-point noise such as
 * 21572.5 × 0.09 = 1941.5249999… which must round to 1941.53.
 */
const EPSILON = 1e-6

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  const scaled = Math.abs(value) * factor
  const rounded = Math.round(scaled + EPSILON) / factor
  return value < 0 ? -rounded : rounded
}

/** Round to 0.01 PLN (grosz). */
export const roundGrosz = (value: number): number => roundTo(value, 2)

/** Round to whole PLN. */
export const roundPln = (value: number): number => roundTo(value, 0)

/** Sum money amounts and round the result to 0.01 PLN. */
export function sumMoney(values: readonly number[]): number {
  return roundGrosz(values.reduce((acc, v) => acc + v, 0))
}
