import { motion } from 'motion/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatMoney } from '@/services/format'

export interface RefundNoticeProps {
  refund: number
  unusedAmount: number
  monthsWithTaxableIncome: number
  annualReducingAmount: number
  monthlyReducingAmount: number
  year: number
}

export function RefundNotice(props: RefundNoticeProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Alert>
        <AlertTitle>
          Expected tax refund in {props.year + 1}: <span className="tabular-nums">{formatMoney(props.refund)} PLN</span>
        </AlertTitle>
        <AlertDescription>
          <p>
            Monthly advances used {formatMoney(props.monthlyReducingAmount)} PLN of the tax-reducing amount in{' '}
            {props.monthsWithTaxableIncome} taxable month{props.monthsWithTaxableIncome === 1 ? '' : 's'}, leaving{' '}
            {formatMoney(props.unusedAmount)} of {formatMoney(props.annualReducingAmount)} PLN unused. It is settled in the annual
            return, up to the PIT actually paid.
          </p>
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}
