import type { components } from '@sia/contracts'

/**
 * Seguimiento del ciclo (Fase 7).
 * US-PRO-001: objetivo, actividades, evidencia por URL y cronograma.
 * US-PRO-002: envío y validación con observación; un aprobado editado vuelve a validación.
 * US-PRO-005: fotografía descriptiva de las seis áreas, sin puntajes; la aprobada es inmutable.
 * US-PRO-006: ambición del emprendimiento, opcional en el objetivo.
 * La autorización de cada operación sigue en la API.
 */

export type Canvas = components['schemas']['CanvasOut']
export type Area = components['schemas']['AreaOut']
export type Ambition = components['schemas']['AmbitionOut']
export type Objective = components['schemas']['ObjectiveOut']
export type Activity = components['schemas']['ActivityOut']
export type Evidence = components['schemas']['EvidenceOut']
export type Diagnostic = components['schemas']['DiagnosticOut']
export type Validation = components['schemas']['ValidationOut']
export type ScheduleItem = components['schemas']['ScheduleItem']
export type DiagnosticComparison = components['schemas']['DiagnosticComparison']
export type ObjectiveStatus = Objective['status']

export const TRACKED_PROGRAMS = ['Prototipado', 'Puesta en marcha'] as const

export const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  draft: 'Borrador',
  pending_validation: 'Pendiente de validación',
  approved: 'Aprobado',
  correction_requested: 'Corrección solicitada',
  rejected: 'Rechazado',
}

export const DECISION_LABEL: Record<'approve' | 'request_correction' | 'reject', string> = {
  approve: 'Aprobar',
  request_correction: 'Solicitar corrección',
  reject: 'Rechazar',
}

const STATUSES = new Set<string>(Object.keys(STATUS_LABEL))

export type SeguimientoResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

export function canValidate(role: string): boolean {
  return role === 'Coordinadora' || role === 'Gestor'
}

export function canSubmit(status: string): boolean {
  return status === 'draft' || status === 'correction_requested' || status === 'rejected'
}

export function seguimientoUrl(cycleId: string, path: string): string {
  return `/api/sia/cycles/${cycleId}/seguimiento/${path}`
}

export function httpUrl(value: string): { url: string } | { error: string } {
  const url = value.trim()
  if (!url) {
    return { error: 'La URL es obligatoria.' }
  }
  if (url.length > 2048) {
    return { error: 'La URL admite hasta 2048 caracteres.' }
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'La evidencia debe ser una URL http o https.' }
    }
  } catch {
    return { error: 'La URL no es válida.' }
  }
  return { url }
}

export function isoDate(value: string): { date: string } | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Indica una fecha válida.' }
  }
  return { date: value }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function whole(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
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

export function parseCanvas(value: unknown): Canvas | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const program = requiredText(value.program)
  const version = whole(value.version)
  const areas = parseList(value.areas, parseArea)
  if (!id || !program || version === null || !areas) {
    return null
  }
  return { id, program, version, areas }
}

function parseArea(value: unknown): Area | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const canvasId = requiredText(value.canvas_id)
  const key = requiredText(value.key)
  const name = requiredText(value.name)
  const description = text(value.description)
  const position = whole(value.position)
  if (!id || !canvasId || !key || !name || description === null || position === null) {
    return null
  }
  return { id, canvas_id: canvasId, key, name, description, position }
}

export function parseAmbition(value: unknown): Ambition | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const entrepreneurshipId = requiredText(value.entrepreneurship_id)
  const title = requiredText(value.title)
  const description = text(value.description)
  const revision = whole(value.revision)
  const createdAt = requiredText(value.created_at)
  if (!id || !entrepreneurshipId || !title || description === null || revision === null || !createdAt) {
    return null
  }
  return {
    id,
    entrepreneurship_id: entrepreneurshipId,
    title,
    description,
    revision,
    created_at: createdAt,
  }
}

export function parseAmbitionList(value: unknown): Ambition[] | null {
  return parseList(value, parseAmbition)
}

export function parseObjective(value: unknown): Objective | null {
  const ambition = parseAmbition(value)
  if (!ambition || !isRecord(value) || !STATUSES.has(String(value.status))) {
    return null
  }
  const cycleId = requiredText(value.cycle_id)
  const canvasId = requiredText(value.canvas_id)
  const areaId = requiredText(value.area_id)
  const ambitionId = value.ambition_id === null ? null : requiredText(value.ambition_id)
  const deliverable = value.deliverable === null ? null : requiredText(value.deliverable)
  if (!cycleId || !canvasId || !areaId || ambitionId === null && value.ambition_id !== null) {
    return null
  }
  if (deliverable === null && value.deliverable !== null) {
    return null
  }
  return {
    ...ambition,
    cycle_id: cycleId,
    canvas_id: canvasId,
    area_id: areaId,
    ambition_id: ambitionId,
    deliverable,
    status: value.status as ObjectiveStatus,
  }
}

export function parseObjectiveList(value: unknown): Objective[] | null {
  return parseList(value, parseObjective)
}

export function parseActivity(value: unknown): Activity | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const cycleId = requiredText(value.cycle_id)
  const objectiveId = requiredText(value.objective_id)
  const title = requiredText(value.title)
  const description = text(value.description)
  const responsibleId = requiredText(value.responsible_id)
  const startsOn = requiredText(value.starts_on)
  const endsOn = requiredText(value.ends_on)
  const completedAt = value.completed_at === null ? null : requiredText(value.completed_at)
  const revision = whole(value.revision)
  const createdAt = requiredText(value.created_at)
  if (
    !id ||
    !cycleId ||
    !objectiveId ||
    !title ||
    description === null ||
    !responsibleId ||
    !startsOn ||
    !endsOn ||
    (completedAt === null && value.completed_at !== null) ||
    revision === null ||
    !createdAt
  ) {
    return null
  }
  return {
    id,
    cycle_id: cycleId,
    objective_id: objectiveId,
    title,
    description,
    responsible_id: responsibleId,
    starts_on: startsOn,
    ends_on: endsOn,
    completed_at: completedAt,
    revision,
    created_at: createdAt,
  }
}

export function parseActivityList(value: unknown): Activity[] | null {
  return parseList(value, parseActivity)
}

export function parseEvidence(value: unknown): Evidence | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const cycleId = requiredText(value.cycle_id)
  const activityId = requiredText(value.activity_id)
  const title = requiredText(value.title)
  const description = text(value.description)
  const kind = requiredText(value.kind)
  const url = requiredText(value.url)
  const createdBy = requiredText(value.created_by)
  const createdAt = requiredText(value.created_at)
  if (!id || !cycleId || !activityId || !title || description === null || !kind || !url || !createdBy || !createdAt) {
    return null
  }
  return {
    id,
    cycle_id: cycleId,
    activity_id: activityId,
    title,
    description,
    kind,
    url,
    created_by: createdBy,
    created_at: createdAt,
  }
}

export function parseEvidenceList(value: unknown): Evidence[] | null {
  return parseList(value, parseEvidence)
}

export function parseDiagnostic(value: unknown): Diagnostic | null {
  if (!isRecord(value) || !STATUSES.has(String(value.status))) {
    return null
  }
  const id = requiredText(value.id)
  const cycleId = requiredText(value.cycle_id)
  const canvasId = requiredText(value.canvas_id)
  const entrepreneurshipId = requiredText(value.entrepreneurship_id)
  const assessedOn = requiredText(value.assessed_on)
  const supersedesId = value.supersedes_id === null ? null : requiredText(value.supersedes_id)
  const revision = whole(value.revision)
  const createdBy = requiredText(value.created_by)
  const createdAt = requiredText(value.created_at)
  const assessments = parseList(value.assessments, parseAssessment)
  if (
    !id ||
    !cycleId ||
    !canvasId ||
    !entrepreneurshipId ||
    !assessedOn ||
    (supersedesId === null && value.supersedes_id !== null) ||
    revision === null ||
    !createdBy ||
    !createdAt ||
    !assessments
  ) {
    return null
  }
  return {
    id,
    cycle_id: cycleId,
    canvas_id: canvasId,
    entrepreneurship_id: entrepreneurshipId,
    assessed_on: assessedOn,
    assessments,
    supersedes_id: supersedesId,
    status: value.status as ObjectiveStatus,
    revision,
    created_by: createdBy,
    created_at: createdAt,
  }
}

function parseAssessment(value: unknown): { area_id: string; observation: string } | null {
  if (!isRecord(value)) {
    return null
  }
  const areaId = requiredText(value.area_id)
  const observation = requiredText(value.observation)
  if (!areaId || !observation) {
    return null
  }
  return { area_id: areaId, observation }
}

export function parseDiagnosticList(value: unknown): Diagnostic[] | null {
  return parseList(value, parseDiagnostic)
}

export function parseSchedule(value: unknown): ScheduleItem[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items: ScheduleItem[] = []
  for (const item of value) {
    const activity = parseActivity(item)
    if (!activity || !isRecord(item)) {
      return null
    }
    const areaId = requiredText(item.area_id)
    const deliverable = item.deliverable === null ? null : requiredText(item.deliverable)
    if (!areaId || (deliverable === null && item.deliverable !== null)) {
      return null
    }
    items.push({ ...activity, area_id: areaId, deliverable })
  }
  return items
}

export function parseValidation(value: unknown): Validation | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredText(value.id)
  const cycleId = requiredText(value.cycle_id)
  const objectiveId = value.objective_id === null ? null : requiredText(value.objective_id)
  const diagnosticId = value.diagnostic_id === null ? null : requiredText(value.diagnostic_id)
  const actorId = requiredText(value.actor_id)
  const decision = requiredText(value.decision)
  const observation = requiredText(value.observation)
  const entityRevision = whole(value.entity_revision)
  const createdAt = requiredText(value.created_at)
  if (
    !id ||
    !cycleId ||
    (objectiveId === null && value.objective_id !== null) ||
    (diagnosticId === null && value.diagnostic_id !== null) ||
    !actorId ||
    !decision ||
    !observation ||
    entityRevision === null ||
    !createdAt ||
    !isRecord(value.snapshot)
  ) {
    return null
  }
  return {
    id,
    cycle_id: cycleId,
    objective_id: objectiveId,
    diagnostic_id: diagnosticId,
    actor_id: actorId,
    decision,
    observation,
    entity_revision: entityRevision,
    snapshot: value.snapshot,
    created_at: createdAt,
  }
}

export function parseValidationList(value: unknown): Validation[] | null {
  return parseList(value, parseValidation)
}

export function parseComparison(value: unknown): DiagnosticComparison | null {
  if (!isRecord(value)) {
    return null
  }
  const previousId = requiredText(value.previous_id)
  const currentId = requiredText(value.current_id)
  const canvasId = requiredText(value.canvas_id)
  const areas = parseList(value.areas, (item) => {
    if (!isRecord(item)) {
      return null
    }
    const areaId = requiredText(item.area_id)
    const before = text(item.before)
    const after = text(item.after)
    if (!areaId || before === null || after === null) {
      return null
    }
    return { area_id: areaId, before, after }
  })
  if (!previousId || !currentId || !canvasId || !areas) {
    return null
  }
  return { previous_id: previousId, current_id: currentId, canvas_id: canvasId, areas }
}

export async function requestSeguimiento<T>(
  path: string,
  parse: (value: unknown) => T | null,
  init?: { method: 'POST' | 'PUT'; body: unknown },
): Promise<SeguimientoResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init ? { 'content-type': 'application/json' } : undefined,
      body: init ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, message: 'No se pudo consultar el seguimiento.' }
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
      message: 'La respuesta no coincide con el contrato de seguimiento.',
    }
  }
  return { ok: true, data }
}
