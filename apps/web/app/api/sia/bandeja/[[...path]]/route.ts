import { NextResponse } from 'next/server'

import { proxySia } from '../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = { params: Promise<{ path?: string[] }> }

function isUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

function allows(method: string, path: readonly string[]): boolean {
  const [first, second, third, extra] = path
  if (extra !== undefined || path.length === 0) {
    return false
  }
  if (path.length === 1 && (first === 'alerts' || first === 'notifications')) {
    return method === 'GET'
  }
  return path.length === 3 && first === 'notifications' && isUuid(second) && third === 'read' && method === 'PUT'
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

async function forward(request: Request, context: RouteContext): Promise<NextResponse> {
  const { path = [] } = await context.params
  if (!allows(request.method, path)) {
    return NextResponse.json({ detail: 'Ruta no encontrada' }, { status: 404 })
  }
  const search = searchFrom(request)
  if (search instanceof NextResponse) {
    return search
  }
  const suffix = path.map((segment) => encodeURIComponent(segment)).join('/')
  return proxySia(`/${suffix}`, { method: request.method, search })
}

export function GET(request: Request, context: RouteContext) {
  return forward(request, context)
}

export function PUT(request: Request, context: RouteContext) {
  return forward(request, context)
}
