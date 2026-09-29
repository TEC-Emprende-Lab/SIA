'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { StatusPanel, useMe } from './authenticated-shell'
import styles from './expediente.module.css'
import extra from './comunicacion.module.css'
import { formatDateTime } from '../lib/expediente'
import {
  assignableRoles,
  canListUsers,
  INVITATION_PAGE_SIZE,
  INVITATION_STATE_LABEL,
  invitableRoles,
  invitationEmail,
  invitationState,
  parseAssignment,
  parseInvitation,
  parseInvitationList,
  parseUserList,
  requestAdmin,
  type Assignment,
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
  return scope.kind === 'entrepreneurship'
    ? `/api/sia/entrepreneurships/${scope.id}/assignments`
    : `/api/sia/entrepreneurships/cycles/${scope.id}/assignments`
}

type Registered = { assignment: Assignment; email: string }

export function AssignmentPanel({ scope }: { scope: AssignmentScope }) {
  const me = useMe()
  const roles = assignableRoles(me.role)
  if (roles.length === 0) {
    return null
  }
  const title = scope.kind === 'entrepreneurship' ? 'Asignaciones del emprendimiento' : 'Asignaciones del ciclo'
  return (
    <section className={styles.section} aria-labelledby={`asignaciones-${scope.id}`}>
      <h2 id={`asignaciones-${scope.id}`}>{title}</h2>
      {canListUsers(me.role) ? (
        <AssignmentForm scope={scope} roles={roles} />
      ) : (
        <p className={styles.meta}>
          Para asignar hay que elegir a la persona en el listado de usuarios, que la API entrega solo a Coordinadora.
          TBD: cómo elige Gestor a la persona que asigna.
        </p>
      )}
    </section>
  )
}

function AssignmentForm({ scope, roles }: { scope: AssignmentScope; roles: readonly string[] }) {
  const [users, setUsers] = useState<ListState<SiaUser>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState<Registered[]>([])
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
        setUsers(
          result.status === 403
            ? { status: 'forbidden', message: result.message }
            : { status: 'error', message: result.message },
        )
        return
      }
      setUsers({
        status: 'ready',
        items: result.data.filter((user) => roles.includes(user.role)),
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
    setPending('assign')
    setError(null)
    const result = await requestAdmin(assignmentsPath(scope), parseAssignment, {
      method: 'POST',
      body: { user_id: person.id, role: person.role },
    })
    setPending(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setRegistered((items) => [...items, { assignment: result.data, email: person.email }])
    setFormKey((value) => value + 1)
  }

  async function revoke(item: Registered) {
    if (pending) {
      return
    }
    setPending(item.assignment.id)
    setError(null)
    const result = await requestAdmin(`${assignmentsPath(scope)}/${item.assignment.id}`, parseAssignment, {
      method: 'DELETE',
    })
    setPending(null)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setRegistered((items) =>
      items.map((entry) => (entry.assignment.id === item.assignment.id ? { ...entry, assignment: result.data } : entry)),
    )
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

  return (
    <>
      <p className={styles.meta}>
        La API todavía no lista las asignaciones vigentes. Aquí aparecen las que registres en esta visita, y solo esas se
        pueden revocar desde esta pantalla.
      </p>
      {users.items.length === 0 ? (
        <p className={styles.meta}>No hay Gestores ni Emprendedores con sesión iniciada para asignar.</p>
      ) : (
        <form key={formKey} className={styles.form} onSubmit={(event) => void assign(event)}>
          <label className={extra.field}>
            Persona
            <select name="user_id" required defaultValue="" disabled={pending !== null}>
              <option value="">Elige a una persona</option>
              {users.items.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email} ({user.role})
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={pending !== null}>
              {pending === 'assign' ? 'Guardando…' : 'Asignar'}
            </button>
          </div>
        </form>
      )}
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
      {registered.length > 0 ? (
        <ul className={styles.list}>
          {registered.map((item) => (
            <li key={item.assignment.id} className={extra.block}>
              <div className={extra.row}>
                <strong>{item.email}</strong>
                <span className={styles.meta}>{item.assignment.role}</span>
              </div>
              <p className={styles.meta}>
                Asignada {formatDateTime(item.assignment.created_at)}
                {item.assignment.revoked_at ? `. Revocada ${formatDateTime(item.assignment.revoked_at)}.` : '.'}
              </p>
              {item.assignment.revoked_at ? null : (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    disabled={pending !== null}
                    onClick={() => void revoke(item)}
                  >
                    {pending === item.assignment.id ? 'Guardando…' : 'Revocar'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
