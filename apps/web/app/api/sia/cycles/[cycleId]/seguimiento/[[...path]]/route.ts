import { NextResponse } from 'next/server'

import { proxySia } from '../../../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLLECTIONS = new Set(['ambitions', 'objectives', 'activities', 'evidence', 'diagnostics'])
const UPDATABLE = new Set(['ambitions', 'objectives', 'activities', 'diagnostics'])

type RouteContext = { params: Promise<{ cycleId: string; path?: string[] }> }

function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function allows(method: string, path: readonly string[]): boolean {
  const [resource, second, third, fourth, extra] = path
  if (extra !== undefined || !resource) {
    return false
  }
  if (path.length === 1 && (resource === 'canvas' || resource === 'schedule' || resource === 'validations' || resource === 'summary')) {
    return method === 'GET'
  }
  if (path.length === 1 && COLLECTIONS.has(resource)) {
    return method === 'GET' || method === 'POST'
  }
  if (path.length === 2 && UPDATABLE.has(resource) && isUuid(second)) {
    return method === 'PUT'
  }
  if (
    path.length === 3 &&
    isUuid(second) &&
    third === 'submit' &&
    (resource === 'objectives' || resource === 'diagnostics')
  ) {
    return method === 'POST'
  }
  if (
    path.length === 3 &&
    isUuid(second) &&
    third === 'validations' &&
    (resource === 'objectives' || resource === 'diagnostics')
  ) {
    return method === 'POST'
  }
  if (path.length === 3 && resource === 'activities' && isUuid(second) && third === 'completion') {
    return method === 'POST'
  }
  return (
    path.length === 4 &&
    resource === 'diagnostics' &&
    second === 'compare' &&
    isUuid(third) &&
    isUuid(fourth) &&
    method === 'GET'
  )
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
  if (new URL(request.url).searchParams.size > 0) {
    return NextResponse.json({ detail: 'Parámetro no permitido' }, { status: 400 })
  }
  let body: string | undefined
  if (request.method === 'POST' || request.method === 'PUT') {
    const read = await readBody(request)
    if (read instanceof NextResponse) {
      return read
    }
    body = read
  }
  const suffix = path.map((segment) => encodeURIComponent(segment)).join('/')
  return proxySia(`/cycles/${encodeURIComponent(cycleId)}/seguimiento/${suffix}`, {
    method: request.method,
    search: '',
    body,
  })
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
