import { NextResponse } from 'next/server'

import { proxySia } from '../../../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = { params: Promise<{ cycleId: string; path?: string[] }> }

function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function allows(method: string, path: readonly string[]): boolean {
  const [meetingId, resource, third, fourth, extra] = path
  if (extra !== undefined) {
    return false
  }
  if (path.length === 0) {
    return method === 'GET' || method === 'POST'
  }
  if (!isUuid(meetingId)) {
    return false
  }
  if (path.length === 1) {
    return method === 'GET' || method === 'PUT' || method === 'DELETE'
  }
  if (path.length === 2 && (resource === 'minutes' || resource === 'agreements')) {
    return method === 'GET' || method === 'POST'
  }
  if (path.length === 3 && resource === 'minutes' && third === 'drafts') {
    return method === 'POST'
  }
  if (path.length === 3 && resource === 'minutes' && isUuid(third)) {
    return method === 'PUT'
  }
  if (path.length === 3 && resource === 'agreements' && isUuid(third)) {
    return method === 'PUT'
  }
  return (
    path.length === 4 &&
    resource === 'minutes' &&
    isUuid(third) &&
    fourth === 'approval' &&
    method === 'POST'
  )
}

function searchFrom(request: Request): string | NextResponse {
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

async function readBody(request: Request): Promise<string | NextResponse> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'El cuerpo debe ser JSON' }, { status: 415 })
  }
  const text = await request.text()
  if (text.length > 262144) {
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
  const { cycleId, path = [] } = await context.params
  if (!isUuid(cycleId) || !allows(request.method, path)) {
    return NextResponse.json({ detail: 'Ruta no encontrada' }, { status: 404 })
  }
  const search = searchFrom(request)
  if (search instanceof NextResponse) {
    return search
  }
  let body: string | undefined
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    const read = await readBody(request)
    if (read instanceof NextResponse) {
      return read
    }
    body = read
  }
  const suffix = path.map((segment) => encodeURIComponent(segment)).join('/')
  const apiPath = suffix
    ? `/cycles/${encodeURIComponent(cycleId)}/meetings/${suffix}`
    : `/cycles/${encodeURIComponent(cycleId)}/meetings`
  return proxySia(apiPath, { method: request.method, search, body })
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
