'use client'

import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import {
  identityForbiddenMessage,
  identityFromResponse,
  isSiaRole,
  type IdentityState,
  type Me,
} from '../lib/identity'
import { canOpenSection, navigationGroups, ROLE_SCOPE, sectionForPath } from '../lib/navigation'
import styles from './shell.module.css'

const ReadyIdentityContext = createContext<Me | null>(null)

export function useMe(): Me {
  const me = useContext(ReadyIdentityContext)
  if (!me) {
    throw new Error('useMe debe usarse dentro del shell autenticado')
  }
  return me
}

function SessionNotice({ children }: { children: ReactNode }) {
  return <main className={styles.notice}>{children}</main>
}

function StatusPanel({
  status,
  title,
  description,
}: {
  status: 'empty' | 'forbidden' | 'error'
  title: string
  description: string
}) {
  return (
    <section className={styles.panel} data-status={status} role={status === 'error' ? 'alert' : 'status'}>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <StatusPanel status="empty" title={title} description={description} />
}

function IdentityStatus({ state }: { state: Exclude<IdentityState, { status: 'loading' | 'ready' }> }) {
  if (state.status === 'forbidden') {
    return (
      <SessionNotice>
        <p>{identityForbiddenMessage()}</p>
      </SessionNotice>
    )
  }
  return (
    <SessionNotice>
      <p role="alert">{state.message}</p>
    </SessionNotice>
  )
}

export function SignedOutNotice() {
  return (
    <main className={styles.notice}>
      <h1>SIA</h1>
      <p>La aplicación de producción está en construcción.</p>
      <p>Inicia sesión con Google para continuar. El primer acceso a SIA requiere invitación.</p>
    </main>
  )
}

export function WorkspaceHome() {
  const me = useMe()
  const sections = navigationGroups(me.role)
  if (sections.length === 0) {
    return (
      <EmptyState
        title="Sin secciones"
        description="No hay secciones de trabajo para este rol."
      />
    )
  }
  const scope = isSiaRole(me.role) ? `${ROLE_SCOPE[me.role]}. ` : ''
  return (
    <EmptyState
      title="Sin expediente abierto"
      description={`${scope}Elige Expediente en la navegación para continuar.`}
    />
  )
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const pathname = usePathname()
  const [sessionReady, setSessionReady] = useState(false)
  const [state, setState] = useState<IdentityState>({ status: 'loading' })

  useEffect(() => {
    setSessionReady(true)
  }, [])

  useEffect(() => {
    if (!sessionReady || !isLoaded || !isSignedIn) {
      return
    }
    let cancelled = false
    async function load() {
      try {
        const response = await fetch('/api/sia/me')
        if (cancelled) {
          return
        }
        const next = await identityFromResponse(response)
        if (!cancelled) {
          setState(next)
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: 'No se pudo consultar la identidad SIA.' })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [sessionReady, isLoaded, isSignedIn])

  if (!sessionReady || !isLoaded) {
    return (
      <SessionNotice>
        <p aria-live="polite">Cargando sesión…</p>
      </SessionNotice>
    )
  }
  if (!isSignedIn) {
    return <SignedOutNotice />
  }
  if (state.status === 'loading') {
    return (
      <SessionNotice>
        <p aria-live="polite">Consultando identidad SIA…</p>
      </SessionNotice>
    )
  }
  if (state.status === 'forbidden' || state.status === 'error') {
    return <IdentityStatus state={state} />
  }

  const section = sectionForPath(pathname)
  const allowed = section === null || canOpenSection(state.me.role, section)
  const groups = navigationGroups(state.me.role)

  return (
    <ReadyIdentityContext.Provider value={state.me}>
      <div className={styles.shell}>
        <a className={styles.skip} href="#contenido-sia">
          Saltar al contenido
        </a>
        <aside className={styles.nav}>
          <div className={styles.identity}>
            <p>
              <strong>{state.me.email}</strong>
            </p>
            <p>Rol {state.me.role}</p>
            {isSiaRole(state.me.role) ? <p className={styles.scope}>{ROLE_SCOPE[state.me.role]}</p> : null}
          </div>
          <nav aria-label="Navegación SIA">
            <div className={styles.links}>
              <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={styles.link}>
                Inicio
              </Link>
            </div>
            {groups.map((group) => (
              <div key={group.label}>
                <p className={styles.groupLabel}>{group.label}</p>
                <div className={styles.links}>
                  {group.sections.map((item) => {
                    const current = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={styles.link}
                        aria-current={current ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <main id="contenido-sia" className={styles.main}>
          {allowed ? (
            children
          ) : (
            <StatusPanel
              status="forbidden"
              title="Acceso no disponible"
              description="Tu rol no incluye esta sección."
            />
          )}
        </main>
      </div>
    </ReadyIdentityContext.Provider>
  )
}
