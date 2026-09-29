import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SessionHeader } from './components/session-header'
import './globals.css'

export const metadata: Metadata = {
  title: 'SIA',
  description: 'Sistema de Incubación y Acompañamiento',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CR">
      <body>
        <ClerkProvider>
          <SessionHeader />
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
