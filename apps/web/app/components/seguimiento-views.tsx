'use client'

import { useEffect, useState, type FormEvent } from 'react'

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
} from '../lib/seguimiento'

type Bundle = {
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

export function SeguimientoPanel({ cycleId, program }: { cycleId: string; program: string }) {
  if (!tracked(program)) {
    return <p className={shell.meta}>Este programa no tiene seguimiento confirmado.</p>
  }
  return <SeguimientoCycle cycleId={cycleId} />
}

function SeguimientoCycle({ cycleId }: { cycleId: string }) {
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
      const [canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations] =
        await Promise.all([
          requestSeguimiento(`${base}canvas`, parseCanvas),
          requestSeguimiento(`${base}ambitions`, parseAmbitionList),
          requestSeguimiento(`${base}objectives`, parseObjectiveList),
          requestSeguimiento(`${base}activities`, parseActivityList),
          requestSeguimiento(`${base}evidence`, parseEvidenceList),
          requestSeguimiento(`${base}diagnostics`, parseDiagnosticList),
          requestSeguimiento(`${base}schedule`, parseSchedule),
          requestSeguimiento(`${base}validations`, parseValidationList),
        ])
      if (cancelled) {
        return
      }
      const results = [canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations]
      const denied = results.find((item) => !item.ok && item.status === 403)
      const failed = results.find((item) => !item.ok)
      if (denied && !denied.ok) {
        setState({ status: 'forbidden', message: denied.message })
        return
      }
      if (failed && !failed.ok) {
        setState({ status: 'error', message: failed.message })
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
        !validations.ok
      ) {
        return
      }
      setState({
        status: 'ready',
        data: {
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

  return (
    <div className={styles.stack}>
      <section className={shell.section} aria-labelledby="canvas-titulo">
        <h2 id="canvas-titulo">Canvas</h2>
        <p className={shell.meta}>
          {bundle.canvas.program}, versión {bundle.canvas.version}. Las áreas se registran con observación, sin puntaje.
        </p>
        <ol className={styles.areas}>
          {areas.map((area) => (
            <li key={area.id}>
              <strong>{area.name}.</strong> {area.description}
            </li>
          ))}
        </ol>
      </section>
      <AmbitionSection {...shared} ambitions={bundle.ambitions} />
      <ObjectiveSection
        {...shared}
        areas={areas}
        ambitions={bundle.ambitions}
        objectives={bundle.objectives}
        activities={bundle.activities}
        evidence={bundle.evidence}
        validations={bundle.validations}
      />
      <ScheduleSection areas={areas} schedule={bundle.schedule} />
      <DiagnosticSection {...shared} areas={areas} diagnostics={bundle.diagnostics} validations={bundle.validations} />
    </div>
  )
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
    <section className={shell.section} aria-labelledby="ambiciones-titulo">
      <h2 id="ambiciones-titulo">Ambiciones</h2>
      <p className={shell.meta}>Pertenecen al emprendimiento y pueden existir sin un objetivo.</p>
      {ambitions.length === 0 ? <p className={shell.meta}>No hay ambiciones registradas.</p> : null}
      {ambitions.map((ambition) => (
        <article key={ambition.id} className={styles.block}>
          <h3>{ambition.title}</h3>
          {ambition.description ? <p className={shell.meta}>{ambition.description}</p> : null}
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
        </article>
      ))}
      <TextForm
        id="ambition-new"
        title="Nueva ambición"
        submitLabel="Crear ambición"
        pending={pendingId === 'ambition-new'}
        error={actionError}
        onSubmit={(title, description) =>
          run('ambition-new', async () =>
            requestSeguimiento(seguimientoUrl(cycleId, 'ambitions'), parseAmbition, {
              method: 'POST',
              body: { title, description },
            }).then(asVoid),
          )
        }
      />
    </section>
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
  areas: Area[]
  ambitions: Ambition[]
  objectives: Objective[]
  activities: Activity[]
  evidence: Evidence[]
  validations: Validation[]
}) {
  return (
    <section className={shell.section} aria-labelledby="objetivos-titulo">
      <h2 id="objetivos-titulo">Objetivos y actividades</h2>
      {objectives.length === 0 ? <p className={shell.meta}>No hay objetivos en este ciclo.</p> : null}
      {areas.map((area) => {
        const items = objectives.filter((item) => item.area_id === area.id)
        if (items.length === 0) {
          return null
        }
        return (
          <div key={area.id} className={styles.stack}>
            <h3>{area.name}</h3>
            {items.map((objective) => (
              <ObjectiveCard
                key={objective.id}
                cycleId={cycleId}
                objective={objective}
                areas={areas}
                ambitions={ambitions}
                activities={activities.filter((item) => item.objective_id === objective.id)}
                evidence={evidence}
                validation={latest(validations, 'objective_id', objective.id)}
                pendingId={pendingId}
                actionError={actionError}
                role={role}
                userId={userId}
                run={run}
              />
            ))}
          </div>
        )
      })}
      <ObjectiveForm
        id="objective-new"
        title="Nuevo objetivo"
        submitLabel="Crear objetivo"
        areas={areas}
        ambitions={ambitions}
        pending={pendingId === 'objective-new'}
        error={actionError}
        onSubmit={(body) =>
          run('objective-new', async () =>
            requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjective, {
              method: 'POST',
              body,
            }).then(asVoid),
          )
        }
      />
    </section>
  )
}

function ObjectiveCard({
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
  objective: Objective
  areas: Area[]
  ambitions: Ambition[]
  activities: Activity[]
  evidence: Evidence[]
  validation: Validation | null
}) {
  const ambition = ambitions.find((item) => item.id === objective.ambition_id)
  return (
    <article className={styles.block}>
      <div className={styles.row}>
        <h3>{objective.title}</h3>
        <span className={styles.badge} data-status={objective.status}>
          {STATUS_LABEL[objective.status]}
        </span>
      </div>
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
        <span className={shell.meta}>{activity.completed_at ? 'Realizada' : 'Pendiente'}</span>
      </div>
      <p className={shell.meta}>
        {formatDay(activity.starts_on)} – {formatDay(activity.ends_on)}
      </p>
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
      {evidence.length === 0 ? <p className={shell.meta}>Sin evidencias.</p> : null}
      <ul className={shell.list}>
        {evidence.map((item) => (
          <li key={item.id}>
            <a href={item.url}>{item.title}</a>
            <span className={shell.cardMeta}> {item.kind}</span>
          </li>
        ))}
      </ul>
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

function ScheduleSection({ areas, schedule }: { areas: Area[]; schedule: ScheduleItem[] }) {
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
  cycleId,
  areas,
  diagnostics,
  validations,
  pendingId,
  actionError,
  role,
  run,
}: Actions & { areas: Area[]; diagnostics: Diagnostic[]; validations: Validation[] }) {
  const [comparison, setComparison] = useState<DiagnosticComparison | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const approved = diagnostics.filter((item) => item.status === 'approved')
  return (
    <section className={shell.section} aria-labelledby="fotografias-titulo">
      <h2 id="fotografias-titulo">Fotografías del ciclo</h2>
      <p className={shell.meta}>Cada fotografía describe las seis áreas. Una fotografía aprobada no se edita.</p>
      {diagnostics.length === 0 ? <p className={shell.meta}>No hay fotografías en este ciclo.</p> : null}
      {diagnostics.map((diagnostic) => {
        const decision = latest(validations, 'diagnostic_id', diagnostic.id)
        return (
          <article key={diagnostic.id} className={styles.block}>
            <div className={styles.row}>
              <h3>{formatDay(diagnostic.assessed_on)}</h3>
              <span className={styles.badge} data-status={diagnostic.status}>
                {STATUS_LABEL[diagnostic.status]}
              </span>
            </div>
            <ul className={styles.areas}>
              {diagnostic.assessments.map((item) => (
                <li key={item.area_id}>
                  <strong>{areaName(areas, item.area_id)}.</strong> {item.observation}
                </li>
              ))}
            </ul>
            {decision ? (
              <p className={shell.meta}>
                Última decisión ({formatDateTime(decision.created_at)}): {decision.observation}
              </p>
            ) : null}
            {diagnostic.status !== 'approved' ? (
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
            ) : null}
          </article>
        )
      })}
      <DiagnosticForm
        id="diagnostic-new"
        areas={areas}
        approved={approved}
        pending={pendingId === 'diagnostic-new'}
        error={actionError}
        onSubmit={(body) =>
          run('diagnostic-new', async () =>
            requestSeguimiento(seguimientoUrl(cycleId, 'diagnostics'), parseDiagnostic, {
              method: 'POST',
              body,
            }).then(asVoid),
          )
        }
      />
      {approved.length >= 2 ? (
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
