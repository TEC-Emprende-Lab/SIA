import { NextResponse } from 'next/server'

import { apiBaseUrl, readSiaBearer } from './sia-bff'

function withoutToken(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutToken)
  }
  if (value && typeof value === 'object') {
    const { token: _token, ...rest } = value as Record<string, unknown>
    return rest
  }
  return value
}

/**
 * Reenvía invitaciones y usuarios a la API.
 * El token de invitación no sale al navegador: la aceptación usa el correo verificado.
 */
export async function proxyIdentity(
  apiPath: string,
  init: { method: string; search: string; body?: string; stripToken: boolean },
): Promise<NextResponse> {
  const bearer = await readSiaBearer()
  if ('response' in bearer) {
    return bearer.response
  }
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${apiPath}${init.search}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${bearer.token}`,
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: init.body,
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { detail: 'No se pudo conectar con la API en ' + apiBaseUrl() },
      { status: 503 },
    )
  }
  const text = await response.text()
  if (!response.ok || !init.stripToken) {
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    })
  }
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    return NextResponse.json({ detail: 'La API devolvió una respuesta no JSON' }, { status: 502 })
  }
  return NextResponse.json(withoutToken(payload), {
    status: response.status,
    headers: { 'cache-control': 'no-store' },
  })
}

export function pageSearch(request: Request): string | NextResponse {
  const url = new URL(request.url)
  for (const key of url.searchParams.keys()) {
    if (key !== 'limit' && key !== 'offset') {
      return NextResponse.json({ detail: 'Parámetro no permitido' }, { status: 400 })
    }
  }
  const params = new URLSearchParams()
  for (const key of ['limit', 'offset'] as const) {
    const values = url.searchParams.getAll(key)
    if (values.length > 1) {
      return NextResponse.json({ detail: 'Parámetro repetido' }, { status: 400 })
    }
    const value = values[0]
    if (value === undefined) {
      continue
    }
    if (!/^\d+$/.test(value)) {
      return NextResponse.json({ detail: `${key} inválido` }, { status: 400 })
    }
    params.set(key, value)
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}
