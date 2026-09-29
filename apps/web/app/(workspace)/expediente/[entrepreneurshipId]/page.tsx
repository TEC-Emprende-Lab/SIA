'use client'

import { useParams } from 'next/navigation'

import { ExpedienteDetailView } from '../../../components/expediente-views'
import { routeParam } from '../../../lib/expediente'

export default function ExpedienteDetailPage() {
  const params = useParams()
  return <ExpedienteDetailView entrepreneurshipId={routeParam(params.entrepreneurshipId)} />
}
