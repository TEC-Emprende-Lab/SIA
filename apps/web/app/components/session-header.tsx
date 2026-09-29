'use client'

import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs'

export function SessionHeader() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <header className="site-header">
      <strong className="brand">SIA / TEC EMPRENDE</strong>
      <nav className="session-nav" aria-label="Sesión">
        {!isLoaded || isSignedIn ? null : (
          <>
            <SignInButton>Iniciar sesión</SignInButton>
            <SignUpButton>Registrarse</SignUpButton>
          </>
        )}
      </nav>
    </header>
  )
}
