'use client'

import { useState } from 'react'
import styles from './expediente.module.css'
import { SkeletonRows } from './ui/loading-state'
import { ActionFeedback } from './ui/action-feedback'

export function LoadMore({
  hasMore,
  loading,
  error,
  onLoad,
  label = 'Cargar más',
}: {
  hasMore: boolean
  loading: boolean
  error: string | null
  onLoad: () => void
  label?: string
}) {
  const [requested, setRequested] = useState(false)
  const end = requested && !hasMore && !loading && !error
  const showButton = hasMore || loading
  let buttonLabel = label
  if (loading) buttonLabel = 'Cargando…'
  else if (error) buttonLabel = 'Reintentar carga'

  return (
    <>
      {loading && <SkeletonRows rows={1} />}
      {showButton && (
        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} aria-disabled={loading} onClick={() => {
            if (loading || !hasMore) return
            setRequested(true)
            onLoad()
          }}>
            {buttonLabel}
          </button>
        </div>
      )}
      {error && <ActionFeedback tone="error">{error}</ActionFeedback>}
      {end && <p className={styles.meta} role="status">No hay más resultados.</p>}
      <span className="sr-only" role="status">{loading && 'Cargando más resultados…'}</span>
    </>
  )
}
