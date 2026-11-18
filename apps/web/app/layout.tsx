import { ClerkProvider } from '@clerk/nextjs'
import { ui } from '@clerk/ui'
import { clerkSpanish } from './lib/clerk-spanish'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './project.css'

export const metadata: Metadata = {
  title: 'SIA de TEC Emprende Lab',
  description: 'Sistema de Incubación y Acompañamiento',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CR">
      <body>
        <ClerkProvider ui={ui} localization={clerkSpanish} appearance={{
          variables: {
            colorPrimary: '#1d1d1f', colorForeground: '#1d1d1f', colorMutedForeground: '#6e6e73',
            colorBackground: '#fff', colorInput: '#f5f5f7', colorInputForeground: '#1d1d1f',
            fontFamily: '-apple-system, BlinkMacSystemFont, Helvetica Neue, Segoe UI, sans-serif',
            borderRadius: '0.65rem',
          },
        }}>{children}</ClerkProvider>
      </body>
    </html>
  )
}
