import { NextResponse } from 'next/server'

import { proxySia } from '../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = { params: Promise<{ path?: string[] }> }

function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function allows(method: string, path: readonly string[]): boolean {
  const [channelId, resource, messageId, extra] = path
  if (extra !== undefined) {
    return false
  }
  if (path.length === 0) {
    return method === 'GET' || method === 'POST'
  }
  if (!isUuid(channelId) || path.length === 1) {
    return false
  }
  if (path.length === 2 && resource === 'messages') {
    return method === 'GET' || method === 'POST'
  }
  if (path.length === 2 && resource === 'read-receipt') {
    return method === 'PUT'
  }
  if (path.length === 2 && resource === 'unread') {
    return method === 'GET'
  }
  return path.length === 3 && resource === 'messages' && isUuid(messageId) && (method === 'PUT' || method === 'DELETE')
}

function searchFrom(request: Request, path: readonly string[]): string | NextResponse {
  const url = new URL(request.url)
  const listing = request.method === 'GET' && (path.length === 0 || path[1] === 'messages')
  const allowed = new Set(
    !listing ? [] : path.length === 0 ? ['entrepreneurship_id', 'cycle_id', 'limit', 'offset'] : ['limit', 'offset'],
  )
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) {
      return NextResponse.json({ detail: 'Parámetro no permitido' }, { status: 400 })
    }
  }
  const params = new URLSearchParams()
  for (const key of allowed) {
    const values = url.searchParams.getAll(key)
    if (values.length > 1) {
      return NextResponse.json({ detail: 'Parámetro repetido' }, { status: 400 })
    }
    const value = values[0]
    if (value === undefined) {
      continue
    }
    const valid = key === 'limit' || key === 'offset' ? /^\d+$/.test(value) : isUuid(value)
    if (!valid) {
      return NextResponse.json({ detail: `${key} inválido` }, { status: 400 })
    }
    params.set(key, value)
  }
  if (listing && path.length === 0 && !params.has('entrepreneurship_id')) {
    return NextResponse.json({ detail: 'entrepreneurship_id es obligatorio' }, { status: 400 })
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

async function readBody(request: Request): Promise<string | NextResponse> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'El cuerpo debe ser JSON' }, { status: 415 })
  }
  const text = await request.text()
  if (text.length > 65536) {
    return NextResponse.json({ detail: 'El cuerpo excede el tamaño permitido' }, { status: 413 })
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ detail: 'El cuerpo debe ser un objeto JSON' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ detail: 'JSON inválido' }, { status: 400 })
  }
  return text
}

async function forward(request: Request, context: RouteContext): Promise<NextResponse> {
  const { path = [] } = await context.params
  if (!allows(request.method, path)) {
    return NextResponse.json({ detail: 'Ruta no encontrada' }, { status: 404 })
  }
  const search = searchFrom(request, path)
  if (search instanceof NextResponse) {
    return search
  }
  let body: string | undefined
  if (request.method !== 'GET') {
    const read = await readBody(request)
    if (read instanceof NextResponse) {
      return read
    }
    body = read
  }
  const suffix = path.map((segment) => encodeURIComponent(segment)).join('/')
  return proxySia(suffix ? `/channels/${suffix}` : '/channels', { method: request.method, search, body })
}

export function GET(request: Request, context: RouteContext) {
  return forward(request, context)
}

export function POST(request: Request, context: RouteContext) {
  return forward(request, context)
}

export function PUT(request: Request, context: RouteContext) {
  return forward(request, context)
}

export function DELETE(request: Request, context: RouteContext) {
  return forward(request, context)
}
