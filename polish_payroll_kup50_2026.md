# KUP 50% (copyright costs) for employment contract, tax year 2026

Extends `polish_payroll_rules_2026.md`. All rules not listed here are unchanged.

## 1. Inputs

- `copyrightShare`: 0–1, share of gross that is copyright remuneration.
- `applyStandardKupWhenFullCopyright`: boolean, default `true`.

## 2. Monthly calculation order

1. `copyrightGross = gross × copyrightShare`
2. `social` = employee pension + disability + sickness, calculated from the full gross (cap 282,600 applies).
3. `health = 9% × (gross − social)`. Unchanged by KUP 50%.
4. `copyrightSocial = round2(social × copyrightShare)`
5. `kup50 = round2(50% × (copyrightGross − copyrightSocial))`, then `kup50 = min(kup50, 120000 − cumulativeKup50)`
6. `standardKup` = 250 or 300. If `copyrightShare = 1` and `applyStandardKupWhenFullCopyright = false`, use 0.
7. `taxBase = round0(max(0, gross − social − kup50 − standardKup))`
8. PIT, brackets and the tax-reducing amount follow the main spec.
9. `net = gross − social − health − PIT`

## 3. Base for the 50%

- Subtract: employee pension, disability and sickness contributions (the share attributable to the copyright part).
- Do NOT subtract: health contribution, standard KUP, PIT, employer ZUS.
- After the ZUS cap is reached, `social` falls, so `kup50` rises.

## 4. Annual limit

- Cumulative `kup50` ≤ **120,000 PLN** per year (the cost amount, not revenue).
- In the month the limit is reached, apply only the remainder. In later months, `kup50 = 0`.
- Standard KUP still applies after the limit is reached.
- Track `cumulativeKup50` and `cumulativeTaxBase` (bracket threshold 120,000) as separate counters.

## 5. Youth relief

- Copyright gross counts in full toward the 85,528 PLN limit.
- While the revenue is exempt: `kup50 = 0`, and nothing is counted toward the 120,000 PLN cost limit.
- In the month the limit is exceeded: split the taxable excess by `copyrightShare`. Apply `kup50` only to the taxable copyright part, minus its proportional `social`.
- After that: normal rules apply, with `cumulativeKup50` starting at 0.

## 6. Validation

- `gross × (1 − copyrightShare) < 4806` (minimum wage 2026): show a warning only. Do not change the calculation.

## 7. Rounding

- `copyrightSocial` and `kup50`: 0.01 PLN.
- `taxBase` and PIT: whole PLN.

## 8. Output

- Table columns: **month | gross | pension | disability | sickness | health | KUP 50% | tax base | PIT | net**, plus a TOTAL row.
- Running total: `cumulativeKup50` (limit 120,000). Flag the month in which the limit is reached.
- Show the annual PIT saving compared with the same salary without KUP 50%.

### Test vector C: 10,000 gross, copyrightShare 0.6, KUP 250, PIT-2, no youth relief

- Every month: pension 976.00, disability 150.00, sickness 245.00, health 776.61, KUP 50% 2,588.70, tax base 5,790, PIT 395, net 7,457.39.
- Without KUP 50%: PIT 705, net 7,147.39.
- TOTAL: KUP 50% 31,064.40, tax base 69,480, PIT 4,740, net 89,488.68.

### Test vector D: 30,000 gross, copyrightShare 0.8, KUP 250, PIT-2, no youth relief

| Month | Gross | Pension | Disability | Sickness | Health | KUP 50% | Tax base | PIT | Net |
|---|---|---|---|---|---|---|---|---|---|
| 1–7 | 30,000 | 2,928.00 | 450.00 | 735.00 | 2,329.83 | 10,354.80 | 15,282 | 1,534 | 22,023.17 |
| 8 (120k tax base crossed) | 30,000 | 2,928.00 | 450.00 | 735.00 | 2,329.83 | 10,354.80 | 15,282 | 1,985 | 21,572.17 |
| 9 | 30,000 | 2,928.00 | 450.00 | 735.00 | 2,329.83 | 10,354.80 | 15,282 | 4,590 | 18,967.17 |
| 10 (ZUS cap) | 30,000 | 1,229.76 | 189.00 | 735.00 | 2,506.16 | 11,138.50 | 16,458 | 4,967 | 20,373.08 |
| 11 | 30,000 | 0.00 | 0.00 | 735.00 | 2,633.85 | 11,706.00 | 17,309 | 5,239 | 21,392.15 |
| 12 (KUP 50% limit) | 30,000 | 0.00 | 0.00 | 735.00 | 2,633.85 | 3,962.30 | 25,053 | 7,717 | 18,914.15 |
| **TOTAL** | 360,000 | 27,581.76 | 4,239.00 | 8,820.00 | 28,742.33 | 120,000.00 | 196,358 | 35,236 | 255,380.91 |
