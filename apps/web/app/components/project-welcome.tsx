import Link from 'next/link'
import { ArrowUpRight, FolderOpen } from 'lucide-react'

// Presentation only. The caller derives capabilities from the existing role policy.
export function ProjectWelcome({ unavailable, hasProjects, canManage, onPick, onRefresh }: {
  unavailable: boolean
  hasProjects: boolean
  canManage: boolean
  onPick: () => void
  onRefresh: () => void
}) {
  return (
    <section className="workspace-welcome" aria-labelledby="workspace-welcome-title">
      <span className="welcome-icon" aria-hidden="true"><FolderOpen size={28} strokeWidth={1.5} /></span>
      <p className="eyebrow">Tu espacio de acompañamiento</p>
      <h1 id="workspace-welcome-title">{unavailable ? 'Este proyecto no está disponible' : hasProjects ? 'Elige dónde continuar' : canManage ? 'Todo comienza con un proyecto' : 'Tu próximo proyecto aparecerá aquí'}</h1>
      <p className="welcome-description">{unavailable ? 'No encontramos ese ciclo en los proyectos autorizados para tu cuenta. Puedes elegir otro proyecto o volver a consultar.' : hasProjects ? 'Abre un ciclo para ver su diagnóstico, organizar el trabajo y conversar con el equipo.' : canManage ? 'Registra un emprendimiento y su ciclo de programa desde Expedientes. Si ya existe un expediente, puedes continuar su registro allí.' : 'Cuando tengas una asignación vigente a un emprendimiento con un ciclo de programa, podrás consultar su trabajo desde este espacio.'}</p>
      <div className="welcome-actions">
        {hasProjects && <button className="btn primary" onClick={onPick}>Elegir proyecto <ArrowUpRight size={16} /></button>}
        {canManage && <Link className={`btn ${hasProjects ? 'secondary' : 'primary'}`} href="/expediente">{hasProjects ? 'Gestionar expedientes' : 'Ir a expedientes'} <ArrowUpRight size={16} /></Link>}
        <button className="btn secondary" onClick={onRefresh}>Actualizar proyectos</button>
      </div>
      {!canManage && !hasProjects && <p className="welcome-hint">Si esperabas ver un proyecto, consulta tu asignación con la Coordinadora o el Gestor que te acompaña.</p>}
      {canManage && !hasProjects && <ol className="welcome-steps"><li><span>1</span>Registra el emprendimiento</li><li><span>2</span>Agrega su programa y ciclo</li><li><span>3</span>Vuelve y abre tu proyecto</li></ol>}
    </section>
  )
}
