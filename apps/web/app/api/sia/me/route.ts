import { NextResponse } from 'next/server'

import { apiBaseUrl, readSiaBearer } from '../../../lib/sia-bff'

export async function GET() {
  const bearer = await readSiaBearer()
  if ('response' in bearer) {
    return bearer.response
  }
  const { token, claims } = bearer

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
      const detail = typeof parsed.detail === 'string' ? parsed.detail : body
      return NextResponse.json({ detail, clerk_claims: claims }, { status: response.status })
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
