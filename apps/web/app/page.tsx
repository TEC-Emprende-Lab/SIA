import { Show } from '@clerk/nextjs'

import { ProjectWorkspace } from './components/project-workspace'

export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <main className="workspace">
          <p className="eyebrow">Sistema de Incubación y Acompañamiento</p>
          <h1>Tu proyecto, su evidencia y cada decisión.</h1>
          <p className="notice">Inicia sesión para consultar un expediente autorizado. El primer acceso requiere una invitación vigente con correo verificado.</p>
        </main>
      </Show>
      <Show when="signed-in"><ProjectWorkspace /></Show>
    </>
  )
}
