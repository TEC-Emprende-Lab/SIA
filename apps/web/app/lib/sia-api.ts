import 'server-only'

import { auth, clerkClient } from '@clerk/nextjs/server'

const jwtTemplate = process.env.CLERK_JWT_TEMPLATE ?? 'sia'
const expectedAudience = process.env.SIA_CLERK_AUDIENCE ?? 'sia'

export class SiaApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function apiBaseUrl(): string {
  return process.env.SIA_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
}

function tokenFromClerk(value: unknown): string | null {
  if (typeof value === 'string' && value) return value
  if (value && typeof value === 'object' && 'jwt' in value && typeof value.jwt === 'string') {
    return value.jwt
  }
  return null
}

function hasExpectedAudience(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
      aud?: string | string[]
    }
    return Array.isArray(payload.aud)
      ? payload.aud.includes(expectedAudience)
      : payload.aud === expectedAudience
  } catch {
    return false
  }
}

async function siaToken(): Promise<string> {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) throw new SiaApiError(401, 'No autenticado')

  let token: string | null = null
  try {
    token = tokenFromClerk(await (await clerkClient()).sessions.getToken(sessionId, jwtTemplate))
  } catch {
    throw new SiaApiError(401, 'Clerk no pudo emitir el JWT de SIA')
  }
  if (!token || !hasExpectedAudience(token)) {
    throw new SiaApiError(401, 'El JWT de SIA no tiene la audiencia requerida')
  }
  return token
}

export async function siaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await siaToken()
  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
  } catch {
    throw new SiaApiError(503, 'No se pudo conectar con la API de SIA')
  }
}

export async function siaJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await siaFetch(path, init)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: unknown }
    throw new SiaApiError(
      response.status,
      typeof body.detail === 'string' ? body.detail : 'La API de SIA no pudo procesar la solicitud',
    )
  }
  return response.json() as Promise<T>
}

export function isAllowedSiaPath(path: string): boolean {
  return /^(users\/me|entrepreneurships(?:\/|$)|cycles\/[0-9a-f-]+\/(?:seguimiento|meetings|reports)(?:\/|$)|channels(?:\/|$)|alerts$|notifications(?:\/|$))/.test(
    path,
  )
}
