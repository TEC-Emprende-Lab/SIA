import {
  bandejaUrl, meetingsUrl, parseAgreementList, parseAlertList, parseMeetingList, requestComunicacion,
  type Agreement, type Alert, type ComunicacionResult, type Meeting,
} from './comunicacion'

/** US-PRO-001/002/004, US-PM-001/002/003 + comunicación y alertas comunes.
 * Solo lecturas existentes. Los acuerdos no tienen estado de cumplimiento definido.
 */
export type SummaryAgreement = { agreement: Agreement; meeting: Meeting }
export type SummaryState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T[] }
  | { status: 'error'; message: string; httpStatus: number }

const PAGE_SIZE = 100
const AGREEMENT_CONCURRENCY = 4

function invalid(message: string): { ok: false; status: number; message: string } {
  return { ok: false, status: 0, message }
}

function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

async function readPages<T extends { id: string }>(
  pageUrl: (offset: number) => string,
  parse: (value: unknown) => T[] | null,
  signal?: AbortSignal,
): Promise<ComunicacionResult<T[]>> {
  const items: T[] = []
  const ids = new Set<string>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    if (signal?.aborted) return invalid('Consulta cancelada.')
    const page = await requestComunicacion(pageUrl(offset), parse, { signal })
    if (!page.ok) return page
    if (page.data.length > PAGE_SIZE) return invalid('La API devolvió una página de tamaño inválido.')
    for (const item of page.data) {
      if (ids.has(item.id)) return invalid('La lista cambió durante la consulta. Actualiza el resumen.')
      ids.add(item.id)
      items.push(item)
    }
    if (page.data.length < PAGE_SIZE) return { ok: true, data: items }
  }
}

export async function loadSummaryMeetings(cycleId: string, signal?: AbortSignal): Promise<ComunicacionResult<Meeting[]>> {
  const result = await readPages((offset) => meetingsUrl(cycleId, '', { limit: PAGE_SIZE, offset }), parseMeetingList, signal)
  if (!result.ok) return result
  if (result.data.some((meeting) => meeting.cycle_id !== cycleId || !Number.isFinite(Date.parse(meeting.scheduled_at)))) {
    return invalid('Las reuniones no corresponden al ciclo o contienen una fecha inválida.')
  }
  return result
}

export async function loadSummaryAgreements(cycleId: string, meetings: Meeting[], signal?: AbortSignal): Promise<ComunicacionResult<SummaryAgreement[]>> {
  if (meetings.some((meeting) => meeting.cycle_id !== cycleId)) return invalid('Las reuniones no corresponden al ciclo.')
  const active = meetings.filter((meeting) => meeting.revoked_at === null)
  const items: SummaryAgreement[] = []
  // La API actual ofrece acuerdos por reunión, no por ciclo. Limitar el fan-out;
  // no solicitar minutas ni detalles adicionales ni introducir un endpoint nuevo.
  for (let start = 0; start < active.length; start += AGREEMENT_CONCURRENCY) {
    if (signal?.aborted) return invalid('Consulta cancelada.')
    const batch = active.slice(start, start + AGREEMENT_CONCURRENCY)
    const results = await Promise.all(batch.map((meeting) => readPages(
      (offset) => meetingsUrl(cycleId, `${meeting.id}/agreements`, { limit: PAGE_SIZE, offset }), parseAgreementList, signal,
    )))
    for (const [index, result] of results.entries()) {
      if (!result.ok) return result
      const meeting = batch[index]!
      if (result.data.some((agreement) => agreement.meeting_id !== meeting.id || !calendarDate(agreement.due_date))) {
        return invalid('Los acuerdos no corresponden a su reunión o contienen una fecha inválida.')
      }
      items.push(...result.data.filter((agreement) => agreement.revoked_at === null).map((agreement) => ({ meeting, agreement })))
    }
  }
  return { ok: true, data: items.sort((left, right) => left.agreement.due_date.localeCompare(right.agreement.due_date) || left.agreement.id.localeCompare(right.agreement.id)) }
}

export async function loadSummaryAlerts(entrepreneurshipId: string, cycleId: string, userId: string, signal?: AbortSignal): Promise<ComunicacionResult<Alert[]>> {
  const result = await readPages((offset) => bandejaUrl('alerts', { limit: PAGE_SIZE, offset }), parseAlertList, signal)
  if (!result.ok) return result
  if (result.data.some((alert) => alert.recipient_id !== userId || !Number.isFinite(Date.parse(alert.created_at)))) {
    return invalid('La bandeja no corresponde al usuario o contiene una fecha inválida.')
  }
  return { ok: true, data: result.data.filter((alert) => alert.entrepreneurship_id === entrepreneurshipId && (alert.cycle_id === null || alert.cycle_id === cycleId) && alert.resolved_at === null)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at) || left.id.localeCompare(right.id)) }
}

export function upcomingMeetings(meetings: Meeting[], now: number): Meeting[] {
  return meetings.filter((meeting) => meeting.revoked_at === null && Date.parse(meeting.scheduled_at) >= now)
    .sort((left, right) => Date.parse(left.scheduled_at) - Date.parse(right.scheduled_at) || left.id.localeCompare(right.id))
}

export function agreementDate(value: string): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
