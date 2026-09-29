'use client'

import { Show } from '@clerk/nextjs'

import { AuthenticatedShell, SignedOutNotice, WorkspaceHome } from './authenticated-shell'

export function HomeBody() {
  return (
    <>
      <Show when="signed-out">
        <SignedOutNotice />
      </Show>
      <Show when="signed-in">
        <AuthenticatedShell>
          <WorkspaceHome />
        </AuthenticatedShell>
      </Show>
    </>
  )
}
