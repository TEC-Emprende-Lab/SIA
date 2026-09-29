import type { components } from '@sia/contracts'

import type { SiaRole } from './identity'

/**
 * Invitaciones, usuarios y asignaciones (Fase 7).
 * Invitar: apps/api/app/modules/identity/policy.py. Coordinadora invita a los tres roles; Gestor, a Emprendedor.
 * Gestor solo lista las invitaciones que emitió. Solo Coordinadora lista usuarios.
 * Asignar: docs/00-nucleo-comun/actores-roles-y-permisos.md. Solo Coordinadora asigna o remueve Gestor.
 * El navegador no recibe el token de invitación; la aceptación usa el correo verificado.
 * La autorización de cada operación sigue en la API.
 */

export type Invitation = Omit<components['schemas']['InvitationOut'], 'token'>
export type SiaUser = components['schemas']['UserOut']
export type Assignment = components['schemas']['AssignmentOut']
export type AssignableRole = components['schemas']['AssignmentCreate']['role']

export const INVITATION_PAGE_SIZE = 50

const INVITABLE: Record<SiaRole, readonly SiaRole[]> = {
  Coordinadora: ['Coordinadora', 'Gestor', 'Emprendedor'],
  Gestor: ['Emprendedor'],
  Emprendedor: [],
}

export type AdminResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

export function invitableRoles(role: string): readonly SiaRole[] {
  return role in INVITABLE ? INVITABLE[role as SiaRole] : []
}

export function canListUsers(role: string): boolean {
  return role === 'Coordinadora'
}

const ASSIGNABLE: Record<SiaRole, readonly AssignableRole[]> = {
  Coordinadora: ['Gestor', 'Emprendedor'],
  Gestor: ['Emprendedor'],
  Emprendedor: [],
}

export function assignableRoles(role: string): readonly AssignableRole[] {
  return role in ASSIGNABLE ? ASSIGNABLE[role as SiaRole] : []
}

export function invitationState(invitation: Invitation, now = Date.now()): 'usada' | 'vencida' | 'vigente' {
  if (invitation.used_at) {
    return 'usada'
  }
  const expires = new Date(invitation.expires_at).getTime()
  return Number.isFinite(expires) && expires <= now ? 'vencida' : 'vigente'
}

export const INVITATION_STATE_LABEL: Record<ReturnType<typeof invitationState>, string> = {
  vigente: 'Vigente',
  usada: 'Aceptada',
  vencida: 'Vencida',
}

export function invitationEmail(value: string): { email: string } | { error: string } {
  const email = value.trim().toLowerCase()
  if (!email) {
    return { error: 'El correo es obligatorio.' }
  }
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El correo no es válido.' }
  }
  return { email }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return typeof value === 'string' && value ? value : undefined
}

function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items: T[] = []
  for (const item of value) {
    const parsed = parseItem(item)
    if (!parsed) {
      return null
    }
    items.push(parsed)
  }
  return items
}

export function parseInvitation(value: unknown): Invitation | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredString(value.id)
  const email = requiredString(value.email)
  const role = requiredString(value.role)
  const expiresAt = requiredString(value.expires_at)
  const usedAt = nullableString(value.used_at)
  const createdAt = requiredString(value.created_at)
  if (!id || !email || !role || !expiresAt || usedAt === undefined || !createdAt) {
    return null
  }
  return { id, email, role, expires_at: expiresAt, used_at: usedAt, created_at: createdAt }
}

export function parseInvitationList(value: unknown): Invitation[] | null {
  return parseList(value, parseInvitation)
}

export function parseUser(value: unknown): SiaUser | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredString(value.id)
  const clerkUserId = nullableString(value.clerk_user_id)
  const email = requiredString(value.email)
  const role = requiredString(value.role)
  const createdAt = requiredString(value.created_at)
  if (!id || clerkUserId === undefined || !email || !role || !createdAt) {
    return null
  }
  return { id, clerk_user_id: clerkUserId, email, role, created_at: createdAt }
}

export function parseUserList(value: unknown): SiaUser[] | null {
  return parseList(value, parseUser)
}

export function parseAssignment(value: unknown): Assignment | null {
  if (!isRecord(value)) {
    return null
  }
  const id = requiredString(value.id)
  const userId = requiredString(value.user_id)
  const role = requiredString(value.role)
  const createdAt = requiredString(value.created_at)
  const revokedAt = nullableString(value.revoked_at)
  if (!id || !userId || !role || !createdAt || revokedAt === undefined) {
    return null
  }
  return { id, user_id: userId, role, created_at: createdAt, revoked_at: revokedAt }
}

function detailMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback
  }
  const detail = payload.detail
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item) => {
      if (isRecord(item) && typeof item.msg === 'string' && item.msg.trim()) {
        return [item.msg]
      }
      return []
    })
    if (messages.length > 0) {
      return messages.join(' ')
    }
  }
  return fallback
}

export async function requestAdmin<T>(
  path: string,
  parse: (value: unknown) => T | null,
  init?: { method: 'POST' | 'DELETE'; body?: unknown },
): Promise<AdminResult<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    return { ok: false, status: 0, message: 'No se pudo conectar con SIA.' }
  }
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: detailMessage(payload, `No se pudo completar la operación (${response.status}).`),
    }
  }
  const data = parse(payload)
  if (data === null) {
    return { ok: false, status: response.status, message: 'La respuesta no coincide con el contrato.' }
  }
  return { ok: true, data }
}
