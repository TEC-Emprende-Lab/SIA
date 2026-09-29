'use client'

import { AuthenticatedShell } from './authenticated-shell'
import { ProjectWorkspace } from './project-workspace'

export function ProjectApp() {
  return <AuthenticatedShell chrome={false}><ProjectWorkspace /></AuthenticatedShell>
}
