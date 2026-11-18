'use client'

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import shell from './expediente.module.css'
import styles from './meeting-calendar.module.css'
import { LoadingState, SkeletonBar } from './ui/loading-state'
import type { Meeting } from '../lib/comunicacion'
import { loadSummaryMeetings, type SummaryState } from '../lib/project-summary'
import {
  calendarDate, calendarDays, calendarZone, meetingDateKey, meetingsByCalendarDay, shiftCalendar, type CalendarMode,
} from '../lib/meeting-calendar'

const fullDate = new Intl.DateTimeFormat('es-CR', { dateStyle: 'full', timeZone: 'UTC' })
const monthDate = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const weekDate = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const meetingTime = new Intl.DateTimeFormat('es-CR', { timeStyle: 'short', timeZone: calendarZone })
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MeetingCalendar({ cycleId, revision, renderMeeting }: {
  cycleId: string
  revision: number
  renderMeeting: (meeting: Meeting) => ReactNode
}) {
  const headingId = useId()
  const today = meetingDateKey(new Date())
  const [selected, setSelected] = useState(today)
  const [mode, setMode] = useState<CalendarMode>('month')
  const [state, setState] = useState<SummaryState<Meeting>>({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  const [loadedRevision, setLoadedRevision] = useState(revision)

  useEffect(() => {
    const controller = new AbortController()
    void loadSummaryMeetings(cycleId, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.ok) setState({ status: 'ready', data: result.data })
      else setState({ status: 'error', message: result.message, httpStatus: result.status })
      setLoadedRevision(revision)
    })
    return () => controller.abort()
  }, [cycleId, revision, retry])

  const grouped = useMemo(() => {
    if (state.status === 'ready') return meetingsByCalendarDay(state.data)
    return new Map<string, Meeting[]>()
  }, [state])
  const days = calendarDays(selected, mode)
  let period = monthDate.format(calendarDate(selected))
  if (mode === 'week') period = weekDate.formatRange(calendarDate(days[0]!), calendarDate(days[6]!))
  const dailyMeetings = grouped.get(selected) ?? []

  return <section className={styles.calendar} aria-labelledby={headingId}>
    <div className={styles.toolbar}>
      <div>
        <h3 id={headingId} className={styles.period} aria-live="polite">{period}</h3>
        <p className={styles.note}>Hora de Costa Rica</p>
      </div>
      <div className={styles.controls}>
        <div className={styles.navigation} role="group" aria-label="Navegación del calendario">
          <button type="button" aria-label="Período anterior" onClick={() => setSelected(shiftCalendar(selected, mode, -1))}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => setSelected(today)}>Hoy</button>
          <button type="button" aria-label="Período siguiente" onClick={() => setSelected(shiftCalendar(selected, mode, 1))}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <div className={styles.switcher} role="group" aria-label="Vista del calendario">
          <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Semana</button>
          <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Mes</button>
        </div>
      </div>
    </div>
    {state.status === 'loading' && <LoadingState label="Cargando el calendario…">
      <div className={styles.grid} data-mode={mode}>
        {weekdays.map((day) => <span key={day} className={styles.weekday}>{day}</span>)}
        {days.map((day) => <div key={day} className={`${styles.day} ${styles.placeholder}`}>
          <SkeletonBar size="short" />
        </div>)}
      </div>
      <div className={styles.agendaPlaceholder}><SkeletonBar /></div>
    </LoadingState>}
    {state.status === 'error' && <div className={styles.feedback}>
      <p className={shell.formError} role="alert">No se pudieron cargar las reuniones. {state.message}</p>
      <button type="button" className={shell.buttonSecondary} onClick={() => {
        setState({ status: 'loading' })
        setRetry((value) => value + 1)
      }}>Reintentar</button>
    </div>}
    {state.status === 'ready' && <>
      {loadedRevision !== revision && <p className={styles.note} role="status">Actualizando reuniones…</p>}
      <div className={styles.grid} data-mode={mode}>
        {weekdays.map((day) => <span key={day} className={styles.weekday} aria-hidden="true">{day}</span>)}
        {days.map((day) => {
          const date = calendarDate(day)
          const dayMeetings = grouped.get(day) ?? []
          let count = `${dayMeetings.length} reuniones`
          if (dayMeetings.length === 1) count = '1 reunión'
          let current: 'date' | undefined
          if (day === today) current = 'date'
          return <button
            type="button"
            key={day}
            className={styles.day}
            data-outside={mode === 'month' && day.slice(0, 7) !== selected.slice(0, 7)}
            aria-pressed={day === selected}
            aria-current={current}
            aria-label={`${fullDate.format(date)}, ${count}`}
            onClick={() => setSelected(day)}
          >
            <span className={styles.number}>{date.getUTCDate()}</span>
            {dayMeetings.length > 0 && <>
              <span className={styles.events} aria-hidden="true">
                {dayMeetings.slice(0, 2).map((meeting) => (
                  <span className={styles.event} key={meeting.id}>
                    <time dateTime={meeting.scheduled_at}>{meetingTime.format(new Date(meeting.scheduled_at))}</time>
                    <span>{meeting.title}</span>
                  </span>
                ))}
                {dayMeetings.length > 2 && <span className={styles.more}>+{dayMeetings.length - 2} más</span>}
              </span>
              <span className={styles.compactCount} aria-hidden="true">{dayMeetings.length}</span>
            </>}
          </button>
        })}
      </div>
      <section className={styles.agenda} aria-label="Reuniones del día">
        <h4 aria-live="polite">{fullDate.format(calendarDate(selected))}</h4>
        {dailyMeetings.length === 0 && <p className={styles.note}>No hay reuniones programadas para este día.</p>}
        {dailyMeetings.map(renderMeeting)}
      </section>
    </>}
  </section>
}
