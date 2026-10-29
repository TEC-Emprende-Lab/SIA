import type { components } from '@sia/contracts'

export type Purchase = components['schemas']['PurchaseOut']
export type Change = components['schemas']['ChangeOut']
export type FinanceEvent = components['schemas']['EventOut']
export type Reconciliation = components['schemas']['ReconciliationOut']
export type Kind = Purchase['kind']
export type Definitions = { types: Record<Kind, string>; checklists: Record<Kind, Record<string, string>>; currency: string }
export type ItemSummary = { id: string; name: string; revision: number; allocated: string; executed: string; pending: string; balance_after_execution: string; consumed_percent: string; available: null }
export type Summary = { currency: string; items: ItemSummary[]; available: null; detail: string; purchase_count: number; by_type?: { kind: Kind; label: string; count: number; executed: string; pending: string }[] }
export type Duplicate = { supplier: string; amount: string; purchase_ids: string[]; warning: string }
export type Attachment = { id: string; document_id: string; name: string }
export type Extraction = { invoice_number: string; supplier: string; amount: string | null; submission_date: string | null; description: string; currency: string | null; warning: string }

export const STATUS: Record<string, string> = { draft: 'Borrador', submitted: 'En revisión', correction_requested: 'Corrección solicitada', validated: 'Validado internamente', fundatec: 'Registrado en FUNDATEC', executed: 'Ejecutado', rejected: 'Rechazado', cancelled: 'Anulado' }
export const RESULT: Record<string, string> = { match: 'Coincide', difference: 'Diferencia', only_sea: 'Solo SEA', only_fundatec: 'Solo FUNDATEC', ambiguous: 'Número ambiguo' }
const currencyFormatter = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' })
export function money(value: string | number): string {
  if (typeof value === 'number') return Number.isFinite(value) ? currencyFormatter.format(value) : '—'
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) return '—'
  const whole = BigInt(match[2]!)
  const parts = currencyFormatter.formatToParts(match[1] ? -whole : whole)
  const text = parts.map(part => part.type === 'fraction' ? (match[3] ?? '').padEnd(2, '0') : part.value).join('')
  return match[1] && whole === 0n ? `-${text}` : text
}
export const financeUrl = (cycle: string, path: string) => `/api/sia/cycles/${encodeURIComponent(cycle)}/finanzas/${path}`

export function sumFinanceAmounts(values: string[]): string {
  const cents = values.reduce((total, value) => {
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value)
    if (!match) throw new Error('Monto financiero inválido.')
    const magnitude = BigInt(match[2]!) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
    return total + (match[1] ? -magnitude : magnitude)
  }, 0n)
  const magnitude = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const strings = (value: Record<string, unknown>, keys: string[]) => keys.every(k => typeof value[k] === 'string')
const amount = (value: unknown) => typeof value === 'string' && /^-?\d+(\.\d{1,2})?$/.test(value)
const positiveRevision = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0
const kinds = ['factura', 'reintegro', 'uso_tc', 'comision_bancaria', 'pago_contrato']

export function validPurchase(value: unknown, cycle: string): value is Purchase {
  if (!record(value) || !strings(value, ['id', 'cycle_id', 'item_id', 'kind', 'status', 'supplier', 'invoice_number', 'description', 'fundatec_number', 'created_by', 'created_at'])) return false
  return value.cycle_id === cycle && kinds.includes(String(value.kind)) && Object.hasOwn(STATUS, String(value.status)) && amount(value.amount) && positiveRevision(value.revision) && record(value.checklist) && Object.values(value.checklist).every(v => typeof v === 'boolean')
}

export function validSummary(value: unknown): value is Summary {
  return record(value) && value.currency === 'CRC' && value.available === null && typeof value.detail === 'string' && Array.isArray(value.items) && value.items.every(i => record(i) && strings(i, ['id', 'name', 'allocated', 'executed', 'pending', 'balance_after_execution', 'consumed_percent']) && amount(i.allocated) && amount(i.executed) && amount(i.pending) && amount(i.balance_after_execution)) && (value.by_type === undefined || Array.isArray(value.by_type) && value.by_type.every(row => record(row) && strings(row, ['kind', 'label']) && amount(row.executed) && amount(row.pending) && typeof row.count === 'number'))
}

function validResponse(path: string, value: unknown, cycle: string): boolean {
  const endpoint = path.split('?')[0] ?? ''
  if (endpoint === 'summary') return validSummary(value)
  if (endpoint === 'purchases') return Array.isArray(value) ? value.every(p => validPurchase(p, cycle)) : validPurchase(value, cycle)
  if (/^purchases\/[^/]+(?:\/transitions)?$/.test(endpoint)) return validPurchase(value, cycle)
  if (endpoint === 'definitions') return record(value) && value.currency === 'CRC' && record(value.types) && record(value.checklists) && kinds.every(k => record(value.checklists) && record(value.checklists[k]) && Object.values(value.checklists[k]).every(v => typeof v === 'string') && record(value.types) && typeof value.types[k] === 'string')
  if (endpoint === 'events') return Array.isArray(value) && value.every(v => record(v) && strings(v, ['id', 'entity_id', 'action', 'observation', 'actor_id', 'created_at']) && record(v.snapshot))
  if (endpoint.endsWith('/attachments')) return Array.isArray(value) ? value.every(v => record(v) && strings(v, ['id', 'document_id', 'name']) && !('storage_key' in v)) : record(value) && value.ok === true
  if (endpoint === 'report-text') return record(value) && typeof value.text === 'string'
  if (endpoint === 'changes' || /^changes\/[^/]+\/decision$/.test(endpoint)) {
    const valid = (v: unknown) => record(v) && strings(v, ['id', 'source_id', 'target_id', 'reason', 'status', 'created_by']) && amount(v.amount) && positiveRevision(v.revision) && ['pending', 'approved', 'rejected'].includes(String(v.status))
    return Array.isArray(value) ? value.every(valid) : valid(value)
  }
  if (endpoint === 'reconciliations') {
    const valid = (v: unknown) => record(v) && strings(v, ['id', 'name', 'sha256', 'project_reference', 'created_at']) && Array.isArray(v.results) && v.results.every(row => record(row) && strings(row, ['key', 'invoice_number', 'status']) && Object.hasOwn(RESULT, String(row.status)))
    return Array.isArray(value) ? value.every(valid) : valid(value)
  }
  if (endpoint === 'duplicates') return Array.isArray(value) && value.every(v => record(v) && strings(v, ['supplier', 'amount', 'warning']) && Array.isArray(v.purchase_ids) && v.purchase_ids.every(id => typeof id === 'string'))
  if (endpoint === 'extract') return record(value) && strings(value, ['invoice_number', 'supplier', 'description', 'warning']) && (value.amount === null || amount(value.amount))
  if (endpoint === 'items') return record(value) && strings(value, ['id', 'name']) && amount(value.amount) && positiveRevision(value.revision)
  return record(value) && value.ok === true
}

export async function downloadFinancePdf(path: string, filename: string): Promise<void> {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('No se pudo generar el reporte financiero.')
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  URL.revokeObjectURL(url)
}

export async function financeRequest<T>(cycle: string, path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const init: RequestInit = { method, cache: 'no-store', signal }
  if (method !== 'GET' && body !== undefined) { init.headers = { 'content-type': 'application/json' }; init.body = JSON.stringify(body) }
  const response = await fetch(financeUrl(cycle, path), init)
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = value && typeof value === 'object' && 'detail' in value ? value.detail : null
    throw new Error(typeof detail === 'string' ? detail : response.status === 422 ? 'Revise los campos, montos y fechas del formulario.' : 'No se pudo completar la operación financiera.')
  }
  if (!validResponse(path, value, cycle)) throw new Error('Respuesta financiera inválida; no se muestran datos incompletos ni de otro ciclo.')
  return value as T
}

export async function extractInvoice(cycle: string, file: File): Promise<Extraction> {
  if (file.size > 6_000_000) throw new Error('La extracción admite hasta 6 MB. Puede completar los datos manualmente.')
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
  return financeRequest(cycle, 'extract', 'POST', { name: file.name, content_base64: content })
}

export async function allFinanceEvents(cycle: string, entityId: string): Promise<FinanceEvent[]> {
  const result: FinanceEvent[] = []
  const seen = new Set<string>()
  for (let offset = 0; ; offset += 100) {
    const page = await financeRequest<FinanceEvent[]>(cycle, `events?entity_id=${encodeURIComponent(entityId)}&offset=${offset}&limit=100`)
    for (const event of page) {
      if (event.entity_id !== entityId || seen.has(event.id)) throw new Error('El historial cambió durante la consulta; vuelva a abrir la conciliación.')
      seen.add(event.id); result.push(event)
    }
    if (page.length < 100) return result
  }
}
