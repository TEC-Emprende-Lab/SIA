'use client'

import Link from 'next/link'
import { useState } from 'react'

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
  const [actionError, setActionError] = useState<string | null>(null)
  const alertState = alerts.state
  const notificationState = notifications.state
  const alertItems = alertState.status === 'ready' && alertState.data || []

  async function markRead(notification: Notification) {
    if (pendingId) {
      return
    }
    setPendingId(notification.id)
    setActionError(null)
    const result = await requestComunicacion(
      bandejaUrl(`notifications/${notification.id}/read`),
      parseNotification,
      { method: 'PUT' },
    )
    setPendingId(null)
    if (!result.ok) {
      setActionError(result.message)
      return
    }
    notifications.reload()
  }

  return (
    <div className={shell.page}>
      <header className={shell.header}>
        <h1>Bandeja</h1>
      </header>
      <p className={shell.intro}>
        Alertas y notificaciones de tu usuario. Se actualizan al abrir esta página.
      </p>
      {notificationState.status !== 'loading' && notificationState.status !== 'ready' && (
        <section className={shell.section}>
          <p className={shell.formError} role="alert">
            No se pudieron cargar las notificaciones. {notificationState.message}
          </p>
          <button type="button" className={shell.buttonSecondary} onClick={notifications.reload}>
            Reintentar notificaciones
          </button>
        </section>
      )}
      {notificationState.status === 'loading' && (
        <section className={shell.section} aria-label="Alertas y notificaciones">
          <LoadingRows label="Cargando bandeja…" />
        </section>
      )}
      {notificationState.status === 'ready' && (
        <>
          {alertState.status === 'loading' && <LoadingRows label="Cargando detalles de alertas…" rows={1} />}
          {alertState.status !== 'loading' && alertState.status !== 'ready' && (
            <section className={shell.section}>
              <p className={shell.formError} role="alert">
                No se pudieron cargar los detalles de las alertas. Puedes consultar las notificaciones. {alertState.message}
              </p>
              <button type="button" className={shell.buttonSecondary} onClick={alerts.reload}>
                Reintentar detalles
              </button>
            </section>
          )}
          <BandejaList
            alerts={alertItems}
            notifications={notificationState.data}
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
              void alerts.loadMore()
              void notifications.loadMore()
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
  actionError: string | null
  onRead: (notification: Notification) => void
}) {
  const alertsById = new Map(alerts.map((item) => [item.id, item]))
  if (notifications.length === 0) {
    if (detailsStatus === 'ready' && alerts.length === 0) {
      return <p className={shell.meta}>No hay alertas ni notificaciones en tu bandeja.</p>
    }
    return <p className={shell.meta}>No hay notificaciones en tu bandeja.</p>
  }
  let missingDetail = 'El detalle no vino en esta consulta.'
  if (detailsStatus === 'loading') missingDetail = 'Cargando detalle…'
  else if (detailsStatus !== 'ready') missingDetail = 'El detalle no está disponible.'
  return (
    <div className={styles.stack}>
      {actionError ? (
        <p className={shell.formError} role="alert">
          {actionError}
        </p>
      ) : null}
      <ul className={shell.list}>
        {notifications.map((notification) => {
          const alert = alertsById.get(notification.alert_id) ?? null
          return (
            <li
              key={notification.id}
              className={`${styles.block} ${notification.read_at ? '' : styles.unread}`}
            >
              <div className={styles.row}>
                <strong>{alert ? kindLabel(alert.kind) : 'Notificación'}</strong>
                <span className={shell.meta}>{formatDateTime(notification.created_at)}</span>
              </div>
              <p className={styles.prose}>{alert?.detail ?? missingDetail}</p>
              {alert ? (
                <p className={shell.meta}>
                  <Link href={`/expediente/${alert.entrepreneurship_id}`}>Ver expediente</Link>
                  {alert.resolved_at ? `, resuelta ${formatDateTime(alert.resolved_at)}` : ''}
                </p>
              ) : null}
              {notification.read_at ? (
                <p className={shell.meta}>Leída {formatDateTime(notification.read_at)}</p>
              ) : (
                <button
                  type="button"
                  className={shell.buttonSecondary}
                  disabled={pendingId === notification.id}
                  onClick={() => onRead(notification)}
                >
                  {pendingId === notification.id ? 'Guardando…' : 'Marcar como leída'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
