'use client'

import { useState, type FormEvent, type ReactNode } from 'react'

import { useMe } from './authenticated-shell'
import shell from './expediente.module.css'
import styles from './comunicacion.module.css'
import { LoadMore } from './load-more'
import { formatDateTime, localDateTimeValue } from '../lib/expediente'
import { usePagedList } from '../lib/use-paged-list'
import {
  awareDateTime,
  canManageMeetings,
  isoDate,
  meetingsUrl,
  optionalHttpUrl,
  parseAgreement,
  parseAgreementList,
  parseMeeting,
  parseMeetingList,
  parseMinutes,
  parseMinutesList,
  participantLines,
  requestComunicacion,
  requiredText,
  TRACKED_PROGRAMS,
  type Agreement,
  type Meeting,
  type Minutes,
} from '../lib/comunicacion'

const fetchMeetings = (url: string) => requestComunicacion(url, parseMeetingList)
const fetchMinutes = (url: string) => requestComunicacion(url, parseMinutesList)
const fetchAgreements = (url: string) => requestComunicacion(url, parseAgreementList)

type ActionError = { id: string; message: string } | null

const dayFormat = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'UTC' })

function tracked(program: string): boolean {
  return (TRACKED_PROGRAMS as readonly string[]).includes(program)
}

function formatDay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return dayFormat.format(new Date(Date.UTC(year, month - 1, day)))
}

function field(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

function settled(result: { ok: boolean; message?: string }): { ok: true } | { ok: false; message: string } {
  if (result.ok) {
    return { ok: true }
  }
  return { ok: false, message: 'message' in result && result.message ? result.message : 'No se pudo guardar.' }
}

function originLabel(origin: Minutes['origin']): string {
  return origin === 'ia_borrador' ? 'Borrador desde transcripción' : 'Redacción manual'
}

export function MeetingsPanel({ cycleId, program }: { cycleId: string; program: string }) {
  if (!tracked(program)) {
    return <p className={shell.meta}>Este programa no tiene reuniones en el alcance inicial.</p>
  }
  return <MeetingsCycle cycleId={cycleId} />
}

function MeetingsCycle({ cycleId }: { cycleId: string }) {
  const me = useMe()
  const manage = canManageMeetings(me.role)
  const meetings = usePagedList((limit, offset) => meetingsUrl(cycleId, '', { limit, offset }), fetchMeetings)
  const state = meetings.state
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ActionError>(null)

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
    meetings.reload()
  }

  if (state.status === 'loading') {
    return <p className={shell.meta}>Cargando reuniones…</p>
  }
  if (state.status !== 'ready') {
    return (
      <section className={shell.section}>
        <h2>Reuniones</h2>
        <p className={shell.formError} role="alert">
          {state.message}
        </p>
        {state.status === 'error' ? (
          <button type="button" className={shell.buttonSecondary} onClick={meetings.reload}>
            Reintentar
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className={shell.section} aria-labelledby="reuniones-titulo">
      <h2 id="reuniones-titulo">Reuniones</h2>
      <p className={shell.meta}>
        Fecha, participantes y referencia de la herramienta externa. La minuta publicada queda fija; una corrección es
        otra minuta.
      </p>
      {state.data.length === 0 ? <p className={shell.meta}>No hay reuniones en este ciclo.</p> : null}
      <div className={styles.stack}>
        {state.data.map((meeting) => (
          <MeetingCard
            key={`${meeting.id}:${meeting.revision}`}
            cycleId={cycleId}
            meeting={meeting}
            manage={manage}
            userId={me.id}
            onChanged={meetings.reload}
          />
        ))}
      </div>
      <LoadMore
        hasMore={meetings.hasMore}
        loading={meetings.loadingMore}
        error={meetings.moreError}
        onLoad={() => void meetings.loadMore()}
        label="Cargar más reuniones"
      />
      {manage ? (
        <MeetingForm
          id="meeting-new"
          title="Nueva reunión"
          submitLabel="Registrar reunión"
          pending={pendingId === 'meeting-new'}
          error={actionError}
          onSubmit={(body) =>
            run('meeting-new', async () =>
              requestComunicacion(meetingsUrl(cycleId), parseMeeting, { method: 'POST', body }).then(settled),
            )
          }
        />
      ) : null}
    </section>
  )
}

function MeetingCard({
  cycleId,
  meeting,
  manage,
  userId,
  onChanged,
}: {
  cycleId: string
  meeting: Meeting
  manage: boolean
  userId: string
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ActionError>(null)
  const active = meeting.revoked_at === null
  const canWrite = manage && active

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
    onChanged()
  }

  return (
    <article className={styles.block}>
      <div className={styles.row}>
        <h3>{meeting.title}</h3>
        {meeting.revoked_at ? (
          <span className={styles.badge} data-status="revocada">
            Revocada
          </span>
        ) : null}
      </div>
      <p className={shell.meta}>{formatDateTime(meeting.scheduled_at)}</p>
      <p className={shell.meta}>Participantes: {meeting.participants.join(', ')}</p>
      {meeting.reference_url ? (
        <p className={shell.meta}>
          <a href={meeting.reference_url} rel="noreferrer">
            Referencia de la reunión
          </a>
        </p>
      ) : null}
      <div className={shell.actions}>
        <button
          type="button"
          className={shell.buttonSecondary}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? 'Ocultar minuta y acuerdos' : 'Ver minuta y acuerdos'}
        </button>
      </div>
      {open ? (
        <MeetingChildren cycleId={cycleId} meeting={meeting} canWrite={canWrite} manage={manage} userId={userId} />
      ) : null}
      {canWrite ? (
        <>
          <MeetingForm
            id={`meeting-${meeting.id}`}
            title="Editar reunión"
            submitLabel="Guardar reunión"
            pending={pendingId === `meeting-${meeting.id}`}
            error={actionError}
            initial={meeting}
            onSubmit={(body) =>
              run(`meeting-${meeting.id}`, async () =>
                requestComunicacion(meetingsUrl(cycleId, meeting.id), parseMeeting, {
                  method: 'PUT',
                  body: { ...body, expected_revision: meeting.revision },
                }).then(settled),
              )
            }
          />
          <ObservationForm
            id={`revoke-${meeting.id}`}
            title="Revocar reunión"
            submitLabel="Revocar"
            hint="La reunión revocada se conserva. No admite minutas ni acuerdos nuevos."
            pending={pendingId === `revoke-${meeting.id}`}
            error={actionError}
            onSubmit={(observation) =>
              run(`revoke-${meeting.id}`, async () =>
                requestComunicacion(meetingsUrl(cycleId, meeting.id), parseMeeting, {
                  method: 'DELETE',
                  body: { expected_revision: meeting.revision, observation },
                }).then(settled),
              )
            }
          />
        </>
      ) : null}
    </article>
  )
}

function MeetingChildren({
  cycleId,
  meeting,
  canWrite,
  manage,
  userId,
}: {
  cycleId: string
  meeting: Meeting
  canWrite: boolean
  manage: boolean
  userId: string
}) {
  const minutes = usePagedList(
    (limit, offset) => meetingsUrl(cycleId, `${meeting.id}/minutes`, { limit, offset }),
    fetchMinutes,
  )
  const agreements = usePagedList(
    (limit, offset) => meetingsUrl(cycleId, `${meeting.id}/agreements`, { limit, offset }),
    fetchAgreements,
  )
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ActionError>(null)
  const [generation, setGeneration] = useState(0)

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
    minutes.reload()
    agreements.reload()
    setGeneration((value) => value + 1)
  }

  const failed = [minutes.state, agreements.state].find(
    (state) => state.status !== 'loading' && state.status !== 'ready',
  )
  if (failed) {
    return (
      <div className={styles.stack}>
        <p className={shell.formError} role="alert">
          {failed.message}
        </p>
        <button
          type="button"
          className={shell.buttonSecondary}
          onClick={() => {
            minutes.reload()
            agreements.reload()
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
  if (minutes.state.status !== 'ready' || agreements.state.status !== 'ready') {
    return <p className={shell.meta}>Cargando minuta y acuerdos…</p>
  }
  return (
    <div className={styles.stack}>
      <MinutesBlock
        key={`minutes-${generation}`}
        cycleId={cycleId}
        meeting={meeting}
        minutes={minutes.state.data}
        canWrite={canWrite}
        manage={manage}
        pendingId={pendingId}
        actionError={actionError}
        run={run}
        more={
          <LoadMore
            hasMore={minutes.hasMore}
            loading={minutes.loadingMore}
            error={minutes.moreError}
            onLoad={() => void minutes.loadMore()}
            label="Cargar más minutas"
          />
        }
      />
      <AgreementsBlock
        key={`agreements-${generation}`}
        cycleId={cycleId}
        meeting={meeting}
        agreements={agreements.state.data}
        canWrite={canWrite}
        userId={userId}
        pendingId={pendingId}
        actionError={actionError}
        run={run}
        more={
          <LoadMore
            hasMore={agreements.hasMore}
            loading={agreements.loadingMore}
            error={agreements.moreError}
            onLoad={() => void agreements.loadMore()}
            label="Cargar más acuerdos"
          />
        }
      />
    </div>
  )
}

function MinutesBlock({
  cycleId,
  meeting,
  minutes,
  canWrite,
  manage,
  pendingId,
  actionError,
  run,
  more,
}: {
  cycleId: string
  meeting: Meeting
  minutes: Minutes[]
  canWrite: boolean
  manage: boolean
  pendingId: string | null
  actionError: ActionError
  run: (id: string, exec: () => Promise<{ ok: true } | { ok: false; message: string }>) => Promise<void>
  more: ReactNode
}) {
  return (
    <div className={styles.stack}>
      <h4>Minutas</h4>
      {minutes.length === 0 ? (
        <p className={shell.meta}>{manage ? 'No hay minutas.' : 'No hay minutas publicadas.'}</p>
      ) : null}
      {minutes.map((item) => (
        <article key={item.id} className={styles.block}>
          <div className={styles.row}>
            <span className={styles.badge} data-status={item.status}>
              {item.status === 'aprobada' ? 'Publicada' : 'Borrador'}
            </span>
            <span className={shell.meta}>{originLabel(item.origin)}</span>
          </div>
          <p className={styles.prose}>{item.content}</p>
          {item.approved_at ? <p className={shell.meta}>Publicada {formatDateTime(item.approved_at)}</p> : null}
          {canWrite && item.status === 'borrador' && item.revoked_at === null ? (
            <>
              <MinutesForm
                id={`minutes-${item.id}`}
                title="Corregir borrador"
                submitLabel="Guardar borrador"
                pending={pendingId === `minutes-${item.id}`}
                error={actionError}
                initial={item.content}
                requireObservation
                onSubmit={(content, observation) =>
                  run(`minutes-${item.id}`, async () =>
                    requestComunicacion(meetingsUrl(cycleId, `${meeting.id}/minutes/${item.id}`), parseMinutes, {
                      method: 'PUT',
                      body: { content, expected_revision: item.revision, observation },
                    }).then(settled),
                  )
                }
              />
              <ObservationForm
                id={`approve-${item.id}`}
                title="Publicar minuta"
                submitLabel="Publicar"
                hint="Publicar confirma la revisión humana. La minuta publicada no se modifica."
                pending={pendingId === `approve-${item.id}`}
                error={actionError}
                onSubmit={(observation) =>
                  run(`approve-${item.id}`, async () =>
                    requestComunicacion(
                      meetingsUrl(cycleId, `${meeting.id}/minutes/${item.id}/approval`),
                      parseMinutes,
                      {
                        method: 'POST',
                        body: { expected_revision: item.revision, observation, human_reviewed: true },
                      },
                    ).then(settled),
                  )
                }
              />
            </>
          ) : null}
        </article>
      ))}
      {more}
      {canWrite ? (
        <>
          <MinutesForm
            id={`minutes-new-${meeting.id}`}
            title="Nueva minuta manual"
            submitLabel="Crear minuta"
            pending={pendingId === `minutes-new-${meeting.id}`}
            error={actionError}
            onSubmit={(content) =>
              run(`minutes-new-${meeting.id}`, async () =>
                requestComunicacion(meetingsUrl(cycleId, `${meeting.id}/minutes`), parseMinutes, {
                  method: 'POST',
                  body: { content },
                }).then(settled),
              )
            }
          />
          <MinutesForm
            id={`draft-${meeting.id}`}
            title="Borrador desde transcripción"
            submitLabel="Crear borrador"
            hint="Se conserva la transcripción y queda pendiente de completar. No hay procesamiento de IA."
            pending={pendingId === `draft-${meeting.id}`}
            error={actionError}
            contentLabel="Transcripción"
            onSubmit={(transcript) =>
              run(`draft-${meeting.id}`, async () =>
                requestComunicacion(meetingsUrl(cycleId, `${meeting.id}/minutes/drafts`), parseMinutes, {
                  method: 'POST',
                  body: { transcript },
                }).then(settled),
              )
            }
          />
        </>
      ) : null}
    </div>
  )
}

function AgreementsBlock({
  cycleId,
  meeting,
  agreements,
  canWrite,
  userId,
  pendingId,
  actionError,
  run,
  more,
}: {
  cycleId: string
  meeting: Meeting
  agreements: Agreement[]
  canWrite: boolean
  userId: string
  pendingId: string | null
  actionError: ActionError
  run: (id: string, exec: () => Promise<{ ok: true } | { ok: false; message: string }>) => Promise<void>
  more: ReactNode
}) {
  return (
    <div className={styles.stack}>
      <h4>Acuerdos</h4>
      {agreements.length === 0 ? <p className={shell.meta}>No hay acuerdos.</p> : null}
      {agreements.map((item) => (
        <article key={item.id} className={styles.block}>
          <p className={styles.prose}>{item.description}</p>
          <p className={shell.meta}>
            Fecha {formatDay(item.due_date)}
            {item.next_steps ? `. Próximos pasos: ${item.next_steps}` : ''}
          </p>
          {canWrite && item.revoked_at === null ? (
            <AgreementForm
              id={`agreement-${item.id}`}
              title="Editar acuerdo"
              submitLabel="Guardar acuerdo"
              pending={pendingId === `agreement-${item.id}`}
              error={actionError}
              initial={item}
              onSubmit={(body, observation) =>
                run(`agreement-${item.id}`, async () =>
                  requestComunicacion(meetingsUrl(cycleId, `${meeting.id}/agreements/${item.id}`), parseAgreement, {
                    method: 'PUT',
                    body: { ...body, responsible_id: item.responsible_id, expected_revision: item.revision, observation },
                  }).then(settled),
                )
              }
            />
          ) : null}
        </article>
      ))}
      {more}
      {canWrite ? (
        <AgreementForm
          id={`agreement-new-${meeting.id}`}
          title="Nuevo acuerdo"
          submitLabel="Registrar acuerdo"
          hint="El responsable es tu usuario, porque no hay un listado de personas del ciclo."
          pending={pendingId === `agreement-new-${meeting.id}`}
          error={actionError}
          onSubmit={(body) =>
            run(`agreement-new-${meeting.id}`, async () =>
              requestComunicacion(meetingsUrl(cycleId, `${meeting.id}/agreements`), parseAgreement, {
                method: 'POST',
                body: { ...body, responsible_id: userId },
              }).then(settled),
            )
          }
        />
      ) : null}
    </div>
  )
}

function ErrorLine({ id, error }: { id: string; error: ActionError }) {
  if (!error || error.id !== id) {
    return null
  }
  return (
    <p className={shell.formError} role="alert">
      {error.message}
    </p>
  )
}

function MeetingForm({
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
  initial?: Meeting
  onSubmit: (body: {
    title: string
    scheduled_at: string
    participants: string[]
    reference_url: string | null
    observation?: string
  }) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = requiredText(field(data, 'title'), 'El título es obligatorio.')
    if ('error' in name) {
      setLocalError(name.error)
      return
    }
    if (name.text.length > 200) {
      setLocalError('El título admite hasta 200 caracteres.')
      return
    }
    const when = awareDateTime(field(data, 'scheduled_at'))
    if ('error' in when) {
      setLocalError(when.error)
      return
    }
    const participants = participantLines(field(data, 'participants'))
    if ('error' in participants) {
      setLocalError(participants.error)
      return
    }
    const reference = optionalHttpUrl(field(data, 'reference_url'))
    if ('error' in reference) {
      setLocalError(reference.error)
      return
    }
    let observation: string | undefined
    if (initial) {
      const note = requiredText(field(data, 'observation'), 'La observación es obligatoria.')
      if ('error' in note) {
        setLocalError(note.error)
        return
      }
      observation = note.text
    }
    setLocalError(null)
    onSubmit({
      title: name.text,
      scheduled_at: when.iso,
      participants: participants.participants,
      reference_url: reference.url,
      ...(observation ? { observation } : {}),
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
        Fecha y hora
        <input
          name="scheduled_at"
          type="datetime-local"
          required
          defaultValue={initial ? localDateTimeValue(new Date(initial.scheduled_at)) : localDateTimeValue()}
          disabled={pending}
        />
      </label>
      <label className={styles.field}>
        Participantes, uno por línea
        <textarea
          name="participants"
          required
          defaultValue={initial?.participants.join('\n')}
          disabled={pending}
        />
      </label>
      <label className={styles.field}>
        Referencia http o https
        <input name="reference_url" type="url" defaultValue={initial?.reference_url ?? ''} disabled={pending} />
      </label>
      {initial ? (
        <label className={styles.field}>
          Observación del cambio
          <textarea name="observation" required disabled={pending} />
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
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function MinutesForm({
  id,
  title,
  submitLabel,
  hint,
  pending,
  error,
  initial,
  contentLabel = 'Contenido',
  requireObservation = false,
  onSubmit,
}: {
  id: string
  title: string
  submitLabel: string
  hint?: string
  pending: boolean
  error: ActionError
  initial?: string
  contentLabel?: string
  requireObservation?: boolean
  onSubmit: (content: string, observation?: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const content = requiredText(field(data, 'content'), 'El texto es obligatorio.')
    if ('error' in content) {
      setLocalError(content.error)
      return
    }
    let observation: string | undefined
    if (requireObservation) {
      const note = requiredText(field(data, 'observation'), 'La observación es obligatoria.')
      if ('error' in note) {
        setLocalError(note.error)
        return
      }
      observation = note.text
    }
    setLocalError(null)
    onSubmit(content.text, observation)
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>{title}</h4>
      {hint ? <p className={shell.meta}>{hint}</p> : null}
      <label className={styles.field}>
        {contentLabel}
        <textarea name="content" required defaultValue={initial} disabled={pending} />
      </label>
      {requireObservation ? (
        <label className={styles.field}>
          Observación del cambio
          <textarea name="observation" required disabled={pending} />
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
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function ObservationForm({
  id,
  title,
  submitLabel,
  hint,
  pending,
  error,
  onSubmit,
}: {
  id: string
  title: string
  submitLabel: string
  hint?: string
  pending: boolean
  error: ActionError
  onSubmit: (observation: string) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = requiredText(field(new FormData(event.currentTarget), 'observation'), 'La observación es obligatoria.')
    if ('error' in note) {
      setLocalError(note.error)
      return
    }
    setLocalError(null)
    onSubmit(note.text)
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>{title}</h4>
      {hint ? <p className={shell.meta}>{hint}</p> : null}
      <label className={styles.field}>
        Observación
        <textarea name="observation" required disabled={pending} />
      </label>
      {localError ? (
        <p className={shell.formError} role="alert">
          {localError}
        </p>
      ) : (
        <ErrorLine id={id} error={error} />
      )}
      <div className={shell.actions}>
        <button className={shell.buttonSecondary} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function AgreementForm({
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
  hint?: string
  pending: boolean
  error: ActionError
  initial?: Agreement
  onSubmit: (
    body: { description: string; due_date: string; next_steps: string },
    observation?: string,
  ) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const description = requiredText(field(data, 'description'), 'La descripción es obligatoria.')
    if ('error' in description) {
      setLocalError(description.error)
      return
    }
    const due = isoDate(field(data, 'due_date'))
    if ('error' in due) {
      setLocalError(due.error)
      return
    }
    let observation: string | undefined
    if (initial) {
      const note = requiredText(field(data, 'observation'), 'La observación es obligatoria.')
      if ('error' in note) {
        setLocalError(note.error)
        return
      }
      observation = note.text
    }
    setLocalError(null)
    onSubmit(
      { description: description.text, due_date: due.date, next_steps: field(data, 'next_steps').trim() },
      observation,
    )
  }
  return (
    <form className={shell.form} onSubmit={handleSubmit}>
      <h4>{title}</h4>
      {hint ? <p className={shell.meta}>{hint}</p> : null}
      <label className={styles.field}>
        Descripción
        <textarea name="description" required defaultValue={initial?.description} disabled={pending} />
      </label>
      <label className={styles.field}>
        Fecha
        <input name="due_date" type="date" required defaultValue={initial?.due_date} disabled={pending} />
      </label>
      <label className={styles.field}>
        Próximos pasos
        <textarea name="next_steps" defaultValue={initial?.next_steps} disabled={pending} />
      </label>
      {initial ? (
        <label className={styles.field}>
          Observación del cambio
          <textarea name="observation" required disabled={pending} />
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
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
