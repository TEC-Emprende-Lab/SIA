'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { BriefcaseBusiness, CalendarPlus, FolderPlus, Search, X } from 'lucide-react'

import { StatusPanel, useMe } from './authenticated-shell'
import styles from './expediente.module.css'
import { AssignmentPanel } from './administracion-views'
import { ChannelsPanel } from './canales-views'
import { MeetingsPanel } from './comunicacion-views'
import { EntrepreneurshipTable } from './entrepreneurship-table'
import { ProjectWorkspaceTabs } from './project-workspace-tabs'
import { SeguimientoPanel } from './seguimiento-views'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
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

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true"><BriefcaseBusiness /></span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {action ? <div className={styles.emptyAction}>{action}</div> : null}
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  )
}

function DetailHero({
  eyebrow,
  title,
  description,
  monogram,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  monogram: string
  action?: ReactNode
}) {
  return (
    <header className={styles.detailHero}>
      <span className={styles.detailMonogram} aria-hidden="true">{monogram.slice(0, 2).toUpperCase()}</span>
      <div className={styles.detailHeroCopy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.detailHeroAction}>{action}</div> : null}
    </header>
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
  const [query, setQuery] = useState('')
  usePageTitle('Expediente')

  const visibleItems = items.filter((item) => item.name.toLocaleLowerCase('es-CR').includes(query.trim().toLocaleLowerCase('es-CR')))

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
      <header className={styles.pageHero}>
        <div>
          <p className={styles.eyebrow}>Expediente</p>
          <h1>Emprendimientos</h1>
          <p className={styles.intro}>Consulta el historial y los ciclos a los que tienes acceso.</p>
        </div>
        {canRegisterExpediente(me.role) ? (
          <Dialog>
            <DialogTrigger className={styles.button}><FolderPlus aria-hidden="true" /> Nuevo emprendimiento</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo emprendimiento</DialogTitle>
                <DialogDescription>El expediente conservará su historial entre programas y ciclos.</DialogDescription>
              </DialogHeader>
              <NameForm
                key={formKey}
                title="Datos del emprendimiento"
                fieldLabel="Nombre"
                submitLabel="Crear emprendimiento"
                pending={pending}
                error={formError}
                onSubmit={(name) => void createEntrepreneurship(name)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </header>
      {createdNotice ? (
        <p className={styles.notice} role="status">
          {createdNotice}
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title="No hay emprendimientos en tu alcance"
          description={canRegisterExpediente(me.role) ? 'Crea el primer emprendimiento para iniciar su expediente.' : 'Cuando te asignen a un emprendimiento, aparecerá aquí.'}
        />
      ) : <>
        <section className={styles.listWorkspace} aria-labelledby="lista-emprendimientos">
          <div className={styles.listToolbar}>
            <div>
              <h2 id="lista-emprendimientos">Emprendimientos disponibles</h2>
              <p>{query ? `${visibleItems.length} coincidencia${visibleItems.length === 1 ? '' : 's'} en los ${items.length} emprendimientos cargados.` : `${items.length} emprendimiento${items.length === 1 ? '' : 's'} cargado${items.length === 1 ? '' : 's'}.`}</p>
            </div>
            <label className={styles.searchField}>
              <span className="sr-only">Buscar emprendimiento en los resultados cargados</span>
              <Search aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre" type="search" />
              {query ? <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X aria-hidden="true" /></button> : null}
            </label>
          </div>
          {visibleItems.length === 0 ? (
            <EmptyState title="No encontramos coincidencias" description="Prueba con otro nombre o limpia la búsqueda para consultar los emprendimientos cargados." />
          ) : <EntrepreneurshipTable items={visibleItems} />}
        </section>
      </>}
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
          <DetailHero
            eyebrow="Expediente del emprendimiento"
            title={entrepreneurship.state.data.name}
            description="Historial de programas, ciclos y colaboración autorizada."
            monogram={entrepreneurship.state.data.name}
            action={canRegisterExpediente(me.role) ? (
              <Dialog>
                <DialogTrigger className={styles.button}><CalendarPlus aria-hidden="true" /> Inscribir en Prototipado</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inscribir en Prototipado</DialogTitle>
                    <DialogDescription>La inscripción se conserva como parte del historial del emprendimiento.</DialogDescription>
                  </DialogHeader>
                  <EnrollmentForm pending={pending} error={formError} onSubmit={(value) => void createEnrollment(value)} />
                </DialogContent>
              </Dialog>
            ) : undefined}
          />
          <div className={styles.detailLayout}>
            <div className={styles.primaryColumn}>
              <section className={styles.section} aria-labelledby="inscripciones-titulo">
                <SectionHeader
                  title="Inscripciones"
                  description="Programas registrados para este emprendimiento."
                />
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
              </section>
              <ChannelsPanel entrepreneurshipId={entrepreneurship.state.data.id} />
            </div>
            <aside className={styles.sideColumn} aria-label="Resumen del expediente">
              <section className={styles.summaryCard}>
                <h2>Resumen</h2>
                <Facts
                  rows={[
                    { term: 'Creado', value: formatDateTime(entrepreneurship.state.data.created_at) },
                    { term: 'Actualizado', value: formatDateTime(entrepreneurship.state.data.updated_at) },
                  ]}
                />
              </section>
              <section className={styles.guidanceCard}>
                <h2>Cómo continuar</h2>
                <p>Una inscripción agrupa los ciclos de trabajo del programa. Abre una inscripción para consultar o crear sus ciclos.</p>
              </section>
              <AssignmentPanel scope={{ kind: 'entrepreneurship', id: entrepreneurship.state.data.id }} />
            </aside>
          </div>
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
    state.data.length === 0 ? (
      <EmptyState title="Aún no hay inscripciones" description="Las inscripciones registran el paso del emprendimiento por cada programa." />
    ) : (
      <RecordList empty={null}>
        {state.data.map((enrollment) => (
          <li key={enrollment.id}>
            <Link className={styles.card} href={`/expediente/${entrepreneurshipId}/inscripciones/${enrollment.id}`}>
              <span className={styles.cardTitle}>{enrollment.program}</span>
              <span className={styles.cardMeta}>Ingreso {formatDateTime(enrollment.enrolled_at)}</span>
            </Link>
          </li>
        ))}
      </RecordList>
    )
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
    <form className={styles.formCompact} onSubmit={handleSubmit}>
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
          <DetailHero
            eyebrow="Inscripción"
            title={enrollment.state.data.program}
            description={`Programa registrado para ${entrepreneurshipName}.`}
            monogram={enrollment.state.data.program}
          />
          <Facts rows={[{ term: 'Fecha de ingreso', value: formatDateTime(enrollment.state.data.enrolled_at) }]} />
          <section className={styles.section} aria-labelledby="ciclos-titulo">
            <SectionHeader
              title="Ciclos"
              description="Proyectos o intervenciones registrados dentro de esta inscripción."
              action={canRegisterExpediente(me.role) && enrollment.state.data.program === PROTOTIPADO_PROGRAM ? (
                <Dialog>
                  <DialogTrigger className={styles.button}><FolderPlus aria-hidden="true" /> Nuevo ciclo</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo ciclo de Prototipado</DialogTitle>
                      <DialogDescription>El ciclo organizará el trabajo, seguimiento y comunicación de esta inscripción.</DialogDescription>
                    </DialogHeader>
                    <NameForm
                      title="Datos del ciclo"
                      fieldLabel="Nombre del ciclo"
                      submitLabel="Crear ciclo"
                      pending={pending}
                      error={formError}
                      onSubmit={(name) => void createCycle(name)}
                    />
                  </DialogContent>
                </Dialog>
              ) : undefined}
            />
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
    state.data.length === 0 ? (
      <EmptyState title="Aún no hay ciclos" description="Crea un ciclo cuando exista un proyecto o intervención concreta dentro de esta inscripción." />
    ) : (
      <RecordList empty={null}>
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
    )
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
          <DetailHero
            eyebrow="Espacio del ciclo"
            title={cycle.state.data.name}
            description={`${entrepreneurshipName} · ${enrollment.state.data.program}`}
            monogram={cycle.state.data.name}
          />
          <Facts
            rows={[
              { term: 'Programa', value: enrollment.state.data.program },
              { term: 'Creado', value: formatDateTime(cycle.state.data.created_at) },
            ]}
          />
          <ProjectWorkspaceTabs
            tabs={[
              {
                value: 'seguimiento',
                label: 'Seguimiento',
                content: <SeguimientoPanel cycleId={cycle.state.data.id} program={enrollment.state.data.program} />,
              },
              {
                value: 'reuniones',
                label: 'Reuniones',
                content: <MeetingsPanel cycleId={cycle.state.data.id} program={enrollment.state.data.program} />,
              },
              {
                value: 'canales',
                label: 'Canales',
                content: <ChannelsPanel entrepreneurshipId={enrollment.state.data.entrepreneurship_id} cycleId={cycle.state.data.id} />,
              },
              {
                value: 'equipo',
                label: 'Equipo',
                content: <AssignmentPanel scope={{ kind: 'cycle', id: cycle.state.data.id }} />,
              },
            ]}
          />
        </>
      ) : null}
    </div>
  )
}
