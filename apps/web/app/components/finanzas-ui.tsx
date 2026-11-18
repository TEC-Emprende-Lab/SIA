'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, FileText, Info, Plus, RefreshCw } from 'lucide-react'
import { financeRequest, STATUS } from '../lib/finanzas'
import styles from './finanzas.module.css'

export const financeFailure = (reason: unknown) => reason instanceof Error ? reason.message : 'No se pudo completar la operación. Intenta de nuevo.'

export function useFinanceData<T>(cycle: string, path: string, version = 0) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void financeRequest<T>(cycle, path, 'GET', undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(reason => { if (!controller.signal.aborted) setError(financeFailure(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cycle, path, version, attempt])
  return { data, error, loading, retry: () => setAttempt(v => v + 1) }
}

export function FinanceNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertCircle : Info
  return <div className={styles.notice} data-tone={tone} role={tone === 'success' ? 'status' : undefined}>
    <Icon size={17} aria-hidden="true" /><div>{children}</div>
  </div>
}

export function FinanceError({ message, retry }: { message: string; retry?: () => void }) {
  return <div className={styles.error} role="alert"><AlertCircle size={18} aria-hidden="true" /><div><strong>No se pudo completar la operación</strong><p>{message}</p>{retry && <button className="btn secondary" onClick={retry}><RefreshCw size={14} aria-hidden="true" />Intentar de nuevo</button>}</div></div>
}

export function FinanceLoading({ label = 'Consultando información financiera…' }: { label?: string }) {
  return <div className={styles.loading} role="status"><span>{label}</span><div className={styles.skeleton} aria-hidden="true" /><div className={styles.skeleton} aria-hidden="true" /></div>
}

export function FinanceHeaderActions({ loading, ready, hasBudget, coordinate, refresh, addItem, create }: {
  loading: boolean
  ready: boolean
  hasBudget: boolean
  coordinate: boolean
  refresh: () => void
  addItem: () => void
  create: () => void
}) {
  let primary = null
  let hint = ''
  if (ready && hasBudget) {
    primary = <button type="button" className="btn primary" onClick={create}><Plus size={16} aria-hidden="true" />Nuevo trámite</button>
  } else if (ready && coordinate) {
    primary = <button type="button" className="btn primary" onClick={addItem}><Plus size={16} aria-hidden="true" />Registrar primera partida</button>
    hint = 'Registra una partida del presupuesto aprobado para habilitar los trámites.'
  } else if (ready) {
    hint = 'La Coordinadora debe registrar una partida aprobada antes de que puedas crear un trámite.'
  }
  let refreshLabel = 'Actualizar'
  if (loading && ready) refreshLabel = 'Actualizando…'

  return <div className={styles.headerActions}>
    <div className={styles.actions}>
      {primary}
      <button type="button" className="btn secondary" onClick={refresh} disabled={loading} aria-label="Actualizar finanzas"><RefreshCw size={16} aria-hidden="true" />{refreshLabel}</button>
    </div>
    {hint && <p className={styles.hint}>{hint}</p>}
  </div>
}

export function FinanceEmpty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className={styles.empty}><FileText size={28} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{children}</p>{action}</div>
}

export function FinanceStatus({ status, label }: { status: string; label?: string }) {
  return <span className={styles.status} data-status={status}><span aria-hidden="true" />{label ?? STATUS[status] ?? status}</span>
}

export function FinancePages({ offset, count, loading, change, size = 50 }: { offset: number; count: number; loading: boolean; change: (offset: number) => void; size?: number }) {
  return <nav className={styles.pagination} aria-label="Páginas de resultados"><span>Página {offset / size + 1}, {count} {count === 1 ? 'registro' : 'registros'}</span><div><button className="btn secondary" disabled={!offset || loading} onClick={() => change(Math.max(0, offset - size))}>Anterior</button><button className="btn secondary" disabled={count < size || loading} onClick={() => change(offset + size)}>Siguiente</button></div></nav>
}

export function FinanceField({ label, hint, children }: { label: string; hint?: string; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId()
  return <div className={styles.field}><label htmlFor={id}>{label}</label>{children(id, hint ? `${id}-hint` : undefined)}{hint && <small id={`${id}-hint`}>{hint}</small>}</div>
}

const EVENT_LABELS: Record<string, string> = {
  'finance.created': 'Borrador creado', 'finance.updated': 'Información corregida',
  'finance.submit': 'Enviado a revisión', 'finance.request_correction': 'Corrección solicitada',
  'finance.validate': 'Validación interna', 'finance.register_fundatec': 'Registrado en FUNDATEC',
  'finance.execute': 'Ejecución confirmada', 'finance.reject': 'Trámite rechazado',
  'finance.cancel': 'Trámite anulado', 'finance.attached': 'Respaldo adjuntado',
}
export const financeEventLabel = (value: string) => EVENT_LABELS[value] ?? value

export function localDateInput() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
