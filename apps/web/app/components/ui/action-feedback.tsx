import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './interaction-states.module.css'

const feedbackIcons = {
  error: CircleAlert,
  success: CircleCheck,
  notice: Info,
}

export function ActionFeedback({ tone = 'notice', children }: {
  tone?: keyof typeof feedbackIcons
  children: ReactNode
}) {
  const Icon = feedbackIcons[tone]
  let role = 'status'
  if (tone === 'error') role = 'alert'
  return <div className={styles.feedback} data-tone={tone} role={role}>
    <Icon size={18} aria-hidden="true" />
    <div>{children}</div>
  </div>
}
