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

type RowsProps = {
  rows?: number
  layout?: 'list' | 'table'
}

export function SkeletonRows({ rows = 3, layout = 'list' }: RowsProps) {
  return <div className={styles.rows} data-layout={layout} aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <div className={styles.row} key={index}>
        <SkeletonBar />
        <SkeletonBar size="text" />
        {layout === 'table' && <SkeletonBar size="short" />}
      </div>
    ))}
  </div>
}

export function LoadingRows({ label, ...rows }: RowsProps & { label: string }) {
  return <LoadingState label={label}><SkeletonRows {...rows} /></LoadingState>
}
