import styles from './expediente.module.css'
import { LoadingRows } from './ui/loading-state'

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
  let buttonLabel = label
  if (loading) buttonLabel = 'Cargando…'

  return (
    <>
      {loading && <LoadingRows label="Cargando más resultados…" rows={1} />}
      {hasMore && (
        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} disabled={loading} onClick={onLoad}>
            {buttonLabel}
          </button>
        </div>
      )}
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </>
  )
}
