'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowRightLeft, Check, Download, Plus, Upload } from 'lucide-react'
import { allFinanceEvents, downloadFinancePdf, financeRequest, money, sumFinanceAmounts, RESULT, validSummary, type Change, type Duplicate, type FinanceEvent, type Purchase, type Reconciliation, type Summary } from '../lib/finanzas'
import { FinanceEmpty, FinanceError, FinanceField, FinanceLoading, FinanceNotice, FinancePages, FinanceReadFeedback, FinanceStatus, financeFailure, financeReadState, useFinanceData } from './finanzas-ui'
import { ConfirmAction } from './ui/confirm-action'
import styles from './finanzas.module.css'

export function Changes({ cycle, summary, manage, coordinate, refresh, version }: { cycle: string; summary: Summary | null; manage: boolean; coordinate: boolean; refresh: () => void; version: number }) {
  const [offset, setOffset] = useState(0)
  const list = useFinanceData<Change[]>(cycle, `changes?offset=${offset}`, version)
  const [creating, setCreating] = useState(false)
  const [items, setItems] = useState<Summary['items']>([])
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [decision, setDecision] = useState<{ row: Change; kind: 'approve' | 'reject'; observation: string; human: boolean } | null>(null)
  function startRequest() {
    if (!summary) return
    const [first, second] = summary.items
    if (!first || !second) return
    setItems(summary.items); setSource(first.id); setTarget(second.id)
    setCreating(true); setError(''); setSuccess('')
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !summary) return
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true); setError(''); setSuccess('')
    try { await financeRequest(cycle, 'changes', 'POST', body); setCreating(false); setSuccess('Solicitud registrada. La Coordinadora debe revisarla antes de mover los fondos.'); refresh() }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  async function decide() {
    if (busy || !decision) return
    const { row, kind, observation, human } = decision
    setBusy(true); setError(''); setSuccess('')
    try {
      await financeRequest(cycle, `changes/${row.id}/decision`, 'POST', { expected_revision: row.revision, decision: kind, observation, human_reviewed: human })
      setDecision(null)
      if (kind === 'approve') setSuccess('Traslado aprobado. Los montos de ambas partidas se actualizaron.')
      else setSuccess('Solicitud rechazada. No se movieron fondos.')
      refresh()
    }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  const name = (id: string) => summary?.items.find(item => item.id === id)?.name ?? 'Partida registrada'
  const canRequest = Boolean(summary && summary.items.length >= 2)
  let decisionLabel = 'Aprobar traslado'
  let decisionDescription = 'Se moverá el monto indicado entre las dos partidas; la aprobación quedará en el historial.'
  let decisionTone: 'normal' | 'danger' = 'normal'
  if (decision?.kind === 'reject') {
    decisionLabel = 'Rechazar solicitud'
    decisionDescription = 'La solicitud quedará rechazada en el historial. No se moverán fondos.'
    decisionTone = 'danger'
  }
  let submitLabel = 'Enviar solicitud'
  if (busy && !decision) submitLabel = 'Registrando…'
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Cambios presupuestarios</h2><p>Los traslados entre partidas se aplican solo después de la aprobación de la Coordinadora.</p></div>{manage && !creating && canRequest && <button className="btn secondary" onClick={startRequest}><Plus size={15} aria-hidden="true" />Solicitar traslado</button>}</div>
    {manage && summary && !canRequest && <FinanceNotice>Se necesitan al menos dos partidas para solicitar un traslado. La Coordinadora puede registrarlas desde Presupuesto.</FinanceNotice>}
    {creating && <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <div className={styles.columns}><FinanceField label="Partida de origen *">{id => <select id={id} name="source_id" value={source} disabled={busy} onChange={event => { const next = event.target.value; setSource(next); if (target === next) setTarget(items.find(item => item.id !== next)?.id ?? '') }}>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</FinanceField><FinanceField label="Partida de destino *">{id => <select id={id} name="target_id" value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>{items.filter(item => item.id !== source).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</FinanceField></div>
      <FinanceField label="Monto a trasladar en colones *">{id => <input id={id} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required disabled={busy} />}</FinanceField><FinanceField label="Justificación *">{id => <textarea id={id} name="reason" required maxLength={4000} disabled={busy} />}</FinanceField>
      <div className={styles.actions}><button className="btn secondary" type="button" disabled={busy} onClick={() => { setCreating(false); setError('') }}>Cancelar</button><button className="btn primary" disabled={busy || !summary}>{submitLabel}<ArrowRightLeft size={15} aria-hidden="true" /></button></div>
    </form>}
    {error && !decision && <FinanceError title="No se pudo registrar el traslado" message={error} />}{success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    <FinanceReadFeedback read={list} label="Consultando solicitudes de traslado…" title="No se pudieron consultar las solicitudes de traslado" />
    {list.data?.length === 0 && offset === 0 && <FinanceEmpty title="Sin solicitudes de traslado">Los cambios entre partidas aparecerán aquí con su justificación y estado de revisión.</FinanceEmpty>}
    {list.data?.length === 0 && offset > 0 && <FinanceEmpty title="No hay solicitudes en esta página">Vuelve a la página anterior para consultar las solicitudes registradas.</FinanceEmpty>}
    {list.data?.map(row => <article className={styles.reviewRow} key={row.id}><div className={styles.toolbar}><strong>{name(row.source_id)} → {name(row.target_id)}</strong><FinanceStatus status={row.status} label={CHANGE_STATUS[row.status]} /></div><p>{money(row.amount)}, {row.reason}</p>{coordinate && row.status === 'pending' && <details><summary>Revisar solicitud</summary><DecisionForm key={row.revision} busy={busy || list.loading} canDecide={Boolean(summary)} decide={(kind, observation, human) => { setError(''); setDecision({ row, kind, observation, human }) }} /></details>}</article>)}
    {(!list.loading || list.data) && <FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading} change={setOffset} />}
    {decision && <ConfirmAction title={decisionLabel} subject={`${money(decision.row.amount)}: ${name(decision.row.source_id)} → ${name(decision.row.target_id)}`} description={decisionDescription} confirmLabel={decisionLabel} tone={decisionTone} pending={busy} error={error} onCancel={() => { setDecision(null); setError('') }} onConfirm={() => void decide()} />}
  </section>
}

const CHANGE_STATUS: Record<Change['status'], string> = { pending: 'Pendiente de revisión', approved: 'Aprobado', rejected: 'Rechazado' }

function DecisionForm({ busy, canDecide, decide }: { busy: boolean; canDecide: boolean; decide: (decision: 'approve' | 'reject', observation: string, human: boolean) => void }) {
  const [reason, setReason] = useState('')
  const [human, setHuman] = useState(false)
  return <div className={styles.form}><FinanceField label="Observación de la decisión *">{id => <textarea id={id} required maxLength={4000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />}</FinanceField><label className={styles.checkbox}><input type="checkbox" disabled={busy} checked={human} onChange={event => setHuman(event.target.checked)} />Confirmo que revisé personalmente este traslado.</label><div className={styles.actions}><button className="btn primary" disabled={busy || !canDecide || !human || !reason.trim()} onClick={() => decide('approve', reason, human)}>Aprobar traslado</button><button className={`btn secondary ${styles.danger}`} disabled={busy || !canDecide || !human || !reason.trim()} onClick={() => decide('reject', reason, human)}>Rechazar solicitud</button></div></div>
}

export function Duplicates({ cycle, open, version, canOpen }: { cycle: string; open: (p: Purchase) => void; version: number; canOpen: boolean }) {
  const list = useFinanceData<Duplicate[]>(cycle, 'duplicates', version)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState('')
  async function inspect(id: string) {
    setOpening(id); setError('')
    try { open(await financeRequest<Purchase>(cycle, `purchases/${id}`)) } catch (reason) { setError(financeFailure(reason)) } finally { setOpening('') }
  }
  function inspectLabel(id: string) {
    if (opening === id) return 'Abriendo…'
    return `Trámite ${id.slice(0, 8)}`
  }
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Posibles duplicados</h2><p>Comprueba si dos trámites del mismo proveedor y monto corresponden a una misma compra.</p></div></div>
    <FinanceNotice>Una coincidencia no implica un error. El sistema bloquea proveedor y número de documento repetidos, pero no elimina registros automáticamente.</FinanceNotice>
    {error && <FinanceError title="No se pudo abrir el trámite" message={error} />}
    <FinanceReadFeedback read={list} label="Buscando coincidencias en este ciclo…" title="No se pudieron consultar las coincidencias" />
    {list.data?.length === 0 && <FinanceEmpty title="No hay coincidencias para revisar">Los trámites del mismo proveedor y monto aparecerán aquí. No se consultan proyectos ajenos a este ciclo.</FinanceEmpty>}
    {list.data?.map((row, index) => <article key={`${row.supplier}/${index}`} className={styles.reviewRow}><strong>{row.supplier}, {money(row.amount)}</strong><p>{row.warning}</p><div className={styles.actions}>{row.purchase_ids.map(id => <button key={id} className="btn secondary" disabled={Boolean(opening) || list.loading || !canOpen} onClick={() => void inspect(id)} aria-label={`Abrir trámite ${id}`}>{inspectLabel(id)}<ArrowRight size={14} aria-hidden="true" /></button>)}</div></article>)}
  </section>
}

export function Reconcile({ cycle, version }: { cycle: string; version: number }) {
  const [offset, setOffset] = useState(0)
  const [listVersion, setListVersion] = useState(0)
  const [historyVersion, setHistoryVersion] = useState(0)
  const list = useFinanceData<Reconciliation[]>(cycle, `reconciliations?offset=${offset}`, version + listVersion)
  const [selected, setSelected] = useState<Reconciliation | null>(null)
  const [history, setHistory] = useState<{ query: string; events: FinanceEvent[]; error: string } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [operation, setOperation] = useState<'upload' | 'resolve' | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all' | 'match'>('pending')
  const selectedId = selected?.id
  const historyQuery = JSON.stringify([cycle, selectedId, historyVersion, version])
  const historyReady = history?.query === historyQuery
  const busy = Boolean(operation)
  useEffect(() => {
    if (!selectedId) return
    let active = true
    void allFinanceEvents(cycle, selectedId)
      .then(events => { if (active) setHistory({ query: historyQuery, events, error: '' }) })
      .catch(reason => { if (active) setHistory({ query: historyQuery, events: [], error: financeFailure(reason) }) })
    return () => { active = false }
  }, [cycle, selectedId, historyQuery])
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || !confirmed || busy) return
    const form = event.currentTarget
    setOperation('upload'); setError(''); setSuccess('')
    try {
      if (file.size > 2_000_000) throw new Error('El reporte supera los 2 MB de lectura. Revisa que sea la exportación de Situación Presupuestaria.')
      const bytes = await file.arrayBuffer()
      let html = new TextDecoder().decode(bytes)
      if (html.includes('�')) html = new TextDecoder('windows-1252').decode(bytes)
      setSelected(await financeRequest<Reconciliation>(cycle, 'reconciliations', 'POST', { name: file.name, html, confirm_cycle: true }))
      form.reset(); setFile(null); setConfirmed(false); setOffset(0); setListVersion(v => v + 1)
      setHistoryVersion(v => v + 1); setFilter('pending'); setSuccess('Comparación guardada. Revisa las diferencias; ningún trámite fue modificado.')
    } catch (reason) { setError(financeFailure(reason)) } finally { setOperation(null) }
  }
  async function resolve(key: string, observation: string) {
    if (!selected || busy || !historyReady || history.error) return
    setOperation('resolve'); setError(''); setSuccess('')
    try { await financeRequest(cycle, `reconciliations/${selected.id}/resolutions`, 'POST', { row_key: key, observation }); setHistoryVersion(v => v + 1); setSuccess('Revisión registrada. El comentario permanece en el historial; los montos no cambiaron.') }
    catch (reason) { setError(financeFailure(reason)) } finally { setOperation(null) }
  }
  const resolution = (key: string) => history?.events.find(event => event.action === 'finance.resolved' && event.snapshot.row_key === key)
  const pending = selected?.results.filter(row => row.status !== 'match' && !resolution(String(row.key))) ?? []
  const visible = selected?.results.filter(row => filter === 'all' || filter === 'match' && row.status === 'match' || filter === 'pending' && row.status !== 'match' && !resolution(String(row.key))) ?? []
  let uploadLabel = 'Comparar y guardar resultado'
  if (operation === 'upload') uploadLabel = 'Comparando…'
  let emptyTitle = 'No hay resultados en este filtro'
  if (filter === 'pending') emptyTitle = 'Sin diferencias pendientes de revisión'
  let result: React.ReactNode
  if (!historyReady) result = <FinanceLoading label="Recuperando las revisiones guardadas…" />
  else if (history.error) result = <FinanceError title="No se pudo consultar el historial de esta comparación" message={history.error} retry={() => setHistoryVersion(v => v + 1)} />
  else if (selected) result = <>
    <div className={styles.resultFilters} aria-label="Filtrar resultados de conciliación"><button aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Por revisar ({pending.length})</button><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos ({selected.results.length})</button><button aria-pressed={filter === 'match'} onClick={() => setFilter('match')}>Coinciden ({selected.results.filter(row => row.status === 'match').length})</button></div>
    {!visible.length && <FinanceEmpty title={emptyTitle} action={filter !== 'all' && <button className="btn secondary" onClick={() => setFilter('all')}>Ver todos los movimientos</button>}>Una coincidencia no sustituye la revisión financiera ni acredita un pago.</FinanceEmpty>}
    {Boolean(visible.length) && <div className={styles.scroll} tabIndex={0} role="region" aria-label="Resultados de conciliación"><table className={styles.table}><thead><tr><th scope="col">Documento</th><th scope="col">Resultado</th><th scope="col" className={styles.numeric}>SEA</th><th scope="col" className={styles.numeric}>FUNDATEC</th><th scope="col">Revisión</th></tr></thead><tbody>{visible.map(row => {
      const key = String(row.key)
      const reviewed = resolution(key)
      let status = 'pending'
      if (row.status === 'match') status = 'executed'
      let review = <ResolutionForm busy={busy} save={text => void resolve(key, text)} />
      if (reviewed) review = <><span>{reviewed.observation}</span><small>Revisado el {new Date(reviewed.created_at).toLocaleDateString('es-CR')}</small></>
      return <tr key={key}><td>{String(row.invoice_number)}</td><td><FinanceStatus status={status} label={RESULT[String(row.status)]} /></td><td className={styles.numeric}>{reconciliationAmount(row.sea_amount)}</td><td className={styles.numeric}>{reconciliationAmount(row.fundatec_amount)}</td><td>{review}</td></tr>
    })}</tbody></table></div>}
  </>
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Conciliación con FUNDATEC</h2><p>Compara una exportación del sistema externo con los trámites del ciclo. Los resultados se guardan para revisión.</p></div></div>
    <div className={styles.split}><form className={styles.form} onSubmit={upload} aria-busy={operation === 'upload'}><div className={styles.upload}><Upload size={22} aria-hidden="true" /><FinanceField label="Archivo de Situación Presupuestaria" hint="Archivo rpSituacion en .xls con contenido HTML, .html o .htm de hasta 2 MB.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="file" accept=".xls,.html,.htm" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirmed(false); setError('') }} />}</FinanceField></div><label className={styles.checkbox}><input type="checkbox" disabled={busy || !file} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo que este archivo pertenece al ciclo que estoy consultando.</label><button className="btn primary" disabled={!file || !confirmed || busy}>{uploadLabel}</button><p className={styles.hint}>La conciliación no mueve trámites, no confirma pagos y no requiere credenciales FUNDATEC.</p></form>
      <section><h3>Comparaciones guardadas</h3>
        <FinanceReadFeedback read={list} label="Consultando archivos anteriores…" title="No se pudieron consultar las comparaciones guardadas" />
        {list.data?.length === 0 && offset === 0 && <p className={styles.hint}>Cuando compares un archivo, podrás volver a su resultado desde aquí.</p>}
        {list.data?.length === 0 && offset > 0 && <p className={styles.hint}>No hay comparaciones en esta página. Vuelve a la anterior.</p>}
        {list.data?.map(row => <button key={row.id} className={styles.fileChoice} aria-pressed={selected?.id === row.id} disabled={busy || list.loading} onClick={() => { setSelected(row); setFilter('pending'); setError(''); setSuccess('') }}>{row.name}<small>{new Date(row.created_at).toLocaleString('es-CR')}</small></button>)}
        {(!list.loading || list.data) && <FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading || busy} change={setOffset} />}
      </section>
    </div>
    {error && <FinanceError message={error} />}{success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    {selected && <section className={styles.detailSection}><h3>{selected.project_reference}</h3><details className={styles.disclosure}><summary>Ver procedencia del archivo</summary><p>Archivo: {selected.name}<br />SHA-256: {selected.sha256}</p></details>
      {operation === 'resolve' && <p className={styles.refreshing} role="status">Guardando la revisión…</p>}
      {result}
      <p className={styles.hint}>Comisiones y traslados contables no se interpretan como facturas. Las revisiones conservan comentarios, sin corregir montos ni estados automáticamente.</p>
    </section>}
  </section>
}

function reconciliationAmount(value: unknown) {
  if (value == null) return '—'
  return money(String(value))
}

function ResolutionForm({ busy, save }: { busy: boolean; save: (text: string) => void }) {
  const [text, setText] = useState('')
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); save(text) }}><FinanceField label="Observación de revisión">{id => <input id={id} required maxLength={4000} disabled={busy} value={text} onChange={event => setText(event.target.value)} />}</FinanceField><button className="btn secondary" disabled={busy || !text.trim()}>Registrar revisión<Check size={14} aria-hidden="true" /></button></form>
}

export function Portfolio({ version }: { version: number }) {
  type Row = Summary & { cycle_id: string; cycle_name: string; entrepreneurship_name: string }
  const scope = 'portfolio'
  const [result, setResult] = useState<{ scope: string; request: string; data: Row[] | null; error: string } | null>(null)
  const [exportError, setExportError] = useState('')
  const [success, setSuccess] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const request = JSON.stringify([version, attempt])
  const read = financeReadState(result, scope, request, () => setAttempt(v => v + 1))
  const rows = read.data
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/sia/finanzas/overview', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const value: unknown = await response.json()
      if (!response.ok || !Array.isArray(value) || !value.every(row => validSummary(row) && 'cycle_id' in row && typeof row.cycle_id === 'string' && 'cycle_name' in row && typeof row.cycle_name === 'string' && 'entrepreneurship_name' in row && typeof row.entrepreneurship_name === 'string')) throw new Error('No se pudo consultar la cartera autorizada. Intenta de nuevo.')
      if (!controller.signal.aborted) setResult({ scope, request, data: value as Row[], error: '' })
    }).catch(reason => { if (!controller.signal.aborted) setResult({ scope, request, data: null, error: financeFailure(reason) }) })
    return () => controller.abort()
  }, [request])
  async function download() {
    setBusy(true); setExportError(''); setSuccess('')
    try {
      await downloadFinancePdf('/api/sia/finanzas/report.pdf', 'finanzas-general.pdf')
      setSuccess('Reporte general generado. Revisa las descargas del navegador.')
    } catch (reason) { setExportError(financeFailure(reason)) } finally { setBusy(false) }
  }
  const total = (row: Row, key: 'allocated' | 'executed' | 'pending') => sumFinanceAmounts(row.items.map(item => item[key]))
  let exportLabel = 'Reporte general PDF'
  if (busy) exportLabel = 'Generando PDF…'
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Cartera autorizada</h2><p>Resumen de los ciclos de Prototipado a los que tienes acceso vigente.</p></div><button className="btn secondary" disabled={busy || read.loading || !rows?.length} onClick={() => void download()}><Download size={15} aria-hidden="true" />{exportLabel}</button></div>
    {exportError && <FinanceError title="No se pudo exportar la cartera" message={exportError} />}
    {success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    <FinanceReadFeedback read={read} label="Consultando la cartera autorizada…" title="No se pudo consultar la cartera autorizada" layout="table" />
    {rows?.length === 0 && <FinanceEmpty title="Sin ciclos financieros disponibles">Aquí aparecerán los ciclos de Prototipado a los que tengas acceso. Una asignación no habilita otros ciclos del mismo emprendimiento.</FinanceEmpty>}
    {rows && rows.length > 0 && <div className={styles.scroll} role="region" aria-label="Cartera financiera" tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">Emprendimiento / ciclo</th><th scope="col" className={styles.numeric}>Asignado</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th><th scope="col">Trámites</th></tr></thead><tbody>{rows.map(row => <tr key={row.cycle_id}><td><a href={`/?project=${encodeURIComponent(row.cycle_id)}#${encodeURIComponent('Finanzas y compras')}`}>{row.entrepreneurship_name}</a><small>{row.cycle_name}</small></td><td className={styles.numeric}>{money(total(row, 'allocated'))}</td><td className={styles.numeric}>{money(total(row, 'executed'))}</td><td className={styles.numeric}>{money(total(row, 'pending'))}</td><td>{row.purchase_count}</td></tr>)}</tbody></table></div>}
    <p className={styles.hint}>Los importes en proceso no son pagos ejecutados ni reservas presupuestarias.</p>
  </section>
}
