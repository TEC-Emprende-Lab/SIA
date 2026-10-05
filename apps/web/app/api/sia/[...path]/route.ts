import { NextResponse } from 'next/server'

import { proxySia } from '../../../lib/sia-bff'

function isAllowedSiaPath(path: string): boolean {
  return /^(users\/me|entrepreneurships(?:\/|$)|cycles\/[0-9a-f-]+\/(?:seguimiento|meetings|reports)(?:\/|$)|channels(?:\/|$)|alerts$|notifications(?:\/|$))/.test(
    path,
  )
}

async function forward(request: Request, params: Promise<{ path: string[] }>) {
  const { path: parts } = await params
  const path = parts.join('/')
  if (!isAllowedSiaPath(path)) {
    return NextResponse.json({ detail: 'Ruta SIA no disponible' }, { status: 404 })
  }

  const url = new URL(request.url)
  return proxySia(`/${path}`, {
    method: request.method,
    search: url.search,
    body: request.method === 'GET' ? undefined : await request.text(),
  })
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
