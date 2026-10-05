import { ExternalLink, FileText, Paperclip } from 'lucide-react'
import { formatDateTime } from '../lib/expediente'
import { httpUrl, type Activity, type Evidence, type Objective } from '../lib/seguimiento'
import styles from './seguimiento.module.css'

const EVIDENCE_LABEL: Record<string, string> = { link: 'Enlace', file: 'Documento', photograph: 'Fotografía', video: 'Video' }

/** US-PRO-001/002, US-PM-001/002: contexto real antes de validar, sin nuevas reglas. */
export function ObjectiveReviewContext({ objective, area, ambition, activities, evidence }: {
  objective: Objective
  area: string
  ambition?: string
  activities: Activity[]
  evidence: Evidence[]
}) {
  const related = activities.filter((activity) => activity.objective_id === objective.id && activity.cycle_id === objective.cycle_id)
  const references = evidence.filter((item) => item.cycle_id === objective.cycle_id && related.some((activity) => activity.id === item.activity_id))
  return <section className={styles.reviewContext} aria-label="Contexto del objetivo">
    <p className={styles.eyebrow}>Qué se busca lograr</p>
    <h3>{objective.title}</h3>
    <p className={styles.reviewDescription}>{objective.description || 'Sin descripción del objetivo registrada.'}</p>
    <dl className={styles.reviewDetails}>
      <div><dt>Área del canvas</dt><dd>{area}</dd></div>
      <div><dt>Entregable de trabajo</dt><dd>{objective.deliverable || 'Sin referencia registrada.'}</dd></div>
      <div><dt>Ambición vinculada</dt><dd>{ambition || 'Sin ambición vinculada.'}</dd></div>
    </dl>
    <div className={styles.reviewStats}>
      <span><strong>{related.filter((activity) => activity.completed_at).length} / {related.length}</strong> actividades completadas</span>
      <span><Paperclip size={18} aria-hidden="true" /><strong>{references.length}</strong> evidencias registradas</span>
    </div>
  </section>
}

/** Referencias externas: nunca cargar ni incrustar automáticamente contenido remoto. */
export function ActivityEvidence({ activity, evidence }: { activity: Activity; evidence: Evidence[] }) {
  const related = evidence.filter((item) => item.activity_id === activity.id && item.cycle_id === activity.cycle_id)
  return <section className={styles.evidenceReview} aria-label={`Evidencias de ${activity.title}`}>
    <div className={styles.row}><h5><Paperclip size={19} aria-hidden="true" /> Evidencias de esta actividad</h5><span className={styles.badge}>{related.length} {related.length === 1 ? 'registrada' : 'registradas'}</span></div>
    <p className={styles.evidenceHelp}>Respaldo del trabajo registrado. Las referencias se abren en una pestaña nueva.</p>
    {related.length === 0 ? <p className={styles.evidenceEmpty}>Esta actividad todavía no tiene evidencias registradas.</p> : <ul className={styles.evidenceReviewList}>
      {related.map((item) => {
        const url = httpUrl(item.url)
        return <li key={item.id} className={styles.evidenceReviewCard}>
          <div className={styles.evidenceIcon}><FileText size={25} aria-hidden="true" /></div>
          <div className={styles.evidenceBody}>
            <span className={styles.evidenceKind}>{EVIDENCE_LABEL[item.kind] ?? 'Evidencia'} · referencia externa</span>
            <h6>{item.title}</h6>
            <p className={styles.reviewDescription}>{item.description || 'Sin descripción de la evidencia registrada.'}</p>
            <p className={styles.evidenceDate}>Registrada: {formatDateTime(item.created_at)}</p>
            {'url' in url ? <a className={styles.evidenceOpen} href={url.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir evidencia: ${item.title} (pestaña nueva)`}>Abrir evidencia <ExternalLink size={16} aria-hidden="true" /></a> : <p className={styles.evidenceEmpty}>Referencia no disponible: URL inválida.</p>}
            <details className={styles.evidenceAddress}><summary>Ver URL completa</summary><p className={styles.evidenceUrl}>{item.url}</p></details>
          </div>
        </li>
      })}
    </ul>}
  </section>
}
