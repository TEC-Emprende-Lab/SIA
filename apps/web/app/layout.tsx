import { ClerkProvider, Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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
          <Show when="signed-out">
            <header className="site-header">
              <strong className="brand">SIA / TEC EMPRENDE</strong>
              <nav className="session-nav" aria-label="Sesión">
                <SignInButton>Iniciar sesión</SignInButton>
                <SignUpButton>Registrarse</SignUpButton>
              </nav>
            </header>
          </Show>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
