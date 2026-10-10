'use client'

import { useState, type ReactNode } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Compass, Search, Target, ListChecks, Pencil } from 'lucide-react'
import { STATUS_LABEL, type Activity, type Ambition, type Area, type Objective } from '../lib/seguimiento'
import styles from './ambition-explorer.module.css'

type Props = {
  ambitions: Ambition[]
  objectives: Objective[]
  activities: Activity[]
  areas: Area[]
  createAction: ReactNode
  editAction: (ambition: Ambition) => ReactNode
  onObjective?: (id: string) => void
}

export function AmbitionExplorer({ ambitions, objectives, activities, areas, createAction, editAction, onObjective }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const linkedIds = new Set(objectives.map((item) => item.ambition_id).filter(Boolean))
  const visible = ambitions.filter((item) => {
    const matches = `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))
    return matches && (filter === 'all' || (filter === 'linked' ? linkedIds.has(item.id) : !linkedIds.has(item.id)))
  })
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0]
  const linked = selected ? objectives.filter((item) => item.ambition_id === selected.id) : []
  const position = visible.findIndex((item) => item.id === selected?.id)
  const move = (offset: number) => {
    const item = visible[position + offset]
    if (item) setSelectedId(item.id)
  }
  return <div className={styles.workspace}>
    <header className={styles.heading}>
      <div><h1>Ambiciones</h1><p>Una dirección clara para lo que viene.</p></div>
      {createAction}
    </header>
    <div className={styles.introduction}>
      <p>Lo que quieres lograr a largo plazo, conectado con el trabajo de hoy.</p>
      <div className={styles.path} aria-label="Una ambición orienta objetivos, que se desagregan en actividades"><span><Compass size={18} /> Ambición</span><ArrowRight size={16} /><span><Target size={18} /> Objetivos</span><ArrowRight size={16} /><span><ListChecks size={18} /> Actividades</span></div>
    </div>
    {ambitions.length === 0 ? <section className={styles.empty}><Compass size={36} aria-hidden="true" /><h2>Tu siguiente gran idea empieza aquí</h2><p>Crea tu primera ambición con «Nueva ambición». Puede existir por sí sola; cuando tengas un plan, podrás vincularla a objetivos.</p></section> : <>
      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={18} aria-hidden="true" /><input type="search" aria-label="Buscar ambiciones" placeholder="Buscar una ambición…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className={styles.filter}>Mostrar<select aria-label="Filtrar ambiciones" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todas</option><option value="linked">Con objetivos</option><option value="unlinked">Sin objetivos en este ciclo</option></select></label>
        <span role="status" className={styles.count}>{visible.length} de {ambitions.length} ambiciones</span>
      </div>
      {!selected ? <section className={styles.empty}><Search size={28} aria-hidden="true" /><h2>No encontramos ambiciones</h2><p>Prueba otra palabra o cambia el filtro para ampliar la búsqueda.</p><button type="button" className="btn secondary" onClick={() => { setQuery(''); setFilter('all') }}>Restablecer búsqueda</button></section> : <div className={styles.explorer}>
        <nav className={styles.index} aria-label="Seleccionar ambición">
          <h2>El rumbo del proyecto</h2>
          <label className={styles.mobilePicker}>Ambición seleccionada<select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{visible.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <div className={styles.indexList}>{visible.map((item) => {
            const total = objectives.filter((objective) => objective.ambition_id === item.id).length
            return <button type="button" key={item.id} aria-pressed={item.id === selected.id} aria-controls="ambition-detail" onClick={() => setSelectedId(item.id)}><span className={styles.marker}><Compass size={19} aria-hidden="true" /></span><span className={styles.indexCopy}><strong>{item.title}</strong><span>{total ? `${total} ${total === 1 ? 'objetivo vinculado' : 'objetivos vinculados'}` : 'Sin objetivos en este ciclo'}</span></span><ChevronRight size={16} aria-hidden="true" /></button>
          })}</div>
          <p className={styles.indexNote}>Las ambiciones pertenecen al emprendimiento y se conservan entre programas.</p>
        </nav>
        <article id="ambition-detail" className={styles.detail} aria-label="Detalle de la ambición">
          <div className={styles.detailNavigation}><span>{position + 1} de {visible.length}</span><div><button type="button" aria-label="Ambición anterior" disabled={position === 0} onClick={() => move(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Ambición siguiente" disabled={position === visible.length - 1} onClick={() => move(1)}><ChevronRight size={18} /></button></div></div>
          <div key={selected.id} className={styles.detailBody}>
            <div className={styles.title}><h2>{selected.title}</h2>{editAction(selected)}</div>
            <p className={styles.description}>{selected.description.trim() || 'Esta ambición todavía no tiene una descripción. Puedes añadirla con «Editar ambición».'}</p>
            <section className={styles.connections} aria-labelledby="ambition-objectives-title">
              <div className={styles.connectionsHeading}><h3 id="ambition-objectives-title"><Target size={19} aria-hidden="true" /> De la intención a la acción</h3><span>{linked.length} {linked.length === 1 ? 'objetivo' : 'objetivos'}</span></div>
              <p>Objetivos vinculados en este ciclo. Abre uno para ver sus actividades y evidencias.</p>
              {linked.length ? <div className={styles.objectives}>{linked.map((objective) => {
                const tasks = activities.filter((item) => item.objective_id === objective.id)
                return <button type="button" key={objective.id} disabled={!onObjective} onClick={() => onObjective?.(objective.id)}><span className={styles.objectiveCopy}><span className={styles.area}>{areas.find((item) => item.id === objective.area_id)?.name ?? 'Área del programa'}</span><strong>{objective.title}</strong><span className={styles.metadata}><span data-status={objective.status}>{STATUS_LABEL[objective.status]}</span><span>{tasks.length ? `${tasks.filter((item) => item.completed_at).length} de ${tasks.length} actividades completadas` : 'Sin actividades registradas'}</span></span></span><ArrowRight size={19} aria-hidden="true" /></button>
              })}</div> : <div className={styles.noObjectives}><Target size={25} aria-hidden="true" /><div><h4>Una ambición también puede esperar su momento</h4><p>Aún no tiene objetivos vinculados en este ciclo. Cuando definas uno, podrás elegir esta ambición desde «Objetivos y actividades».</p></div></div>}
            </section>
          </div>
        </article>
      </div>}
    </>}
    <p className={styles.footnote}><Pencil size={15} aria-hidden="true" /> Las ambiciones expresan propósito, no un porcentaje de avance. El seguimiento se realiza en los objetivos.</p>
  </div>
}
