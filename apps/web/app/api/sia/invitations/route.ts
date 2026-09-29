import { NextResponse } from 'next/server'

import { pageSearch, proxyIdentity } from '../../../lib/sia-identity-bff'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const search = pageSearch(request)
  if (search instanceof NextResponse) {
    return search
  }
  return proxyIdentity('/invitations', { method: 'GET', search, stripToken: true })
}

export async function POST(request: Request) {
  if (new URL(request.url).searchParams.size > 0) {
    return NextResponse.json({ detail: 'Parámetro no permitido' }, { status: 400 })
  }
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ detail: 'El cuerpo debe ser JSON' }, { status: 415 })
  }
  const text = await request.text()
  if (text.length > 2048) {
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
  return proxyIdentity('/invitations', { method: 'POST', search: '', body: text, stripToken: true })
}
