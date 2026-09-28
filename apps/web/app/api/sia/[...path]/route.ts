import { NextResponse } from 'next/server'

import { isAllowedSiaPath, SiaApiError, siaFetch } from '../../../lib/sia-api'

async function forward(request: Request, params: Promise<{ path: string[] }>) {
  const { path: parts } = await params
  const path = parts.join('/')
  if (!isAllowedSiaPath(path)) {
    return NextResponse.json({ detail: 'Ruta SIA no disponible' }, { status: 404 })
  }

  const url = new URL(request.url)
  try {
    const response = await siaFetch(`/${path}${url.search}`, {
      method: request.method,
      body: request.method === 'GET' ? undefined : await request.text(),
      headers: request.headers.get('content-type')
        ? { 'content-type': request.headers.get('content-type')! }
        : undefined,
    })
    return new NextResponse(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    })
  } catch (error) {
    const status = error instanceof SiaApiError ? error.status : 500
    const detail = error instanceof SiaApiError ? error.message : 'Error interno de SIA'
    return NextResponse.json({ detail }, { status })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, params)
}
