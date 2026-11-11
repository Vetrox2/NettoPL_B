# NettoPL

Gross-to-net salary calculator for Poland (employment contract, tax year 2026).
Enter a gross monthly salary and see the net result plus a month-by-month breakdown of the whole year.
Runs entirely in the browser. Salaries paid in a foreign currency are converted to PLN at the latest
NBP average rate (table A, public API at https://api.nbp.pl/), and the net result can also be shown in
another currency.

Calculation rules: [`polish_payroll_rules_2026.md`](polish_payroll_rules_2026.md), extended by
[`polish_payroll_kup50_2026.md`](polish_payroll_kup50_2026.md) (50% author's costs).

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm test         # unit tests (calculation logic, no rendering)
npm run build    # typecheck + production build
```

## Structure

```
src/
  config/payroll2026.ts      every rate, threshold and limit (single source of truth)
  config/currency.ts         NBP endpoint, retry/fallback policy, offered currencies
  services/                  pure TypeScript, no React
    money.ts                 rounding (0.01 PLN / whole PLN, half up)
    format.ts                PLN formatting and input parsing
    currency/
      nbpClient.ts           NBP API client: retries with backoff, historical fallback
      convert.ts             pure toPln / fromPln
      display.ts             net figures in a display currency
    payroll/
      zus.ts                 social contributions + annual cap
      health.ts              health contribution
      tax.ts                 KUP, tax base, PIT advance, brackets, reducing amount
      youthRelief.ts         under-26 exemption share
      kup50.ts               50% author's costs (KUP 50%), annual limit, minimum-wage warning
      calculateYear.ts       12-month calculation, totals, refund
      summary.ts             headline numbers and limit progress
  state/                     useReducer + context: form state → parsed input → result
    exchangeRates.ts         rate loading state, rate resolution (NBP or manual), salary conversion
    useExchangeRates.ts      fetches rates via the client, handles loading/errors, raises the toast
  components/calculator/     presentational components (props in, events out)
  components/ui, animate-ui  shadcn/ui and Animate UI primitives
  App.tsx                    container that wires state to components
```

Every calculation function takes a `PayrollConfig` (defaulting to the 2026 config), so tests can run any
scenario against modified rules.
