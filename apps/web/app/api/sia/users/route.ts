import { NextResponse } from 'next/server'

import { proxyIdentity } from '../../../lib/sia-identity-bff'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.size > 0) {
    return NextResponse.json({ detail: 'Parámetro no permitido' }, { status: 400 })
  }
  return proxyIdentity('/users', { method: 'GET', search: '', stripToken: false })
}
