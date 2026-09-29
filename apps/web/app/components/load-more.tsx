import styles from './expediente.module.css'

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
  return (
    <>
      {hasMore ? (
        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} disabled={loading} onClick={onLoad}>
            {loading ? 'Cargando…' : label}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
