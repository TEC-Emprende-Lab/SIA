'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

import { StatusPanel, useMe } from './authenticated-shell'
import styles from './expediente.module.css'
import { AssignmentPanel } from './administracion-views'
import { ChannelsPanel } from './canales-views'
import { MeetingsPanel } from './comunicacion-views'
import { SeguimientoPanel } from './seguimiento-views'
import {
  canRegisterExpediente,
  enrolledAtIso,
  expedienteUrl,
  formatDateTime,
  isUuid,
  LIST_PAGE_SIZE,
  localDateTimeValue,
  parseCycle,
  parseCycleList,
  parseEnrollment,
  parseEnrollmentList,
  parseEntrepreneurship,
  parseEntrepreneurshipList,
  PROTOTIPADO_PROGRAM,
  requestExpediente,
  toViewState,
  trimmedName,
  type Cycle,
  type Enrollment,
  type Entrepreneurship,
  type ViewState,
} from '../lib/expediente'
import { usePagedList } from '../lib/use-paged-list'
import { LoadMore } from './load-more'

const fetchEnrollments = (url: string) => requestExpediente(url, parseEnrollmentList)
const fetchCycles = (url: string) => requestExpediente(url, parseCycleList)

function usePageTitle(title: string | null) {
  useEffect(() => {
    if (!title) {
      return
    }
    document.title = `${title} · SIA`
    return () => {
      document.title = 'SIA'
    }
  }, [title])
}

function useExpediente<T>(
  url: string | null,
  parse: (value: unknown) => T | null,
  missingMessage: string,
) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ViewState<T>>({ status: 'loading' })
  useEffect(() => {
    if (!url) {
      setState({ status: 'missing', message: missingMessage })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    void requestExpediente(url, parse).then((result) => {
      if (!cancelled) {
        setState(toViewState(result))
      }
    })
    return () => {
      cancelled = true
    }
  }, [url, parse, missingMessage, attempt])
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { state, retry }
}

function LoadingLine({ children }: { children: string }) {
  return (
    <p className={styles.meta} aria-live="polite">
      {children}
    </p>
  )
}

function ResourceFallback({
  state,
  missingTitle,
  errorTitle,
  onRetry,
  heading = 'h1',
}: {
  state: Extract<ViewState<unknown>, { status: 'forbidden' | 'missing' | 'error' }>
  missingTitle: string
  errorTitle: string
  onRetry?: () => void
  heading?: 'h1' | 'h2'
}) {
  if (state.status === 'forbidden') {
    return (
      <StatusPanel status="forbidden" heading={heading} title="Acceso no disponible" description={state.message} />
    )
  }
  if (state.status === 'missing') {
    return <StatusPanel status="missing" heading={heading} title={missingTitle} description={state.message} />
  }
  return (
    <>
      <StatusPanel status="error" heading={heading} title={errorTitle} description={state.message} />
      {onRetry ? (
        <button type="button" className={styles.buttonSecondary} onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </>
  )
}

function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <ol className={styles.crumbs}>
      {items.map((item) => (
        <li key={item.href ?? item.label} className={styles.crumb}>
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </li>
      ))}
    </ol>
  )
}

function Facts({ rows }: { rows: { term: string; value: string }[] }) {
  return (
    <dl className={styles.facts}>
      {rows.map((row) => (
        <div key={row.term} className={styles.fact}>
          <dt>{row.term}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function NameForm({
  title,
  fieldLabel,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  title: string
  fieldLabel: string
  submitLabel: string
  pending: boolean
  error: string | null
  onSubmit: (name: string) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const raw = data.get('name')
    onSubmit(typeof raw === 'string' ? raw : '')
  }
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label className={styles.field}>
        {fieldLabel}
        <input name="name" required maxLength={200} disabled={pending} autoComplete="off" />
      </label>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function RecordList({
  children,
  empty,
}: {
  children: ReactNode
  empty: string | null
}) {
  if (empty) {
    return <p className={styles.meta}>{empty}</p>
  }
  return <ul className={styles.list}>{children}</ul>
}

export function ExpedienteListView() {
  const me = useMe()
  const router = useRouter()
  const [items, setItems] = useState<Entrepreneurship[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdNotice, setCreatedNotice] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  usePageTitle('Expediente')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState('loading')
      const result = await requestExpediente(
        expedienteUrl('', { limit: LIST_PAGE_SIZE, offset: 0 }),
        parseEntrepreneurshipList,
      )
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setItems([])
        setHasMore(false)
        setState(result.status === 403 ? 'forbidden' : 'error')
        setMessage(result.message)
        return
      }
      setItems(result.data)
      setHasMore(result.data.length === LIST_PAGE_SIZE)
      setState('ready')
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(null)
    const result = await requestExpediente(
      expedienteUrl('', { limit: LIST_PAGE_SIZE, offset: items.length }),
      parseEntrepreneurshipList,
    )
    setLoadingMore(false)
    if (!result.ok) {
      setMoreError(result.message)
      return
    }
    setItems((current) => [...current, ...result.data])
    setHasMore(result.data.length === LIST_PAGE_SIZE)
  }

  async function createEntrepreneurship(rawName: string) {
    if (pending) {
      return
    }
    const name = trimmedName(rawName)
    if ('error' in name) {
      setFormError(name.error)
      return
    }
    setPending(true)
    setFormError(null)
    setCreatedNotice(null)
    const result = await requestExpediente(expedienteUrl(''), parseEntrepreneurship, {
      method: 'POST',
      body: { name: name.name },
    })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    if (me.role === 'Coordinadora') {
      router.push(`/expediente/${result.data.id}`)
      return
    }
    setFormKey((value) => value + 1)
    setCreatedNotice(
      `Se registró ${result.data.name}. Podrás consultarlo cuando tengas una asignación vigente.`,
    )
    setAttempt((value) => value + 1)
  }

  if (state === 'loading') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>Expediente</h1>
        </header>
        <LoadingLine>Cargando emprendimientos…</LoadingLine>
      </div>
    )
  }
  if (state === 'forbidden' || state === 'error') {
    return (
      <div className={styles.page}>
        <ResourceFallback
          state={{ status: state, message }}
          missingTitle="Expediente"
          errorTitle="No se pudo cargar el expediente"
          onRetry={state === 'error' ? () => setAttempt((value) => value + 1) : undefined}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Expediente</h1>
        <p className={styles.intro}>Emprendimientos que puedes consultar.</p>
      </header>
      {canRegisterExpediente(me.role) ? (
        <NameForm
          key={formKey}
          title="Nuevo emprendimiento"
          fieldLabel="Nombre"
          submitLabel="Crear emprendimiento"
          pending={pending}
          error={formError}
          onSubmit={(name) => void createEntrepreneurship(name)}
        />
      ) : null}
      {createdNotice ? (
        <p className={styles.meta} role="status">
          {createdNotice}
        </p>
      ) : null}
      <RecordList empty={items.length === 0 ? 'No hay emprendimientos en tu alcance.' : null}>
        {items.map((item) => (
          <li key={item.id}>
            <Link className={styles.card} href={`/expediente/${item.id}`}>
              <span className={styles.cardTitle}>{item.name}</span>
              <span className={styles.cardMeta}>Creado {formatDateTime(item.created_at)}</span>
            </Link>
          </li>
        ))}
      </RecordList>
      {hasMore ? (
        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      ) : null}
      {moreError ? (
        <p className={styles.formError} role="alert">
          {moreError}
        </p>
      ) : null}
    </div>
  )
}

export function ExpedienteDetailView({ entrepreneurshipId }: { entrepreneurshipId: string | undefined }) {
  const me = useMe()
  const router = useRouter()
  const id = isUuid(entrepreneurshipId) ? entrepreneurshipId : null
  const entrepreneurship = useExpediente(
    id ? expedienteUrl(`/${id}`) : null,
    parseEntrepreneurship,
    'Emprendimiento no encontrado',
  )
  const enrollments = usePagedList(
    id ? (limit, offset) => expedienteUrl(`/${id}/enrollments`, { limit, offset }) : null,
    fetchEnrollments,
    { missingMessage: 'Emprendimiento no encontrado' },
  )
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const title = entrepreneurship.state.status === 'ready' ? entrepreneurship.state.data.name : null
  usePageTitle(title)

  async function createEnrollment(localValue: string) {
    if (!id || pending) {
      return
    }
    const enrolled = enrolledAtIso(localValue)
    if ('error' in enrolled) {
      setFormError(enrolled.error)
      return
    }
    setPending(true)
    setFormError(null)
    const result = await requestExpediente(expedienteUrl(`/${id}/enrollments`), parseEnrollment, {
      method: 'POST',
      body: { program: PROTOTIPADO_PROGRAM, enrolled_at: enrolled.iso },
    })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    router.push(`/expediente/${id}/inscripciones/${result.data.id}`)
  }

  return (
    <div className={styles.page}>
      <Crumbs items={[{ href: '/expediente', label: 'Expediente' }, { label: title ?? 'Emprendimiento' }]} />
      {entrepreneurship.state.status === 'loading' ? <LoadingLine>Cargando emprendimiento…</LoadingLine> : null}
      {entrepreneurship.state.status !== 'loading' && entrepreneurship.state.status !== 'ready' ? (
        <ResourceFallback
          state={entrepreneurship.state}
          missingTitle="Emprendimiento no encontrado"
          errorTitle="No se pudo abrir el emprendimiento"
          onRetry={entrepreneurship.retry}
        />
      ) : null}
      {entrepreneurship.state.status === 'ready' ? (
        <>
          <header className={styles.header}>
            <h1>{entrepreneurship.state.data.name}</h1>
          </header>
          <Facts
            rows={[
              { term: 'Creado', value: formatDateTime(entrepreneurship.state.data.created_at) },
              { term: 'Actualizado', value: formatDateTime(entrepreneurship.state.data.updated_at) },
            ]}
          />
          <section className={styles.section} aria-labelledby="inscripciones-titulo">
            <h2 id="inscripciones-titulo">Inscripciones</h2>
            <EnrollmentSection
              state={enrollments.state}
              entrepreneurshipId={entrepreneurship.state.data.id}
              onRetry={enrollments.reload}
            />
            <LoadMore
              hasMore={enrollments.hasMore}
              loading={enrollments.loadingMore}
              error={enrollments.moreError}
              onLoad={() => void enrollments.loadMore()}
            />
            {canRegisterExpediente(me.role) ? (
              <EnrollmentForm pending={pending} error={formError} onSubmit={(value) => void createEnrollment(value)} />
            ) : null}
          </section>
          <ChannelsPanel entrepreneurshipId={entrepreneurship.state.data.id} />
          <AssignmentPanel scope={{ kind: 'entrepreneurship', id: entrepreneurship.state.data.id }} />
        </>
      ) : null}
    </div>
  )
}

function EnrollmentSection({
  state,
  entrepreneurshipId,
  onRetry,
}: {
  state: ViewState<Enrollment[]>
  entrepreneurshipId: string
  onRetry: () => void
}) {
  if (state.status === 'loading') {
    return <LoadingLine>Cargando inscripciones…</LoadingLine>
  }
  if (state.status !== 'ready') {
    return (
      <ResourceFallback
        state={state}
        missingTitle="Inscripciones no disponibles"
        errorTitle="No se pudieron cargar las inscripciones"
        onRetry={onRetry}
        heading="h2"
      />
    )
  }
  return (
    <>
      <RecordList empty={state.data.length === 0 ? 'Este emprendimiento no tiene inscripciones.' : null}>
        {state.data.map((enrollment) => (
          <li key={enrollment.id}>
            <Link className={styles.card} href={`/expediente/${entrepreneurshipId}/inscripciones/${enrollment.id}`}>
              <span className={styles.cardTitle}>{enrollment.program}</span>
              <span className={styles.cardMeta}>Ingreso {formatDateTime(enrollment.enrolled_at)}</span>
            </Link>
          </li>
        ))}
      </RecordList>
    </>
  )
}

function EnrollmentForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean
  error: string | null
  onSubmit: (localValue: string) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const raw = data.get('enrolled_at')
    onSubmit(typeof raw === 'string' ? raw : '')
  }
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Inscribir en Prototipado</h2>
      <label className={styles.field}>
        Fecha de ingreso
        <input
          name="enrolled_at"
          type="datetime-local"
          required
          defaultValue={localDateTimeValue()}
          disabled={pending}
        />
      </label>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Inscribir'}
        </button>
      </div>
    </form>
  )
}

export function EnrollmentDetailView({
  entrepreneurshipId,
  enrollmentId,
}: {
  entrepreneurshipId: string | undefined
  enrollmentId: string | undefined
}) {
  const me = useMe()
  const router = useRouter()
  const entrepreneurshipValid = isUuid(entrepreneurshipId)
  const enrollmentValid = isUuid(enrollmentId)
  const entrepreneurship = useExpediente(
    entrepreneurshipValid ? expedienteUrl(`/${entrepreneurshipId}`) : null,
    parseEntrepreneurship,
    'Emprendimiento no encontrado',
  )
  const enrollment = useExpediente(
    enrollmentValid ? expedienteUrl(`/enrollments/${enrollmentId}`) : null,
    parseEnrollment,
    'Inscripción no encontrada',
  )
  const cycles = usePagedList(
    enrollmentValid
      ? (limit, offset) => expedienteUrl(`/enrollments/${enrollmentId}/cycles`, { limit, offset })
      : null,
    fetchCycles,
    { missingMessage: 'Inscripción no encontrada' },
  )
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const aligned =
    entrepreneurship.state.status === 'ready' &&
    enrollment.state.status === 'ready' &&
    enrollment.state.data.entrepreneurship_id === entrepreneurship.state.data.id
  const mismatch =
    entrepreneurship.state.status === 'ready' &&
    enrollment.state.status === 'ready' &&
    enrollment.state.data.entrepreneurship_id !== entrepreneurship.state.data.id
  const program = aligned && enrollment.state.status === 'ready' ? enrollment.state.data.program : null
  usePageTitle(program)

  async function createCycle(rawName: string) {
    if (!aligned || enrollment.state.status !== 'ready' || entrepreneurship.state.status !== 'ready' || pending) {
      return
    }
    const name = trimmedName(rawName)
    if ('error' in name) {
      setFormError(name.error)
      return
    }
    setPending(true)
    setFormError(null)
    const result = await requestExpediente(
      expedienteUrl(`/enrollments/${enrollment.state.data.id}/cycles`),
      parseCycle,
      { method: 'POST', body: { name: name.name } },
    )
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    router.push(
      `/expediente/${entrepreneurship.state.data.id}/inscripciones/${enrollment.state.data.id}/ciclos/${result.data.id}`,
    )
  }

  const entrepreneurshipName =
    entrepreneurship.state.status === 'ready' ? entrepreneurship.state.data.name : 'Emprendimiento'
  const blocking =
    entrepreneurship.state.status !== 'loading' && entrepreneurship.state.status !== 'ready'
      ? entrepreneurship.state
      : !entrepreneurshipValid || !enrollmentValid
        ? ({ status: 'missing', message: 'Inscripción no encontrada' } as const)
        : enrollment.state.status !== 'loading' && enrollment.state.status !== 'ready'
          ? enrollment.state
          : mismatch
            ? ({ status: 'missing', message: 'Inscripción no encontrada' } as const)
            : null

  return (
    <div className={styles.page}>
      <Crumbs
        items={[
          { href: '/expediente', label: 'Expediente' },
          {
            href: entrepreneurshipValid ? `/expediente/${entrepreneurshipId}` : '/expediente',
            label: entrepreneurshipName,
          },
          { label: program ?? 'Inscripción' },
        ]}
      />
      {blocking === null && (entrepreneurship.state.status === 'loading' || enrollment.state.status === 'loading') ? (
        <LoadingLine>Cargando inscripción…</LoadingLine>
      ) : null}
      {blocking ? (
        <ResourceFallback
          state={blocking}
          missingTitle="Inscripción no encontrada"
          errorTitle="No se pudo abrir la inscripción"
          onRetry={() => {
            entrepreneurship.retry()
            enrollment.retry()
            cycles.reload()
          }}
        />
      ) : null}
      {aligned && enrollment.state.status === 'ready' && entrepreneurship.state.status === 'ready' ? (
        <>
          <header className={styles.header}>
            <h1>{enrollment.state.data.program}</h1>
          </header>
          <Facts rows={[{ term: 'Fecha de ingreso', value: formatDateTime(enrollment.state.data.enrolled_at) }]} />
          <section className={styles.section} aria-labelledby="ciclos-titulo">
            <h2 id="ciclos-titulo">Ciclos</h2>
            <CycleSection
              state={cycles.state}
              entrepreneurshipId={entrepreneurship.state.data.id}
              enrollmentId={enrollment.state.data.id}
              onRetry={cycles.reload}
            />
            <LoadMore
              hasMore={cycles.hasMore}
              loading={cycles.loadingMore}
              error={cycles.moreError}
              onLoad={() => void cycles.loadMore()}
            />
            {canRegisterExpediente(me.role) && enrollment.state.data.program === PROTOTIPADO_PROGRAM ? (
              <NameForm
                title="Nuevo ciclo de Prototipado"
                fieldLabel="Nombre del ciclo"
                submitLabel="Crear ciclo"
                pending={pending}
                error={formError}
                onSubmit={(name) => void createCycle(name)}
              />
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}

function CycleSection({
  state,
  entrepreneurshipId,
  enrollmentId,
  onRetry,
}: {
  state: ViewState<Cycle[]>
  entrepreneurshipId: string
  enrollmentId: string
  onRetry: () => void
}) {
  if (state.status === 'loading') {
    return <LoadingLine>Cargando ciclos…</LoadingLine>
  }
  if (state.status !== 'ready') {
    return (
      <ResourceFallback
        state={state}
        missingTitle="Ciclos no disponibles"
        errorTitle="No se pudieron cargar los ciclos"
        onRetry={onRetry}
        heading="h2"
      />
    )
  }
  return (
    <>
      <RecordList empty={state.data.length === 0 ? 'Esta inscripción no tiene ciclos.' : null}>
        {state.data.map((cycle) => (
          <li key={cycle.id}>
            <Link
              className={styles.card}
              href={`/expediente/${entrepreneurshipId}/inscripciones/${enrollmentId}/ciclos/${cycle.id}`}
            >
              <span className={styles.cardTitle}>{cycle.name}</span>
              <span className={styles.cardMeta}>Creado {formatDateTime(cycle.created_at)}</span>
            </Link>
          </li>
        ))}
      </RecordList>
    </>
  )
}

export function CycleDetailView({
  entrepreneurshipId,
  enrollmentId,
  cycleId,
}: {
  entrepreneurshipId: string | undefined
  enrollmentId: string | undefined
  cycleId: string | undefined
}) {
  const entrepreneurshipValid = isUuid(entrepreneurshipId)
  const enrollmentValid = isUuid(enrollmentId)
  const cycleValid = isUuid(cycleId)
  const entrepreneurship = useExpediente(
    entrepreneurshipValid ? expedienteUrl(`/${entrepreneurshipId}`) : null,
    parseEntrepreneurship,
    'Emprendimiento no encontrado',
  )
  const enrollment = useExpediente(
    enrollmentValid ? expedienteUrl(`/enrollments/${enrollmentId}`) : null,
    parseEnrollment,
    'Inscripción no encontrada',
  )
  const cycle = useExpediente(
    cycleValid ? expedienteUrl(`/cycles/${cycleId}`) : null,
    parseCycle,
    'Ciclo no encontrado',
  )
  const aligned =
    entrepreneurship.state.status === 'ready' &&
    enrollment.state.status === 'ready' &&
    cycle.state.status === 'ready' &&
    enrollment.state.data.entrepreneurship_id === entrepreneurship.state.data.id &&
    cycle.state.data.enrollment_id === enrollment.state.data.id
  usePageTitle(aligned && cycle.state.status === 'ready' ? cycle.state.data.name : null)

  const entrepreneurshipName =
    entrepreneurship.state.status === 'ready' ? entrepreneurship.state.data.name : 'Emprendimiento'
  const programLabel = enrollment.state.status === 'ready' ? enrollment.state.data.program : 'Inscripción'
  const idsValid = entrepreneurshipValid && enrollmentValid && cycleValid
  const loaded =
    entrepreneurship.state.status !== 'loading' &&
    enrollment.state.status !== 'loading' &&
    cycle.state.status !== 'loading'
  const blocking = !idsValid
    ? ({ status: 'missing', message: 'Ciclo no encontrado' } as const)
    : entrepreneurship.state.status !== 'loading' && entrepreneurship.state.status !== 'ready'
      ? entrepreneurship.state
      : enrollment.state.status !== 'loading' && enrollment.state.status !== 'ready'
        ? enrollment.state
        : cycle.state.status !== 'loading' && cycle.state.status !== 'ready'
          ? cycle.state
          : loaded && !aligned
            ? ({ status: 'missing', message: 'Ciclo no encontrado' } as const)
            : null

  return (
    <div className={styles.page}>
      <Crumbs
        items={[
          { href: '/expediente', label: 'Expediente' },
          {
            href: entrepreneurshipValid ? `/expediente/${entrepreneurshipId}` : '/expediente',
            label: entrepreneurshipName,
          },
          {
            href:
              entrepreneurshipValid && enrollmentValid
                ? `/expediente/${entrepreneurshipId}/inscripciones/${enrollmentId}`
                : '/expediente',
            label: programLabel,
          },
          { label: aligned && cycle.state.status === 'ready' ? cycle.state.data.name : 'Ciclo' },
        ]}
      />
      {blocking === null && !aligned ? <LoadingLine>Cargando ciclo…</LoadingLine> : null}
      {blocking ? (
        <ResourceFallback
          state={blocking}
          missingTitle="Ciclo no encontrado"
          errorTitle="No se pudo abrir el ciclo"
          onRetry={() => {
            entrepreneurship.retry()
            enrollment.retry()
            cycle.retry()
          }}
        />
      ) : null}
      {aligned && cycle.state.status === 'ready' && enrollment.state.status === 'ready' ? (
        <>
          <header className={styles.header}>
            <h1>{cycle.state.data.name}</h1>
          </header>
          <Facts
            rows={[
              { term: 'Programa', value: enrollment.state.data.program },
              { term: 'Creado', value: formatDateTime(cycle.state.data.created_at) },
            ]}
          />
          <SeguimientoPanel cycleId={cycle.state.data.id} program={enrollment.state.data.program} />
          <MeetingsPanel cycleId={cycle.state.data.id} program={enrollment.state.data.program} />
          <ChannelsPanel
            entrepreneurshipId={enrollment.state.data.entrepreneurship_id}
            cycleId={cycle.state.data.id}
          />
          <AssignmentPanel scope={{ kind: 'cycle', id: cycle.state.data.id }} />
        </>
      ) : null}
    </div>
  )
}
