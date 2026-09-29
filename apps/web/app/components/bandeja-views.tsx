'use client'

import Link from 'next/link'
import { useState } from 'react'

import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
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
  const failed = [alerts.state, notifications.state].find(
    (state) => state.status !== 'loading' && state.status !== 'ready',
  )
  const failedMessage = failed ? failed.message : null

  function reload() {
    alerts.reload()
    notifications.reload()
  }

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
      {failedMessage ? (
        <section className={shell.section}>
          <p className={shell.formError} role="alert">
            {failedMessage}
          </p>
          <button type="button" className={shell.buttonSecondary} onClick={reload}>
            Reintentar
          </button>
        </section>
      ) : alerts.state.status !== 'ready' || notifications.state.status !== 'ready' ? (
        <p className={shell.meta}>Cargando bandeja…</p>
      ) : (
        <>
          <BandejaList
            alerts={alerts.state.data}
            notifications={notifications.state.data}
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
  pendingId,
  actionError,
  onRead,
}: {
  alerts: Alert[]
  notifications: Notification[]
  pendingId: string | null
  actionError: string | null
  onRead: (notification: Notification) => void
}) {
  const alertsById = new Map(alerts.map((item) => [item.id, item]))
  if (notifications.length === 0 && alerts.length === 0) {
    return <p className={shell.meta}>No hay alertas ni notificaciones en tu bandeja.</p>
  }
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
              <p className={styles.prose}>{alert ? alert.detail : 'El detalle no vino en esta consulta.'}</p>
              {alert ? (
                <p className={shell.meta}>
                  <Link href={`/expediente/${alert.entrepreneurship_id}`}>Ver expediente</Link>
                  {alert.resolved_at ? ` · Resuelta ${formatDateTime(alert.resolved_at)}` : ''}
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
