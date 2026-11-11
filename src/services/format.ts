const moneyFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

const wholeFormatter = new Intl.NumberFormat('pl-PL', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
})

/** 25000 → "25 000,00" */
export const formatMoney = (value: number): string => moneyFormatter.format(value)

/** 25000 → "25 000" */
export const formatWhole = (value: number): string => wholeFormatter.format(value)

/** 0.6929 → "69,3%" */
export const formatPercent = (ratio: number, digits = 1): string =>
  `${(ratio * 100).toFixed(digits).replace('.', ',')}%`

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const monthName = (month: number): string => MONTH_NAMES[month - 1] ?? String(month)

export const MAX_AMOUNT = 10_000_000

/**
 * Parse a user-typed amount. Accepts spaces as thousand separators and "," or
 * "." as the decimal separator (max 2 decimals). Returns null when invalid,
 * negative or above MAX_AMOUNT.
 */
export function parseAmount(text: string): number | null {
  const normalized = text.replace(/[\s ]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return value <= MAX_AMOUNT ? value : null
}

/** Parse an exchange rate (PLN per unit): positive, up to 6 decimals. Returns null if invalid. */
export function parseRate(text: string): number | null {
  const normalized = text.replace(/[\s ]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) return null
  const value = Number(normalized)
  return value > 0 && value < 100_000 ? value : null
}

const rateFormatter = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 4, maximumFractionDigits: 6 })

/** 4.3895 → "4,3895" */
export const formatRate = (value: number): string => rateFormatter.format(value)

/** "2026-11-10" → "10 Nov 2026" */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}

/** Parse a percentage 0–100 (max 2 decimals, optional "%") into a share 0–1, or null. */
export function parsePercentShare(text: string): number | null {
  const normalized = text.replace(/[\s %]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return value <= 100 ? value / 100 : null
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

/** "EUR" → "Euro" */
export const currencyName = (code: string): string => currencyNames.of(code) ?? code
