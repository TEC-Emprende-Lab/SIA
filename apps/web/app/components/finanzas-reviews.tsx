'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowRightLeft, Check, Download, Plus, Upload } from 'lucide-react'
import { allFinanceEvents, downloadFinancePdf, financeRequest, money, sumFinanceAmounts, RESULT, validSummary, type Change, type Duplicate, type FinanceEvent, type Purchase, type Reconciliation, type Summary } from '../lib/finanzas'
import { FinanceEmpty, FinanceError, FinanceField, FinanceLoading, FinanceNotice, FinancePages, FinanceStatus, financeFailure, useFinanceData } from './finanzas-ui'
import styles from './finanzas.module.css'

export function Changes({ cycle, summary, manage, coordinate, refresh, version }: { cycle: string; summary: Summary; manage: boolean; coordinate: boolean; refresh: () => void; version: number }) {
  const [offset, setOffset] = useState(0)
  const list = useFinanceData<Change[]>(cycle, `changes?offset=${offset}`, version)
  const [creating, setCreating] = useState(false)
  const [source, setSource] = useState(summary.items[0]?.id ?? '')
  const [target, setTarget] = useState(summary.items[1]?.id ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true); setError(''); setSuccess('')
    try { await financeRequest(cycle, 'changes', 'POST', body); setCreating(false); setSuccess('Solicitud registrada. La Coordinadora debe revisarla antes de mover los fondos.'); refresh() }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  async function decide(row: Change, decision: 'approve' | 'reject', observation: string, human: boolean) {
    setBusy(true); setError(''); setSuccess('')
    try { await financeRequest(cycle, `changes/${row.id}/decision`, 'POST', { expected_revision: row.revision, decision, observation, human_reviewed: human }); setSuccess(decision === 'approve' ? 'Traslado aprobado. Los montos de ambas partidas se actualizaron.' : 'Solicitud rechazada. No se movieron fondos.'); refresh() }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  const name = (id: string) => summary.items.find(item => item.id === id)?.name ?? 'Partida registrada'
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Cambios presupuestarios</h2><p>Solicita un traslado entre partidas del ciclo. Solo se aplica después de la aprobación de la Coordinadora.</p></div>{manage && !creating && <button className="btn secondary" disabled={summary.items.length < 2} onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" />Solicitar traslado</button>}</div>
    {manage && summary.items.length < 2 && <FinanceNotice>Se necesitan al menos dos partidas para solicitar un traslado. La Coordinadora puede registrarlas desde Presupuesto.</FinanceNotice>}
    {creating && <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <div className={styles.columns}><FinanceField label="Partida de origen *">{id => <select id={id} name="source_id" value={source} disabled={busy} onChange={event => { const next = event.target.value; setSource(next); if (target === next) setTarget(summary.items.find(item => item.id !== next)?.id ?? '') }}>{summary.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</FinanceField><FinanceField label="Partida de destino *">{id => <select id={id} name="target_id" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>{summary.items.filter(item => item.id !== source).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</FinanceField></div>
      <FinanceField label="Monto a trasladar en colones *">{id => <input id={id} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required disabled={busy} />}</FinanceField><FinanceField label="Justificación *">{id => <textarea id={id} name="reason" required maxLength={4000} disabled={busy} />}</FinanceField>
      <div className={styles.actions}><button className="btn secondary" type="button" disabled={busy} onClick={() => setCreating(false)}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? 'Registrando…' : 'Enviar solicitud'}<ArrowRightLeft size={15} aria-hidden="true" /></button></div>
    </form>}
    {error && <FinanceError message={error} />}{success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    {list.error ? <FinanceError message={list.error} retry={list.retry} /> : list.loading ? <FinanceLoading label="Consultando solicitudes de traslado…" /> : !list.data?.length ? <FinanceEmpty title="Sin solicitudes de traslado">Los cambios entre partidas aparecerán aquí con su justificación y estado de revisión.</FinanceEmpty> : list.data.map(row => <article className={styles.reviewRow} key={row.id}><div className={styles.toolbar}><strong>{name(row.source_id)} → {name(row.target_id)}</strong><FinanceStatus status={row.status} label={row.status === 'pending' ? 'Pendiente de revisión' : row.status === 'approved' ? 'Aprobado' : 'Rechazado'} /></div><p>{money(row.amount)} · {row.reason}</p>{coordinate && row.status === 'pending' && <details><summary>Revisar solicitud</summary><DecisionForm busy={busy} decide={(decision, reason, human) => void decide(row, decision, reason, human)} /></details>}</article>)}
    <FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading} change={setOffset} />
  </section>
}

function DecisionForm({ busy, decide }: { busy: boolean; decide: (decision: 'approve' | 'reject', observation: string, human: boolean) => void }) {
  const [reason, setReason] = useState('')
  const [human, setHuman] = useState(false)
  return <div className={styles.form}><FinanceField label="Observación de la decisión *">{id => <textarea id={id} required maxLength={4000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />}</FinanceField><label className={styles.checkbox}><input type="checkbox" disabled={busy} checked={human} onChange={event => setHuman(event.target.checked)} />Confirmo que revisé personalmente este traslado.</label><div className={styles.actions}><button className="btn primary" disabled={busy || !human || !reason.trim()} onClick={() => decide('approve', reason, human)}>Aprobar traslado</button><button className={`btn secondary ${styles.danger}`} disabled={busy || !human || !reason.trim()} onClick={() => decide('reject', reason, human)}>Rechazar solicitud</button></div></div>
}

export function Duplicates({ cycle, open }: { cycle: string; open: (p: Purchase) => void }) {
  const list = useFinanceData<Duplicate[]>(cycle, 'duplicates')
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('')
  async function inspect(id: string) {
    setOpening(id); setError('')
    try { open(await financeRequest<Purchase>(cycle, `purchases/${id}`)) } catch (reason) { setError(financeFailure(reason)) } finally { setOpening('') }
  }
  return <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Posibles duplicados</h2><p>Comprueba si dos trámites del mismo proveedor y monto corresponden a una misma compra.</p></div></div><FinanceNotice>Una coincidencia no implica un error. El sistema bloquea proveedor y número de documento repetidos, pero no elimina registros automáticamente.</FinanceNotice>{error && <FinanceError message={error} />}{list.error ? <FinanceError message={list.error} retry={list.retry} /> : list.loading ? <FinanceLoading label="Buscando coincidencias en este ciclo…" /> : !list.data?.length ? <FinanceEmpty title="No hay coincidencias para revisar">Los trámites del mismo proveedor y monto aparecerán aquí. No se consultan proyectos ajenos a este ciclo.</FinanceEmpty> : list.data.map((row, index) => <article key={`${row.supplier}/${index}`} className={styles.reviewRow}><strong>{row.supplier} · {money(row.amount)}</strong><p>{row.warning}</p><div className={styles.actions}>{row.purchase_ids.map(id => <button key={id} className="btn secondary" disabled={!!opening} onClick={() => void inspect(id)} aria-label={`Abrir trámite ${id}`}>{opening === id ? 'Abriendo…' : `Trámite ${id.slice(0, 8)}`}<ArrowRight size={14} aria-hidden="true" /></button>)}</div></article>)}</section>
}

export function Reconcile({ cycle }: { cycle: string }) {
  const [offset, setOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const list = useFinanceData<Reconciliation[]>(cycle, `reconciliations?offset=${offset}`, version)
  const [selected, setSelected] = useState<Reconciliation | null>(null)
  const [events, setEvents] = useState<FinanceEvent[]>([])
  const [historyReady, setHistoryReady] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all' | 'match'>('pending')
  useEffect(() => {
    let active = true
    setHistoryReady(false); setHistoryError(''); setEvents([])
    if (!selected) return
    void allFinanceEvents(cycle, selected.id).then(data => { if (active) { setEvents(data); setHistoryReady(true) } }).catch(reason => { if (active) setHistoryError(financeFailure(reason)) })
    return () => { active = false }
  }, [cycle, selected, version])
  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file || !confirmed) return
    setBusy(true); setError(''); setSuccess('')
    try {
      if (file.size > 2_000_000) throw new Error('El reporte supera los 2 MB de lectura. Revisa que sea la exportación de Situación Presupuestaria.')
      const bytes = await file.arrayBuffer()
      let html = new TextDecoder().decode(bytes)
      if (html.includes('�')) html = new TextDecoder('windows-1252').decode(bytes)
      setSelected(await financeRequest<Reconciliation>(cycle, 'reconciliations', 'POST', { name: file.name, html, confirm_cycle: true }))
      setVersion(v => v + 1); setFilter('pending'); setSuccess('Comparación guardada. Revisa las diferencias; ningún trámite fue modificado.')
    } catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  async function resolve(key: string, observation: string) {
    if (!selected) return
    setBusy(true); setError(''); setSuccess('')
    try { await financeRequest(cycle, `reconciliations/${selected.id}/resolutions`, 'POST', { row_key: key, observation }); setVersion(v => v + 1); setSuccess('Revisión registrada. El comentario permanece en el historial; los montos no cambiaron.') }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  const resolution = (key: string) => events.find(event => event.action === 'finance.resolved' && event.snapshot.row_key === key)
  const pending = selected?.results.filter(row => row.status !== 'match' && !resolution(String(row.key))) ?? []
  const visible = selected?.results.filter(row => filter === 'all' || filter === 'match' && row.status === 'match' || filter === 'pending' && row.status !== 'match' && !resolution(String(row.key))) ?? []
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Conciliación con FUNDATEC</h2><p>Compara una exportación del sistema externo con los trámites del ciclo. Los resultados se guardan para revisión.</p></div></div>
    <div className={styles.split}><form className={styles.form} onSubmit={upload} aria-busy={busy}><div className={styles.upload}><Upload size={22} aria-hidden="true" /><FinanceField label="Archivo de Situación Presupuestaria" hint="rpSituacion · .xls con contenido HTML, .html o .htm · Hasta 2 MB.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="file" accept=".xls,.html,.htm" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirmed(false); setError('') }} />}</FinanceField></div><label className={styles.checkbox}><input type="checkbox" disabled={busy || !file} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo que este archivo pertenece al ciclo que estoy consultando.</label><button className="btn primary" disabled={!file || !confirmed || busy}>{busy ? 'Comparando…' : 'Comparar y guardar resultado'}</button><p className={styles.hint}>La conciliación no mueve trámites, no confirma pagos y no requiere credenciales FUNDATEC.</p></form>
      <section><h3>Comparaciones guardadas</h3>{list.error ? <FinanceError message={list.error} retry={list.retry} /> : list.loading ? <FinanceLoading label="Consultando archivos anteriores…" /> : !list.data?.length ? <p className={styles.hint}>Cuando compares un archivo, podrás volver a su resultado desde aquí.</p> : list.data.map(row => <button key={row.id} className={styles.fileChoice} aria-pressed={selected?.id === row.id} disabled={busy} onClick={() => { setSelected(row); setFilter('pending'); setSuccess('') }}>{row.name}<small>{new Date(row.created_at).toLocaleString('es-CR')}</small></button>)}<FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading} change={setOffset} /></section>
    </div>
    {error && <FinanceError message={error} />}{success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    {selected && <section className={styles.detailSection}><h3>{selected.project_reference}</h3><details className={styles.disclosure}><summary>Ver procedencia del archivo</summary><p>Archivo: {selected.name}<br />SHA-256: {selected.sha256}</p></details>
      {historyError ? <FinanceError message={historyError} retry={() => setVersion(v => v + 1)} /> : !historyReady ? <FinanceLoading label="Recuperando las revisiones guardadas…" /> : <><div className={styles.resultFilters} aria-label="Filtrar resultados de conciliación"><button aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Por revisar ({pending.length})</button><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos ({selected.results.length})</button><button aria-pressed={filter === 'match'} onClick={() => setFilter('match')}>Coinciden ({selected.results.filter(row => row.status === 'match').length})</button></div>{!visible.length ? <FinanceEmpty title={filter === 'pending' ? 'Sin diferencias pendientes de revisión' : 'No hay resultados en este filtro'}>Puedes consultar todos los movimientos. Una coincidencia no sustituye la revisión financiera ni acredita un pago.</FinanceEmpty> : <div className={styles.scroll} tabIndex={0} role="region" aria-label="Resultados de conciliación"><table className={styles.table}><thead><tr><th scope="col">Documento</th><th scope="col">Resultado</th><th scope="col" className={styles.numeric}>SEA</th><th scope="col" className={styles.numeric}>FUNDATEC</th><th scope="col">Revisión</th></tr></thead><tbody>{visible.map(row => { const key = String(row.key); const reviewed = resolution(key); return <tr key={key}><td>{String(row.invoice_number)}</td><td><FinanceStatus status={row.status === 'match' ? 'executed' : 'pending'} label={RESULT[String(row.status)]} /></td><td className={styles.numeric}>{row.sea_amount == null ? '—' : money(String(row.sea_amount))}</td><td className={styles.numeric}>{row.fundatec_amount == null ? '—' : money(String(row.fundatec_amount))}</td><td>{reviewed ? <><span>{reviewed.observation}</span><small>Revisado el {new Date(reviewed.created_at).toLocaleDateString('es-CR')}</small></> : <ResolutionForm busy={busy} save={text => void resolve(key, text)} />}</td></tr> })}</tbody></table></div>}</>}
      <p className={styles.hint}>Comisiones y traslados contables no se interpretan como facturas. Las revisiones conservan comentarios, sin corregir montos ni estados automáticamente.</p>
    </section>}
  </section>
}

function ResolutionForm({ busy, save }: { busy: boolean; save: (text: string) => void }) {
  const [text, setText] = useState('')
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); save(text) }}><FinanceField label="Observación de revisión">{id => <input id={id} required maxLength={4000} disabled={busy} value={text} onChange={event => setText(event.target.value)} />}</FinanceField><button className="btn secondary" disabled={busy || !text.trim()}>Registrar revisión<Check size={14} aria-hidden="true" /></button></form>
}

export function Portfolio() {
  type Row = Summary & { cycle_id: string; cycle_name: string; entrepreneurship_name: string }
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch('/api/sia/finanzas/overview', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const value: unknown = await response.json()
      if (!response.ok || !Array.isArray(value) || !value.every(row => validSummary(row) && 'cycle_id' in row && typeof row.cycle_id === 'string' && 'cycle_name' in row && typeof row.cycle_name === 'string' && 'entrepreneurship_name' in row && typeof row.entrepreneurship_name === 'string')) throw new Error('No se pudo consultar la cartera autorizada. Intenta de nuevo.')
      if (!controller.signal.aborted) setRows(value as Row[])
    }).catch(reason => { if (!controller.signal.aborted) setError(financeFailure(reason)) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  async function download() { setBusy(true); setError(''); try { await downloadFinancePdf('/api/sia/finanzas/report.pdf', 'finanzas-general.pdf') } catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) } }
  const total = (row: Row, key: 'allocated' | 'executed' | 'pending') => sumFinanceAmounts(row.items.map(item => item[key]))
  return <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Cartera autorizada</h2><p>Resumen de los ciclos de Prototipado a los que tienes acceso vigente.</p></div><button className="btn secondary" disabled={busy || loading || !rows?.length} onClick={() => void download()}><Download size={15} aria-hidden="true" />{busy ? 'Generando…' : 'Reporte general PDF'}</button></div>{error ? <FinanceError message={error} retry={() => setAttempt(v => v + 1)} /> : loading ? <FinanceLoading label="Consultando la cartera autorizada…" /> : !rows?.length ? <FinanceEmpty title="Sin ciclos financieros disponibles">Aquí aparecerán los ciclos de Prototipado a los que tengas acceso. Una asignación no habilita sus ciclos hermanos.</FinanceEmpty> : <div className={styles.scroll} role="region" aria-label="Cartera financiera" tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">Emprendimiento / ciclo</th><th scope="col" className={styles.numeric}>Asignado</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th><th scope="col">Trámites</th></tr></thead><tbody>{rows.map(row => <tr key={row.cycle_id}><td><a href={`/?project=${encodeURIComponent(row.cycle_id)}#${encodeURIComponent('Finanzas y compras')}`}>{row.entrepreneurship_name}</a><small>{row.cycle_name}</small></td><td className={styles.numeric}>{money(total(row, 'allocated'))}</td><td className={styles.numeric}>{money(total(row, 'executed'))}</td><td className={styles.numeric}>{money(total(row, 'pending'))}</td><td>{row.purchase_count}</td></tr>)}</tbody></table></div>}<p className={styles.hint}>Los importes en proceso no son pagos ejecutados ni reservas presupuestarias.</p></section>
}
