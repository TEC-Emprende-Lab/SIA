import type { components } from '@sia/contracts'

/**
 * Comunicación en la web (Fase 7).
 * Reuniones, minutas y acuerdos: docs/00-nucleo-comun/reuniones-minutas-y-canales.md.
 * Publicar minutas: Coordinadora y Gestor asignado. Emprendedor consulta las publicadas.
 * Bandeja propia: docs/00-nucleo-comun/notificaciones-y-alertas.md. Sin tiempo real ni correo.
 * Canales: solo nombre, sin categorías ni permisos por tipo mientras su taxonomía siga TBD.
 * Mensajes sin tiempo real: se consultan al abrir o actualizar el canal. Solo el autor edita o revoca.
 * La autorización de cada operación sigue en la API.
 */

export type Meeting = components['schemas']['MeetingOut']
export type Minutes = components['schemas']['MinutesOut']
export type Agreement = components['schemas']['AgreementOut']
export type Alert = components['schemas']['AlertOut']
export type Notification = components['schemas']['NotificationOut']
export type Channel = components['schemas']['ChannelOut']
export type Message = components['schemas']['MessageOut']

export const MESSAGE_PAGE_SIZE = 50

export const TRACKED_PROGRAMS = ['Prototipado', 'Puesta en marcha'] as const
export type ComunicacionResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

const MINUTES_ORIGIN = new Set(['manual', 'ia_borrador'])
const MINUTES_STATUS = new Set(['borrador', 'aprobada'])

export function canManageMeetings(role: string): boolean {
  return role === 'Coordinadora' || role === 'Gestor'
}

export function meetingsUrl(
  cycleId: string,
  path = '',
  query?: { limit?: number; offset?: number },
): string {
  return withQuery(`/api/sia/cycles/${cycleId}/meetings${path ? `/${path}` : ''}`, query)
}

export function channelsUrl(query: {
  entrepreneurshipId: string
  cycleId?: string
  limit?: number
  offset?: number
}): string {
  const params = new URLSearchParams({ entrepreneurship_id: query.entrepreneurshipId })
  if (query.cycleId) {
    params.set('cycle_id', query.cycleId)
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit))
  }
  if (query.offset !== undefined) {
    params.set('offset', String(query.offset))
  }
  return `/api/sia/channels?${params.toString()}`
}

export function channelUrl(channelId: string, path: string, query?: { limit?: number; offset?: number }): string {
  return withQuery(`/api/sia/channels/${channelId}/${path}`, query)
}

export function bandejaUrl(path: string, query?: { limit?: number; offset?: number }): string {
  return withQuery(`/api/sia/bandeja/${path}`, query)
}

function withQuery(path: string, query?: { limit?: number; offset?: number }): string {
  const params = new URLSearchParams()
  if (query?.limit !== undefined) {
    params.set('limit', String(query.limit))
  }
  if (query?.offset !== undefined) {
    params.set('offset', String(query.offset))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

export function optionalHttpUrl(value: string): { url: string | null } | { error: string } {
  const url = value.trim()
  if (!url) {
    return { url: null }
  }
  if (url.length > 2048) {
    return { error: 'La referencia admite hasta 2048 caracteres.' }
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'La referencia debe ser una URL http o https.' }
    }
  } catch {
    return { error: 'La referencia no es una URL válida.' }
  }
  return { url }
}

export function awareDateTime(localValue: string): { iso: string } | { error: string } {
  if (!localValue) {
    return { error: 'La fecha es obligatoria.' }
  }
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) {
    return { error: 'La fecha no es válida.' }
  }
  return { iso: date.toISOString() }
}

export function isoDate(value: string): { date: string } | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Indica una fecha válida.' }
  }
  return { date: value }
}

export function participantLines(value: string): { participants: string[] } | { error: string } {
  const participants = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (participants.length === 0) {
    return { error: 'Indica al menos un participante.' }
  }
  return { participants }
}

export function requiredText(value: string, emptyMessage: string): { text: string } | { error: string } {
  const text = value.trim()
  if (!text) {
    return { error: emptyMessage }
  }
  return { text }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return typeof value === 'string' && value ? value : undefined
}

function whole(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

function detailMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback
  }
  const detail = payload.detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item) => {
      if (isRecord(item) && typeof item.msg === 'string' && item.msg.trim()) {
        return [item.msg]
      }
      return []
    })
    if (messages.length > 0) {
      return messages.join(' ')
    }
  }
  return fallback
}

function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items: T[] = []
  for (const item of value) {
    const parsed = parseItem(item)
    if (!parsed) {
      return null
    }
    items.push(parsed)
  }
  return items
}

function editable(value: Record<string, unknown>): {
  id: string
  created_at: string
  created_by: string
  revision: number
  revoked_at: string | null
} | null {
  const id = requiredString(value.id)
  const createdAt = requiredString(value.created_at)
  const createdBy = requiredString(value.created_by)
  const revision = whole(value.revision)
  const revokedAt = nullableString(value.revoked_at)
  if (!id || !createdAt || !createdBy || revision === null || revokedAt === undefined) {
    return null
  }
  return { id, created_at: createdAt, created_by: createdBy, revision, revoked_at: revokedAt }
}

export function parseMeeting(value: unknown): Meeting | null {
  if (!isRecord(value)) {
    return null
  }
  const base = editable(value)
  const cycleId = requiredString(value.cycle_id)
  const title = requiredString(value.title)
  const scheduledAt = requiredString(value.scheduled_at)
  const reference = nullableString(value.reference_url)
  const participants = parseList(value.participants, (item) => (typeof item === 'string' && item ? item : null))
  if (!base || !cycleId || !title || !scheduledAt || reference === undefined || !participants) {
    return null
  }
  return { ...base, cycle_id: cycleId, title, scheduled_at: scheduledAt, participants, reference_url: reference }
}

export function parseMeetingList(value: unknown): Meeting[] | null {
  return parseList(value, parseMeeting)
}

export function parseMinutes(value: unknown): Minutes | null {
  if (!isRecord(value)) {
    return null
  }
  const base = editable(value)
  const meetingId = requiredString(value.meeting_id)
  const content = text(value.content)
  const origin = requiredString(value.origin)
  const source = nullableString(value.source_transcript)
  const status = requiredString(value.status)
  const reviewedBy = nullableString(value.reviewed_by)
  const approvedAt = nullableString(value.approved_at)
  if (
    !base ||
    !meetingId ||
    content === null ||
    !origin ||
    !MINUTES_ORIGIN.has(origin) ||
    source === undefined ||
    !status ||
    !MINUTES_STATUS.has(status) ||
    reviewedBy === undefined ||
    approvedAt === undefined
  ) {
    return null
  }
  return {
    ...base,
    meeting_id: meetingId,
    content,
    origin: origin as Minutes['origin'],
    source_transcript: source,
    status: status as Minutes['status'],
    reviewed_by: reviewedBy,
    approved_at: approvedAt,
  }
}

export function parseMinutesList(value: unknown): Minutes[] | null {
  return parseList(value, parseMinutes)
}

export function parseAgreement(value: unknown): Agreement | null {
  if (!isRecord(value)) {
    return null
  }
  const base = editable(value)
  const meetingId = requiredString(value.meeting_id)
  const description = requiredString(value.description)
  const responsibleId = requiredString(value.responsible_id)
  const dueDate = requiredString(value.due_date)
  const nextSteps = text(value.next_steps)
  if (!base || !meetingId || !description || !responsibleId || !dueDate || nextSteps === null) {
    return null
  }
  return {
    ...base,
    meeting_id: meetingId,
    description,
    responsible_id: responsibleId,
    due_date: dueDate,
    next_steps: nextSteps,
  }
}

export function parseAgreementList(value: unknown): Agreement[] | null {
  return parseList(value, parseAgreement)
}

export function parseAlert(value: unknown): Alert | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredString(value.id)
  const createdAt = requiredString(value.created_at)
  const entrepreneurshipId = requiredString(value.entrepreneurship_id)
  const cycleId = nullableString(value.cycle_id)
  const recipientId = requiredString(value.recipient_id)
  const kind = requiredString(value.kind)
  const detail = text(value.detail)
  const resolvedAt = nullableString(value.resolved_at)
  if (
    !id ||
    !createdAt ||
    !entrepreneurshipId ||
    cycleId === undefined ||
    !recipientId ||
    !kind ||
    detail === null ||
    resolvedAt === undefined
  ) {
    return null
  }
  return {
    id,
    created_at: createdAt,
    entrepreneurship_id: entrepreneurshipId,
    cycle_id: cycleId,
    recipient_id: recipientId,
    kind,
    detail,
    resolved_at: resolvedAt,
  }
}

export function parseAlertList(value: unknown): Alert[] | null {
  return parseList(value, parseAlert)
}

export function parseNotification(value: unknown): Notification | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredString(value.id)
  const createdAt = requiredString(value.created_at)
  const alertId = requiredString(value.alert_id)
  const readAt = nullableString(value.read_at)
  if (!id || !createdAt || !alertId || readAt === undefined) {
    return null
  }
  return { id, created_at: createdAt, alert_id: alertId, read_at: readAt }
}

export function parseNotificationList(value: unknown): Notification[] | null {
  return parseList(value, parseNotification)
}

export function parseChannel(value: unknown): Channel | null {
  if (!isRecord(value)) {
    return null
  }
  const base = editable(value)
  const entrepreneurshipId = requiredString(value.entrepreneurship_id)
  const cycleId = nullableString(value.cycle_id)
  const name = requiredString(value.name)
  if (!base || !entrepreneurshipId || cycleId === undefined || !name) {
    return null
  }
  return { ...base, entrepreneurship_id: entrepreneurshipId, cycle_id: cycleId, name }
}

export function parseChannelList(value: unknown): Channel[] | null {
  return parseList(value, parseChannel)
}

export function parseMessage(value: unknown): Message | null {
  if (!isRecord(value)) {
    return null
  }
  const base = editable(value)
  const channelId = requiredString(value.channel_id)
  const content = value.content === null ? null : text(value.content)
  const mentions = parseList(value.mentioned_user_ids, (item) => (typeof item === 'string' && item ? item : null))
  if (!base || !channelId || (content === null && value.content !== null) || !mentions) {
    return null
  }
  return { ...base, channel_id: channelId, content, mentioned_user_ids: mentions }
}

export function parseMessageList(value: unknown): Message[] | null {
  return parseList(value, parseMessage)
}

export function parseUnread(value: unknown): number | null {
  if (!isRecord(value) || typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 0) {
    return null
  }
  return value.count
}

export function parseReceipt(value: unknown): { last_read_message_id: string } | null {
  if (!isRecord(value)) {
    return null
  }
  const last = requiredString(value.last_read_message_id)
  return last ? { last_read_message_id: last } : null
}

export async function requestComunicacion<T>(
  path: string,
  parse: (value: unknown) => T | null,
  init?: { method?: 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal },
): Promise<ComunicacionResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: init?.signal,
    })
  } catch {
    return { ok: false, status: 0, message: 'No se pudo consultar la comunicación.' }
  }
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: detailMessage(payload, `No se pudo completar la operación (${response.status}).`),
    }
  }
  const data = parse(payload)
  if (data === null) {
    return {
      ok: false,
      status: response.status,
      message: 'La respuesta no coincide con el contrato de comunicación.',
    }
  }
  return { ok: true, data }
}
