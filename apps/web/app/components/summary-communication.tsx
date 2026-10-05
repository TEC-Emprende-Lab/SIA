'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Bell, CalendarDays, MessageSquare } from 'lucide-react'
import { ProjectLink, ProjectPanel } from './project-reference-ui'
import { formatDateTime } from '../lib/expediente'
import type { Alert, ComunicacionResult, Meeting } from '../lib/comunicacion'
import type { ProjectSection } from '../lib/project-workspace'
import { agreementDate, loadSummaryAgreements, loadSummaryAlerts, loadSummaryMeetings, upcomingMeetings, type SummaryAgreement, type SummaryState } from '../lib/project-summary'
import styles from './summary-communication.module.css'

type Navigate = (section: ProjectSection, id?: string) => void

function settled<T>(result: ComunicacionResult<T[]>): SummaryState<T> {
  return result.ok ? { status: 'ready', data: result.data } : { status: 'error', message: result.message, httpStatus: result.status }
}

export function SummaryCommunication({ entrepreneurshipId, cycleId, userId, navigate }: {
  entrepreneurshipId: string; cycleId: string; userId: string; navigate?: Navigate
}) {
  const [attempt, setAttempt] = useState(0)
  const [meetings, setMeetings] = useState<SummaryState<Meeting>>({ status: 'loading' })
  const [agreements, setAgreements] = useState<SummaryState<SummaryAgreement>>({ status: 'loading' })
  const [alerts, setAlerts] = useState<SummaryState<Alert>>({ status: 'loading' })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    setNow(Date.now())
    setMeetings({ status: 'loading' })
    setAgreements({ status: 'loading' })
    setAlerts({ status: 'loading' })
    void loadSummaryMeetings(cycleId, signal).then(async (result) => {
      if (signal.aborted) return
      setMeetings(settled(result))
      if (!result.ok) {
        setAgreements({ status: 'error', message: 'No se pueden consultar los acuerdos sin sus reuniones autorizadas.', httpStatus: result.status })
        return
      }
      const loaded = await loadSummaryAgreements(cycleId, result.data, signal)
      if (!signal.aborted) setAgreements(settled(loaded))
    })
    void loadSummaryAlerts(entrepreneurshipId, cycleId, userId, signal).then((result) => {
      if (!signal.aborted) setAlerts(settled(result))
    })
    return () => controller.abort()
  }, [entrepreneurshipId, cycleId, userId, attempt])

  return <SummaryCommunicationContent meetings={meetings.status === 'ready' ? { status: 'ready', data: upcomingMeetings(meetings.data, now) } : meetings} agreements={agreements} alerts={alerts} navigate={navigate} onRetry={() => setAttempt((value) => value + 1)} />
}

function Resource<T>({ state, empty, onRetry, children }: { state: SummaryState<T>; empty: string; onRetry: () => void; children: (items: T[]) => ReactNode }) {
  if (state.status === 'loading') return <p className={styles.message} role="status">Consultando datos autorizados…</p>
  if (state.status === 'error') return <div className={styles.error}><p role="alert">{state.message}{state.httpStatus ? ` (HTTP ${state.httpStatus})` : ''}</p><button className="btn secondary" onClick={onRetry}>Reintentar</button></div>
  if (state.data.length === 0) return <p className={styles.message}>{empty}</p>
  return <>{children(state.data.slice(0, 5))}{state.data.length > 5 && <p className={styles.message}>Se muestran 5 de {state.data.length} registros. Abre el módulo para consultar el resto.</p>}</>
}

/** Separado de la carga para probar render y errores sin simular una sesión. */
export function SummaryCommunicationContent({ meetings, agreements, alerts, navigate, onRetry }: {
  meetings: SummaryState<Meeting>; agreements: SummaryState<SummaryAgreement>; alerts: SummaryState<Alert>; navigate?: Navigate; onRetry: () => void
}) {
  return <div className={styles.grid}>
    <ProjectPanel title="Próximas reuniones" action={navigate && <ProjectLink onClick={() => navigate('Reuniones')}>Ver reuniones</ProjectLink>}>
      <p className={styles.intro}>Reuniones no revocadas programadas desde el momento de la consulta. Horario de Costa Rica.</p>
      <Resource state={meetings} empty="No hay reuniones próximas registradas en este ciclo." onRetry={onRetry}>{(items) => <ul className={styles.list}>{items.map((meeting) => <li key={meeting.id} className={styles.row}><CalendarDays aria-hidden="true" size={20} /><div><h3>{meeting.title}</h3><p>{formatDateTime(meeting.scheduled_at)}</p><p>Participantes: {meeting.participants.join(', ') || 'Sin participantes registrados.'}</p></div></li>)}</ul>}</Resource>
    </ProjectPanel>
    <ProjectPanel title="Acuerdos registrados" action={navigate && <ProjectLink onClick={() => navigate('Reuniones')}>Ver acuerdos</ProjectLink>}>
      <p className={styles.intro}>Ordenados por fecha de compromiso. El estado de cumplimiento todavía no está definido; no se clasifican como pendientes ni completados.</p>
      <Resource state={agreements} empty="No hay acuerdos vigentes registrados en las reuniones de este ciclo." onRetry={onRetry}>{(items) => <ul className={styles.list}>{items.map(({ meeting, agreement }) => <li key={agreement.id} className={styles.row}><MessageSquare aria-hidden="true" size={20} /><div><h3>{agreement.description}</h3><p>Compromiso: {agreementDate(agreement.due_date)}</p><p>Reunión: {meeting.title}</p><p>{agreement.next_steps || 'Sin próximos pasos registrados.'}</p></div></li>)}</ul>}</Resource>
    </ProjectPanel>
    <ProjectPanel title="Mis alertas del proyecto" className={styles.alerts} action={navigate && <ProjectLink onClick={() => navigate('Alertas')}>Ver mi bandeja</ProjectLink>}>
      <p className={styles.intro}>Alertas sin resolver para tu usuario, del ciclo actual o compartidas por este emprendimiento. No incluye bandejas de otras personas.</p>
      <Resource state={alerts} empty="No hay alertas sin resolver para tu usuario en este proyecto." onRetry={onRetry}>{(items) => <ul className={styles.list}>{items.map((alert) => <li key={alert.id} className={styles.row}><Bell aria-hidden="true" size={20} /><div><h3>{alert.kind === 'mention' ? 'Mención' : alert.kind}</h3><p>{alert.detail || 'Sin detalle registrado.'}</p><p>{formatDateTime(alert.created_at)} · {alert.cycle_id === null ? 'Compartida del emprendimiento' : 'Ciclo actual'}</p></div></li>)}</ul>}</Resource>
    </ProjectPanel>
    {navigate && <p className={styles.note}>Las tarjetas se consultan al abrir el Resumen. “Ver mi bandeja” abre tu bandeja completa, que puede incluir otros proyectos autorizados.</p>}
    <button className={`btn secondary ${styles.refresh}`} onClick={onRetry}>Actualizar reuniones, acuerdos y alertas</button>
  </div>
}
