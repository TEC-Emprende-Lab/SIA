import { isSiaRole, type SiaRole } from './identity'

/**
 * Navegación del shell (Fase 7).
 * Alcance por rol: docs/00-nucleo-comun/actores-roles-y-permisos.md.
 * Invitaciones y usuarios siguen apps/api/app/modules/identity/policy.py:
 * Coordinadora lista usuarios; Coordinadora y Gestor listan invitaciones.
 * Revisor financiero sigue TBD y no aparece aquí.
 * La UI solo oculta enlaces; cada operación se autoriza en la API.
 */
export type ShellHref = '/expediente' | '/invitaciones' | '/usuarios'

export type ShellGroup = 'Trabajo' | 'Administración'

export type ShellSection = {
  href: ShellHref
  label: string
  group: ShellGroup
  roles: readonly SiaRole[]
  emptyTitle: string
  emptyDescription: string
}

export const ROLE_SCOPE: Record<SiaRole, string> = {
  Coordinadora: 'Visibilidad global',
  Gestor: 'Solo emprendimientos o ciclos asignados',
  Emprendedor: 'Solo emprendimientos donde participas',
}

export const SHELL_SECTIONS: readonly ShellSection[] = [
  {
    href: '/expediente',
    label: 'Expediente',
    group: 'Trabajo',
    roles: ['Coordinadora', 'Gestor', 'Emprendedor'],
    emptyTitle: 'Expediente',
    emptyDescription: 'Esta sección aún no muestra registros.',
  },
  {
    href: '/invitaciones',
    label: 'Invitaciones',
    group: 'Administración',
    roles: ['Coordinadora', 'Gestor'],
    emptyTitle: 'Invitaciones',
    emptyDescription: 'Esta sección aún no muestra registros.',
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    group: 'Administración',
    roles: ['Coordinadora'],
    emptyTitle: 'Usuarios',
    emptyDescription: 'Esta sección aún no muestra registros.',
  },
]

const GROUP_ORDER: readonly ShellGroup[] = ['Trabajo', 'Administración']

export function sectionsForRole(role: string): ShellSection[] {
  if (!isSiaRole(role)) {
    return []
  }
  return SHELL_SECTIONS.filter((section) => section.roles.includes(role))
}

export function navigationGroups(role: string): { label: ShellGroup; sections: ShellSection[] }[] {
  const sections = sectionsForRole(role)
  return GROUP_ORDER.map((label) => ({
    label,
    sections: sections.filter((section) => section.group === label),
  })).filter((group) => group.sections.length > 0)
}

export function sectionForPath(pathname: string): ShellSection | null {
  return (
    SHELL_SECTIONS.find(
      (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
    ) ?? null
  )
}

export function canOpenSection(role: string, section: ShellSection): boolean {
  return isSiaRole(role) && section.roles.includes(role)
}

export function sectionByHref(href: ShellHref): ShellSection {
  const section = SHELL_SECTIONS.find((item) => item.href === href)
  if (!section) {
    throw new Error(`Sección no configurada: ${href}`)
  }
  return section
}
