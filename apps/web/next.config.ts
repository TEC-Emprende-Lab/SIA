import type { NextConfig } from 'next'

const config: NextConfig = {
  async redirects() {
    return [
      // Keep existing project deep links, but retire the storage-tree navigation.
      { source: '/expediente/:entrepreneurshipId/inscripciones/:enrollmentId/ciclos/:cycleId', destination: '/?project=:cycleId', permanent: false },
      { source: '/expediente/:path*', destination: '/', permanent: false },
      { source: '/bandeja', destination: '/#Alertas', permanent: false },
    ]
  },
}

export default config
