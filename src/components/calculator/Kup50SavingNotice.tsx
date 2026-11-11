import { motion } from 'motion/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatMoney } from '@/services/format'

export interface Kup50SavingNoticeProps {
  pitSaving: number
  pitWith: number
  pitWithout: number
  netGain: number
  kup50Total: number
}

export function Kup50SavingNotice(props: Kup50SavingNoticeProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Alert>
        <AlertTitle>
          KUP 50% saves you <span className="tabular-nums">{formatMoney(props.pitSaving)} PLN</span> of PIT this year
        </AlertTitle>
        <AlertDescription>
          <p className="tabular-nums">
            PIT {formatMoney(props.pitWith)} PLN instead of {formatMoney(props.pitWithout)} PLN, so +{formatMoney(props.netGain)} PLN
            net. Author’s costs deducted: {formatMoney(props.kup50Total)} PLN.
          </p>
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}
