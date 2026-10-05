import type { components } from '@sia/contracts'

export type Report = components['schemas']['ReportOut']
type ReportBody = components['schemas']['ReportCreate'] | components['schemas']['ReportUpdate'] | components['schemas']['ReportApproval'] | components['schemas']['ReportCorrection']
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
  const response = await fetch(path, { method: init?.method ?? 'GET', cache: 'no-store', headers: init ? { 'content-type': 'application/json' } : undefined, body: init ? JSON.stringify(init.body) : undefined })
  const payload: unknown = await response.json()
  if (!response.ok) throw new Error(typeof payload === 'object' && payload && 'detail' in payload && typeof payload.detail === 'string' ? payload.detail : 'No se pudo consultar el informe.')
  const data = parse(payload)
  if (data === null) throw new Error('La respuesta de informes no es válida.')
  return data
}
export function parseReports(value: unknown): Report[] | null {
  if (!Array.isArray(value)) return null
  const reports = value.map(parseReport)
  return reports.every((report): report is Report => report !== null) ? reports : null
}
