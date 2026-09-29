import {
  expedienteUrl, parseCycleList, parseEnrollmentList, parseEntrepreneurshipList,
  requestExpediente, type Cycle, type Enrollment, type Entrepreneurship,
} from './expediente'

// Presentation follows visual/prototype, not the persistence hierarchy.
export const PROJECT_GROUPS = [
  { label: 'GENERAL', sections: ['Resumen'] },
  { label: 'ACOMPAÑAMIENTO', sections: ['Diagnóstico 360°', 'Ambiciones', 'Objetivos y actividades', 'Evidencias', 'Evolución', 'Informes'] },
  { label: 'ESPACIO DEL PROYECTO', sections: ['Reuniones', 'Finanzas y compras', 'Chat', 'Equipo'] },
] as const
export type ProjectSection = typeof PROJECT_GROUPS[number]['sections'][number] | 'Alertas'
export type Project = { cycle: Cycle; enrollment: Enrollment; entrepreneurship: Entrepreneurship }

export function readProjectSection(hash: string): { section: ProjectSection; id?: string } {
  try {
    const [section = '', id] = decodeURIComponent(hash.replace(/^#/, '')).split('/')
    const sections: readonly string[] = [...PROJECT_GROUPS.flatMap((group) => [...group.sections]), 'Alertas']
    return { section: sections.includes(section) ? section as ProjectSection : 'Diagnóstico 360°', id }
  } catch {
    return { section: 'Diagnóstico 360°' }
  }
}

async function allPages<T>(path: string, parser: (value: unknown) => T[] | null): Promise<T[]> {
  const items: T[] = []
  for (let offset = 0; ; offset += 50) {
    const result = await requestExpediente(expedienteUrl(path, { limit: 50, offset }), parser)
    if (!result.ok) throw new Error(result.message)
    items.push(...result.data)
    if (result.data.length < 50) return items
  }
}

export async function loadProjects(): Promise<Project[]> {
  const entrepreneurships = await allPages('', parseEntrepreneurshipList)
  const nested = await Promise.all(entrepreneurships.map(async (entrepreneurship) => {
    const enrollments = await allPages(`/${entrepreneurship.id}/enrollments`, parseEnrollmentList)
    return (await Promise.all(enrollments.map(async (enrollment) => {
      if (enrollment.entrepreneurship_id !== entrepreneurship.id) throw new Error('La inscripción no pertenece al proyecto consultado.')
      const cycles = await allPages(`/enrollments/${enrollment.id}/cycles`, parseCycleList)
      if (cycles.some((cycle) => cycle.enrollment_id !== enrollment.id)) throw new Error('El ciclo no pertenece a la inscripción consultada.')
      return cycles.map((cycle) => ({ cycle, enrollment, entrepreneurship }))
    }))).flat()
  }))
  return nested.flat()
}
