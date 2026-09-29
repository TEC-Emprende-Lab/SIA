'use client'

import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs'

export function SessionHeader() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <header className="site-header">
      <strong className="brand">SIA / TEC EMPRENDE</strong>
      <nav className="session-nav" aria-label="Sesión">
        {!isLoaded ? null : isSignedIn ? (
          <UserButton />
        ) : (
          <>
            <SignInButton>Iniciar sesión</SignInButton>
            <SignUpButton>Registrarse</SignUpButton>
          </>
        )}
      </nav>
    </header>
  )
}
