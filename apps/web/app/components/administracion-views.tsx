'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { StatusPanel, useMe } from './authenticated-shell'
import styles from './expediente.module.css'
import extra from './comunicacion.module.css'
import { formatDateTime } from '../lib/expediente'
import {
  assignableRoles,
  canListUsers,
  canViewTeam,
  INVITATION_PAGE_SIZE,
  INVITATION_STATE_LABEL,
  invitableRoles,
  invitationEmail,
  invitationState,
  parseActiveAssignments,
  parseAssignment,
  parseInvitation,
  parseInvitationList,
  parseUserList,
  requestAdmin,
  type ActiveAssignment,
  type Invitation,
  type SiaUser,
} from '../lib/administracion'

type ListState<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[]; complete: boolean }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }

function pageUrl(path: string, offset: number): string {
  return `${path}?limit=${INVITATION_PAGE_SIZE}&offset=${offset}`
}

export function InvitacionesView() {
  const me = useMe()
  const roles = invitableRoles(me.role)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ListState<Invitation>>({ status: 'loading' })
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState({ status: 'loading' })
      const result = await requestAdmin(pageUrl('/api/sia/invitations', 0), parseInvitationList)
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setState(
          result.status === 403
            ? { status: 'forbidden', message: result.message }
            : { status: 'error', message: result.message },
        )
        return
      }
      setState({ status: 'ready', items: result.data, complete: result.data.length < INVITATION_PAGE_SIZE })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function loadMore() {
    if (state.status !== 'ready' || loadingMore) {
      return
    }
    setLoadingMore(true)
    setMoreError(null)
    const result = await requestAdmin(pageUrl('/api/sia/invitations', state.items.length), parseInvitationList)
    setLoadingMore(false)
    if (!result.ok) {
      setMoreError(result.message)
      return
    }
    const known = new Set(state.items.map((item) => item.id))
    setState({
      status: 'ready',
      items: [...state.items, ...result.data.filter((item) => !known.has(item.id))],
      complete: result.data.length < INVITATION_PAGE_SIZE,
    })
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    const data = new FormData(event.currentTarget)
    const email = invitationEmail(String(data.get('email') ?? ''))
    const role = String(data.get('role') ?? '')
    if ('error' in email) {
      setFormError(email.error)
      return
    }
    if (!(roles as readonly string[]).includes(role)) {
      setFormError('Elige un rol que puedas invitar.')
      return
    }
    setPending(true)
    setFormError(null)
    setNotice(null)
    const result = await requestAdmin('/api/sia/invitations', parseInvitation, {
      method: 'POST',
      body: { email: email.email, role },
    })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setNotice(
      `Se registró la invitación de ${result.data.email} como ${result.data.role}. SIA no envía correo: avisa a esa persona que inicie sesión con Google usando ese mismo correo antes del ${formatDateTime(result.data.expires_at)}.`,
    )
    setFormKey((value) => value + 1)
    setAttempt((value) => value + 1)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Invitaciones</h1>
      </header>
      <p className={styles.intro}>
        {me.role === 'Coordinadora'
          ? 'Todas las invitaciones emitidas en SIA.'
          : 'Invitaciones que emitiste. Puedes invitar a Emprendedores.'}{' '}
        La invitación se acepta sola cuando la persona inicia sesión con Google usando el mismo correo.
      </p>
      {roles.length > 0 ? (
        <form key={formKey} className={styles.form} onSubmit={(event) => void invite(event)}>
          <h2>Nueva invitación</h2>
          <label className={styles.field}>
            Correo de Google
            <input name="email" type="email" required maxLength={320} autoComplete="off" disabled={pending} />
          </label>
          <label className={extra.field}>
            Rol
            <select name="role" required defaultValue={roles.length === 1 ? roles[0] : ''} disabled={pending}>
              {roles.length > 1 ? <option value="">Elige un rol</option> : null}
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Invitar'}
            </button>
          </div>
        </form>
      ) : null}
      {notice ? (
        <p className={styles.meta} role="status">
          {notice}
        </p>
      ) : null}
      <section className={styles.section} aria-labelledby="invitaciones-lista">
        <h2 id="invitaciones-lista">Registro</h2>
        {state.status === 'loading' ? <p className={styles.meta}>Cargando invitaciones…</p> : null}
        {state.status === 'forbidden' ? (
          <StatusPanel status="forbidden" heading="h2" title="Acceso no disponible" description={state.message} />
        ) : null}
        {state.status === 'error' ? (
          <>
            <StatusPanel status="error" heading="h2" title="No se pudieron cargar" description={state.message} />
            <button type="button" className={styles.buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </button>
          </>
        ) : null}
        {state.status === 'ready' && state.items.length === 0 ? (
          <p className={styles.meta}>No hay invitaciones.</p>
        ) : null}
        {state.status === 'ready' && state.items.length > 0 ? (
          <ul className={styles.list}>
            {state.items.map((invitation) => {
              const current = invitationState(invitation)
              return (
                <li key={invitation.id} className={extra.block}>
                  <div className={extra.row}>
                    <strong>{invitation.email}</strong>
                    <span className={extra.badge} data-status={current === 'vigente' ? 'borrador' : current === 'usada' ? 'aprobada' : 'vencida'}>
                      {INVITATION_STATE_LABEL[current]}
                    </span>
                  </div>
                  <p className={styles.meta}>
                    {invitation.role}. Emitida {formatDateTime(invitation.created_at)}.{' '}
                    {invitation.used_at
                      ? `Aceptada ${formatDateTime(invitation.used_at)}.`
                      : `Vence ${formatDateTime(invitation.expires_at)}.`}
                  </p>
                </li>
              )
            })}
          </ul>
        ) : null}
        {state.status === 'ready' && !state.complete ? (
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
      </section>
    </div>
  )
}

export function UsuariosView() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ListState<SiaUser>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setState({ status: 'loading' })
      const result = await requestAdmin('/api/sia/users', parseUserList)
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setState(
          result.status === 403
            ? { status: 'forbidden', message: result.message }
            : { status: 'error', message: result.message },
        )
        return
      }
      setState({ status: 'ready', items: result.data, complete: true })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Usuarios</h1>
      </header>
      <p className={styles.intro}>Personas que ya iniciaron sesión con una invitación aceptada.</p>
      {state.status === 'loading' ? <p className={styles.meta}>Cargando usuarios…</p> : null}
      {state.status === 'forbidden' ? (
        <StatusPanel status="forbidden" heading="h2" title="Acceso no disponible" description={state.message} />
      ) : null}
      {state.status === 'error' ? (
        <>
          <StatusPanel status="error" heading="h2" title="No se pudieron cargar" description={state.message} />
          <button type="button" className={styles.buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
            Reintentar
          </button>
        </>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? <p className={styles.meta}>No hay usuarios.</p> : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className={styles.list}>
          {state.items.map((user) => (
            <li key={user.id} className={extra.block}>
              <div className={extra.row}>
                <strong>{user.email}</strong>
                <span className={styles.meta}>{user.role}</span>
              </div>
              <p className={styles.meta}>Alta {formatDateTime(user.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

type AssignmentScope = { kind: 'entrepreneurship'; id: string } | { kind: 'cycle'; id: string }

function assignmentsPath(scope: AssignmentScope): string {
  if (scope.kind === 'entrepreneurship') {
    return `/api/sia/entrepreneurships/${scope.id}/assignments`
  }
  return `/api/sia/entrepreneurships/cycles/${scope.id}/assignments`
}

export function AssignmentPanel({ scope }: { scope: AssignmentScope }) {
  const me = useMe()
  if (!canViewTeam(me.role)) {
    return null
  }
  let title = 'Asignaciones del ciclo'
  if (scope.kind === 'entrepreneurship') {
    title = 'Asignaciones del emprendimiento'
  }
  const path = assignmentsPath(scope)
  return (
    <section className={styles.section} aria-labelledby={`asignaciones-${scope.id}`}>
      <h2 id={`asignaciones-${scope.id}`}>{title}</h2>
      <AssignmentRoster key={path} path={path} canManage={canListUsers(me.role)} />
    </section>
  )
}

function AssignmentRoster({ path, canManage }: { path: string; canManage: boolean }) {
  const [list, setList] = useState<ListState<ActiveAssignment>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [offset, setOffset] = useState(0)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const pageSize = 50

  useEffect(() => {
    let active = true
    const url = `${path}?limit=${pageSize + 1}&offset=${offset}`
    void requestAdmin(url, parseActiveAssignments).then((result) => {
      if (!active) return
      if (!result.ok) {
        setList({ status: 'error', message: result.message })
        return
      }
      if (offset > 0 && result.data.length === 0) {
        setOffset((value) => Math.max(0, value - pageSize))
        return
      }
      setList({
        status: 'ready',
        items: result.data.slice(0, pageSize),
        complete: result.data.length <= pageSize,
      })
    })
    return () => { active = false }
  }, [path, offset, attempt])

  function reload() {
    setList({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  function movePage(next: number) {
    setList({ status: 'loading' })
    setOffset(next)
  }

  async function revoke(item: ActiveAssignment) {
    if (revoking) return
    setRevoking(item.id)
    setError(null)
    setNotice('')
    const result = await requestAdmin(`${path}/${item.id}`, parseAssignment, { method: 'DELETE' })
    setRevoking(null)
    if (!result.ok) {
      setError(result.message)
      if (result.status === 409) reload()
      return
    }
    setNotice(`Se revocó esta asignación de ${item.email}.`)
    reload()
  }

  let body = null
  if (list.status === 'loading') {
    body = <p className={styles.meta} role="status">Consultando asignaciones…</p>
  } else if (list.status === 'error' || list.status === 'forbidden') {
    body = <>
      <p role="alert" className={styles.formError}>No se pudo consultar el equipo. {list.message}</p>
      <button className={styles.buttonSecondary} type="button" onClick={reload}>Reintentar</button>
    </>
  } else if (list.items.length === 0) {
    body = <p className={styles.meta}>Todavía no hay asignaciones vigentes en este ámbito.</p>
  } else {
    body = <>
      <ul className={styles.list}>
        {list.items.map((item) => (
          <li key={item.id} className={extra.block}>
            <div className={extra.row}>
              <strong>{item.email}</strong>
              <span className={styles.meta}>{item.role}</span>
            </div>
            <p className={styles.meta}>Asignada {formatDateTime(item.created_at)}</p>
            {canManage && (
              <button
                className={styles.buttonSecondary}
                type="button"
                aria-label={`Revocar la asignación de ${item.email}`}
                disabled={revoking !== null}
                onClick={() => void revoke(item)}
              >
                Revocar asignación
              </button>
            )}
          </li>
        ))}
      </ul>
      {(offset > 0 || !list.complete) && (
        <div className={styles.actions} aria-label="Páginas de asignaciones">
          <button className={styles.buttonSecondary} type="button" disabled={offset === 0 || revoking !== null} onClick={() => movePage(offset - pageSize)}>Anterior</button>
          <button className={styles.buttonSecondary} type="button" disabled={list.complete || revoking !== null} onClick={() => movePage(offset + pageSize)}>Siguiente</button>
        </div>
      )}
    </>
  }

  return (
    <>
      <p className={styles.meta}>Solo se muestran las asignaciones vigentes de este ámbito.</p>
      {body}
      {error && <p className={styles.formError} role="alert">{error}</p>}
      <p className={styles.meta} role="status">{notice}</p>
      {canManage && <AssignmentForm path={path} onAssigned={() => {
        setError(null)
        setNotice('Asignación guardada.')
        reload()
      }} />}
    </>
  )
}

function AssignmentForm({ path, onAssigned }: { path: string; onAssigned: () => void }) {
  const roles = assignableRoles('Coordinadora')
  const [users, setUsers] = useState<ListState<SiaUser>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setUsers({ status: 'loading' })
      const result = await requestAdmin('/api/sia/users', parseUserList)
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setUsers({ status: 'error', message: result.message })
        return
      }
      setUsers({
        status: 'ready',
        items: result.data.filter((user) => roles.some((role) => role === user.role)),
        complete: true,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attempt, roles])

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || users.status !== 'ready') {
      return
    }
    const userId = String(new FormData(event.currentTarget).get('user_id') ?? '')
    const person = users.items.find((user) => user.id === userId)
    if (!person) {
      setError('Elige a una persona.')
      return
    }
    setPending(true)
    setError(null)
    const result = await requestAdmin(path, parseAssignment, {
      method: 'POST',
      body: { user_id: person.id, role: person.role },
    })
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setFormKey((value) => value + 1)
    onAssigned()
  }

  if (users.status === 'loading') {
    return <p className={styles.meta}>Cargando personas…</p>
  }
  if (users.status === 'forbidden' || users.status === 'error') {
    return (
      <>
        <p className={styles.formError} role="alert">
          {users.message}
        </p>
        <button type="button" className={styles.buttonSecondary} onClick={() => setAttempt((value) => value + 1)}>
          Reintentar
        </button>
      </>
    )
  }

  if (users.items.length === 0) {
    return <p className={styles.meta}>No hay gestores ni emprendedores con sesión iniciada para asignar.</p>
  }
  let action = 'Asignar acceso'
  if (pending) action = 'Guardando…'
  return (
    <>
        <form key={formKey} className={styles.form} onSubmit={(event) => void assign(event)}>
          <label className={extra.field}>
            Persona
            <select name="user_id" required defaultValue="" disabled={pending}>
              <option value="">Elige a una persona</option>
              {users.items.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={pending}>
              {action}
            </button>
          </div>
        </form>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </>
  )
}
