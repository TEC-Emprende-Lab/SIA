import type { components } from '@sia/contracts'

export type Report = components['schemas']['ReportOut']
type ReportBody = components['schemas']['ReportCreate'] | components['schemas']['ReportUpdate'] | components['schemas']['ReportApproval'] | components['schemas']['ReportCorrection']
export type ReportAction = 'edit' | 'approve' | 'correct'

/** US-PRO-004 / US-PM-003: refleja las validaciones de la API, que sigue autorizando. */
export function reportSubmission(form: FormData, report?: Report): { path: string; method: 'POST' | 'PUT'; body: ReportBody } {
  const text = (field: string) => String(form.get(field) ?? '')
  const narrative = text('narrative')
  if (!report) {
    const start = text('start')
    const end = text('end')
    if (!start || !end) throw new Error('Selecciona el inicio y el fin del período.')
    if (start > end) throw new Error('La fecha final debe ser igual o posterior a la inicial.')
    return { path: '', method: 'POST', body: { period_start: start, period_end: end, kind: 'mensual', narrative } }
  }
  const action = text('action')
  const observation = text('observation').trim()
  if (!observation) throw new Error('Escribe una observación; no puede contener solo espacios.')
  if (report.status === 'aprobado' && action !== 'correct') throw new Error('La versión aprobada se conserva sin cambios. Crea una corrección vinculada.')
  if (action === 'correct' && report.status === 'aprobado') {
    return { path: `/${report.id}/corrections`, method: 'POST', body: { observation, narrative } }
  }
  if (action === 'approve') {
    if (form.get('reviewed') !== 'on') throw new Error('Confirma la revisión humana antes de aprobar.')
    if (narrative !== report.narrative) throw new Error('Guarda primero los cambios del borrador antes de aprobarlo.')
    return { path: `/${report.id}/approval`, method: 'POST', body: { expected_revision: report.revision, observation, human_reviewed: true } }
  }
  if (action === 'edit') {
    return { path: `/${report.id}`, method: 'PUT', body: { expected_revision: report.revision, observation, narrative } }
  }
  throw new Error('Selecciona una acción disponible para este informe.')
}
export function parseReport(value: unknown): Report | null {
  if (typeof value !== 'object' || !value || Array.isArray(value)) return null
  const report = value as Record<string, unknown>
  for (const field of ['id', 'entrepreneurship_id', 'cycle_id', 'period_start', 'period_end', 'kind', 'narrative', 'created_by', 'created_at']) {
    if (typeof report[field] !== 'string') return null
  }
  if (report.status !== 'borrador' && report.status !== 'aprobado') return null
  if (!Number.isInteger(report.version) || !Number.isInteger(report.revision)) return null
  if (typeof report.composition !== 'object' || !report.composition || Array.isArray(report.composition)) return null
  return value as Report
}
export async function reportRequest<T>(path: string, parse: (value: unknown) => T | null, init?: { method: 'POST' | 'PUT'; body: ReportBody }): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { method: init?.method ?? 'GET', cache: 'no-store', headers: init ? { 'content-type': 'application/json' } : undefined, body: init ? JSON.stringify(init.body) : undefined })
  } catch {
    throw new Error('No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.')
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload && typeof payload.detail === 'string' ? payload.detail : ''
    if (response.status === 409 && detail === 'Revisión obsoleta') throw new Error('Este informe cambió desde que lo abriste. Conserva una copia de tu redacción y recarga la página para revisar la versión actual.')
    throw new Error(detail || (response.status === 422 ? 'Revisa los datos del formulario e inténtalo de nuevo.' : 'No se pudo completar la operación. Inténtalo de nuevo.'))
  }
  const data = parse(payload)
  if (data === null) throw new Error('La respuesta de informes no es válida.')
  return data
}
export async function requestReportPdf(
  cycleId: string,
  reportId: string,
): Promise<{ url: string; expires_in: number }> {
  const response = await fetch(`/api/sia/cycles/${cycleId}/reports/${reportId}/pdf`, { cache: 'no-store' })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || typeof payload !== 'object' || !payload || Array.isArray(payload)) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload && typeof payload.detail === 'string' ? payload.detail : 'No se pudo preparar el PDF.'
    throw new Error(detail)
  }
  const body = payload as Record<string, unknown>
  if ('pdf_storage_key' in body || 'storage_key' in body || typeof body.url !== 'string' || !body.url || typeof body.expires_in !== 'number') {
    throw new Error('La respuesta del PDF no es válida.')
  }
  return { url: body.url, expires_in: body.expires_in }
}

export function parseReports(value: unknown): Report[] | null {
  if (!Array.isArray(value)) return null
  const reports = value.map(parseReport)
  return reports.every((report): report is Report => report !== null) ? reports : null
}
