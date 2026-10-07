import { NextResponse } from 'next/server'

import { apiBaseUrl, readSiaBearer } from '../../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = { params: Promise<{ entrepreneurshipId: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { entrepreneurshipId } = await context.params
  if (!UUID.test(entrepreneurshipId)) {
    return NextResponse.json({ detail: 'Ruta no encontrada' }, { status: 404 })
  }
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return NextResponse.json({ detail: 'El cuerpo debe ser multipart/form-data' }, { status: 415 })
  }
  const bearer = await readSiaBearer()
  if ('response' in bearer) {
    return bearer.response
  }
  try {
    const response = await fetch(`${apiBaseUrl()}/entrepreneurships/${entrepreneurshipId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer.token}`,
        'content-type': contentType,
      },
      body: await request.arrayBuffer(),
      cache: 'no-store',
    })
    const body = await response.text()
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ detail: 'No se pudo conectar con la API en ' + apiBaseUrl() }, { status: 503 })
  }
}
