'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Download, Plus, RefreshCw } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { uploadPrivateDocument, requestDocumentAccess } from '../lib/documents'
import { financeRequest, financeUrl, allFinanceEvents, validSummary, downloadFinancePdf, extractInvoice, money, STATUS, RESULT, type Purchase, type Change, type FinanceEvent, type Definitions, type Summary, type Kind, type Duplicate, type Attachment, type Reconciliation } from '../lib/finanzas'
import styles from './finanzas.module.css'

type View = 'Presupuesto' | 'Trámites' | 'Cambios' | 'Duplicados' | 'Conciliación' | 'Cartera autorizada'
const fail = (reason: unknown) => reason instanceof Error ? reason.message : 'No se pudo completar la operación.'

export function FinanzasView({ cycleId, entrepreneurshipId, program }: { cycleId: string; entrepreneurshipId: string; program: string }) {
  const me = useMe()
  const [view, setView] = useState<View>('Presupuesto')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [definitions, setDefinitions] = useState<Definitions | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState<Purchase | 'new' | null>(null)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [newItem, setNewItem] = useState(false)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let active = true
    if (program !== 'Prototipado') { setLoading(false); return }
    setLoading(true)
    setError('')
    void Promise.all([financeRequest<Summary>(cycleId, 'summary'), financeRequest<Definitions>(cycleId, 'definitions')]).then(([s, d]) => { if (active) { setSummary(s); setDefinitions(d) } }).catch(e => { if (active) setError(fail(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [cycleId, program, version])
  if (program !== 'Prototipado') return <><ProjectHeading eyebrow="Recursos para avanzar" title="Finanzas y compras" /><section className="panel"><p>Finanzas no está habilitada para este programa. Sus reglas siguen pendientes de definición.</p></section></>
  const manage = me.role !== 'Emprendedor'
  const coordinate = me.role === 'Coordinadora'
  const total = (field: 'allocated' | 'executed' | 'pending') => summary?.items.reduce((sum, item) => sum + Number(item[field]), 0) ?? 0
  return <div className={styles.workspace}>
    <div className={styles.toolbar}><ProjectHeading eyebrow="Cada recurso, con propósito" title="Finanzas y compras" /><div className={styles.actions}><button className="btn secondary" onClick={refresh} aria-label="Actualizar finanzas"><RefreshCw size={16} /></button><button className="btn primary" disabled={!summary?.items.length || loading} onClick={() => setForm('new')}><Plus size={16} />Nuevo trámite</button></div></div>
    <p className={styles.note}>CRC · Presupuesto por ciclo. Validar no significa pagar. Los registros ejecutados y su historial se conservan.</p>
    {error && <div role="alert" className={styles.error}>{error}<button className="btn secondary" onClick={refresh}>Reintentar</button></div>}
    {loading ? <p role="status">Consultando finanzas…</p> : summary && definitions && <>
      <section className={styles.metrics} aria-label="Resumen financiero"><div><small>Presupuesto asignado</small><strong>{money(total('allocated'))}</strong></div><div><small>Ejecutado</small><strong>{money(total('executed'))}</strong></div><div><small>En proceso · no es reserva</small><strong>{money(total('pending'))}</strong></div></section>
      <div className={styles.tabs} aria-label="Vistas financieras">{(['Presupuesto', 'Trámites', 'Cambios', 'Duplicados', ...(manage ? ['Conciliación'] : []), 'Cartera autorizada'] as View[]).map(v => <button key={v} className={styles.tab} aria-pressed={view === v} onClick={() => setView(v)}>{v}</button>)}</div>
      {view === 'Presupuesto' && <section className="panel"><div className={styles.toolbar}><h2>Partidas del ciclo</h2>{coordinate && <button className="btn secondary" onClick={() => setNewItem(true)}>Registrar partida aprobada</button>}</div><p className={styles.note}>{summary.detail}</p>{summary.items.length ? <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Partida</th><th>Asignado</th><th>Ejecutado</th><th>En proceso</th><th>Saldo sobre ejecutado</th><th>Consumo</th></tr></thead><tbody>{summary.items.map(item => <tr key={item.id}><td>{item.name}</td><td className={styles.numeric}>{money(item.allocated)}</td><td className={styles.numeric}>{money(item.executed)}</td><td className={styles.numeric}>{money(item.pending)}</td><td className={styles.numeric}>{money(item.balance_after_execution)}</td><td>{item.consumed_percent}%<progress className={styles.progress} max="100" value={Math.min(100, Number(item.consumed_percent))} /></td></tr>)}</tbody></table></div> : <p className={styles.empty}>Aún no hay partidas. La Coordinadora debe registrar el presupuesto aprobado; no se inventa un catálogo oficial.</p>}</section>}
      {view === 'Trámites' && <PurchaseList key={version} cycle={cycleId} definitions={definitions} open={setDetail} />}
      {view === 'Presupuesto' && summary.by_type && <section className="panel"><h2>Distribución por tipo de trámite</h2><div className={styles.scroll}><table className={styles.table}><thead><tr><th>Tipo</th><th>Vigentes · incluye borradores</th><th>Ejecutado</th><th>En proceso</th></tr></thead><tbody>{summary.by_type.map(row => <tr key={row.kind}><td>{row.label}</td><td>{row.count}</td><td className={styles.numeric}>{money(row.executed)}</td><td className={styles.numeric}>{money(row.pending)}</td></tr>)}</tbody></table></div></section>}
      {view === 'Cambios' && <Changes key={version} cycle={cycleId} summary={summary} manage={manage} coordinate={coordinate} refresh={refresh} />}
      {view === 'Duplicados' && <Duplicates cycle={cycleId} />}
      {view === 'Conciliación' && manage && <Reconcile cycle={cycleId} />}
      {view === 'Cartera autorizada' && <Portfolio />}
      {form && <PurchaseForm key={form === 'new' ? 'new' : form.id} cycle={cycleId} definitions={definitions} summary={summary} purchase={form === 'new' ? undefined : form} close={() => setForm(null)} saved={item => { setForm(null); setDetail(item); refresh() }} />}
      {detail && <PurchaseDetail key={`${detail.id}/${detail.revision}`} cycle={cycleId} eid={entrepreneurshipId} purchase={detail} definitions={definitions} role={me.role} userId={me.id} close={() => setDetail(null)} edit={() => { setForm(detail); setDetail(null) }} updated={item => { setDetail(item); refresh() }} />}
      {newItem && <ItemForm cycle={cycleId} close={() => setNewItem(false)} saved={() => { setNewItem(false); refresh() }} />}
    </>}
  </div>
}

function PurchaseList({ cycle, definitions, open }: { cycle: string; definitions: Definitions; open: (p: Purchase) => void }) {
  const [rows, setRows] = useState<Purchase[]>([])
  const [filters, setFilters] = useState({ status: '', kind: '', start: '', end: '' })
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    void financeRequest<Purchase[]>(cycle, `purchases?${query}&offset=${offset}&limit=50`).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(fail(e)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [cycle, query, offset])
  async function download() {
    setExporting(true); setError('')
    try {
      await downloadFinancePdf(financeUrl(cycle, `report.pdf?${query}`), 'finanzas-operativo.pdf')
    } catch (e) { setError(fail(e)) } finally { setExporting(false) }
  }
  async function copySession() {
    setError('')
    try {
      const dates = new URLSearchParams(Object.entries({ start: filters.start, end: filters.end }).filter(([, v]) => v))
      const result = await financeRequest<{ text: string }>(cycle, `report-text?${dates}`)
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
    } catch (e) { setError(fail(e)) }
  }
  return <section className="panel"><div className={styles.toolbar}><h2>Trámites y reportes</h2><button className="btn secondary" onClick={download} disabled={exporting}><Download size={16} />{exporting ? 'Generando…' : 'Reporte PDF'}</button></div><div className={styles.filters}><label>Estado<select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setOffset(0) }}><option value="">Todos</option>{Object.entries(STATUS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label><label>Tipo<select value={filters.kind} onChange={e => { setFilters({ ...filters, kind: e.target.value }); setOffset(0) }}><option value="">Todos</option>{Object.entries(definitions.types).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label><label>Registrado desde<input type="date" value={filters.start} onChange={e => { setFilters({ ...filters, start: e.target.value }); setOffset(0) }} /></label><label>Hasta<input type="date" value={filters.end} onChange={e => { setFilters({ ...filters, end: e.target.value }); setOffset(0) }} /></label></div>
    <div className={styles.filters}><label>Seleccionar mes<input type="month" onChange={e => { const [year, month] = e.target.value.split('-').map(Number); if (!year || !month) return; setFilters({ ...filters, start: `${e.target.value}-01`, end: `${e.target.value}-${new Date(year, month, 0).getDate()}` }); setOffset(0); setCopied(false) }} /></label><button className="btn secondary" onClick={() => void copySession()}>{copied ? 'Texto copiado' : 'Copiar validaciones internas del período'}</button></div><p className={styles.note}>El PDF usa fecha de registro. El texto de sesión usa la fecha de validación interna y conserva quién validó; no afirma que FUNDATEC pagó.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}{loading ? <p role="status">Cargando trámites…</p> : rows.length ? <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Trámite / proveedor</th><th>Documento</th><th>Monto CRC</th><th>Estado</th><th>Revisión</th><th>Detalle</th></tr></thead><tbody>{rows.map(p => <tr key={p.id}><td>{definitions.types[p.kind]}<small>{p.supplier}</small></td><td>{p.invoice_number || 'Sin documento'}<small>{p.fundatec_number ? `FUNDATEC ${p.fundatec_number}` : ''}</small></td><td className={styles.numeric}>{money(p.amount)}</td><td><span className={styles.status}>{STATUS[p.status]}</span></td><td>{Object.values(p.checklist).filter(Boolean).length}/{Object.keys(p.checklist).length}</td><td><button className="btn secondary" onClick={() => open(p)}>Abrir</button></td></tr>)}</tbody></table></div> : <p className={styles.empty}>No hay trámites con estos filtros.</p>}
    <div className={styles.actions}><button className="btn secondary" disabled={offset === 0 || loading} onClick={() => setOffset(v => Math.max(0, v - 50))}>Anterior</button><span>Página {offset / 50 + 1}</span><button className="btn secondary" disabled={rows.length < 50 || loading} onClick={() => setOffset(v => v + 50)}>Siguiente</button></div>
  </section>
}

function PurchaseForm({ cycle, definitions, summary, purchase, close, saved }: { cycle: string; definitions: Definitions; summary: Summary; purchase?: Purchase; close: () => void; saved: (p: Purchase) => void }) {
  const [fields, setFields] = useState({ item_id: purchase?.item_id ?? summary.items[0]?.id ?? '', kind: purchase?.kind ?? 'factura' as Kind, amount: String(purchase?.amount ?? ''), supplier: purchase?.supplier ?? '', invoice_number: purchase?.invoice_number ?? '', description: purchase?.description ?? '', submission_date: purchase?.submission_date ?? '' })
  const [checks, setChecks] = useState<Record<string, boolean>>(purchase?.checklist ?? {})
  const [observation, setObservation] = useState('')
  const [requestKey] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  async function parse(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const result = await extractInvoice(cycle, file)
      setFields(f => ({ ...f, invoice_number: result.invoice_number || f.invoice_number, supplier: result.supplier || f.supplier, amount: result.amount ?? f.amount, submission_date: result.submission_date || f.submission_date, description: result.description || f.description }))
      setHint(result.warning + ' Adjunte el archivo al trámite después de guardar el borrador.')
    } catch (e) { setError(fail(e)) } finally { setBusy(false) }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { saved(await financeRequest<Purchase>(cycle, purchase ? `purchases/${purchase.id}` : 'purchases', purchase ? 'PUT' : 'POST', { ...fields, submission_date: fields.submission_date || null, checklist: Object.fromEntries(Object.keys(definitions.checklists[fields.kind]).map(k => [k, checks[k] ?? false])), ...(purchase ? { expected_revision: purchase.revision, observation } : { request_key: requestKey }) })) } catch (reason) { setError(fail(reason)) } finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={v => { if (!v && !busy) close() }}><DialogContent className={styles.dialog}><DialogHeader><DialogTitle>{purchase ? 'Corregir trámite' : 'Nuevo trámite'}</DialogTitle><DialogDescription>Guarde un borrador, adjunte el respaldo y envíelo a revisión. Nada se aprueba automáticamente.</DialogDescription></DialogHeader><form className={styles.form} onSubmit={submit}>
    <label>Prellenar desde XML o PDF<input type="file" accept=".xml,.pdf" disabled={busy} onChange={e => void parse(e.target.files?.[0])} /></label>{hint && <p role="status" className={styles.note}>{hint}</p>}
    <div className={styles.columns}><label>Tipo<select value={fields.kind} onChange={e => { setFields({ ...fields, kind: e.target.value as Kind }); setChecks({}) }}>{Object.entries(definitions.types).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label><label>Partida<select value={fields.item_id} onChange={e => setFields({ ...fields, item_id: e.target.value })}>{summary.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <label>Proveedor / beneficiario<input required maxLength={200} value={fields.supplier} onChange={e => setFields({ ...fields, supplier: e.target.value })} /></label><div className={styles.columns}><label>Número de factura / contrato / documento<input maxLength={100} value={fields.invoice_number} onChange={e => setFields({ ...fields, invoice_number: e.target.value })} /></label><label>Monto en colones<input type="number" required min="0.01" step="0.01" max="999999999999.99" value={fields.amount} onChange={e => setFields({ ...fields, amount: e.target.value })} /></label></div><label>Detalle / justificación<textarea required maxLength={4000} value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })} /></label><label>Fecha de ingreso<input type="date" value={fields.submission_date} onChange={e => setFields({ ...fields, submission_date: e.target.value })} /></label>
    <fieldset className={styles.checks}><legend>Checklist v1 · {definitions.types[fields.kind]}</legend>{Object.entries(definitions.checklists[fields.kind]).map(([key, label]) => <label key={key}><input type="checkbox" checked={checks[key] ?? false} onChange={e => setChecks({ ...checks, [key]: e.target.checked })} />{label}</label>)}</fieldset>
    {fields.kind === 'uso_tc' && <p className={styles.note}>No ingrese el número completo de la tarjeta, CVV ni credenciales bancarias. Adjunte únicamente respaldos sin esos datos sensibles.</p>}
    {purchase && <label>Motivo de la corrección<textarea required value={observation} onChange={e => setObservation(e.target.value)} /></label>}{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><button type="button" className="btn secondary" disabled={busy} onClick={close}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? 'Procesando…' : 'Guardar borrador'}</button></div>
  </form></DialogContent></Dialog>
}

function PurchaseDetail({ cycle, eid, purchase: p, definitions, role, userId, close, edit, updated }: { cycle: string; eid: string; purchase: Purchase; definitions: Definitions; role: string; userId: string; close: () => void; edit: () => void; updated: (p: Purchase) => void }) {
  const [events, setEvents] = useState<FinanceEvent[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [observation, setObservation] = useState('')
  const [fundatec, setFundatec] = useState('')
  const [executed, setExecuted] = useState('')
  const [human, setHuman] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [eventOffset, setEventOffset] = useState(0)
  const editable = ['draft', 'correction_requested'].includes(p.status) && (role !== 'Emprendedor' || p.created_by === userId)
  const manager = role !== 'Emprendedor'
  useEffect(() => { let active = true; void Promise.all([financeRequest<FinanceEvent[]>(cycle, `events?entity_id=${p.id}&offset=${eventOffset}`), financeRequest<Attachment[]>(cycle, `purchases/${p.id}/attachments`)]).then(([a, b]) => { if (active) { setEvents(a); setAttachments(b) } }).catch(e => { if (active) setError(fail(e)) }); return () => { active = false } }, [cycle, p.id, eventOffset])
  async function act(action: string) {
    if (!observation.trim()) { setError('Escriba el motivo de la acción.'); return }
    setBusy(true); setError('')
    try { updated(await financeRequest<Purchase>(cycle, `purchases/${p.id}/transitions`, 'POST', { action, expected_revision: p.revision, observation, human_reviewed: human, fundatec_number: fundatec, executed_on: executed || null })) } catch (e) { setError(fail(e)) } finally { setBusy(false) }
  }
  async function attach(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const upload = await uploadPrivateDocument(eid, file)
      if (!upload.ok) throw new Error(upload.message)
      await financeRequest(cycle, `purchases/${p.id}/attachments`, 'POST', { document_id: upload.data.id, expected_revision: p.revision })
      // Read the persisted record rather than guessing its revision.
      updated(await financeRequest<Purchase>(cycle, `purchases/${p.id}`))
    } catch (e) { setError(fail(e)) } finally { setBusy(false) }
  }
  async function openDocument(id: string) { const result = await requestDocumentAccess(eid, id); if (result.ok) window.open(result.data.url, '_blank', 'noopener,noreferrer'); else setError(result.message) }
  const actions: [string, string][] = []
  if (editable) actions.push(['submit', 'Enviar a revisión'])
  if (manager && p.status === 'submitted') actions.push(['request_correction', 'Pedir corrección'], ['validate', 'Validar internamente'], ['reject', 'Rechazar'])
  if (manager && p.status === 'validated') actions.push(['register_fundatec', 'Registrar en FUNDATEC'], ['reject', 'Rechazar'])
  if (role === 'Coordinadora' && (p.status === 'fundatec' || p.status === 'validated' && p.kind === 'comision_bancaria')) actions.push(['execute', 'Confirmar ejecución'])
  if (role === 'Coordinadora' && !['executed', 'cancelled', 'rejected'].includes(p.status)) actions.push(['cancel', 'Anular con motivo'])
  return <Dialog open onOpenChange={v => { if (!v && !busy) close() }}><DialogContent className={styles.dialog}><DialogHeader><DialogTitle>{definitions.types[p.kind]}</DialogTitle><DialogDescription>{p.supplier} · {money(p.amount)} · {STATUS[p.status]}</DialogDescription></DialogHeader>
    <p>{p.description}</p><p className={styles.note}>Documento: {p.invoice_number || 'Pendiente'} · FUNDATEC: {p.fundatec_number || 'Pendiente'} · Revisión {p.revision}<br />Checklist: {Object.values(p.checklist).filter(Boolean).length}/{Object.keys(p.checklist).length}. {p.executed_on ? `Ejecutado: ${p.executed_on}` : 'Sin ejecución confirmada.'}</p>
    <h3>Respaldos privados</h3>{attachments.length ? attachments.map(a => <button key={a.id} className="btn secondary" onClick={() => void openDocument(a.document_id)}>{a.name}</button>) : <p>Sin archivos adjuntos.</p>}
    {editable && <div className={styles.form}><label>Adjuntar respaldo<input type="file" disabled={busy} onChange={e => void attach(e.target.files?.[0])} /></label><button className="btn secondary" disabled={busy} onClick={edit}>Editar borrador / checklist</button></div>}
    {actions.length > 0 && <div className={styles.form}><h3>Siguiente paso</h3><label>Observación / motivo<textarea required value={observation} onChange={e => setObservation(e.target.value)} /></label>{manager && <><label>Consecutivo FUNDATEC<input value={fundatec} maxLength={100} onChange={e => setFundatec(e.target.value)} /></label>{role === 'Coordinadora' && <label>Fecha de ejecución<input type="date" value={executed} max={new Date().toLocaleDateString('en-CA')} onChange={e => setExecuted(e.target.value)} /></label>}<label><span><input type="checkbox" checked={human} onChange={e => setHuman(e.target.checked)} /> Confirmo que revisé personalmente la información</span></label></>}<div className={styles.actions}>{actions.map(([action, label]) => <button key={action} className="btn secondary" disabled={busy} onClick={() => void act(action)}>{label}</button>)}</div></div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}<h3>Historial verificable</h3><ul className={styles.history}>{events.map(event => <li key={event.id}><small>{new Date(event.created_at).toLocaleString('es-CR')} · Actor {event.actor_id} · {event.action}</small>{event.observation}</li>)}</ul><div className={styles.actions}><button className="btn secondary" disabled={!eventOffset} onClick={() => setEventOffset(v => Math.max(0, v - 50))}>Historial anterior</button><button className="btn secondary" disabled={events.length < 50} onClick={() => setEventOffset(v => v + 50)}>Más historial</button></div>
  </DialogContent></Dialog>
}

function ItemForm({ cycle, close, saved }: { cycle: string; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { await financeRequest(cycle, 'items', 'POST', Object.fromEntries(data)); saved() } catch (reason) { setError(fail(reason)) } finally { setBusy(false) } }
  return <Dialog open onOpenChange={v => { if (!v && !busy) close() }}><DialogContent><DialogHeader><DialogTitle>Registrar partida aprobada</DialogTitle><DialogDescription>Registre el nombre y monto del presupuesto autorizado. No crea un catálogo oficial.</DialogDescription></DialogHeader><form className={styles.form} onSubmit={submit}><label>Nombre<input name="name" required maxLength={200} /></label><label>Monto CRC<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Referencia de aprobación / justificación<textarea name="observation" required maxLength={4000} /></label>{error && <p role="alert" className={styles.error}>{error}</p>}<button className="btn primary" disabled={busy}>Guardar partida</button></form></DialogContent></Dialog>
}

function Changes({ cycle, summary, manage, coordinate, refresh }: { cycle: string; summary: Summary; manage: boolean; coordinate: boolean; refresh: () => void }) {
  const [rows, setRows] = useState<Change[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [offset, setOffset] = useState(0)
  useEffect(() => { let active = true; void financeRequest<Change[]>(cycle, `changes?offset=${offset}`).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(fail(e)) }); return () => { active = false } }, [cycle, offset])
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { await financeRequest(cycle, 'changes', 'POST', Object.fromEntries(data)); refresh() } catch (reason) { setError(fail(reason)) } finally { setBusy(false) } }
  async function decide(row: Change, decision: 'approve' | 'reject', observation: string) { setBusy(true); try { await financeRequest(cycle, `changes/${row.id}/decision`, 'POST', { expected_revision: row.revision, decision, observation, human_reviewed: true }); refresh() } catch (e) { setError(fail(e)) } finally { setBusy(false) } }
  const name = (id: string) => summary.items.find(i => i.id === id)?.name ?? id
  return <section className="panel"><h2>Cambios presupuestarios</h2><p className={styles.note}>Solo la Coordinadora aprueba traslados entre partidas del mismo ciclo. La aprobación no sustituye el control institucional.</p>{manage && summary.items.length >= 2 && <form className={styles.form} onSubmit={submit}><div className={styles.columns}><label>Partida origen<select name="source_id">{summary.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label>Partida destino<select name="target_id" defaultValue={summary.items[1]?.id}>{summary.items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label></div><label>Monto CRC<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Justificación<textarea name="reason" required maxLength={4000} /></label><button className="btn secondary" disabled={busy}>Solicitar traslado</button></form>}{error && <p role="alert" className={styles.error}>{error}</p>}{rows.length ? rows.map(row => <div className="record-row" key={row.id}><div><strong>{name(row.source_id)} → {name(row.target_id)} · {money(row.amount)}</strong><p>{row.reason} · {row.status === 'pending' ? 'Pendiente' : row.status === 'approved' ? 'Aprobado' : 'Rechazado'}</p>{coordinate && row.status === 'pending' && <DecisionForm busy={busy} decide={(d, reason) => void decide(row, d, reason)} />}</div></div>) : <p className={styles.empty}>Sin solicitudes de traslado.</p>}<div className={styles.actions}><button className="btn secondary" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Anterior</button><button className="btn secondary" disabled={rows.length < 50} onClick={() => setOffset(v => v + 50)}>Siguiente</button></div></section>
}

function DecisionForm({ busy, decide }: { busy: boolean; decide: (d: 'approve' | 'reject', observation: string) => void }) {
  const [reason, setReason] = useState('')
  const [human, setHuman] = useState(false)
  return <div className={styles.form}><label>Observación de decisión<textarea required value={reason} onChange={e => setReason(e.target.value)} /></label><label><span><input type="checkbox" checked={human} onChange={e => setHuman(e.target.checked)} />Revisé personalmente este traslado</span></label><div className={styles.actions}><button className="btn primary" disabled={busy || !human || !reason.trim()} onClick={() => decide('approve', reason)}>Aprobar</button><button className="btn secondary" disabled={busy || !human || !reason.trim()} onClick={() => decide('reject', reason)}>Rechazar</button></div></div>
}

function Duplicates({ cycle }: { cycle: string }) {
  const [rows, setRows] = useState<Duplicate[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; void financeRequest<Duplicate[]>(cycle, 'duplicates').then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(fail(e)) }); return () => { active = false } }, [cycle])
  return <section className="panel"><h2>Posibles duplicados</h2><p className={styles.note}>Se bloquea proveedor + número de documento repetido. Proveedor + monto es una advertencia, nunca una eliminación automática.</p>{error && <p role="alert" className={styles.error}>{error}</p>}{rows === null ? <p role="status">Revisando…</p> : !rows.length ? <p className={styles.empty}>No se encontraron coincidencias para revisar.</p> : rows.map((row, i) => <div className="record-row" key={i}><div><strong>{row.supplier} · {money(row.amount)}</strong><p>{row.warning}</p>{row.purchase_ids.map(id => <small key={id}>Trámite {id}<br /></small>)}</div></div>)}</section>
}

function Reconcile({ cycle }: { cycle: string }) {
  const [rows, setRows] = useState<Reconciliation[]>([])
  const [selected, setSelected] = useState<Reconciliation | null>(null)
  const [events, setEvents] = useState<FinanceEvent[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [version, setVersion] = useState(0)
  const [offset, setOffset] = useState(0)
  useEffect(() => { let active = true; void financeRequest<Reconciliation[]>(cycle, `reconciliations?offset=${offset}`).then(data => { if (active) setRows(data) }).catch(e => { if (active) setError(fail(e)) }); return () => { active = false } }, [cycle, version, offset])
  useEffect(() => { let active = true; setEvents([]); if (!selected) return; void allFinanceEvents(cycle, selected.id).then(data => { if (active) setEvents(data) }).catch(e => { if (active) setError(fail(e)) }); return () => { active = false } }, [cycle, selected, version])
  async function upload(e: FormEvent) {
    e.preventDefault(); if (!file || !confirmed) return
    setBusy(true); setError('')
    try {
      if (file.size > 2_000_000) throw new Error('El reporte supera el límite de lectura de 2 MB.')
      const bytes = await file.arrayBuffer()
      let html = new TextDecoder().decode(bytes)
      if (html.includes('�')) html = new TextDecoder('windows-1252').decode(bytes)
      setSelected(await financeRequest<Reconciliation>(cycle, 'reconciliations', 'POST', { name: file.name, html, confirm_cycle: true })); setVersion(v => v + 1)
    } catch (reason) { setError(fail(reason)) } finally { setBusy(false) }
  }
  async function resolve(key: string, observation: string) { if (!selected) return; setBusy(true); try { await financeRequest(cycle, `reconciliations/${selected.id}/resolutions`, 'POST', { row_key: key, observation }); setVersion(v => v + 1) } catch (e) { setError(fail(e)) } finally { setBusy(false) } }
  return <section className="panel"><h2>Conciliación manual FUNDATEC</h2><p className={styles.note}>Cargue Situación Presupuestaria (.xls que contiene HTML). No modifica ni mueve trámites, no confirma pagos y no requiere credenciales FUNDATEC.</p><form className={styles.form} onSubmit={upload}><label>Archivo de Situación Presupuestaria<input type="file" accept=".xls,.html,.htm" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><label><span><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Confirmo que el archivo pertenece al ciclo actual</span></label><button className="btn primary" disabled={!file || !confirmed || busy}>{busy ? 'Procesando…' : 'Comparar y guardar resultado'}</button></form>{error && <p role="alert" className={styles.error}>{error}</p>}<h3>Conciliaciones guardadas</h3>{rows.map(row => <button key={row.id} className="record-row" onClick={() => setSelected(row)}>{row.name} · {new Date(row.created_at).toLocaleString('es-CR')}</button>)}<div className={styles.actions}><button className="btn secondary" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Anterior</button><button className="btn secondary" disabled={rows.length < 50} onClick={() => setOffset(v => v + 50)}>Siguiente</button></div>
    {selected && <><h3>{selected.project_reference}</h3><p>Fuente: {selected.name} · SHA-256 {selected.sha256}</p><div className={styles.scroll}><table className={styles.table}><thead><tr><th>Documento</th><th>Resultado</th><th>SEA</th><th>FUNDATEC</th><th>Resolución</th></tr></thead><tbody>{selected.results.map((row, i) => { const key = String(row.key); const resolution = events.find(e => e.action === 'finance.resolved' && e.snapshot.row_key === key); return <tr key={key || i}><td>{String(row.invoice_number)}</td><td>{RESULT[String(row.status)] ?? String(row.status)}</td><td>{row.sea_amount == null ? '—' : money(String(row.sea_amount))}</td><td>{row.fundatec_amount == null ? '—' : money(String(row.fundatec_amount))}</td><td>{resolution ? <span>{resolution.observation}<small>Actor {resolution.actor_id}</small></span> : <ResolutionForm busy={busy} save={text => void resolve(key, text)} />}</td></tr> })}</tbody></table></div><p className={styles.note}>Las resoluciones conservan comentarios, no corrigen automáticamente el presupuesto. Comisiones y traslados contables no se interpretan como facturas.</p></>}
  </section>
}

function ResolutionForm({ busy, save }: { busy: boolean; save: (text: string) => void }) {
  const [text, setText] = useState('')
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); save(text) }}><label>Observación de resolución<input required maxLength={4000} value={text} onChange={e => setText(e.target.value)} /></label><button className="btn secondary" disabled={busy || !text.trim()}>Registrar revisión</button></form>
}

function Portfolio() {
  type Row = Summary & { cycle_id: string; cycle_name: string; entrepreneurship_name: string }
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    void fetch('/api/sia/finanzas/overview', { cache: 'no-store' }).then(async response => {
      const value: unknown = await response.json()
      if (!response.ok || !Array.isArray(value) || !value.every(row => validSummary(row) && 'cycle_id' in row && typeof row.cycle_id === 'string' && 'cycle_name' in row && typeof row.cycle_name === 'string' && 'entrepreneurship_name' in row && typeof row.entrepreneurship_name === 'string')) throw new Error('No se pudo consultar la cartera autorizada.')
      if (active) setRows(value as Row[])
    }).catch(e => { if (active) setError(fail(e)) })
    return () => { active = false }
  }, [])
  async function download() { setBusy(true); try { await downloadFinancePdf('/api/sia/finanzas/report.pdf', 'finanzas-general.pdf') } catch (e) { setError(fail(e)) } finally { setBusy(false) } }
  const total = (row: Row, key: 'allocated' | 'executed' | 'pending') => row.items.reduce((sum, i) => sum + Number(i[key]), 0)
  return <section className="panel"><div className={styles.toolbar}><h2>Cartera autorizada</h2><button className="btn secondary" disabled={busy || !rows} onClick={() => void download()}><Download size={16} />Reporte general PDF</button></div><p className={styles.note}>Solo Prototipado y ciclos con acceso vigente. Una asignación a un ciclo no permite ver sus hermanos.</p>{error && <p role="alert" className={styles.error}>{error}</p>}{!rows ? <p role="status">Consultando cartera…</p> : <div className={styles.scroll}><table className={styles.table}><thead><tr><th>Emprendimiento / ciclo</th><th>Asignado</th><th>Ejecutado</th><th>En proceso</th><th>Trámites</th></tr></thead><tbody>{rows.map(row => <tr key={row.cycle_id}><td>{row.entrepreneurship_name}<small>{row.cycle_name}</small></td><td className={styles.numeric}>{money(total(row, 'allocated'))}</td><td className={styles.numeric}>{money(total(row, 'executed'))}</td><td className={styles.numeric}>{money(total(row, 'pending'))}</td><td>{row.purchase_count}</td></tr>)}</tbody></table></div>}</section>
}
