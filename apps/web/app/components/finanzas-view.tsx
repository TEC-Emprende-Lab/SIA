'use client'

import { useCallback, useState } from 'react'
import { ArrowRight, Copy, Download, Plus } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { PurchaseDetail, PurchaseForm, ItemForm } from './finanzas-editors'
import { Changes, Duplicates, Portfolio, Reconcile } from './finanzas-reviews'
import { FinanceEmpty, FinanceError, FinanceHeaderActions, FinanceNotice, FinancePages, FinanceReadFeedback, FinanceStatus, financeFailure, useFinanceData } from './finanzas-ui'
import { LoadingState, SkeletonBar } from './ui/loading-state'
import { financeRequest, financeUrl, downloadFinancePdf, money, sumFinanceAmounts, STATUS, type Purchase, type Definitions, type Summary } from '../lib/finanzas'
import styles from './finanzas.module.css'

type View = 'Presupuesto' | 'Trámites' | 'Cambios' | 'Duplicados' | 'Conciliación' | 'Cartera autorizada'

export function FinanzasView({ cycleId, entrepreneurshipId, program }: { cycleId: string; entrepreneurshipId: string; program: string }) {
  if (program !== 'Prototipado') return <div className={styles.workspace}><ProjectHeading title="Finanzas y compras" /><section className={styles.surface}><FinanceEmpty title="Finanzas no está habilitada en este programa">Las reglas de presupuesto y compras deben definirse antes de activar esta sección.</FinanceEmpty></section></div>
  return <FinanceCycle key={cycleId} cycleId={cycleId} entrepreneurshipId={entrepreneurshipId} />
}

function FinanceCycle({ cycleId, entrepreneurshipId }: { cycleId: string; entrepreneurshipId: string }) {
  const me = useMe()
  const [view, setView] = useState<View>('Presupuesto')
  const [success, setSuccess] = useState('')
  const [version, setVersion] = useState(0)
  const [lookupVersion, setLookupVersion] = useState(0)
  const [form, setForm] = useState<{ purchase?: Purchase; summary: Summary; definitions: Definitions } | null>(null)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [detailNotice, setDetailNotice] = useState('')
  const [newItem, setNewItem] = useState(false)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  const budget = useFinanceData<Summary>(cycleId, 'summary', version)
  const lookup = useFinanceData<Definitions>(cycleId, 'definitions', lookupVersion)
  const summary = budget.data
  const definitions = lookup.data
  const manage = me.role === 'Gestor' || me.role === 'Coordinadora'
  const coordinate = me.role === 'Coordinadora'
  const hasBudget = Boolean(summary?.items.length)
  const total = (field: 'allocated' | 'executed' | 'pending') => sumFinanceAmounts(summary?.items.map(item => item[field]) ?? [])
  const tabs: View[] = ['Presupuesto', 'Trámites', 'Cambios', 'Duplicados']
  if (manage) tabs.push('Conciliación')
  tabs.push('Cartera autorizada')

  function openForm(purchase?: Purchase) {
    if (!summary || !definitions) return
    setForm({ purchase, summary, definitions })
    setDetail(null)
    setSuccess('')
  }
  function openDetail(purchase: Purchase) {
    setDetailNotice('')
    setDetail(purchase)
  }
  let create: (() => void) | undefined
  if (hasBudget && definitions) create = () => openForm()
  let edit: (() => void) | undefined
  if (summary && detail) edit = () => openForm(detail)
  let purchaseEmpty = 'Cuando se registren trámites en este ciclo, puedes consultarlos aquí.'
  if (summary && !hasBudget) {
    purchaseEmpty = 'La Coordinadora debe registrar una partida aprobada antes de que puedas crear un trámite.'
    if (coordinate) purchaseEmpty = 'Registra una partida del presupuesto aprobado para habilitar los trámites.'
  } else if (!summary) {
    purchaseEmpty = 'La creación de trámites estará disponible cuando se pueda consultar el presupuesto del ciclo.'
  }
  return <div className={styles.workspace}>
    <header className={styles.header}>
      <div><ProjectHeading title="Finanzas y compras" /><p>Presupuesto, trámites y respaldos del ciclo, en un mismo lugar.</p></div>
      <FinanceHeaderActions loading={budget.loading || lookup.loading} ready={Boolean(summary)} definitionsReady={Boolean(definitions)} hasBudget={hasBudget} coordinate={coordinate} refresh={() => { refresh(); setLookupVersion(v => v + 1) }} addItem={() => { setSuccess(''); setNewItem(true) }} create={() => openForm()} />
    </header>
    {success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    {budget.loading && !summary && <FinanceSummaryLoading />}
    {(summary || budget.error) && <FinanceReadFeedback read={budget} label="Consultando presupuesto…" title="No se pudo consultar el presupuesto del ciclo" />}
    {hasBudget && <dl className={styles.summary} aria-label="Resumen financiero"><div><dt>Presupuesto asignado</dt><dd>{money(total('allocated'))}</dd><small>Total de las partidas en colones</small></div><div><dt>Ejecutado</dt><dd>{money(total('executed'))}</dd><small>Pagos y movimientos confirmados</small></div><div><dt>En proceso</dt><dd>{money(total('pending'))}</dd><small>No equivale a una reserva ni a un pago</small></div></dl>}
      <nav className={styles.tabs} aria-label="Vistas financieras">{tabs.map(tab => <button key={tab} className={styles.tab} aria-pressed={view === tab} onClick={() => { setView(tab); setSuccess('') }}>{tab}</button>)}</nav>
      {view === 'Presupuesto' && summary && <>
        <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Partidas del ciclo</h2><p>Consulta la ejecución y el saldo de cada partida aprobada.</p></div>{coordinate && hasBudget && <button className="btn secondary" onClick={() => { setSuccess(''); setNewItem(true) }}><Plus size={15} aria-hidden="true" />Registrar partida</button>}</div>
          {!hasBudget && <FinanceEmpty title="Todavía no hay partidas registradas">Los importes de asignación y ejecución aparecerán aquí cuando se registre la primera partida del ciclo.</FinanceEmpty>}
          {hasBudget && <>
            <div className={styles.scroll} tabIndex={0} role="region" aria-label="Presupuesto por partida"><table className={styles.table}><thead><tr><th scope="col">Partida</th><th scope="col" className={styles.numeric}>Asignado</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th><th scope="col" className={styles.numeric}>Saldo sobre ejecutado</th><th scope="col">Consumo</th></tr></thead><tbody>{summary.items.map(item => <tr key={item.id}><td>{item.name}</td><td className={styles.numeric}>{money(item.allocated)}</td><td className={styles.numeric}>{money(item.executed)}</td><td className={styles.numeric}>{money(item.pending)}</td><td className={styles.numeric}><span className={Number(item.balance_after_execution) < 0 ? styles.negative : undefined}>{money(item.balance_after_execution)}</span></td><td>{item.consumed_percent}%<progress className={styles.progress} max="100" aria-label={`Consumo de ${item.name}`} value={Math.min(100, Number(item.consumed_percent))} /></td></tr>)}</tbody></table></div>
            <p className={styles.hint}>El saldo sobre ejecutado es asignado menos ejecutado. No representa fondos libres para gastar.</p>
          </>}
          <details className={styles.disclosure}><summary>Cómo se calculan estos importes</summary><p>{summary.detail}</p><p>La reserva y el disponible operativo siguen pendientes de definición. Validar un trámite internamente no confirma su pago.</p></details>
        </section>
        {!!summary.by_type?.length && <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Distribución por tipo</h2><p>Trámites vigentes: incluye borradores y excluye rechazados o anulados.</p></div></div><div className={styles.scroll} tabIndex={0} role="region" aria-label="Distribución por tipo de trámite"><table className={styles.table}><thead><tr><th scope="col">Tipo de trámite</th><th scope="col">Vigentes</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th></tr></thead><tbody>{summary.by_type.map(row => <tr key={row.kind}><td>{row.label}</td><td>{row.count}</td><td className={styles.numeric}>{money(row.executed)}</td><td className={styles.numeric}>{money(row.pending)}</td></tr>)}</tbody></table></div></section>}
      </>}
      {(view === 'Trámites' || view === 'Duplicados' || hasBudget) && <FinanceReadFeedback read={lookup} label="Consultando tipos y verificaciones de trámites…" title="No se pudo consultar la configuración de trámites" />}
      {view === 'Trámites' && definitions && <PurchaseList cycle={cycleId} definitions={definitions} open={openDetail} version={version} create={create} emptyHint={purchaseEmpty} />}
      {view === 'Cambios' && <Changes cycle={cycleId} summary={summary} manage={manage} coordinate={coordinate} refresh={refresh} version={version} />}
      {view === 'Duplicados' && <Duplicates cycle={cycleId} open={openDetail} version={version} canOpen={Boolean(definitions)} />}
      {view === 'Conciliación' && manage && <Reconcile cycle={cycleId} version={version} />}
      {view === 'Cartera autorizada' && <Portfolio version={version} />}
      {form && <PurchaseForm cycle={cycleId} definitions={form.definitions} summary={form.summary} purchase={form.purchase} close={() => setForm(null)} saved={item => { setForm(null); setDetail(item); setDetailNotice('Borrador guardado. Puedes adjuntar respaldos y enviarlo a revisión.'); refresh() }} />}
      {detail && definitions && <PurchaseDetail key={`${detail.id}/${detail.revision}`} cycle={cycleId} eid={entrepreneurshipId} purchase={detail} definitions={definitions} role={me.role} userId={me.id} notice={detailNotice} close={() => { setDetail(null); setSuccess(detailNotice) }} edit={edit} updated={(item, message) => { setDetail(item); setDetailNotice(message); refresh() }} />}
      {newItem && <ItemForm cycle={cycleId} close={() => setNewItem(false)} saved={() => { setNewItem(false); setSuccess('Partida registrada. Ya puedes crear un trámite con cargo a ella.'); refresh() }} />}
  </div>
}

function FinanceSummaryLoading() {
  return <LoadingState label="Consultando presupuesto del ciclo…">
      <div className={styles.summary}>
        {['Asignado', 'Ejecutado', 'En proceso'].map((key) => (
          <div key={key} className={styles.summaryPlaceholder}>
            <SkeletonBar />
            <div className={styles.amountPlaceholder}><SkeletonBar /></div>
            <SkeletonBar size="text" />
          </div>
        ))}
      </div>
  </LoadingState>
}

function PurchaseList({ cycle, definitions, open, version, create, emptyHint }: { cycle: string; definitions: Definitions; open: (p: Purchase) => void; version: number; create?: () => void; emptyHint: string }) {
  const [filters, setFilters] = useState({ status: '', kind: '', start: '', end: '' })
  const [month, setMonth] = useState('')
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'download' | 'copy' | null>(null)
  const [success, setSuccess] = useState('')
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
  const list = useFinanceData<Purchase[]>(cycle, `purchases?${query}&offset=${offset}&limit=50`, version)
  const hasFilters = Object.values(filters).some(Boolean)
  function update(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); setOffset(0); setSuccess(''); setError(''); if (key === 'start' || key === 'end') setMonth('') }
  function clear() { setFilters({ status: '', kind: '', start: '', end: '' }); setMonth(''); setOffset(0); setSuccess(''); setError('') }
  async function download() {
    setAction('download'); setError(''); setSuccess('')
    try { await downloadFinancePdf(financeUrl(cycle, `report.pdf?${query}`), 'finanzas-operativo.pdf'); setSuccess('PDF operativo generado. Revisa las descargas del navegador.') }
    catch (reason) { setError(financeFailure(reason)) } finally { setAction(null) }
  }
  async function copySession() {
    setAction('copy'); setError(''); setSuccess('')
    try {
      const dates = new URLSearchParams(Object.entries({ start: filters.start, end: filters.end }).filter(([, value]) => value))
      const result = await financeRequest<{ text: string }>(cycle, `report-text?${dates}`)
      try {
        await navigator.clipboard.writeText(result.text)
      } catch {
        throw new Error('No se pudo copiar el texto. Permite el acceso al portapapeles en el navegador e intenta de nuevo.')
      }
      setSuccess('El texto de validaciones se copió al portapapeles.')
    } catch (reason) { setError(financeFailure(reason)) } finally { setAction(null) }
  }
  let downloadLabel = 'Exportar PDF'
  let copyLabel = 'Copiar validaciones del período'
  if (action === 'download') downloadLabel = 'Generando PDF…'
  if (action === 'copy') copyLabel = 'Preparando texto…'
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Trámites del ciclo</h2><p>Revisa cada solicitud, sus respaldos y el siguiente paso.</p></div><button className="btn secondary" onClick={() => void download()} disabled={Boolean(action) || list.loading}><Download size={15} aria-hidden="true" />{downloadLabel}</button></div>
    <div className={styles.filters}>
      <label>Estado<select value={filters.status} onChange={event => update('status', event.target.value)}><option value="">Todos los estados</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Tipo de trámite<select value={filters.kind} onChange={event => update('kind', event.target.value)}><option value="">Todos los tipos</option>{Object.entries(definitions.types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Registrado desde<input type="date" value={filters.start} onChange={event => update('start', event.target.value)} /></label><label>Hasta<input type="date" min={filters.start || undefined} value={filters.end} onChange={event => update('end', event.target.value)} /></label>
    </div>
    {hasFilters && <button className="btn ghost" onClick={clear}>Limpiar filtros</button>}
    {error && <FinanceError message={error} />}
    {success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    <FinanceReadFeedback read={list} label="Consultando trámites…" title="No se pudo consultar los trámites" layout="table" />
    {list.data && <>
      <PurchaseResults items={list.data} definitions={definitions} open={open} hasFilters={hasFilters} clear={clear} create={create} emptyHint={emptyHint} offset={offset} loading={list.loading} />
    </>}
    {(!list.loading || list.data) && <FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading} change={setOffset} />}
    <details className={styles.disclosure}><summary>Reporte mensual y texto de validaciones</summary><div className={styles.filters}><label>Mes completo<input type="month" value={month} onChange={event => { const value = event.target.value; setMonth(value); if (!value) { clear(); return } const [year, selectedMonth] = value.split('-').map(Number); if (!year || !selectedMonth) return; setFilters(current => ({ ...current, start: `${value}-01`, end: `${value}-${new Date(year, selectedMonth, 0).getDate()}` })); setOffset(0); setSuccess(''); setError('') }} /></label><button className="btn secondary" disabled={Boolean(action)} onClick={() => void copySession()}><Copy size={15} aria-hidden="true" />{copyLabel}</button></div><p>El PDF incluye todos los resultados de los filtros y usa la fecha de registro. El texto copiable usa la fecha de validación interna y solo el período seleccionado; no acredita un pago de FUNDATEC.</p></details>
  </section>
}

export function PurchaseResults({ items, definitions, open, hasFilters, clear, create, emptyHint, offset, loading }: {
  items: Purchase[]
  definitions: Definitions
  open: (purchase: Purchase) => void
  hasFilters: boolean
  clear: () => void
  create?: () => void
  emptyHint: string
  offset: number
  loading: boolean
}) {
  if (!items.length) {
    if (offset) return <FinanceEmpty title="No hay trámites en esta página">Vuelve a la página anterior para seguir consultando los trámites.</FinanceEmpty>
    if (hasFilters) return <FinanceEmpty title="Sin resultados con estos filtros" action={<button className="btn secondary" onClick={clear}>Ver todos los trámites</button>}>
      Prueba otro período, tipo o estado. Los registros no se han eliminado.
    </FinanceEmpty>
    if (create) return <FinanceEmpty title="Todavía no hay trámites">Usa «Nuevo trámite» para registrar la información y guardar un borrador al que puedas adjuntar sus respaldos.</FinanceEmpty>
    return <FinanceEmpty title="Todavía no hay trámites">{emptyHint}</FinanceEmpty>
  }
  return <div className={styles.scroll} role="region" aria-label="Listado de trámites" tabIndex={0}>
    <table className={styles.table}>
      <thead><tr><th scope="col">Proveedor / tipo</th><th scope="col">Documento</th><th scope="col" className={styles.numeric}>Monto CRC</th><th scope="col">Estado</th><th scope="col">Verificaciones</th><th scope="col">Detalle</th></tr></thead>
      <tbody>{items.map(p => <tr key={p.id}>
        <td className={styles.supplier}><strong>{p.supplier}</strong><small>{definitions.types[p.kind]}</small></td>
        <td>{p.invoice_number || 'Pendiente de registrar'}{p.fundatec_number && <small>FUNDATEC {p.fundatec_number}</small>}</td>
        <td className={styles.numeric}>{money(p.amount)}</td>
        <td><FinanceStatus status={p.status} /></td>
        <td>{Object.values(p.checklist).filter(Boolean).length}/{Object.keys(p.checklist).length}<small>verificados</small></td>
        <td><button className="btn secondary" disabled={loading} onClick={() => open(p)} aria-label={`Ver trámite de ${p.supplier}`}>Ver trámite<ArrowRight size={14} aria-hidden="true" /></button></td>
      </tr>)}</tbody>
    </table>
  </div>
}
