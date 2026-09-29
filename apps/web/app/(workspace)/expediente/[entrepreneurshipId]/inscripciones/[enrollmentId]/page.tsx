'use client'

import { useParams } from 'next/navigation'

import { EnrollmentDetailView } from '../../../../../components/expediente-views'
import { routeParam } from '../../../../../lib/expediente'

export default function EnrollmentPage() {
  const params = useParams()
  return (
    <EnrollmentDetailView
      entrepreneurshipId={routeParam(params.entrepreneurshipId)}
      enrollmentId={routeParam(params.enrollmentId)}
    />
  )
}
