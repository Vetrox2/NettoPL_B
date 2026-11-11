import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Switch } from '@/components/animate-ui/components/radix/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export interface SalaryFormProps {
  grossText: string
  nonCashBenefitsText: string
  youthRelief: boolean
  commuting: boolean
  grossError?: string
  /** Currency code shown in the gross field. */
  grossCurrency: string
  /** Extra line under the gross field, e.g. the PLN equivalent of a foreign salary. */
  grossHint?: string
  nonCashBenefitsError?: string
  /** Monthly KUP amounts shown next to the commuting option. */
  kupStandard: number
  kupCommuting: number
  youthLimit: string
  kup50: boolean
  copyrightPercentText: string
  copyrightPercentError?: string
  /** Show the "standard KUP with 100% copyright" option. */
  showStandardKupOption: boolean
  applyStandardKupWhenFullCopyright: boolean
  /** Non-blocking warning shown under the copyright percentage. */
  kup50Warning?: string
  kup50Limit: string
  onGrossChange(value: string): void
  onNonCashBenefitsChange(value: string): void
  onYouthReliefChange(value: boolean): void
  onCommutingChange(value: boolean): void
  onKup50Change(value: boolean): void
  onCopyrightPercentChange(value: string): void
  onApplyStandardKupWhenFullCopyrightChange(value: boolean): void
}

/** Animated height/opacity reveal for option-dependent fields. */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="space-y-2 border-l-2 pb-1 pl-3">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface OptionRowProps {
  id: string
  title: string
  description: string
  checked: boolean
  onChange(value: boolean): void
}

function OptionRow({ id, title, description, checked, onChange }: OptionRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="cursor-pointer">
          {title}
        </Label>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  )
}

export function SalaryForm(props: SalaryFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your salary</CardTitle>
        <CardDescription>Employment contract (umowa o pracę), tax year 2026</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="gross">Gross monthly salary (brutto)</Label>
          <div className="relative">
            <Input
              id="gross"
              inputMode="decimal"
              autoComplete="off"
              value={props.grossText}
              onChange={(e) => props.onGrossChange(e.target.value)}
              aria-invalid={Boolean(props.grossError)}
              aria-describedby={props.grossError ? 'gross-error' : undefined}
              className="h-11 pr-14 text-lg font-medium tabular-nums"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              {props.grossCurrency}
            </span>
          </div>
          {props.grossError ? (
            <p id="gross-error" className="text-destructive text-xs">
              {props.grossError}
            </p>
          ) : (
            props.grossHint && <p className="text-muted-foreground text-xs tabular-nums">{props.grossHint}</p>
          )}
        </div>

        <Separator />

        <OptionRow
          id="youth-relief"
          title="Youth relief (under 26)"
          description={`Zero PIT on revenue up to ${props.youthLimit} PLN a year. ZUS and health contributions still apply.`}
          checked={props.youthRelief}
          onChange={props.onYouthReliefChange}
        />

        <Reveal show={props.youthRelief}>
                <Label htmlFor="non-cash">Non-cash benefits per month (optional)</Label>
                <div className="relative">
                  <Input
                    id="non-cash"
                    inputMode="decimal"
                    autoComplete="off"
                    value={props.nonCashBenefitsText}
                    onChange={(e) => props.onNonCashBenefitsChange(e.target.value)}
                    aria-invalid={Boolean(props.nonCashBenefitsError)}
                    className="pr-14 tabular-nums"
                  />
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                    PLN
                  </span>
                </div>
                {props.nonCashBenefitsError ? (
                  <p className="text-destructive text-xs">{props.nonCashBenefitsError}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Private medical care, insurance, vouchers. Counts toward the youth-relief limit only.
                  </p>
                )}
        </Reveal>

        <OptionRow
          id="commuting"
          title="Commuting from another town"
          description={`Higher tax-deductible costs: ${props.kupCommuting} instead of ${props.kupStandard} PLN a month.`}
          checked={props.commuting}
          onChange={props.onCommutingChange}
        />

        <OptionRow
          id="kup50"
          title="Author's costs (KUP 50%)"
          description={`For creative work under copyright. Lowers the tax base, up to ${props.kup50Limit} PLN of costs a year.`}
          checked={props.kup50}
          onChange={props.onKup50Change}
        />

        <Reveal show={props.kup50}>
          <Label htmlFor="copyright-percent">Share of salary for copyright work</Label>
          <div className="relative w-32">
            <Input
              id="copyright-percent"
              inputMode="decimal"
              autoComplete="off"
              value={props.copyrightPercentText}
              onChange={(e) => props.onCopyrightPercentChange(e.target.value)}
              aria-invalid={Boolean(props.copyrightPercentError)}
              aria-describedby="copyright-percent-help"
              className="pr-8 tabular-nums"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
              %
            </span>
          </div>
          <div id="copyright-percent-help">
            {props.copyrightPercentError ? (
              <p className="text-destructive text-xs">{props.copyrightPercentError}</p>
            ) : props.kup50Warning ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">{props.kup50Warning}</p>
            ) : (
              <p className="text-muted-foreground text-xs">The 50% costs are calculated from this part of gross.</p>
            )}
          </div>
          <AnimatePresence initial={false}>
            {props.showStandardKupOption && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-2">
                <OptionRow
                  id="standard-kup-full-copyright"
                  title="Also apply standard work costs"
                  description={`With 100% copyright, deduct the standard ${props.commuting ? props.kupCommuting : props.kupStandard} PLN as well.`}
                  checked={props.applyStandardKupWhenFullCopyright}
                  onChange={props.onApplyStandardKupWhenFullCopyrightChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </CardContent>
    </Card>
  )
}
