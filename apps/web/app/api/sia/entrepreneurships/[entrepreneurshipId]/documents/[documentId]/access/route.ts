import { NextResponse } from 'next/server'

import { proxySia } from '../../../../../../../lib/sia-bff'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RouteContext = { params: Promise<{ entrepreneurshipId: string; documentId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { entrepreneurshipId, documentId } = await context.params
  if (!UUID.test(entrepreneurshipId) || !UUID.test(documentId)) {
    return NextResponse.json({ detail: 'Ruta no encontrada' }, { status: 404 })
  }
  return proxySia(`/entrepreneurships/${entrepreneurshipId}/documents/${documentId}/access`, {
    method: 'GET',
    search: '',
  })
}
