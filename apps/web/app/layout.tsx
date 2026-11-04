import { ClerkProvider } from '@clerk/nextjs'
import { clerkSpanish } from './lib/clerk-spanish'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './project.css'

export const metadata: Metadata = {
  title: 'Espacio del proyecto en Catalitec',
  description: 'Sistema de Incubación y Acompañamiento',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CR">
      <body>
        <ClerkProvider localization={clerkSpanish}>{children}</ClerkProvider>
      </body>
    </html>
  )
}
