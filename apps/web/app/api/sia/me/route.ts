import { NextResponse } from 'next/server'

import { SiaApiError, siaFetch } from '../../../lib/sia-api'

export async function GET() {
  try {
    const response = await siaFetch('/users/me')
    return new NextResponse(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    })
  } catch (error) {
    if (error instanceof SiaApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status })
    }
    return NextResponse.json({ detail: 'Error interno de SIA' }, { status: 500 })
  }
}
