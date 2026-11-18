import type { Meeting } from './comunicacion'

export type CalendarMode = 'week' | 'month'
export const calendarZone = 'America/Costa_Rica'

const costaRicaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: calendarZone, year: 'numeric', month: '2-digit', day: '2-digit',
})

export function meetingDateKey(value: Date): string {
  if (!Number.isFinite(value.getTime())) return ''
  return costaRicaDate.format(value)
}

export function calendarDate(key: string): Date {
  return new Date(`${key}T00:00:00Z`)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function shiftDay(key: string, days: number): string {
  const date = calendarDate(key)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKey(date)
}

export function shiftCalendar(key: string, mode: CalendarMode, change: number): string {
  if (mode === 'week') return shiftDay(key, change * 7)
  const date = calendarDate(key)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + change)
  return dateKey(date)
}

export function calendarDays(key: string, mode: CalendarMode): string[] {
  let start = key
  let count = 7
  if (mode === 'month') start = `${key.slice(0, 7)}-01`
  const weekday = (calendarDate(start).getUTCDay() + 6) % 7
  if (mode === 'month') {
    const final = calendarDate(shiftCalendar(start, 'month', 1))
    final.setUTCDate(0)
    count = Math.ceil((weekday + final.getUTCDate()) / 7) * 7
  }
  start = shiftDay(start, -weekday)
  return Array.from({ length: count }, (_, index) => shiftDay(start, index))
}

export function meetingsByCalendarDay(meetings: Meeting[]): Map<string, Meeting[]> {
  const byDay = new Map<string, Meeting[]>()
  for (const meeting of meetings) {
    if (meeting.revoked_at !== null) continue
    const key = meetingDateKey(new Date(meeting.scheduled_at))
    if (!key) continue
    const existing = byDay.get(key)
    if (existing) existing.push(meeting)
    else byDay.set(key, [meeting])
  }
  for (const items of byDay.values()) {
    items.sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at) || left.id.localeCompare(right.id))
  }
  return byDay
}
