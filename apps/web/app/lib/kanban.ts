import { canSubmit, canValidate, type ObjectiveStatus } from './seguimiento'

/**
 * Tablero Kanban de objetivos y actividades (US-PRO-001/002 y US-PM-001/002).
 * Las columnas se derivan de datos ya existentes:
 * - objetivos: su estado de validación real, sin estados nuevos;
 * - actividades: fecha de fin y finalización manual, sin estados intermedios
 *   (los estados Kanban de actividad siguen TBD en docs/00-nucleo-comun).
 * Cada movimiento se traduce a un endpoint existente; la autorización sigue en la API.
 */

export const OBJECTIVE_COLUMNS = [
  'draft',
  'pending_validation',
  'correction_requested',
  'rejected',
  'approved',
] as const satisfies readonly ObjectiveStatus[]

export const ACTIVITY_COLUMNS = ['pending', 'overdue', 'completed'] as const

export type ActivityColumn = (typeof ACTIVITY_COLUMNS)[number]

export const ACTIVITY_COLUMN_LABEL: Record<ActivityColumn, string> = {
  pending: 'Pendientes',
  overdue: 'Vencidas',
  completed: 'Completadas',
}

export const ACTIVITY_COLUMN_HINT: Record<ActivityColumn, string> = {
  pending: 'Sin completar y dentro de la fecha de fin.',
  overdue: 'Sin completar y con fecha de fin vencida.',
  completed: 'Finalización manual y reversible.',
}

export const OBJECTIVE_COLUMN_HINT: Record<ObjectiveStatus, string> = {
  draft: 'Antes de enviar a validación.',
  pending_validation: 'Espera la decisión de la Coordinadora o el Gestor asignado.',
  correction_requested: 'Corrige y vuelve a enviar a validación.',
  rejected: 'Puede corregirse y volver a enviarse.',
  approved: 'Se reabre solo si cambian el contenido o las evidencias.',
}

const DECISION_BY_TARGET: Record<ObjectiveStatus, 'approve' | 'request_correction' | 'reject' | null> = {
  draft: null,
  pending_validation: null,
  approved: 'approve',
  correction_requested: 'request_correction',
  rejected: 'reject',
}

export type Blocked = { action: 'blocked'; reason: string }
export type ObjectiveDrop =
  | { action: 'submit' }
  | { action: 'validate'; decision: 'approve' | 'request_correction' | 'reject' }
  | Blocked
export type ActivityDrop = { action: 'completion'; completed: boolean } | Blocked

function blocked(reason: string): Blocked {
  return { action: 'blocked', reason }
}

export function activityColumn(
  activity: { completed_at: string | null; ends_on: string },
  today: string,
): ActivityColumn {
  if (activity.completed_at) {
    return 'completed'
  }
  const end = activity.ends_on.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(end) && end < today) {
    return 'overdue'
  }
  return 'pending'
}

/** Qué ocurre al soltar un objetivo en la columna indicada. */
export function objectiveDrop(
  objective: { status: ObjectiveStatus },
  target: ObjectiveStatus,
  role: string,
): ObjectiveDrop {
  if (target === objective.status) {
    return blocked('La tarjeta ya está en esta columna.')
  }
  if (target === 'pending_validation') {
    if (canSubmit(objective.status)) {
      return { action: 'submit' }
    }
    if (objective.status === 'approved') {
      return blocked('Un objetivo aprobado se reabre al editar su contenido o sus evidencias; no vuelve a validación manualmente.')
    }
    return blocked('Este objetivo ya está en validación.')
  }
  if (target === 'draft') {
    return blocked('Un objetivo enviado no vuelve a borrador: se decide en la validación o se reabre al editar.')
  }
  if (objective.status === 'approved') {
    return blocked('Un objetivo aprobado solo cambia cuando su contenido o sus evidencias se modifican, lo que exige una nueva validación.')
  }
  if (objective.status !== 'pending_validation') {
    return blocked('La validación decide sobre una revisión pendiente.')
  }
  if (!canValidate(role)) {
    return blocked('Solo la Coordinadora o un Gestor asignado puede validar este objetivo.')
  }
  const decision = DECISION_BY_TARGET[target]
  if (!decision) {
    return blocked('Esta columna no corresponde a una decisión de validación.')
  }
  return { action: 'validate', decision }
}

/** Qué ocurre al soltar una actividad en la columna indicada. */
export function activityDrop(
  activity: { completed_at: string | null },
  target: ActivityColumn,
): ActivityDrop {
  if (target === 'completed') {
    if (activity.completed_at) {
      return blocked('La tarjeta ya está en esta columna.')
    }
    return { action: 'completion', completed: true }
  }
  if (activity.completed_at) {
    return { action: 'completion', completed: false }
  }
  return blocked('Esta columna se deriva de la fecha de fin: edita las fechas en la tarjeta.')
}
