'use client'

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Target, Search, CheckCircle2, CalendarDays, Paperclip, ArrowRight, ChevronRight, FileText, History, LayoutGrid, List, Plus, Box, Sparkles } from 'lucide-react'
import { ProjectHeading, ProjectPanel, ProjectProgress, ProjectLink } from './project-reference-ui'
import type { ProjectSection } from '../lib/project-workspace'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

import { useMe } from './authenticated-shell'
import shell from './expediente.module.css'
import styles from './seguimiento.module.css'
import { formatDateTime, trimmedName } from '../lib/expediente'
import {
  canSubmit,
  canValidate,
  DECISION_LABEL,
  httpUrl,
  isoDate,
  parseActivity,
  parseActivityList,
  parseAmbition,
  parseAmbitionList,
  parseCanvas,
  parseComparison,
  parseDiagnostic,
  parseDiagnosticList,
  parseEvidence,
  parseEvidenceList,
  parseObjective,
  parseObjectiveList,
  parseSchedule,
  parseValidation,
  parseValidationList,
  parseTrackingSummary,
  requestSeguimiento,
  seguimientoUrl,
  STATUS_LABEL,
  TRACKED_PROGRAMS,
  type Activity,
  type Ambition,
  type Area,
  type Canvas,
  type Diagnostic,
  type DiagnosticComparison,
  type Evidence,
  type Objective,
  type ScheduleItem,
  type Validation,
  type TrackingSummary,
} from '../lib/seguimiento'

type Bundle = {
  summary: TrackingSummary
  canvas: Canvas
  ambitions: Ambition[]
  objectives: Objective[]
  activities: Activity[]
  evidence: Evidence[]
  diagnostics: Diagnostic[]
  schedule: ScheduleItem[]
  validations: Validation[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: Bundle }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }

type ActionError = { id: string; message: string } | null

function tracked(program: string): boolean {
  return (TRACKED_PROGRAMS as readonly string[]).includes(program)
}

function today(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateInputValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined
}

function formatDay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(year, month - 1, day))
}

function areaName(areas: Area[], id: string): string {
  return areas.find((area) => area.id === id)?.name ?? 'Área'
}

function latest(validations: Validation[], key: 'objective_id' | 'diagnostic_id', id: string): Validation | null {
  const matches = validations
    .filter((item) => item[key] === id)
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
  return matches.at(-1) ?? null
}

function field(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

type TrackingView = 'work' | 'summary' | 'diagnostics' | 'ambitions' | 'evidence' | 'evolution'
type TrackingProps = { cycleId: string; program: string; view?: TrackingView; projectName?: string; focusId?: string; navigate?: (section: ProjectSection, id?: string) => void }

export function SeguimientoPanel({ cycleId, program, view = 'work', projectName = '', focusId, navigate }: TrackingProps) {
  if (!tracked(program)) {
    return <p className={shell.meta}>Este programa no tiene seguimiento confirmado.</p>
  }
  return <SeguimientoCycle cycleId={cycleId} view={view} projectName={projectName} program={program} focusId={focusId} navigate={navigate} />
}

function SeguimientoCycle({ cycleId, view, projectName, program, focusId, navigate }: TrackingProps) {
  const me = useMe()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ActionError>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState({ status: 'loading' })
      const base = seguimientoUrl(cycleId, '')
      const [canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations, summary] =
        await Promise.all([
          requestSeguimiento(`${base}canvas`, parseCanvas),
          requestSeguimiento(`${base}ambitions`, parseAmbitionList),
          requestSeguimiento(`${base}objectives`, parseObjectiveList),
          requestSeguimiento(`${base}activities`, parseActivityList),
          requestSeguimiento(`${base}evidence`, parseEvidenceList),
          requestSeguimiento(`${base}diagnostics`, parseDiagnosticList),
          requestSeguimiento(`${base}schedule`, parseSchedule),
          requestSeguimiento(`${base}validations`, parseValidationList),
          requestSeguimiento(`${base}summary`, parseTrackingSummary),
        ])
      if (cancelled) {
        return
      }
      const results = [canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations, summary]
      const denied = results.find((item) => !item.ok && item.status === 403)
      const failed = results.find((item) => !item.ok)
      if (denied && !denied.ok) {
        setState({ status: 'forbidden', message: denied.message })
        return
      }
      if (failed && !failed.ok) {
        const resources = ['canvas', 'ambitions', 'objectives', 'activities', 'evidence', 'diagnostics', 'schedule', 'validations', 'summary']
        const resource = resources[results.indexOf(failed)]
        setState({ status: 'error', message: `${failed.message} (API: seguimiento/${resource}, HTTP ${failed.status}).` })
        return
      }
      if (
        !canvas.ok ||
        !ambitions.ok ||
        !objectives.ok ||
        !activities.ok ||
        !evidence.ok ||
        !diagnostics.ok ||
        !schedule.ok ||
        !validations.ok || !summary.ok
      ) {
        return
      }
      setState({
        status: 'ready',
        data: {
          summary: summary.data,
          canvas: canvas.data,
          ambitions: ambitions.data,
          objectives: objectives.data,
          activities: activities.data,
          evidence: evidence.data,
          diagnostics: diagnostics.data,
          schedule: schedule.data,
          validations: validations.data,
        },
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cycleId, attempt])

  async function run(id: string, exec: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    if (pendingId) {
      return
    }
    setPendingId(id)
    setActionError(null)
    const result = await exec()
    setPendingId(null)
    if (!result.ok) {
      setActionError({ id, message: result.message })
      return
    }
    setAttempt((value) => value + 1)
  }

  if (state.status === 'loading') {
    return <p className={shell.meta}>Cargando seguimiento…</p>
  }
  if (state.status === 'forbidden') {
    return (
      <section className={shell.section}>
        <h2>Seguimiento</h2>
        <p className={shell.formError} role="alert">
          {state.message}
        </p>
      </section>
    )
  }
  if (state.status === 'error') {
    return (
      <section className={shell.section}>
        <h2>Seguimiento</h2>
        <p className={shell.formError} role="alert">
          {state.message}
        </p>
        <button type="button" className={shell.buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
          Reintentar
        </button>
      </section>
    )
  }

  const bundle = state.data
  const areas = [...bundle.canvas.areas].sort((left, right) => left.position - right.position)
  const shared = { cycleId, pendingId, actionError, run, role: me.role, userId: me.id }

  if (view === 'summary') {
    const upcoming = bundle.activities.filter((item) => !item.completed_at).sort((left, right) => left.ends_on.localeCompare(right.ends_on)).slice(0, 5)
    const awaiting = bundle.objectives.filter((item) => item.status === 'pending_validation')
    return <>
      <ProjectHeading eyebrow="Un proyecto con propósito" title="Ideas que se convierten en impacto." />
      <div className="summary-hero"><div><p className="eyebrow">{projectName} · {program}</p><h2>Acompañamos el camino.<br />Construimos el siguiente paso.</h2><p>Del primer hallazgo a la evidencia de lo que hemos logrado.</p><button className="btn secondary" onClick={() => navigate?.('Diagnóstico 360°')}>Explorar diagnóstico <ArrowRight size={16} /></button></div><div className="summary-ring" style={{ background: `conic-gradient(#e4c99a ${bundle.summary.progress_percent}%, #ffffff25 0)` }}><span><strong>{Math.round(bundle.summary.progress_percent)}%</strong><small>avance del proyecto</small></span></div></div>
      <div className="summary-grid">
        <ProjectPanel title="Lo que sigue" action={<ProjectLink onClick={() => navigate?.('Alertas')}>Ver alertas</ProjectLink>}>
          {awaiting.map((objective) => <button className="record-row" key={objective.id} onClick={() => navigate?.('Objetivos y actividades', objective.id)}><Target size={20} /><div><strong>{objective.title}</strong><p>Objetivo pendiente de aprobación · {areaName(areas, objective.area_id)}</p></div><ChevronRight size={16} /></button>)}
          {upcoming.map((activity) => <button className="record-row" key={activity.id} onClick={() => navigate?.('Objetivos y actividades', activity.id)}><CalendarDays size={20} /><div><strong>{activity.title}</strong><p>{formatDay(activity.ends_on)} · Pendiente</p></div><ChevronRight size={16} /></button>)}
          {awaiting.length === 0 && upcoming.length === 0 && <p className="muted">No hay próximos pasos pendientes registrados.</p>}
        </ProjectPanel>
        <ProjectPanel title="El plan compartido">{bundle.objectives.length === 0 ? <p className="muted">Aún no hay objetivos registrados.</p> : bundle.objectives.map((objective) => { const progress = bundle.summary.objectives.find((item) => item.objective_id === objective.id)?.progress_percent ?? 0; return <div className="summary-objective" key={objective.id}><ProjectLink onClick={() => navigate?.('Objetivos y actividades', objective.id)}>{objective.title}</ProjectLink><div className="inline"><ProjectProgress value={progress} label={`Avance de ${objective.title}`} /><span className="small">{Math.round(progress)}%</span></div><span className={`badge ${objective.status === 'approved' ? 'olive' : 'sand'}`}>{STATUS_LABEL[objective.status]}</span></div> })}</ProjectPanel>
      </div>
      <ProjectPanel title="Historial reciente">{bundle.validations.length === 0 ? <p className="muted">Aún no hay decisiones de validación registradas.</p> : [...bundle.validations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((validation) => <div className="record-row" key={validation.id}><CheckCircle2 size={20} /><div><strong>{DECISION_LABEL[validation.decision as keyof typeof DECISION_LABEL] ?? validation.decision}</strong><p>{validation.observation} · {formatDateTime(validation.created_at)}</p></div></div>)}<p className="small muted">Avance: promedio de objetivos aprobados, con igual peso. Modificar actividades o evidencias requiere revalidar su objetivo.</p></ProjectPanel>
    </>
  }

  if (view === 'diagnostics' || view === 'evolution') return <DiagnosticSection {...shared} areas={areas} diagnostics={bundle.diagnostics} validations={bundle.validations} evolution={view === 'evolution'} focusId={focusId} />
  if (view === 'ambitions') return <AmbitionSection {...shared} ambitions={bundle.ambitions} />
  if (view === 'evidence') return <EvidenceSection {...shared} evidence={bundle.evidence} activities={bundle.activities} focusId={focusId} navigate={navigate} />

  return (
    <>
      <ObjectiveSection
        {...shared}
        summary={bundle.summary}
        focusId={focusId}
        areas={areas}
        ambitions={bundle.ambitions}
        objectives={bundle.objectives}
        activities={bundle.activities}
        evidence={bundle.evidence}
        validations={bundle.validations}
      />
    </>
  )
}

function FormDialog({ title, children, pending, error, actionId, trigger, primary = false }: { title: string; children: ReactNode; pending: boolean; error: ActionError; actionId: string; trigger?: ReactNode; primary?: boolean }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (pending) setSaving(true)
    else if (saving) {
      if (error?.id !== actionId) setOpen(false)
      setSaving(false)
    }
  }, [pending, saving, error, actionId])
  return <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next) }}>
    <DialogTrigger className={`btn ${primary ? 'primary' : 'secondary'}`}>{trigger ?? title}</DialogTrigger>
    <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto" onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }} onInteractOutside={(event) => { if (pending) event.preventDefault() }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Los cambios se guardan en el expediente y conservan su historial.</DialogDescription></DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
}

type Actions = {
  cycleId: string
  pendingId: string | null
  actionError: ActionError
  role: string
  userId: string
  run: (id: string, exec: () => Promise<{ ok: true } | { ok: false; message: string }>) => Promise<void>
}

function ErrorLine({ id, error }: { id: string; message?: never; error: ActionError }) {
  if (!error || error.id !== id) {
    return null
  }
  return (
    <p className={shell.formError} role="alert">
      {error.message}
    </p>
  )
}

function AmbitionSection({ cycleId, ambitions, pendingId, actionError, run }: Actions & { ambitions: Ambition[] }) {
  return (
    <>
      <ProjectHeading eyebrow="Lo que nos mueve" title="Ambiciones" description="El propósito que orienta los objetivos del proyecto." action={<FormDialog title="Nueva ambición" primary trigger={<><Plus size={17} /> Nueva ambición</>} pending={pendingId === 'ambition-new'} error={actionError} actionId="ambition-new"><TextForm id="ambition-new" title="Nueva ambición" submitLabel="Crear ambición" pending={pendingId === 'ambition-new'} error={actionError} onSubmit={(title, description) => run('ambition-new', async () => requestSeguimiento(seguimientoUrl(cycleId, 'ambitions'), parseAmbition, { method: 'POST', body: { title, description } }).then(asVoid))} /></FormDialog>} />
      {ambitions.length === 0 ? <p className={shell.meta}>No hay ambiciones registradas.</p> : null}
      <div className="ambition-grid">
      {ambitions.map((ambition) => (
        <article key={ambition.id} className="ambition-card">
          <Sparkles aria-hidden="true" size={23} />
          <h3>{ambition.title}</h3>
          {ambition.description ? <p className={shell.meta}>{ambition.description}</p> : null}
          <FormDialog title="Editar ambición" pending={pendingId === `ambition-${ambition.id}`} error={actionError} actionId={`ambition-${ambition.id}`}>
          <TextForm
            id={`ambition-${ambition.id}`}
            title="Editar ambición"
            submitLabel="Guardar ambición"
            pending={pendingId === `ambition-${ambition.id}`}
            error={actionError}
            initial={{ title: ambition.title, description: ambition.description }}
            onSubmit={(title, description) =>
              run(`ambition-${ambition.id}`, async () =>
                requestSeguimiento(seguimientoUrl(cycleId, `ambitions/${ambition.id}`), parseAmbition, {
                  method: 'PUT',
                  body: { title, description, expected_revision: ambition.revision },
                }).then(asVoid),
              )
            }
          />
          </FormDialog>
        </article>
      ))}
      </div>
    </>
  )
}

function asVoid(result: { ok: boolean; message?: string }): { ok: true } | { ok: false; message: string } {
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, message: 'message' in result && result.message ? result.message : 'No se pudo guardar.' }
}

function TextForm({
  id,
  title,
  submitLabel,
  pending,
  error,
  initial,
  onSubmit,
}: {
  id: string
  title: string
  submitLabel: string
  pending: boolean
  error: ActionError
  initial?: { title: string; description: string }
  onSubmit: (title: string, description: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = trimmedName(field(data, 'title'))
    if ('error' in name) {
      setLocalError(name.error)
      return
    }
    setLocalError(null)
    onSubmit(name.name, field(data, 'description').trim())
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <label className={styles.field}>
        Título
        <input name="title" required maxLength={200} defaultValue={initial?.title} disabled={pending} />
      </label>
      <label className={styles.field}>
        Descripción
        <textarea name="description" maxLength={20000} defaultValue={initial?.description} disabled={pending} />
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function ObjectiveSection({
  focusId,
  summary,
  cycleId,
  areas,
  ambitions,
  objectives,
  activities,
  evidence,
  validations,
  pendingId,
  actionError,
  role,
  userId,
  run,
}: Actions & {
  focusId?: string
  summary: TrackingSummary
  areas: Area[]
  ambitions: Ambition[]
  objectives: Objective[]
  activities: Activity[]
  evidence: Evidence[]
  validations: Validation[]
}) {
  const [query, setQuery] = useState('')
  const [objectiveFilter, setObjectiveFilter] = useState(objectives.some((item) => item.id === focusId) ? focusId! : 'all')
  const [selectedObjective, setSelectedObjective] = useState(objectives.some((item) => item.id === focusId) ? focusId! : '')
  const [selectedActivity, setSelectedActivity] = useState(activities.some((item) => item.id === focusId) ? focusId! : '')
  const [newActivityObjective, setNewActivityObjective] = useState(objectives[0]?.id ?? '')
  const [activityFilter, setActivityFilter] = useState('all')
  const filtered = objectives.filter((item) => (objectiveFilter === 'all' || item.id === objectiveFilter) && (item.title.toLocaleLowerCase('es-CR').includes(query.toLocaleLowerCase('es-CR')) || activities.some((activity) => activity.objective_id === item.id && activity.title.toLocaleLowerCase('es-CR').includes(query.toLocaleLowerCase('es-CR')))))
  return (
    <>
      <ProjectHeading eyebrow="De la intención a la acción" title="Objetivos y actividades" description="Un plan compartido para avanzar, aprender y dejar evidencia." action={<>
      <FormDialog title="Nuevo objetivo" pending={pendingId === 'objective-new'} error={actionError} actionId="objective-new" trigger={<><Target size={16} /> Nuevo objetivo</>}>
        <ObjectiveForm id="objective-new" title="Nuevo objetivo" submitLabel="Crear objetivo" areas={areas} ambitions={ambitions} pending={pendingId === 'objective-new'} error={actionError} onSubmit={(body) => run('objective-new', async () => requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjective, { method: 'POST', body }).then(asVoid))} />
      </FormDialog>
      <FormDialog title="Nueva actividad" primary pending={pendingId === 'activity-new'} error={actionError} actionId="activity-new" trigger={<><Plus size={17} /> Nueva actividad</>}>
        <label className={styles.field}>Objetivo asociado<select value={newActivityObjective} onChange={(event) => setNewActivityObjective(event.target.value)}>{objectives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {newActivityObjective ? <ActivityForm id="activity-new" title="Nueva actividad" submitLabel="Crear actividad" hint="La actividad queda a tu nombre." pending={pendingId === 'activity-new'} error={actionError} onSubmit={(body) => run('activity-new', async () => requestSeguimiento(seguimientoUrl(cycleId, 'activities'), parseActivity, { method: 'POST', body: { ...body, objective_id: newActivityObjective, responsible_id: userId } }).then(asVoid))} /> : <p>Crea primero un objetivo.</p>}
      </FormDialog>
      </>} />
      <div className="plan-summary"><div><strong>{Math.round(summary.progress_percent)}%</strong><p>avance del proyecto</p></div><ProjectProgress value={summary.progress_percent} /><span className="muted small">{summary.objectives_approved} objetivos aprobados · mismo peso</span></div>
      <div className="objectives-strip">{objectives.map((objective, index) => <div className="objective-strip" key={objective.id}><span className="number">{String(index + 1).padStart(2, '0')}</span><button className="plain objective-name" onClick={() => setObjectiveFilter(objective.id)}><strong>{objective.title}</strong><small>{Math.round(summary.objectives.find((item) => item.objective_id === objective.id)?.progress_percent ?? 0)}% · {activities.filter((item) => item.objective_id === objective.id).length} actividades</small></button><span className={`badge ${objective.status === 'approved' ? 'olive' : 'sand'}`}>{STATUS_LABEL[objective.status]}</span><button className="text-link" onClick={() => setSelectedObjective(objective.id)}>Editar</button>{objective.status === 'pending_validation' && canValidate(role) && <button className="btn secondary" onClick={() => setSelectedObjective(objective.id)}>Validar</button>}</div>)}</div>
      <div className="filters">
        <div className="segmented"><button disabled title="Los estados Kanban están pendientes de definición"><LayoutGrid size={15} />Kanban</button><button className="selected" aria-pressed="true"><List size={15} />Lista</button></div>
        <select aria-label="Filtrar actividades por objetivo" value={objectiveFilter} onChange={(event) => setObjectiveFilter(event.target.value)}><option value="all">Todos los objetivos</option>{objectives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select aria-label="Estado de las actividades" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}><option value="all">Todas las actividades</option><option value="pending">Pendientes</option><option value="completed">Completadas</option></select>
        <label className="search-box"><Search size={16} /><input aria-label="Buscar objetivo o actividad" type="search" placeholder="Buscar…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {objectives.length === 0 ? <p className={shell.meta}>No hay objetivos en este ciclo.</p> : null}
      <div className="activity-list">{activities.filter((item) => filtered.some((objective) => objective.id === item.objective_id) && (activityFilter === 'all' || (activityFilter === 'completed' ? Boolean(item.completed_at) : !item.completed_at))).map((activity) => <button className="record-row" key={activity.id} onClick={() => setSelectedActivity(activity.id)}><CheckCircle2 size={19} /><div><strong>{activity.title}</strong><p>{objectives.find((item) => item.id === activity.objective_id)?.title} · {formatDay(activity.ends_on)}</p></div><span className={`badge ${activity.completed_at ? 'olive' : 'neutral'}`}>{activity.completed_at ? 'Completada' : 'Pendiente'}</span><ChevronRight size={16} /></button>)}</div>
      <Dialog open={Boolean(selectedObjective)} onOpenChange={(open) => { if (!open && !pendingId) setSelectedObjective('') }}><DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{objectives.find((item) => item.id === selectedObjective)?.title ?? 'Objetivo'}</DialogTitle><DialogDescription>Objetivo, aprobación y actividades del plan compartido.</DialogDescription></DialogHeader>{objectives.filter((item) => item.id === selectedObjective).map((objective) => (
              <ObjectiveCard
                key={objective.id}
                cycleId={cycleId}
                objective={objective}
                progress={summary.objectives.find((item) => item.objective_id === objective.id)?.progress_percent ?? 0}
                areas={areas}
                ambitions={ambitions}
                activities={activities.filter((item) => item.objective_id === objective.id && (activityFilter === 'all' || (activityFilter === 'completed' ? Boolean(item.completed_at) : !item.completed_at)))}
                evidence={evidence}
                validation={latest(validations, 'objective_id', objective.id)}
                pendingId={pendingId}
                actionError={actionError}
                role={role}
                userId={userId}
                run={run}
              />
            ))}</DialogContent></Dialog>
      <Dialog open={Boolean(selectedActivity)} onOpenChange={(open) => { if (!open && !pendingId) setSelectedActivity('') }}><DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{activities.find((item) => item.id === selectedActivity)?.title ?? 'Actividad'}</DialogTitle><DialogDescription>Avance y evidencias vinculadas a la actividad.</DialogDescription></DialogHeader>{activities.filter((item) => item.id === selectedActivity).map((activity) => <ActivityCard key={activity.id} cycleId={cycleId} activity={activity} evidence={evidence.filter((item) => item.activity_id === activity.id)} pendingId={pendingId} actionError={actionError} run={run} />)}</DialogContent></Dialog>
      {objectives.length > 0 && filtered.length === 0 ? <p className={shell.meta}>No hay coincidencias. Cambia los filtros o la búsqueda.</p> : null}
      <p className="small muted">Las actividades admiten finalización manual y reversible. Los estados intermedios Kanban están pendientes de definición.</p>
    </>
  )
}

function ObjectiveCard({
  progress,
  cycleId,
  objective,
  areas,
  ambitions,
  activities,
  evidence,
  validation,
  pendingId,
  actionError,
  role,
  userId,
  run,
}: Actions & {
  progress: number
  objective: Objective
  areas: Area[]
  ambitions: Ambition[]
  activities: Activity[]
  evidence: Evidence[]
  validation: Validation | null
}) {
  const ambition = ambitions.find((item) => item.id === objective.ambition_id)
  return (
    <article className={styles.block} id={`objective-${objective.id}`}>
      <div className={styles.row}>
        <h3>{objective.title}</h3>
        <span className={styles.badge} data-status={objective.status}>
          {STATUS_LABEL[objective.status]}
        </span>
      </div>
      <div className={styles.objectiveProgress}><progress aria-label={`Avance de ${objective.title}`} value={progress} max={100} /><strong>{Math.round(progress)}%</strong></div>
      {objective.description ? <p className={shell.meta}>{objective.description}</p> : null}
      <p className={shell.meta}>
        {objective.deliverable ? `Entregable de trabajo: ${objective.deliverable}. ` : ''}
        {ambition ? `Ambición: ${ambition.title}.` : 'Sin ambición vinculada.'}
      </p>
      {validation ? (
        <p className={shell.meta}>
          Última decisión ({formatDateTime(validation.created_at)}): {validation.observation}
        </p>
      ) : null}
      <div className={shell.actions}>
        {canSubmit(objective.status) ? (
          <button
            type="button"
            className={shell.buttonSecondary}
            disabled={pendingId === `submit-${objective.id}`}
            onClick={() =>
              void run(`submit-${objective.id}`, async () =>
                requestSeguimiento(seguimientoUrl(cycleId, `objectives/${objective.id}/submit`), parseObjective, {
                  method: 'POST',
                  body: { expected_revision: objective.revision },
                }).then(asVoid),
              )
            }
          >
            Enviar a validación
          </button>
        ) : null}
      </div>
      <ErrorLine id={`submit-${objective.id}`} error={actionError} />
      {objective.status === 'pending_validation' && canValidate(role) ? (
        <ValidationForm
          id={`validate-${objective.id}`}
          pending={pendingId === `validate-${objective.id}`}
          error={actionError}
          onSubmit={(decision, observation) =>
            run(`validate-${objective.id}`, async () =>
              requestSeguimiento(
                seguimientoUrl(cycleId, `objectives/${objective.id}/validations`),
                parseValidation,
                {
                  method: 'POST',
                  body: { expected_revision: objective.revision, decision, observation },
                },
              ).then(asVoid),
            )
          }
        />
      ) : null}
      <FormDialog title="Editar objetivo" pending={pendingId === `objective-${objective.id}`} error={actionError} actionId={`objective-${objective.id}`}>
      <ObjectiveForm
        id={`objective-${objective.id}`}
        title="Editar objetivo"
        submitLabel="Guardar objetivo"
        areas={areas}
        ambitions={ambitions}
        pending={pendingId === `objective-${objective.id}`}
        error={actionError}
        initial={objective}
        onSubmit={(body) =>
          run(`objective-${objective.id}`, async () =>
            requestSeguimiento(seguimientoUrl(cycleId, `objectives/${objective.id}`), parseObjective, {
              method: 'PUT',
              body: { ...body, expected_revision: objective.revision },
            }).then(asVoid),
          )
        }
      />
      </FormDialog>
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          cycleId={cycleId}
          activity={activity}
          evidence={evidence.filter((item) => item.activity_id === activity.id)}
          pendingId={pendingId}
          actionError={actionError}
          run={run}
        />
      ))}
      <FormDialog title="Nueva actividad" pending={pendingId === `activity-new-${objective.id}`} error={actionError} actionId={`activity-new-${objective.id}`}>
      <ActivityForm
        id={`activity-new-${objective.id}`}
        title="Nueva actividad"
        submitLabel="Crear actividad"
        hint="La actividad queda a tu nombre."
        pending={pendingId === `activity-new-${objective.id}`}
        error={actionError}
        onSubmit={(body) =>
          run(`activity-new-${objective.id}`, async () =>
            requestSeguimiento(seguimientoUrl(cycleId, 'activities'), parseActivity, {
              method: 'POST',
              body: { ...body, objective_id: objective.id, responsible_id: userId },
            }).then(asVoid),
          )
        }
      />
      </FormDialog>
    </article>
  )
}

function ObjectiveForm({
  id,
  title,
  submitLabel,
  areas,
  ambitions,
  pending,
  error,
  initial,
  onSubmit,
}: {
  id: string
  title: string
  submitLabel: string
  areas: Area[]
  ambitions: Ambition[]
  pending: boolean
  error: ActionError
  initial?: Objective
  onSubmit: (body: {
    title: string
    description: string
    area_id: string
    ambition_id: string | null
    deliverable: string | null
  }) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = trimmedName(field(data, 'title'))
    if ('error' in name) {
      setLocalError(name.error)
      return
    }
    const areaId = field(data, 'area_id')
    if (!areaId) {
      setLocalError('Elige un área del canvas.')
      return
    }
    const deliverable = trimmedName(field(data, 'deliverable'))
    setLocalError(null)
    onSubmit({
      title: name.name,
      description: field(data, 'description').trim(),
      area_id: areaId,
      ambition_id: field(data, 'ambition_id') || null,
      deliverable: 'error' in deliverable ? null : deliverable.name,
    })
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h3>{title}</h3>
      <label className={styles.field}>
        Título
        <input name="title" required maxLength={200} defaultValue={initial?.title} disabled={pending} />
      </label>
      <label className={styles.field}>
        Descripción
        <textarea name="description" maxLength={20000} defaultValue={initial?.description} disabled={pending} />
      </label>
      <label className={styles.field}>
        Área
        <select name="area_id" required defaultValue={initial?.area_id ?? ''} disabled={pending}>
          <option value="">Elige un área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Ambición
        <select name="ambition_id" defaultValue={initial?.ambition_id ?? ''} disabled={pending}>
          <option value="">Sin ambición</option>
          {ambitions.map((ambition) => (
            <option key={ambition.id} value={ambition.id}>
              {ambition.title}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Referencia de entregable
        <input name="deliverable" maxLength={200} defaultValue={initial?.deliverable ?? ''} disabled={pending} />
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function ActivityCard({
  cycleId,
  activity,
  evidence,
  pendingId,
  actionError,
  run,
}: {
  cycleId: string
  activity: Activity
  evidence: Evidence[]
  pendingId: string | null
  actionError: ActionError
  run: Actions['run']
}) {
  return (
    <article className={styles.nested}>
      <div className={styles.row}>
        <h4>{activity.title}</h4>
        <span className={styles.badge}>{activity.completed_at ? <><CheckCircle2 aria-hidden="true" size={13} /> Completada</> : 'Pendiente'}</span>
      </div>
      <p className={shell.meta}>
        <CalendarDays aria-hidden="true" size={13} />{' '}
        {formatDay(activity.starts_on)} – {formatDay(activity.ends_on)}
      </p>
      <p className={shell.meta}><Paperclip aria-hidden="true" size={13} /> {evidence.length} evidencias</p>
      {activity.description ? <p className={shell.meta}>{activity.description}</p> : null}
      <div className={shell.actions}>
        <button
          type="button"
          className={shell.buttonSecondary}
          disabled={pendingId === `done-${activity.id}`}
          onClick={() =>
            void run(`done-${activity.id}`, async () =>
              requestSeguimiento(seguimientoUrl(cycleId, `activities/${activity.id}/completion`), parseActivity, {
                method: 'POST',
                body: { expected_revision: activity.revision, completed: activity.completed_at === null },
              }).then(asVoid),
            )
          }
        >
          {activity.completed_at ? 'Reabrir actividad' : 'Marcar realizada'}
        </button>
      </div>
      <ErrorLine id={`done-${activity.id}`} error={actionError} />
      <FormDialog title="Editar actividad" pending={pendingId === `activity-${activity.id}`} error={actionError} actionId={`activity-${activity.id}`}>
      <ActivityForm
        id={`activity-${activity.id}`}
        title="Editar actividad"
        submitLabel="Guardar actividad"
        hint="Se conserva el responsable, porque no hay un listado de personas del ciclo."
        pending={pendingId === `activity-${activity.id}`}
        error={actionError}
        initial={activity}
        onSubmit={(body) =>
          run(`activity-${activity.id}`, async () =>
            requestSeguimiento(seguimientoUrl(cycleId, `activities/${activity.id}`), parseActivity, {
              method: 'PUT',
              body: {
                ...body,
                objective_id: activity.objective_id,
                responsible_id: activity.responsible_id,
                expected_revision: activity.revision,
              },
            }).then(asVoid),
          )
        }
      />
      </FormDialog>
      {evidence.length === 0 ? <p className={shell.meta}>Sin evidencias.</p> : null}
      <ul className={shell.list}>
        {evidence.map((item) => (
          <li key={item.id}>
            <a href={item.url}>{item.title}</a>
            <span className={shell.cardMeta}> {item.kind}</span>
          </li>
        ))}
      </ul>
      <FormDialog title="Agregar evidencia" pending={pendingId === `evidence-${activity.id}`} error={actionError} actionId={`evidence-${activity.id}`}>
      <EvidenceForm
        id={`evidence-${activity.id}`}
        pending={pendingId === `evidence-${activity.id}`}
        error={actionError}
        onSubmit={(body) =>
          run(`evidence-${activity.id}`, async () =>
            requestSeguimiento(seguimientoUrl(cycleId, 'evidence'), parseEvidence, {
              method: 'POST',
              body: { ...body, activity_id: activity.id },
            }).then(asVoid),
          )
        }
      />
      </FormDialog>
    </article>
  )
}

function ActivityForm({
  id,
  title,
  submitLabel,
  hint,
  pending,
  error,
  initial,
  onSubmit,
}: {
  id: string
  title: string
  submitLabel: string
  hint: string
  pending: boolean
  error: ActionError
  initial?: Pick<Activity, 'title' | 'description' | 'starts_on' | 'ends_on'>
  onSubmit: (body: { title: string; description: string; starts_on: string; ends_on: string }) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = trimmedName(field(data, 'title'))
    const starts = isoDate(field(data, 'starts_on'))
    const ends = isoDate(field(data, 'ends_on'))
    if ('error' in name) {
      setLocalError(name.error)
      return
    }
    if ('error' in starts) {
      setLocalError(starts.error)
      return
    }
    if ('error' in ends) {
      setLocalError(ends.error)
      return
    }
    if (starts.date > ends.date) {
      setLocalError('La fecha inicial no puede superar la final.')
      return
    }
    setLocalError(null)
    onSubmit({
      title: name.name,
      description: field(data, 'description').trim(),
      starts_on: starts.date,
      ends_on: ends.date,
    })
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>{title}</h4>
      <label className={styles.field}>
        Título
        <input name="title" required maxLength={200} defaultValue={initial?.title} disabled={pending} />
      </label>
      <label className={styles.field}>
        Descripción
        <textarea name="description" maxLength={20000} defaultValue={initial?.description} disabled={pending} />
      </label>
      <label className={styles.field}>
        Inicio
        <input name="starts_on" type="date" required defaultValue={dateInputValue(initial?.starts_on)} disabled={pending} />
      </label>
      <label className={styles.field}>
        Fin
        <input name="ends_on" type="date" required defaultValue={dateInputValue(initial?.ends_on)} disabled={pending} />
      </label>
      <p className={shell.meta}>{hint}</p>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function EvidenceSection({ cycleId, evidence, activities, focusId, navigate, pendingId, actionError, run }: Actions & { evidence: Evidence[]; activities: Activity[]; focusId?: string; navigate?: (section: ProjectSection, id?: string) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(focusId ?? '')
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '')
  const current = evidence.find((item) => item.id === selected)
  const visible = evidence.filter((item) => item.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  return <>
    <ProjectHeading eyebrow="El respaldo de cada paso" title="Evidencias" description="El trabajo del proyecto, documentado y conectado con sus actividades." action={<FormDialog title="Agregar evidencia" primary trigger={<><Paperclip size={16} />Agregar evidencia</>} pending={pendingId === 'evidence-new'} error={actionError} actionId="evidence-new"><label className={styles.field}>Actividad<select value={activityId} onChange={(event) => setActivityId(event.target.value)}>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>{activityId ? <EvidenceForm id="evidence-new" pending={pendingId === 'evidence-new'} error={actionError} onSubmit={(body) => run('evidence-new', async () => requestSeguimiento(seguimientoUrl(cycleId, 'evidence'), parseEvidence, { method: 'POST', body: { ...body, activity_id: activityId } }).then(asVoid))} /> : <p>Registra primero una actividad.</p>}<p className="small muted">Los archivos privados están pendientes de integración. Se registran referencias por URL.</p></FormDialog>} />
    <div className="filters"><span className="muted">{evidence.length} evidencias en el proyecto</span><label className="search-box"><Search size={16} /><input aria-label="Buscar evidencias" placeholder="Buscar evidencia…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
    <div className="evidence-grid">{visible.map((item) => <button className="evidence-card" key={item.id} onClick={() => setSelected(item.id)}><div className={`evidence-cover ${item.kind === 'link' ? 'blue' : 'sand'}`}><FileText size={38} strokeWidth={1} /><span>{item.kind === 'link' ? 'ENLACE' : item.kind === 'file' ? 'DOCUMENTO' : item.kind === 'photograph' ? 'FOTOGRAFÍA' : 'VIDEO'}</span></div><div><h3>{item.title}</h3><p>{activities.find((activity) => activity.id === item.activity_id)?.title}</p><footer>{formatDateTime(item.created_at)}</footer></div></button>)}</div>
    {visible.length === 0 && <div className="empty"><h3>Sin evidencias para mostrar</h3><p>Agrega un respaldo o cambia el texto de búsqueda.</p></div>}
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!open) setSelected('') }}><DialogContent><DialogHeader><DialogTitle>{current?.title}</DialogTitle><DialogDescription>Evidencia vinculada a una actividad del proyecto.</DialogDescription></DialogHeader>{current && <><p className="muted small">{formatDateTime(current.created_at)}</p><div className="document-preview"><FileText size={28} /><h3>Contenido de referencia</h3><p>{current.description || 'Sin descripción registrada.'}</p></div><a className="text-link" href={current.url} target="_blank" rel="noopener noreferrer">Abrir referencia</a><ProjectLink onClick={() => navigate?.('Objetivos y actividades', current.activity_id)}>Ver actividad de origen</ProjectLink></>}</DialogContent></Dialog>
  </>
}

function EvidenceForm({
  id,
  pending,
  error,
  onSubmit,
}: {
  id: string
  pending: boolean
  error: ActionError
  onSubmit: (body: { title: string; description: string; kind: 'link'; url: string }) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = trimmedName(field(data, 'title'))
    const url = httpUrl(field(data, 'url'))
    if ('error' in name) {
      setLocalError(name.error)
      return
    }
    if ('error' in url) {
      setLocalError(url.error)
      return
    }
    setLocalError(null)
    onSubmit({
      title: name.name,
      description: field(data, 'description').trim(),
      kind: 'link',
      url: url.url,
    })
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>Nueva evidencia por URL</h4>
      <label className={styles.field}>
        Título
        <input name="title" required maxLength={200} disabled={pending} />
      </label>
      <label className={styles.field}>
        Descripción
        <textarea name="description" maxLength={20000} disabled={pending} />
      </label>
      <label className={styles.field}>
        URL
        <input name="url" type="url" required disabled={pending} />
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Registrar evidencia'}
        </button>
      </div>
    </form>
  )
}

function ValidationForm({
  id,
  pending,
  error,
  onSubmit,
}: {
  id: string
  pending: boolean
  error: ActionError
  onSubmit: (decision: 'approve' | 'request_correction' | 'reject', observation: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const decision = field(data, 'decision')
    const observation = field(data, 'observation').trim()
    if (decision !== 'approve' && decision !== 'request_correction' && decision !== 'reject') {
      setLocalError('Elige una decisión.')
      return
    }
    if (!observation) {
      setLocalError('La observación es obligatoria.')
      return
    }
    setLocalError(null)
    onSubmit(decision, observation)
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>Validar</h4>
      <label className={styles.field}>
        Decisión
        <select name="decision" required defaultValue="approve" disabled={pending}>
          {Object.entries(DECISION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Observación
        <textarea name="observation" required maxLength={20000} disabled={pending} />
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Registrar decisión'}
        </button>
      </div>
    </form>
  )
}

export function ScheduleSection({ areas, schedule }: { areas: Area[]; schedule: ScheduleItem[] }) {
  return (
    <section className={shell.section} aria-labelledby="cronograma-titulo">
      <h2 id="cronograma-titulo">Cronograma</h2>
      {schedule.length === 0 ? <p className={shell.meta}>No hay actividades para mostrar en el cronograma.</p> : null}
      <ul className={shell.list}>
        {schedule.map((item) => (
          <li key={item.id} className={styles.block}>
            <strong>{item.title}</strong>
            <span className={shell.cardMeta}>
              {formatDay(item.starts_on)} – {formatDay(item.ends_on)} · {areaName(areas, item.area_id)}
              {item.deliverable ? ` · ${item.deliverable}` : ''}
              {item.completed_at ? ' · Realizada' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DiagnosticSection({
  evolution = false,
  focusId,
  cycleId,
  areas,
  diagnostics,
  validations,
  pendingId,
  actionError,
  role,
  run,
}: Actions & { areas: Area[]; diagnostics: Diagnostic[]; validations: Validation[]; evolution?: boolean; focusId?: string }) {
  const [comparison, setComparison] = useState<DiagnosticComparison | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const approved = diagnostics.filter((item) => item.status === 'approved')
  const ordered = [...diagnostics].sort((a, b) => b.assessed_on.localeCompare(a.assessed_on))
  const [selected, setSelected] = useState(focusId ?? ordered.find((item) => item.status === 'approved')?.id ?? ordered[0]?.id ?? '')
  const current = diagnostics.find((item) => item.id === selected) ?? ordered[0]
  const [rotation, setRotation] = useState({ x: -18, y: -28 })
  const [activeArea, setActiveArea] = useState('')
  const faces = ['top', 'right', 'back', 'left', 'front', 'bottom']
  const colors = ['olive', 'sand', 'blue', 'clay', 'orange', 'blue']
  return (
    <>
      <ProjectHeading eyebrow="Comprender para avanzar" title={evolution ? 'Evolución' : 'Diagnóstico 360°'} description={evolution ? 'Compara fotografías aprobadas para observar la evolución del proyecto.' : 'El Cubo 360 reúne seis áreas de negocio para orientar los objetivos del proyecto.'} action={<>
        <FormDialog title="Historial" trigger={<><History size={16} /> Historial</>} pending={false} error={null} actionId="history"><div className="stack">{ordered.map((item) => <button className="record-row" key={item.id} onClick={() => setSelected(item.id)}><CalendarDays size={18} /><div><strong>{formatDay(item.assessed_on)}</strong><p>{STATUS_LABEL[item.status]}</p></div></button>)}<p className="small muted">Selecciona una fotografía; cierra el historial para explorar sus áreas.</p></div></FormDialog>
        {!evolution && <FormDialog title="Nuevo diagnóstico" primary trigger={<><Plus size={17} /> Nuevo diagnóstico</>} pending={pendingId === 'diagnostic-new'} error={actionError} actionId="diagnostic-new"><DiagnosticForm id="diagnostic-new" areas={areas} approved={approved} pending={pendingId === 'diagnostic-new'} error={actionError} onSubmit={(body) => run('diagnostic-new', async () => requestSeguimiento(seguimientoUrl(cycleId, 'diagnostics'), parseDiagnostic, { method: 'POST', body }).then(asVoid))} /></FormDialog>}
      </>} />
      {!evolution && current && <>
        <div className="diagnostic-toolbar"><div className="inline"><span className="eyebrow">Fotografía del proyecto</span><select aria-label="Seleccionar diagnóstico" value={current.id} onChange={(event) => setSelected(event.target.value)}>{ordered.map((item) => <option key={item.id} value={item.id}>{formatDay(item.assessed_on)} · {STATUS_LABEL[item.status]}</option>)}</select><span className={`badge ${current.status === 'approved' ? 'olive' : 'sand'}`}>{STATUS_LABEL[current.status]}</span></div></div>
        <div className="diagnostic-overview"><ProjectPanel className="cube-panel"><div className="panel-heading"><h2>El Cubo 360</h2><span className="small muted">Evaluación descriptiva</span></div><div className="cube360"><div className="cube-scene" role="group" aria-label="Cubo 360 interactivo"><div className="cube" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>{areas.map((area, index) => <button type="button" key={area.id} className={`cube-face cube-face--${faces[index]} ${colors[index]}${activeArea === area.id ? ' active' : ''}`} onClick={() => setActiveArea(area.id)}><span className={`area-icon ${colors[index]}`}><Box size={21} strokeWidth={1.6} /></span><span className="cube-face-name">{area.name}</span><span className="small">{current.assessments.some((item) => item.area_id === area.id) ? 'Observación registrada' : 'Pendiente'}</span></button>)}</div></div><p className="cube-instructions">Usa los controles para girar. Selecciona una cara para ver el detalle.</p><div className="cube-controls" role="group" aria-label="Controles de giro"><button className="btn secondary" onClick={() => setRotation({ x: 0, y: rotation.y + 90 })}>Girar a la izquierda</button><button className="btn secondary" onClick={() => setRotation({ x: 0, y: rotation.y - 90 })}>Girar a la derecha</button><button className="btn secondary" onClick={() => setRotation({ x: -90, y: rotation.y })}>Ver cara superior</button><button className="btn secondary" onClick={() => setRotation({ x: -18, y: -28 })}>Restablecer vista</button></div></div><div className="chart-legend"><span>Evaluación: {formatDay(current.assessed_on)}</span></div></ProjectPanel><div className="diagnostic-story"><p className="eyebrow">Una fotografía, nuevas posibilidades</p><div className="score"><strong>{current.assessments.length}</strong><span>/ {areas.length}<br /><small>áreas registradas</small></span></div><h2>{current.status === 'approved' ? 'Cada avance cuenta.' : 'Tu próxima fotografía está en camino.'}</h2><p>Explora las observaciones para orientar los objetivos del proyecto.</p><div className="evolution-counts"><div><strong>{approved.length}</strong><span>fotografías aprobadas</span></div><div><strong>{diagnostics.length}</strong><span>fotografías registradas</span></div></div><p className="small muted">Las escalas numéricas y sus indicadores comparativos están pendientes de definición. No se calculan puntajes.</p></div></div>
        <div className="section-heading"><div><h2>Seis caras, un mismo proyecto</h2><p className="muted">Explora cada cara del Cubo 360 para orientar los objetivos del plan.</p></div><span className="small muted">{current.assessments.length} áreas evaluadas</span></div><div className="area-grid">{areas.map((area, index) => <button className="area-card" key={area.id} onClick={() => setActiveArea(area.id)}><span className={`area-icon ${colors[index]}`}><Box size={21} strokeWidth={1.6} /></span><h3>{area.name}</h3><p>{current.assessments.find((item) => item.area_id === area.id)?.observation ?? 'Pendiente de completar'}</p></button>)}</div>
        <Dialog open={Boolean(activeArea)} onOpenChange={(open) => { if (!open) setActiveArea('') }}><DialogContent><DialogHeader><DialogTitle>{areaName(areas, activeArea)}</DialogTitle><DialogDescription>Observación de la fotografía seleccionada.</DialogDescription></DialogHeader><p>{current.assessments.find((item) => item.area_id === activeArea)?.observation ?? 'Pendiente de completar'}</p></DialogContent></Dialog>
      </>}
      <section className="panel mt-6" aria-label={evolution ? 'Comparación de fotografías' : 'Acciones del diagnóstico'}>
      {diagnostics.length === 0 ? <p className={shell.meta}>No hay fotografías en este ciclo.</p> : null}
      {(!evolution && current ? [current] : []).map((diagnostic) => {
        const decision = latest(validations, 'diagnostic_id', diagnostic.id)
        return (
          <article key={diagnostic.id} className={styles.block}>
            <div className={styles.row}>
              <h3>{formatDay(diagnostic.assessed_on)}</h3>
              <span className={styles.badge} data-status={diagnostic.status}>
                {STATUS_LABEL[diagnostic.status]}
              </span>
            </div>
            {decision ? (
              <p className={shell.meta}>
                Última decisión ({formatDateTime(decision.created_at)}): {decision.observation}
              </p>
            ) : null}
            {diagnostic.status !== 'approved' ? (
              <FormDialog title="Continuar diagnóstico" pending={pendingId === `diagnostic-${diagnostic.id}`} error={actionError} actionId={`diagnostic-${diagnostic.id}`}>
              <DiagnosticForm
                id={`diagnostic-${diagnostic.id}`}
                areas={areas}
                approved={approved}
                pending={pendingId === `diagnostic-${diagnostic.id}`}
                error={actionError}
                initial={diagnostic}
                onSubmit={(body) =>
                  run(`diagnostic-${diagnostic.id}`, async () =>
                    requestSeguimiento(seguimientoUrl(cycleId, `diagnostics/${diagnostic.id}`), parseDiagnostic, {
                      method: 'PUT',
                      body: { ...body, expected_revision: diagnostic.revision },
                    }).then(asVoid),
                  )
                }
              />
              </FormDialog>
            ) : null}
            {canSubmit(diagnostic.status) ? (
              <button
                type="button"
                className={shell.buttonSecondary}
                disabled={pendingId === `submit-photo-${diagnostic.id}`}
                onClick={() =>
                  void run(`submit-photo-${diagnostic.id}`, async () =>
                    requestSeguimiento(
                      seguimientoUrl(cycleId, `diagnostics/${diagnostic.id}/submit`),
                      parseDiagnostic,
                      { method: 'POST', body: { expected_revision: diagnostic.revision } },
                    ).then(asVoid),
                  )
                }
              >
                Enviar a validación
              </button>
            ) : null}
            <ErrorLine id={`submit-photo-${diagnostic.id}`} error={actionError} />
            {diagnostic.status === 'pending_validation' && canValidate(role) ? (
              <FormDialog title="Validar diagnóstico" pending={pendingId === `validate-photo-${diagnostic.id}`} error={actionError} actionId={`validate-photo-${diagnostic.id}`}>
              <ValidationForm
                id={`validate-photo-${diagnostic.id}`}
                pending={pendingId === `validate-photo-${diagnostic.id}`}
                error={actionError}
                onSubmit={(decisionName, observation) =>
                  run(`validate-photo-${diagnostic.id}`, async () =>
                    requestSeguimiento(
                      seguimientoUrl(cycleId, `diagnostics/${diagnostic.id}/validations`),
                      parseValidation,
                      {
                        method: 'POST',
                        body: {
                          expected_revision: diagnostic.revision,
                          decision: decisionName,
                          observation,
                        },
                      },
                    ).then(asVoid),
                  )
                }
              />
              </FormDialog>
            ) : null}
          </article>
        )
      })}
      {evolution && approved.length >= 2 ? (
        <CompareForm
          approved={approved}
          onCompare={(previousId, currentId) => {
            void (async () => {
              const result = await requestSeguimiento(
                seguimientoUrl(cycleId, `diagnostics/compare/${previousId}/${currentId}`),
                parseComparison,
              )
              if (!result.ok) {
                setComparison(null)
                setCompareError(result.message)
                return
              }
              setCompareError(null)
              setComparison(result.data)
            })()
          }}
        />
      ) : null}
      {evolution && approved.length < 2 && <p className="muted">La comparación estará disponible con dos diagnósticos aprobados.</p>}
      {compareError ? (
        <p className={shell.formError} role="alert">
          {compareError}
        </p>
      ) : null}
      {comparison ? (
        <ul className={styles.areas}>
          {comparison.areas.map((item) => (
            <li key={item.area_id}>
              <strong>{areaName(areas, item.area_id)}.</strong> Antes: {item.before} Después: {item.after}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
    </>
  )
}

function DiagnosticForm({
  id,
  areas,
  approved,
  pending,
  error,
  initial,
  onSubmit,
}: {
  id: string
  areas: Area[]
  approved: Diagnostic[]
  pending: boolean
  error: ActionError
  initial?: Diagnostic
  onSubmit: (body: {
    assessed_on: string
    assessments: { area_id: string; observation: string }[]
    supersedes_id: string | null
  }) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const assessed = isoDate(field(data, 'assessed_on'))
    if ('error' in assessed) {
      setLocalError(assessed.error)
      return
    }
    const assessments = areas.map((area) => ({
      area_id: area.id,
      observation: field(data, `area-${area.id}`).trim(),
    }))
    if (assessments.some((item) => !item.observation)) {
      setLocalError('Describe las seis áreas.')
      return
    }
    setLocalError(null)
    onSubmit({
      assessed_on: assessed.date,
      assessments,
      supersedes_id: initial ? initial.supersedes_id : field(data, 'supersedes_id') || null,
    })
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h3>{initial ? 'Corregir fotografía' : 'Nueva fotografía'}</h3>
      <label className={styles.field}>
        Fecha
        <input
          name="assessed_on"
          type="date"
          required
          defaultValue={initial ? dateInputValue(initial.assessed_on) : today()}
          disabled={pending}
        />
      </label>
      {areas.map((area) => (
        <label key={area.id} className={styles.field}>
          {area.name}
          <textarea
            name={`area-${area.id}`}
            required
            maxLength={20000}
            defaultValue={initial?.assessments.find((item) => item.area_id === area.id)?.observation}
            disabled={pending}
          />
        </label>
      ))}
      {initial ? <p className={shell.meta}>Se conserva la fotografía de origen.</p> : null}
      {!initial && approved.length > 0 ? (
        <label className={styles.field}>
          Fotografía anterior aprobada
          <select name="supersedes_id" defaultValue="" disabled={pending}>
            <option value="">Ninguna</option>
            {approved.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDay(item.assessed_on)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : initial ? 'Guardar fotografía' : 'Crear fotografía'}
        </button>
      </div>
    </form>
  )
}

function CompareForm({
  approved,
  onCompare,
}: {
  approved: Diagnostic[]
  onCompare: (previousId: string, currentId: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const previousId = field(data, 'previous_id')
    const currentId = field(data, 'current_id')
    if (!previousId || !currentId) {
      setLocalError('Elige dos fotografías aprobadas.')
      return
    }
    if (previousId === currentId) {
      setLocalError('Elige dos fotografías distintas.')
      return
    }
    setLocalError(null)
    onCompare(previousId, currentId)
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h3>Comparar fotografías aprobadas</h3>
      <label className={styles.field}>
        Anterior
        <select name="previous_id" required defaultValue="">
          <option value="">Elige una fotografía</option>
          {approved.map((item) => (
            <option key={item.id} value={item.id}>
              {formatDay(item.assessed_on)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Posterior
        <select name="current_id" required defaultValue="">
          <option value="">Elige una fotografía</option>
          {approved.map((item) => (
            <option key={item.id} value={item.id}>
              {formatDay(item.assessed_on)}
            </option>
          ))}
        </select>
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : null}
      <div className={shell.actions}>
        <button className={shell.buttonSecondary} type="submit">
          Comparar
        </button>
      </div>
    </form>
  )
}
