import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'SIA',
  description: 'Sistema de Incubación y Acompañamiento',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.75rem 1.25rem',
  borderBottom: '1px solid #ddd',
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CR">
      <body>
        <ClerkProvider>
          <header style={headerStyle}>
            <strong>SIA</strong>
            <nav style={actionsStyle} aria-label="Sesión">
              <Show when="signed-out">
                <SignInButton>Iniciar sesión</SignInButton>
                <SignUpButton>Registrarse</SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </nav>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
