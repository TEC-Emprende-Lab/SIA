import type { ReactNode } from 'react'
import { ArrowUpRight, CalendarDays, ChartNoAxesCombined, Check, ChevronRight, Clock3, Target } from 'lucide-react'
import { formatDateTime } from '../lib/expediente'
import { activityColumn } from '../lib/kanban'
import { DECISION_LABEL, STATUS_LABEL, type Activity, type Area, type Objective, type TrackingSummary, type Validation } from '../lib/seguimiento'
import type { ProjectSection } from '../lib/project-workspace'
import { ProjectProgress } from './project-reference-ui'
import styles from './project-dashboard.module.css'

type Props = {
  projectName: string
  program: string
  summary: TrackingSummary
  objectives: Objective[]
  activities: Activity[]
  areas: Area[]
  history?: ReactNode
  today: string
  communication?: ReactNode
  navigate?: (section: ProjectSection, id?: string) => void
}

function dueDate(value: string) {
  return new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

/** Presentación del seguimiento existente: US-PRO-001/002 y US-PM-001/002/003.
 * Los porcentajes y conteos vienen del resumen autorizado; no añade reglas ni permisos.
 */
export function ProjectDashboard({ projectName, program, summary, objectives, activities, areas, history, today, communication, navigate }: Props) {
  const awaiting = objectives.filter((item) => item.status === 'pending_validation')
  const upcoming = activities.filter((item) => !item.completed_at).sort((left, right) => left.ends_on.localeCompare(right.ends_on)).slice(0, 5)

  return <div className={styles.dashboard}>
    <header className={styles.heading}>
      <div>
        <p className={styles.kicker}>{program}<span aria-hidden="true">/</span>{projectName}</p>
        <h1>Resumen del ciclo</h1>
        <p className={styles.subtitle}>El avance y los próximos pasos de tu proyecto.</p>
      </div>
      {navigate && <button className={styles.outlineButton} onClick={() => navigate('Diagnóstico 360°')}>Ver diagnóstico <ArrowUpRight size={16} aria-hidden="true" /></button>}
    </header>

    <section className={styles.overview} aria-label="Avance del ciclo">
      <div className={styles.progressSummary}>
        <div className={styles.progressHeading}><span><ChartNoAxesCombined size={17} strokeWidth={1.7} aria-hidden="true" />Avance del ciclo</span></div>
        <strong className={styles.percent}>{Math.round(summary.progress_percent)}<span>%</span></strong>
        <ProjectProgress value={summary.progress_percent} label="Avance del ciclo" />
        <p>Promedio de avance de los objetivos aprobados, con igual peso.</p>
      </div>
      <dl className={styles.metrics}>
        <div><dt>Objetivos aprobados</dt><dd>{summary.objectives_approved}<span> / {summary.objectives_total}</span></dd></div>
        <div><dt>Actividades completadas</dt><dd>{summary.activities_completed}<span> / {summary.activities_total}</span></dd></div>
      </dl>
    </section>

    <div className={styles.columns}>
      <div className={styles.work}>
        <section className={styles.surface} aria-labelledby="dashboard-next-title">
          <div className={styles.sectionHeading}>
            <h2 id="dashboard-next-title">Próximos pasos</h2>
            {navigate && <button className={styles.link} onClick={() => navigate('Objetivos y actividades')}>Ver todo <ArrowUpRight size={14} aria-hidden="true" /></button>}
          </div>
          {awaiting.length > 0 && <div className={styles.taskGroup}>
            <p className={styles.groupLabel}>Por validar <span>{awaiting.length}</span></p>
            {awaiting.map((objective) => <button className={styles.task} key={objective.id} onClick={() => navigate?.('Objetivos y actividades', objective.id)}>
              <span className={styles.taskIcon}><Target size={17} strokeWidth={1.6} aria-hidden="true" /></span>
              <span className={styles.taskCopy}><strong>{objective.title}</strong><small>Objetivo pendiente de aprobación · {areas.find((area) => area.id === objective.area_id)?.name ?? 'Área'}</small></span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>)}
          </div>}
          {upcoming.length > 0 && <div className={styles.taskGroup}>
            <p className={styles.groupLabel}>Actividades por fecha</p>
            {upcoming.map((activity) => {
              const column = activityColumn(activity, today)
              return <button className={styles.task} key={activity.id} onClick={() => navigate?.('Objetivos y actividades', activity.id)}>
                <span className={styles.taskIcon} data-kind="activity"><CalendarDays size={17} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className={styles.taskCopy}><strong>{activity.title}</strong><small><time dateTime={activity.ends_on}>{dueDate(activity.ends_on)}</time><span aria-hidden="true"> · </span><span className={column === 'overdue' ? styles.overdue : undefined}>{column === 'overdue' ? 'Vencida' : 'Pendiente'}</span></small></span>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            })}
          </div>}
          {awaiting.length === 0 && upcoming.length === 0 && <div className={styles.empty}><Check size={23} strokeWidth={1.5} aria-hidden="true" /><p>No hay próximos pasos pendientes registrados.</p></div>}
          {activities.filter((item) => !item.completed_at).length > 5 && <p className={styles.footnote}>Se muestran las primeras 5 actividades por fecha. Consulta el resto en Objetivos y actividades.</p>}
        </section>

        <section className={styles.surface} aria-labelledby="dashboard-plan-title">
          <div className={styles.sectionHeading}><h2 id="dashboard-plan-title">El plan compartido <span className={styles.count}>{objectives.length}</span></h2>{navigate && <button className={styles.link} onClick={() => navigate('Objetivos y actividades')}>Abrir plan <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>
          {objectives.length === 0 ? <div className={styles.empty}><Target size={23} strokeWidth={1.5} aria-hidden="true" /><p>Aún no hay objetivos registrados.</p>{navigate && <button className={styles.link} onClick={() => navigate('Objetivos y actividades')}>Ir a objetivos <ArrowUpRight size={14} aria-hidden="true" /></button>}</div> : <ul className={styles.objectives}>{objectives.map((objective) => {
            const progress = summary.objectives.find((item) => item.objective_id === objective.id)?.progress_percent ?? 0
            return <li key={objective.id}>
              <div className={styles.objectiveHeading}><button onClick={() => navigate?.('Objetivos y actividades', objective.id)}>{objective.title}<ArrowUpRight size={14} aria-hidden="true" /></button><span>{Math.round(progress)}%</span></div>
              <ProjectProgress value={progress} label={`Avance de ${objective.title}`} />
              <p className={styles.objectiveStatus} data-approved={objective.status === 'approved'}><span aria-hidden="true" />{STATUS_LABEL[objective.status]}</p>
            </li>
          })}</ul>}
        </section>

        {history}
        <p className={styles.rule}>Modificar actividades o evidencias requiere revalidar su objetivo.</p>
      </div>
      {communication && <aside className={styles.agenda} aria-label="Reuniones, acuerdos y alertas">{communication}</aside>}
    </div>
  </div>
}

export function DashboardValidationHistory({ validations, children }: { validations?: Validation[]; children?: ReactNode }) {
  const history = [...(validations ?? [])].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 5)
  return <details className={styles.history}>
          <summary><Clock3 size={16} strokeWidth={1.6} aria-hidden="true" /><h2>Historial reciente</h2><span>{!validations ? '' : history.length === 0 ? 'Sin decisiones' : `${history.length} ${history.length === 1 ? 'decisión' : 'decisiones'}`}</span><ChevronRight size={15} className={styles.disclosureArrow} aria-hidden="true" /></summary>
          {children ?? (history.length === 0 ? <p className={styles.footnote}>Aún no hay decisiones de validación registradas.</p> : <ul>{history.map((validation) => <li key={validation.id}><span className={styles.historyDot} aria-hidden="true" /><div><strong>{DECISION_LABEL[validation.decision as keyof typeof DECISION_LABEL] ?? validation.decision}</strong><p>{validation.observation}</p><time dateTime={validation.created_at}>{formatDateTime(validation.created_at)}</time></div></li>)}</ul>)}
        </details>
}
