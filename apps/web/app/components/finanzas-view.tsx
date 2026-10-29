'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, Copy, Download, Plus, RefreshCw } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { PurchaseDetail, PurchaseForm, ItemForm } from './finanzas-editors'
import { Changes, Duplicates, Portfolio, Reconcile } from './finanzas-reviews'
import { FinanceEmpty, FinanceError, FinanceLoading, FinanceNotice, FinancePages, FinanceStatus, financeFailure, useFinanceData } from './finanzas-ui'
import { financeRequest, financeUrl, downloadFinancePdf, money, sumFinanceAmounts, STATUS, type Purchase, type Definitions, type Summary } from '../lib/finanzas'
import styles from './finanzas.module.css'

type View = 'Presupuesto' | 'Trámites' | 'Cambios' | 'Duplicados' | 'Conciliación' | 'Cartera autorizada'

export function FinanzasView({ cycleId, entrepreneurshipId, program }: { cycleId: string; entrepreneurshipId: string; program: string }) {
  const me = useMe()
  const [view, setView] = useState<View>('Presupuesto')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [definitions, setDefinitions] = useState<Definitions | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState<Purchase | 'new' | null>(null)
  const [detail, setDetail] = useState<Purchase | null>(null)
  const [newItem, setNewItem] = useState(false)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    if (program !== 'Prototipado') { setLoading(false); return }
    setLoading(true); setError('')
    void Promise.all([
      financeRequest<Summary>(cycleId, 'summary', 'GET', undefined, controller.signal),
      financeRequest<Definitions>(cycleId, 'definitions', 'GET', undefined, controller.signal),
    ]).then(([nextSummary, nextDefinitions]) => { if (!controller.signal.aborted) { setSummary(nextSummary); setDefinitions(nextDefinitions) } })
      .catch(reason => { if (!controller.signal.aborted) setError(financeFailure(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cycleId, program, version])

  if (program !== 'Prototipado') return <div className={styles.workspace}><ProjectHeading title="Finanzas y compras" /><section className={styles.surface}><FinanceEmpty title="Finanzas no está habilitada en este programa">Las reglas de presupuesto y compras deben definirse antes de activar esta sección.</FinanceEmpty></section></div>
  const manage = me.role === 'Gestor' || me.role === 'Coordinadora'
  const coordinate = me.role === 'Coordinadora'
  const canCreate = !!summary?.items.length
  const total = (field: 'allocated' | 'executed' | 'pending') => sumFinanceAmounts(summary?.items.map(item => item[field]) ?? [])
  const tabs: View[] = ['Presupuesto', 'Trámites', 'Cambios', 'Duplicados', ...(manage ? ['Conciliación'] as const : []), 'Cartera autorizada']
  return <div className={styles.workspace}>
    <header className={styles.header}>
      <div><ProjectHeading title="Finanzas y compras" /><p>Presupuesto, trámites y respaldos del ciclo, en un mismo lugar.</p></div>
      <div className={styles.actions}><button className="btn secondary" onClick={refresh} disabled={loading} aria-label="Actualizar finanzas"><RefreshCw size={16} aria-hidden="true" /><span>{loading && summary ? 'Actualizando…' : 'Actualizar'}</span></button><button className="btn primary" disabled={!canCreate || !definitions} title={!canCreate ? 'Primero se debe registrar una partida aprobada.' : undefined} onClick={() => setForm('new')}><Plus size={16} aria-hidden="true" />Nuevo trámite</button></div>
    </header>
    {error && <FinanceError message={error} retry={refresh} />}
    {success && <FinanceNotice tone="success">{success}</FinanceNotice>}
    {!summary || !definitions ? loading && <FinanceLoading /> : <>
      <dl className={styles.summary} aria-label="Resumen financiero"><div><dt>Presupuesto asignado</dt><dd>{money(total('allocated'))}</dd><small>Total de las partidas · CRC</small></div><div><dt>Ejecutado</dt><dd>{money(total('executed'))}</dd><small>Pagos y movimientos confirmados</small></div><div><dt>En proceso</dt><dd>{money(total('pending'))}</dd><small>No equivale a una reserva ni a un pago</small></div></dl>
      <nav className={styles.tabs} aria-label="Vistas financieras">{tabs.map(tab => <button key={tab} className={styles.tab} aria-pressed={view === tab} onClick={() => { setView(tab); setSuccess('') }}>{tab}</button>)}</nav>
      {view === 'Presupuesto' && <>
        <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Partidas del ciclo</h2><p>Consulta la ejecución y el saldo de cada partida aprobada.</p></div>{coordinate && <button className="btn secondary" onClick={() => setNewItem(true)}><Plus size={15} aria-hidden="true" />Registrar partida</button>}</div>
          {!summary.items.length ? <FinanceEmpty title="Primero, registra el presupuesto">{coordinate ? 'Agrega una partida del presupuesto aprobado para comenzar a registrar trámites.' : 'La Coordinadora debe registrar al menos una partida del presupuesto aprobado para que puedas crear trámites.'}{coordinate && <button className="btn primary" onClick={() => setNewItem(true)}>Registrar primera partida</button>}</FinanceEmpty> : <>
            <div className={styles.scroll} tabIndex={0} role="region" aria-label="Presupuesto por partida"><table className={styles.table}><thead><tr><th scope="col">Partida</th><th scope="col" className={styles.numeric}>Asignado</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th><th scope="col" className={styles.numeric}>Saldo sobre ejecutado</th><th scope="col">Consumo</th></tr></thead><tbody>{summary.items.map(item => <tr key={item.id}><td>{item.name}</td><td className={styles.numeric}>{money(item.allocated)}</td><td className={styles.numeric}>{money(item.executed)}</td><td className={styles.numeric}>{money(item.pending)}</td><td className={styles.numeric}><span className={Number(item.balance_after_execution) < 0 ? styles.negative : undefined}>{money(item.balance_after_execution)}</span></td><td>{item.consumed_percent}%<progress className={styles.progress} max="100" aria-label={`Consumo de ${item.name}`} value={Math.min(100, Number(item.consumed_percent))} /></td></tr>)}</tbody></table></div>
            <p className={styles.hint}>El saldo sobre ejecutado es asignado menos ejecutado. No representa fondos libres para gastar.</p>
          </>}
          <details className={styles.disclosure}><summary>Cómo se calculan estos importes</summary><p>{summary.detail}</p><p>La reserva y el disponible operativo siguen pendientes de definición. Validar un trámite internamente no confirma su pago.</p></details>
        </section>
        {!!summary.by_type?.length && <section className={styles.surface}><div className={styles.sectionHeading}><div><h2>Distribución por tipo</h2><p>Trámites vigentes: incluye borradores y excluye rechazados o anulados.</p></div></div><div className={styles.scroll} tabIndex={0} role="region" aria-label="Distribución por tipo de trámite"><table className={styles.table}><thead><tr><th scope="col">Tipo de trámite</th><th scope="col">Vigentes</th><th scope="col" className={styles.numeric}>Ejecutado</th><th scope="col" className={styles.numeric}>En proceso</th></tr></thead><tbody>{summary.by_type.map(row => <tr key={row.kind}><td>{row.label}</td><td>{row.count}</td><td className={styles.numeric}>{money(row.executed)}</td><td className={styles.numeric}>{money(row.pending)}</td></tr>)}</tbody></table></div></section>}
      </>}
      {view === 'Trámites' && <PurchaseList cycle={cycleId} definitions={definitions} open={setDetail} version={version} create={canCreate ? () => setForm('new') : undefined} />}
      {view === 'Cambios' && <Changes cycle={cycleId} summary={summary} manage={manage} coordinate={coordinate} refresh={refresh} version={version} />}
      {view === 'Duplicados' && <Duplicates cycle={cycleId} open={setDetail} />}
      {view === 'Conciliación' && manage && <Reconcile cycle={cycleId} />}
      {view === 'Cartera autorizada' && <Portfolio />}
      {form && <PurchaseForm key={form === 'new' ? 'new' : form.id} cycle={cycleId} definitions={definitions} summary={summary} purchase={form === 'new' ? undefined : form} close={() => setForm(null)} saved={item => { setForm(null); setDetail(item); setSuccess('Borrador guardado. Puedes adjuntar respaldos y enviarlo a revisión.'); refresh() }} />}
      {detail && <PurchaseDetail key={`${detail.id}/${detail.revision}`} cycle={cycleId} eid={entrepreneurshipId} purchase={detail} definitions={definitions} role={me.role} userId={me.id} close={() => setDetail(null)} edit={() => { setForm(detail); setDetail(null) }} updated={item => { setDetail(item); refresh() }} />}
      {newItem && <ItemForm cycle={cycleId} close={() => setNewItem(false)} saved={() => { setNewItem(false); setSuccess('Partida registrada. Ya puedes crear un trámite con cargo a ella.'); refresh() }} />}
    </>}
  </div>
}

function PurchaseList({ cycle, definitions, open, version, create }: { cycle: string; definitions: Definitions; open: (p: Purchase) => void; version: number; create?: () => void }) {
  const [filters, setFilters] = useState({ status: '', kind: '', start: '', end: '' })
  const [month, setMonth] = useState('')
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
  const list = useFinanceData<Purchase[]>(cycle, `purchases?${query}&offset=${offset}&limit=50`, version)
  const hasFilters = Object.values(filters).some(Boolean)
  function update(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); setOffset(0); setCopied(false); if (key === 'start' || key === 'end') setMonth('') }
  function clear() { setFilters({ status: '', kind: '', start: '', end: '' }); setMonth(''); setOffset(0); setCopied(false) }
  async function download() {
    setExporting(true); setError('')
    try { await downloadFinancePdf(financeUrl(cycle, `report.pdf?${query}`), 'finanzas-operativo.pdf') }
    catch (reason) { setError(financeFailure(reason)) } finally { setExporting(false) }
  }
  async function copySession() {
    setCopying(true); setError(''); setCopied(false)
    try {
      const dates = new URLSearchParams(Object.entries({ start: filters.start, end: filters.end }).filter(([, value]) => value))
      const result = await financeRequest<{ text: string }>(cycle, `report-text?${dates}`)
      await navigator.clipboard.writeText(result.text); setCopied(true)
    } catch (reason) { setError(financeFailure(reason)) } finally { setCopying(false) }
  }
  return <section className={styles.surface}>
    <div className={styles.sectionHeading}><div><h2>Trámites del ciclo</h2><p>Revisa cada solicitud, sus respaldos y el siguiente paso.</p></div><button className="btn secondary" onClick={() => void download()} disabled={exporting || list.loading}><Download size={15} aria-hidden="true" />{exporting ? 'Generando PDF…' : 'Exportar PDF'}</button></div>
    <div className={styles.filters}>
      <label>Estado<select value={filters.status} onChange={event => update('status', event.target.value)}><option value="">Todos los estados</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Tipo de trámite<select value={filters.kind} onChange={event => update('kind', event.target.value)}><option value="">Todos los tipos</option>{Object.entries(definitions.types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Registrado desde<input type="date" value={filters.start} onChange={event => update('start', event.target.value)} /></label><label>Hasta<input type="date" min={filters.start || undefined} value={filters.end} onChange={event => update('end', event.target.value)} /></label>
    </div>
    {hasFilters && <button className="btn ghost" onClick={clear}>Limpiar filtros</button>}
    {error && <FinanceError message={error} />}
    {list.error ? <FinanceError message={list.error} retry={list.retry} /> : list.loading ? <FinanceLoading label="Consultando trámites…" /> : !list.data?.length ? <FinanceEmpty title={hasFilters ? 'Sin resultados con estos filtros' : 'Tu primer trámite empieza aquí'} action={hasFilters ? <button className="btn secondary" onClick={clear}>Ver todos los trámites</button> : create ? <button className="btn primary" onClick={create}><Plus size={15} aria-hidden="true" />Crear primer trámite</button> : undefined}>{hasFilters ? 'Prueba otro período, tipo o estado. Los registros no se han eliminado.' : 'Registra la información, revisa el checklist y guarda un borrador para adjuntar sus respaldos.'}</FinanceEmpty> : <div className={styles.scroll} role="region" aria-label="Listado de trámites" tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">Proveedor / tipo</th><th scope="col">Documento</th><th scope="col" className={styles.numeric}>Monto CRC</th><th scope="col">Estado</th><th scope="col">Checklist</th><th scope="col">Detalle</th></tr></thead><tbody>{list.data.map(p => <tr key={p.id}><td className={styles.supplier}><strong>{p.supplier}</strong><small>{definitions.types[p.kind]}</small></td><td>{p.invoice_number || 'Pendiente de registrar'}{p.fundatec_number && <small>FUNDATEC {p.fundatec_number}</small>}</td><td className={styles.numeric}>{money(p.amount)}</td><td><FinanceStatus status={p.status} /></td><td>{Object.values(p.checklist).filter(Boolean).length}/{Object.keys(p.checklist).length}<small>verificados</small></td><td><button className="btn secondary" onClick={() => open(p)} aria-label={`Ver trámite de ${p.supplier}`}>Ver trámite<ArrowRight size={14} aria-hidden="true" /></button></td></tr>)}</tbody></table></div>}
    <FinancePages offset={offset} count={list.data?.length ?? 0} loading={list.loading} change={setOffset} />
    <details className={styles.disclosure}><summary>Reporte mensual y texto de validaciones</summary><div className={styles.filters}><label>Mes completo<input type="month" value={month} onChange={event => { const value = event.target.value; setMonth(value); if (!value) { clear(); return } const [year, selectedMonth] = value.split('-').map(Number); if (!year || !selectedMonth) return; setFilters(current => ({ ...current, start: `${value}-01`, end: `${value}-${new Date(year, selectedMonth, 0).getDate()}` })); setOffset(0); setCopied(false) }} /></label><button className="btn secondary" disabled={copying} onClick={() => void copySession()}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copying ? 'Preparando…' : copied ? 'Texto copiado' : 'Copiar validaciones del período'}</button></div><p>El PDF incluye todos los resultados de los filtros y usa la fecha de registro. El texto copiable usa la fecha de validación interna y solo el período seleccionado; no acredita un pago de FUNDATEC.</p>{copied && <span role="status">El texto de validaciones se copió al portapapeles.</span>}</details>
  </section>
}
