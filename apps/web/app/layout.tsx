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
            colorPrimary: '#315442', colorForeground: '#273a2f', colorMutedForeground: '#626d65',
            colorBackground: '#fff', colorInput: '#edf3e8', colorInputForeground: '#273a2f',
            fontFamily: 'Instrument Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
            borderRadius: '0.65rem',
          },
        }}>{children}</ClerkProvider>
      </body>
    </html>
  )
}
