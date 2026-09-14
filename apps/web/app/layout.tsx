import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SIA',
  description: 'Sistema de Incubación y Acompañamiento',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-CR"><body>{children}</body></html>
}
