'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
import { LoadingRows } from './ui/loading-state'
import { formatDateTime } from '../lib/expediente'
import { usePagedList } from '../lib/use-paged-list'
import {
  bandejaUrl,
  parseAlertList,
  parseNotification,
  parseNotificationList,
  requestComunicacion,
  type Alert,
  type Notification,
} from '../lib/comunicacion'

const alertsPage = (limit: number, offset: number) => bandejaUrl('alerts', { limit, offset })
const notificationsPage = (limit: number, offset: number) => bandejaUrl('notifications', { limit, offset })
const fetchAlerts = (url: string) => requestComunicacion(url, parseAlertList)
const fetchNotifications = (url: string) => requestComunicacion(url, parseNotificationList)

function kindLabel(kind: string): string {
  if (kind === 'mention') {
    return 'Mención'
  }
  return kind
}

export function BandejaView() {
  const alerts = usePagedList(alertsPage, fetchAlerts)
  const notifications = usePagedList(notificationsPage, fetchNotifications)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const readRequest = useRef(false)
  const [readRecords, setReadRecords] = useState(() => new Map<string, Notification>())
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null)
  const [readNotice, setReadNotice] = useState('')
  const alertState = alerts.state
  const notificationState = notifications.state
  let alertItems: Alert[] = []
  if (alertState.status === 'ready') alertItems = alertState.data

  async function markRead(notification: Notification) {
    if (readRequest.current) return
    readRequest.current = true
    setPendingId(notification.id)
    setActionError(null)
    setReadNotice('')
    const result = await requestComunicacion(
      bandejaUrl(`notifications/${notification.id}/read`),
      parseNotification,
      { method: 'PUT' },
    )
    readRequest.current = false
    setPendingId(null)
    if (!result.ok) {
      setActionError({ id: notification.id, message: result.message })
      return
    }
    if (result.data.id !== notification.id || !result.data.read_at) {
      setActionError({ id: notification.id, message: 'No se pudo confirmar el cambio.' })
      return
    }
    setReadRecords((current) => new Map(current).set(notification.id, result.data))
    setReadNotice('Notificación marcada como leída.')
  }

  return (
    <div className={`${shell.page} ${shell.actionSurface}`}>
      <header className={shell.header}>
        <h1>Bandeja</h1>
      </header>
      <p className={shell.intro}>
        Alertas y notificaciones de tu usuario. Se actualizan al abrir esta página.
      </p>
      <p className="sr-only" role="status">{readNotice}</p>
      {notificationState.status !== 'loading' && notificationState.status !== 'ready' && (
        <section className={shell.section}>
          <p className={shell.formError} role="alert">
            No se pudieron cargar las notificaciones. {notificationState.message}
          </p>
          {notificationState.status === 'error' && (
            <button type="button" className={shell.buttonSecondary} onClick={notifications.reload}>
              Reintentar notificaciones
            </button>
          )}
        </section>
      )}
      {notificationState.status === 'loading' && (
        <section className={shell.section} aria-label="Alertas y notificaciones">
          <LoadingRows label="Cargando bandeja…" />
        </section>
      )}
      {notificationState.status === 'ready' && (
        <>
          {alertState.status === 'loading' && notificationState.data.length > 0 && (
            <LoadingRows label="Cargando detalles de alertas…" rows={1} />
          )}
          {alertState.status !== 'loading' && alertState.status !== 'ready' && (
            <section className={shell.section}>
              <p className={shell.formError} role="alert">
                No se pudieron cargar los detalles de las alertas. Puedes consultar las notificaciones. {alertState.message}
              </p>
              {alertState.status === 'error' && (
                <button type="button" className={shell.buttonSecondary} onClick={alerts.reload}>
                  Reintentar detalles
                </button>
              )}
            </section>
          )}
          <BandejaList
            alerts={alertItems}
            notifications={notificationState.data.map((item) => readRecords.get(item.id) ?? item)}
            detailsStatus={alertState.status}
            pendingId={pendingId}
            actionError={actionError}
            onRead={(notification) => void markRead(notification)}
          />
          <LoadMore
            hasMore={alerts.hasMore || notifications.hasMore}
            loading={alerts.loadingMore || notifications.loadingMore}
            error={alerts.moreError ?? notifications.moreError}
            onLoad={() => {
              if (alerts.hasMore) void alerts.loadMore()
              if (notifications.hasMore) void notifications.loadMore()
            }}
          />
        </>
      )}
    </div>
  )
}

function BandejaList({
  alerts,
  notifications,
  detailsStatus,
  pendingId,
  actionError,
  onRead,
}: {
  alerts: Alert[]
  notifications: Notification[]
  detailsStatus: 'loading' | 'ready' | 'error' | 'forbidden' | 'missing'
  pendingId: string | null
  actionError: { id: string; message: string } | null
  onRead: (notification: Notification) => void
}) {
  const alertsById = new Map(alerts.map((item) => [item.id, item]))
  if (notifications.length === 0) {
    let title = 'Aún no tienes notificaciones'
    if (detailsStatus === 'ready' && alerts.length === 0) title = 'No hay alertas ni notificaciones'
    return (
      <section className={shell.section}>
        <h2>{title}</h2>
        <p className={shell.meta}>Cuando te mencionen en un canal, recibirás una notificación aquí.</p>
      </section>
    )
  }
  let missingDetail = 'El detalle no está en los resultados cargados.'
  if (detailsStatus === 'loading') missingDetail = 'Cargando detalle…'
  else if (detailsStatus !== 'ready') missingDetail = 'El detalle no está disponible.'
  return (
    <ul className={shell.list} aria-label="Notificaciones">
      {notifications.map((notification) => {
        const alert = alertsById.get(notification.alert_id)
        let title = 'Notificación'
        if (alert) title = kindLabel(alert.kind)
        let className = styles.block
        if (!notification.read_at) className = `${className} ${styles.unread}`
        let readLabel = 'Marcar como leída'
        if (pendingId === notification.id) readLabel = 'Marcando como leída…'
        if (actionError?.id === notification.id) readLabel = 'Reintentar marcar como leída'
        return (
          <li key={notification.id} className={className}>
            <div className={styles.row}>
              <strong>{title}</strong>
              <span className={shell.meta}>{formatDateTime(notification.created_at)}</span>
            </div>
            <p className={styles.prose}>{alert?.detail ?? missingDetail}</p>
            {alert && (
              <p className={shell.meta}>
                <Link href={`/expediente/${alert.entrepreneurship_id}`}>Ver expediente</Link>
                {alert.resolved_at && `, resuelta ${formatDateTime(alert.resolved_at)}`}
              </p>
            )}
            {notification.read_at && (
              <p className={shell.meta}>Leída {formatDateTime(notification.read_at)}</p>
            )}
            {!notification.read_at && (
              <button
                type="button"
                className={shell.buttonSecondary}
                disabled={pendingId !== null}
                onClick={() => onRead(notification)}
              >
                {readLabel}
              </button>
            )}
            {actionError?.id === notification.id && (
              <p className={shell.formError} role="alert">
                No se pudo marcar como leída. {actionError.message}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
