import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const JWT_TEMPLATE = process.env.CLERK_JWT_TEMPLATE ?? 'sia'
const EXPECTED_AUD = process.env.SIA_CLERK_AUDIENCE ?? 'sia'

function apiBaseUrl(): string {
  return process.env.SIA_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
}

function jwtFromClerk(result: unknown): string | null {
  if (typeof result === 'string' && result) {
    return result
  }
  if (result && typeof result === 'object' && 'jwt' in result) {
    const jwt = result.jwt
    if (typeof jwt === 'string' && jwt) {
      return jwt
    }
  }
  return null
}

function peekClaims(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1]
  if (!part) {
    return null
  }
  try {
    const json = Buffer.from(part, 'base64url').toString('utf8')
    const payload = JSON.parse(json) as Record<string, unknown>
    return {
      iss: payload.iss ?? null,
      aud: payload.aud ?? null,
      email: payload.email ?? null,
      email_verified: payload.email_verified ?? null,
      keys: Object.keys(payload),
    }
  } catch {
    return null
  }
}

function audienceOf(claims: Record<string, unknown>): string | null {
  const aud = claims.aud
  if (typeof aud === 'string') {
    return aud
  }
  if (Array.isArray(aud) && typeof aud[0] === 'string') {
    return aud[0]
  }
  return null
}

export async function GET() {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) {
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  let token: string | null
  try {
    const client = await clerkClient()
    token = jwtFromClerk(await client.sessions.getToken(sessionId, JWT_TEMPLATE))
  } catch {
    return NextResponse.json(
      {
        detail: 'Clerk no pudo emitir el JWT de plantilla sia. Compruebe JWT templates en Development.',
      },
      { status: 401 },
    )
  }
  if (!token) {
    return NextResponse.json(
      { detail: 'No hay JWT de plantilla SIA; configure la plantilla en Clerk' },
      { status: 401 },
    )
  }

  const claims = peekClaims(token)
  if (!claims || audienceOf(claims) !== EXPECTED_AUD) {
    return NextResponse.json(
      {
        detail:
          'El JWT no es la plantilla sia (falta aud). Clerk emitió el token de sesión; FastAPI lo rechaza.',
        clerk_claims: claims,
      },
      { status: 401 },
    )
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const body = await response.text()
    if (!response.ok) {
      let parsed: { detail?: unknown } = {}
      try {
        parsed = JSON.parse(body) as { detail?: unknown }
      } catch {
        parsed = { detail: body }
      }
      const detail =
        typeof parsed.detail === 'string' ? parsed.detail : body
      return NextResponse.json(
        { detail, clerk_claims: claims },
        { status: response.status },
      )
    }
    return new NextResponse(body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json(
      { detail: 'No se pudo conectar con la API en ' + apiBaseUrl() },
      { status: 503 },
    )
  }
}
