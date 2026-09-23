'use client'

import { Show } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

type Me = {
  id: string
  clerk_user_id: string | null
  email: string
  role: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; me: Me }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }

export function SiaIdentity() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch('/api/sia/me')
      if (cancelled) {
        return
      }
      if (response.status === 403) {
        setState({ status: 'forbidden' })
        return
      }
      if (!response.ok) {
        let detail = ''
        try {
          const payload = (await response.json()) as { detail?: unknown }
          if (typeof payload.detail === 'string') {
            detail = payload.detail
          }
        } catch {
          detail = ''
        }
        setState({
          status: 'error',
          message: detail
            ? `No se pudo consultar la identidad SIA (${response.status}): ${detail}`
            : `No se pudo consultar la identidad SIA (${response.status}).`,
        })
        return
      }
      const me = (await response.json()) as Me
      setState({ status: 'ready', me })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return <p>Consultando identidad SIA…</p>
  }
  if (state.status === 'forbidden') {
    return (
      <p>
        Tu cuenta de Clerk está activa, pero SIA exige una invitación vigente con el mismo correo
        verificado. El registro en Clerk no otorga rol ni acceso al expediente.
      </p>
    )
  }
  if (state.status === 'error') {
    return <p>{state.message}</p>
  }
  return (
    <p>
      Identidad SIA: {state.me.email} · rol {state.me.role}
    </p>
  )
}

export function HomeBody() {
  return (
    <main style={{ padding: '1.25rem' }}>
      <h1>SIA</h1>
      <p>La aplicación de producción está en construcción.</p>
      <Show when="signed-out">
        <p>Inicia sesión con Google para continuar. El primer acceso a SIA requiere invitación.</p>
      </Show>
      <Show when="signed-in">
        <SiaIdentity />
      </Show>
    </main>
  )
}
