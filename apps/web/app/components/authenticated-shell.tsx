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

export function StatusPanel({
  status,
  title,
  description,
  heading = 'h1',
}: {
  status: 'empty' | 'forbidden' | 'error' | 'missing'
  title: string
  description: string
  heading?: 'h1' | 'h2'
}) {
  const Title = heading
  return (
    <section className={styles.panel} data-status={status} role={status === 'error' ? 'alert' : 'status'}>
      <Title>{title}</Title>
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
    <main className={styles.guest}>
      <section className={styles.guestHero}>
        <p className={styles.guestEyebrow}>TEC Emprende Lab · CataliTech</p>
        <h1>SIA acompaña el avance que sí deja evidencia.</h1>
        <p className={styles.guestLead}>
          Un espacio para organizar el trabajo de cada emprendimiento, sus acuerdos y los aprendizajes de cada ciclo.
        </p>
        <div className={styles.guestSteps} aria-label="Cómo empezar">
          <span>1. Inicia sesión con Google</span>
          <span>2. Accede a tu expediente autorizado</span>
        </div>
      </section>
      <aside className={styles.guestCard}>
        <div className={styles.guestMark} aria-hidden="true">S</div>
        <p className={styles.guestCardEyebrow}>Sistema de Incubación y Acompañamiento</p>
        <h2>Tu espacio de trabajo está listo.</h2>
        <p>
          Inicia sesión para consultar los emprendimientos y ciclos que tienes asignados.
        </p>
        <p className={styles.guestNote}>
          El primer acceso requiere una invitación vigente con el mismo correo verificado.
        </p>
      </aside>
    </main>
  )
}

export function WorkspaceHome() {
  const me = useMe()
  const role = typeof me.role === 'string' ? me.role : ''
  const sections = navigationGroups(role)
  if (sections.length === 0) {
    return (
      <EmptyState
        title="Sin secciones"
        description="No hay secciones de trabajo para este rol."
      />
    )
  }
  const scope = isSiaRole(role) ? `${ROLE_SCOPE[role]}. ` : ''
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

  const role = typeof state.me.role === 'string' ? state.me.role : ''
  const section = sectionForPath(pathname)
  const allowed = section === null || canOpenSection(role, section)
  const groups = navigationGroups(role)

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
            <p>Rol {role}</p>
            {isSiaRole(role) ? <p className={styles.scope}>{ROLE_SCOPE[role]}</p> : null}
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
