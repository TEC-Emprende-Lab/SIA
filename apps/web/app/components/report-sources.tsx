import { formatDateTime } from '../lib/expediente'
import type { Report } from '../lib/reports'
import styles from './reports.module.css'

const sectionLabels: Record<string, string> = {
  objectives: 'Objetivos',
  activities_completed: 'Actividades completadas',
  evidence: 'Evidencias',
  minutes_approved: 'Minutas aprobadas',
  agreements: 'Acuerdos',
  finances: 'Finanzas',
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function evidenceLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

function Source({ kind, value }: { kind: string; value: unknown }) {
  const source: Record<string, unknown> = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const title = text(source.title) || text(source.description) || text(value)
    || (kind === 'minutes_approved' ? 'Minuta aprobada' : 'Fuente sin detalle disponible')
  const url = kind === 'evidence' ? evidenceLink(source.url) : undefined
  const references = [
    ['Referencia', text(source.id)],
    ['Objetivo', text(source.objective_id)],
    ['Actividad', text(source.activity_id)],
    ['Reunión', text(source.meeting_id)],
  ].filter(([, id]) => id)
  return <li className={styles.source}>
    <strong>{title}</strong>
    {text(source.completed_at) && <p className="small muted">Completada: {formatDateTime(text(source.completed_at))}</p>}
    {text(source.approved_at) && <p className="small muted">Aprobada: {formatDateTime(text(source.approved_at))}</p>}
    {text(source.due_date) && <p className="small muted">Fecha de compromiso: {text(source.due_date).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')}</p>}
    {url && <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer">Abrir evidencia <span className="small">(nueva pestaña)</span></a>}
    {references.length > 0 && <details className={styles.references}>
      <summary>Ver referencias</summary>
      <dl>{references.map(([label, id]) => <div key={label}><dt>{label}</dt><dd>{id}</dd></div>)}</dl>
    </details>}
  </li>
}

/** US-PRO-004 / US-PM-003: mostrar solo las fuentes conservadas en esta versión. */
export function ReportSources({ composition }: { composition: Report['composition'] }) {
  const sections = Object.entries(composition)
  return <section className={styles.sources} aria-label="Fuentes del informe">
    <h3>Fuentes del informe</h3>
    <p className="small muted">Información conservada en esta versión. Las horas se muestran en horario de Costa Rica.</p>
    {sections.length === 0 && <p className="missing-data">Este informe no tiene fuentes registradas.</p>}
    {sections.map(([kind, sources]) => <section className="report-section" key={kind}>
      <h4>{Object.hasOwn(sectionLabels, kind) ? sectionLabels[kind] : 'Fuentes adicionales'}</h4>
      {Array.isArray(sources)
        ? sources.length > 0
          ? <ul className={styles.list}>{sources.map((source, index) => <Source key={index} kind={kind} value={source} />)}</ul>
          : <p className="small muted">No hay fuentes registradas en esta sección.</p>
        : <p className="missing-data">Pendiente de completar</p>}
    </section>)}
  </section>
}
