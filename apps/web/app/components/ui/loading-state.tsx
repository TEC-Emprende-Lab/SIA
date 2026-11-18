import type { ReactNode } from 'react'
import styles from './interaction-states.module.css'

export function SkeletonBar({ size = 'title' }: { size?: 'short' | 'title' | 'text' }) {
  return <span className={styles.bar} data-size={size} aria-hidden="true" />
}

export function LoadingState({ label, children }: { label: string; children: ReactNode }) {
  return <div>
    <span className="sr-only" role="status">{label}</span>
    <div aria-hidden="true">{children}</div>
  </div>
}

export function LoadingRows({ label, rows = 3, layout = 'list' }: {
  label: string
  rows?: number
  layout?: 'list' | 'table'
}) {
  return <LoadingState label={label}>
    <div className={styles.rows} data-layout={layout}>
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.row} key={index}>
          <SkeletonBar />
          <SkeletonBar size="text" />
          {layout === 'table' && <SkeletonBar size="short" />}
        </div>
      ))}
    </div>
  </LoadingState>
}
