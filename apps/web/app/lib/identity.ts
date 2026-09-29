import type { components } from '@sia/contracts'

export type Me = components['schemas']['MeOut']

export const SIA_ROLES = ['Coordinadora', 'Gestor', 'Emprendedor'] as const

export type SiaRole = (typeof SIA_ROLES)[number]

export type IdentityState =
  | { status: 'loading' }
  | { status: 'ready'; me: Me }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }

const IDENTITY_FORBIDDEN =
  'Tu cuenta de Clerk está activa, pero SIA exige una invitación vigente con el mismo correo verificado. El registro en Clerk no otorga rol ni acceso al expediente.'

export function isSiaRole(role: string): role is SiaRole {
  return (SIA_ROLES as readonly string[]).includes(role)
}

export function identityForbiddenMessage(): string {
  return IDENTITY_FORBIDDEN
}

function isMe(value: unknown): value is Me {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    (record.clerk_user_id === null || typeof record.clerk_user_id === 'string') &&
    typeof record.email === 'string' &&
    typeof record.role === 'string' &&
    typeof record.created_at === 'string'
  )
}

export async function identityFromResponse(
  response: Response,
): Promise<Exclude<IdentityState, { status: 'loading' }>> {
  if (response.status === 403) {
    return { status: 'forbidden' }
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
    return {
      status: 'error',
      message: detail
        ? `No se pudo consultar la identidad SIA (${response.status}): ${detail}`
        : `No se pudo consultar la identidad SIA (${response.status}).`,
    }
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return {
      status: 'error',
      message: 'No se pudo consultar la identidad SIA: la respuesta no es JSON.',
    }
  }
  if (!isMe(payload)) {
    return {
      status: 'error',
      message: 'No se pudo consultar la identidad SIA: la respuesta no coincide con el contrato.',
    }
  }
  return { status: 'ready', me: payload }
}
