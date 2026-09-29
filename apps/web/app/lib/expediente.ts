import type { components } from '@sia/contracts'

/**
 * Expediente (Fase 7).
 * Vistas de docs/00-nucleo-comun/expediente-del-emprendimiento.md.
 * Alta según docs/00-nucleo-comun/actores-roles-y-permisos.md:
 * Coordinadora y Gestor crean emprendimiento, inscripción y ciclo; Emprendedor consulta.
 * El alta de Puesta en marcha queda fuera: la API responde 409 mientras la entrada esté TBD.
 * US-PRO-001 a US-PRO-006 cubren el seguimiento del ciclo, no estas pantallas.
 */

export type Entrepreneurship = components['schemas']['EntrepreneurshipOut']
export type Enrollment = components['schemas']['ProgramEnrollmentOut']
export type Cycle = components['schemas']['ProgramCycleOut']

export const PROTOTIPADO_PROGRAM = 'Prototipado' as const
export const LIST_PAGE_SIZE = 50
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const dateTimeFormat = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Costa_Rica',
})

export type ViewState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'forbidden'; message: string }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

export type ExpedienteResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

type CreateBody =
  | components['schemas']['EntrepreneurshipCreate']
  | components['schemas']['ProgramEnrollmentCreate']
  | components['schemas']['ProgramCycleCreate']

export function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function routeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export function canRegisterExpediente(role: string): boolean {
  return role === 'Coordinadora' || role === 'Gestor'
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return dateTimeFormat.format(date)
}

export function localDateTimeValue(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function trimmedName(value: string): { name: string } | { error: string } {
  const name = value.trim()
  if (!name) {
    return { error: 'El nombre es obligatorio.' }
  }
  if (name.length > 200) {
    return { error: 'El nombre admite hasta 200 caracteres.' }
  }
  return { name }
}

export function enrolledAtIso(localValue: string): { iso: string } | { error: string } {
  if (!localValue) {
    return { error: 'La fecha de ingreso es obligatoria.' }
  }
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) {
    return { error: 'La fecha de ingreso no es válida.' }
  }
  return { iso: date.toISOString() }
}

export function expedienteUrl(
  path: string,
  query?: { limit?: number; offset?: number },
): string {
  const params = new URLSearchParams()
  if (query?.limit !== undefined) {
    params.set('limit', String(query.limit))
  }
  if (query?.offset !== undefined) {
    params.set('offset', String(query.offset))
  }
  const search = params.toString()
  return `/api/sia/entrepreneurships${path}${search ? `?${search}` : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function parseString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export function parseEntrepreneurship(value: unknown): Entrepreneurship | null {
  if (!isRecord(value)) {
    return null
  }
  const id = parseString(value.id)
  const name = parseString(value.name)
  const createdAt = parseString(value.created_at)
  const updatedAt = parseString(value.updated_at)
  if (!id || !name || !createdAt || !updatedAt) {
    return null
  }
  return { id, name, created_at: createdAt, updated_at: updatedAt }
}

export function parseEntrepreneurshipList(value: unknown): Entrepreneurship[] | null {
  return parseList(value, parseEntrepreneurship)
}

export function parseEnrollment(value: unknown): Enrollment | null {
  if (!isRecord(value)) {
    return null
  }
  const id = parseString(value.id)
  const entrepreneurshipId = parseString(value.entrepreneurship_id)
  const program = parseString(value.program)
  const enrolledAt = parseString(value.enrolled_at)
  if (!id || !entrepreneurshipId || !program || !enrolledAt) {
    return null
  }
  return {
    id,
    entrepreneurship_id: entrepreneurshipId,
    program,
    enrolled_at: enrolledAt,
  }
}

export function parseEnrollmentList(value: unknown): Enrollment[] | null {
  return parseList(value, parseEnrollment)
}

export function parseCycle(value: unknown): Cycle | null {
  if (!isRecord(value)) {
    return null
  }
  const id = parseString(value.id)
  const enrollmentId = parseString(value.enrollment_id)
  const name = parseString(value.name)
  const createdAt = parseString(value.created_at)
  if (!id || !enrollmentId || !name || !createdAt) {
    return null
  }
  return { id, enrollment_id: enrollmentId, name, created_at: createdAt }
}

export function parseCycleList(value: unknown): Cycle[] | null {
  return parseList(value, parseCycle)
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

export async function requestExpediente<T>(
  path: string,
  parse: (value: unknown) => T | null,
  init?: { method: 'POST'; body: CreateBody },
): Promise<ExpedienteResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init ? { 'content-type': 'application/json' } : undefined,
      body: init ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, message: 'No se pudo consultar el expediente.' }
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
      message: 'La respuesta no coincide con el contrato del expediente.',
    }
  }
  return { ok: true, data }
}

export function toViewState<T>(result: ExpedienteResult<T>): Exclude<ViewState<T>, { status: 'loading' }> {
  if (result.ok) {
    return { status: 'ready', data: result.data }
  }
  if (result.status === 403) {
    return { status: 'forbidden', message: result.message }
  }
  if (result.status === 404) {
    return { status: 'missing', message: result.message }
  }
  return { status: 'error', message: result.message }
}
