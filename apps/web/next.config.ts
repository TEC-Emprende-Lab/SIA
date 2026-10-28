import type { NextConfig } from 'next'

const config: NextConfig = {
  async redirects() {
    return [
      // Open a cycle in the project workspace; keep expediente management reachable.
      { source: '/expediente/:entrepreneurshipId/inscripciones/:enrollmentId/ciclos/:cycleId', destination: '/?project=:cycleId', permanent: false },
      { source: '/bandeja', destination: '/#Alertas', permanent: false },
    ]
  },
}

export default config
