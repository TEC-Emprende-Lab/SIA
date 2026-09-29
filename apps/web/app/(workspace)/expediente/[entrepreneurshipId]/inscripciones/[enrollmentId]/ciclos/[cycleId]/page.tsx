'use client'

import { useParams } from 'next/navigation'

import { CycleDetailView } from '../../../../../../../components/expediente-views'
import { routeParam } from '../../../../../../../lib/expediente'

export default function CyclePage() {
  const params = useParams()
  return (
    <CycleDetailView
      entrepreneurshipId={routeParam(params.entrepreneurshipId)}
      enrollmentId={routeParam(params.enrollmentId)}
      cycleId={routeParam(params.cycleId)}
    />
  )
}
