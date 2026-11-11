# Polish payroll: gross-to-net calculation rules (employment contract / umowa o pracę, tax year 2026)

## 1. Monthly calculation order

1. **Gross (brutto)** = cash salary from the employment contract. Non-cash benefits are NOT added here (see section 8).
2. **Employee social security contributions (ZUS)** are calculated from gross.
3. **Health contribution** = 9% × (gross − employee social contributions).
4. **Tax base** = gross − employee social contributions − tax-deductible costs (KUP). Round to whole PLN.
5. **PIT advance** = tax base × rate − monthly tax-reducing amount. Round to whole PLN, minimum 0.
6. **Net** = gross − social contributions − health contribution − PIT.

## 2. Employee social security contributions (ZUS)

| Contribution | Rate | Annual cap |
|---|---|---|
| Pension (emerytalna) | 9.76% | yes |
| Disability (rentowa) | 1.50% | yes (same cap) |
| Sickness (chorobowa) | 2.45% | no cap |
| **Total** | **13.71%** | |

- Calculate each contribution separately and round it to 0.01 PLN.
- **Annual cap for 2026: 282,600 PLN.** It applies to the combined, cumulative base of the pension and disability contributions within the calendar year.
- In the month the cap is crossed, charge pension and disability contributions only on the amount remaining up to the cap. In later months, charge 0. Sickness contribution always applies to the full gross.
- When social contributions fall, the health contribution base rises, so the health contribution goes up in those months.

## 3. Health contribution

- 9% × (gross − employee social contributions), rounded to 0.01 PLN.
- **Not deductible** from the tax base or from the PIT advance.
- No annual cap. It is charged even when the youth relief applies.

## 4. Tax-deductible costs (KUP)

| Case | Monthly | Annual, 1 employer | Annual, multiple employers |
|---|---|---|---|
| Standard | **250 PLN** | 3,000 PLN | max 4,500 PLN |
| Commuting (workplace in a different town than the place of residence) | **300 PLN** | 3,600 PLN | max 5,400 PLN |

- Flat monthly amount, independent of salary level.
- The tax base cannot go below 0.
- KUP are not deducted from revenue that is exempt under the youth relief (section 7).

## 5. Tax brackets (2026)

| Cumulative tax base in the year | Rate |
|---|---|
| up to 120,000 PLN | **12%** |
| above 120,000 PLN | **32%** |

- Track the cumulative tax base from January.
- In the month the threshold is crossed: PIT = 12% × (part up to 120,000) + 32% × (excess) − reducing amount.
- In all later months, the whole monthly tax base is taxed at 32%.

## 6. Tax-free amount (30,000 PLN) and the tax-reducing amount

- The 30,000 PLN tax-free amount equals an **annual tax-reducing amount of 3,600 PLN** (12% × 30,000).
- The employer deducts it monthly, in **equal parts**, when the employee has filed form PIT-2:
  - PIT-2 filed with one payer: **300 PLN/month**;
  - with 2 payers: 150 PLN/month; with 3 payers: 100 PLN/month;
  - no PIT-2: 0.
- The 300 PLN is deducted every month, **including after crossing the 120,000 PLN threshold**.
- The tax-free amount is **not front-loaded**. It does not lower PIT in the early months. PIT changes during the year only because of:
  - the youth relief (PIT = 0 until the limit is exceeded);
  - crossing the 120,000 PLN threshold (PIT rises);
  - reaching the ZUS cap (net rises; PIT and health contribution rise slightly).

## 7. Youth relief (ulga dla młodych, "zero PIT")

- **Eligibility:** employees under 26. Revenue received (by payment date) up to and including the 26th birthday is exempt. Applied automatically unless the employee opts out.
- **Limit: 85,528 PLN of revenue per year.**
- **Revenue counted toward the limit is cumulative GROSS with no deductions:**
  - cash gross from the employment contract; nothing is subtracted (no ZUS, no health contribution, no KUP, no PIT);
  - plus the gross value of non-cash benefits (e.g. private medical care, insurance, vouchers, other benefits received as a service rather than money).
- **While under the limit:**
  - PIT = 0;
  - ZUS and the health contribution are calculated and charged as normal;
  - KUP and the tax-reducing amount are not applied, since there is no tax.
- **In the month the limit is exceeded:**
  - only the excess revenue above 85,528 PLN is taxable;
  - social contributions and KUP are deducted from the taxable part only (social contributions in proportion to the taxable share of that month's revenue);
  - the tax-reducing amount of **300 PLN** is applied.
- **Tax brackets after exceeding the limit:** the cumulative tax base for the 120,000 PLN threshold starts at **0 at the moment the limit is exceeded**. Exempt revenue never counts toward the 120,000 PLN bracket threshold.
- **From then on:** normal rules apply (12% / 32%, KUP, −300 PLN per month).
- **Annual reconciliation (tax refund):**
  - in the monthly advances, only 300 PLN × (number of months with taxable income) of the 3,600 PLN is used, because months with PIT = 0 used none of it;
  - the unused part is settled in the annual tax return and gives a **refund in the following year**;
  - refund = 3,600 − 300 × (months with taxable income), capped at the PIT actually paid in the year (annual tax cannot be negative).

## 8. Non-cash benefits

- **Default model:** the value of non-cash benefits (private medical care, insurance, vouchers, etc.) counts **only toward the youth relief revenue limit** (section 7).
- ZUS, the health contribution, the tax base and net pay are calculated from the **cash gross only**. The benefit value increases revenue, but it is offset by an equal deduction, so it is neutral for these calculations.
- **Edge case (disputed):** in some cases the benefit value is included in the **PIT tax base**. If the employee co-pays any part of the benefit cost (even a symbolic amount, e.g. 0.50 PLN/month), the benefit is excluded from the ZUS base.

## 9. Rounding

- ZUS contributions and health contribution: to 0.01 PLN.
- Tax base and PIT advance: to whole PLN (below 0.50 rounds down, 0.50 and above rounds up).

## 10. Required output: annual breakdown

Below the result, render a 12-month table with these columns:

**month | gross | pension | disability | sickness | health | tax base | PIT | net**

- Add a final **TOTAL** row with annual sums.
- Track and expose these running totals:
  - cumulative ZUS base (cap 282,600);
  - cumulative tax base (threshold 120,000);
  - cumulative youth-relief revenue, including non-cash benefits (limit 85,528).
- Flag the months in which any limit or threshold is crossed.
- If the youth relief applies, also show the expected annual refund of the unused tax-reducing amount.

### Test vector A: 25,000 PLN gross/month, KUP 250, PIT-2, no youth relief

| Month | Gross | Pension | Disability | Sickness | Health | PIT | Net |
|---|---|---|---|---|---|---|---|
| 1–5 | 25,000 | 2,440.00 | 375.00 | 612.50 | 1,941.53 | 2,259 | 17,371.97 |
| 6 (120k crossed) | 25,000 | 2,440.00 | 375.00 | 612.50 | 1,941.53 | 3,846 | 15,784.97 |
| 7–11 | 25,000 | 2,440.00 | 375.00 | 612.50 | 1,941.53 | 6,523 | 13,107.97 |
| 12 (ZUS cap) | 25,000 | 741.76 | 114.00 | 612.50 | 2,117.86 | 7,150 | 14,263.88 |
| **TOTAL** | 300,000 | 27,581.76 | 4,239.00 | 7,350.00 | 23,474.69 | 54,906 | 182,448.55 |

### Test vector B: 8,000 PLN gross/month, KUP 250, PIT-2, no youth relief

- Every month: pension 780.80, disability 120.00, sickness 196.00, health 621.29, PIT 498, **net 5,783.91**.
