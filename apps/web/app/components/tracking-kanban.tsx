'use client'

import { useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CalendarDays, CheckCircle2, GripVertical } from 'lucide-react'
import styles from './tracking-kanban.module.css'
import {
  ACTIVITY_COLUMNS,
  ACTIVITY_COLUMN_HINT,
  ACTIVITY_COLUMN_LABEL,
  OBJECTIVE_COLUMNS,
  OBJECTIVE_COLUMN_HINT,
  activityColumn,
  activityDrop,
  objectiveDrop,
  type ActivityColumn,
} from '../lib/kanban'
import { STATUS_LABEL, type Activity, type Area, type Objective, type ObjectiveStatus, type TrackingSummary } from '../lib/seguimiento'

export type ObjectiveDecision = 'approve' | 'request_correction' | 'reject'
export type ObjectiveDropAction = { action: 'submit' } | { action: 'validate'; decision: ObjectiveDecision }

type Notice = { id: string; message: string } | null

type TrackingKanbanProps = {
  board: 'objectives' | 'activities'
  objectives: Objective[]
  activities: Activity[]
  areas: Area[]
  summary: TrackingSummary
  role: string
  pendingId: string | null
  actionError: Notice
  today?: string
  onDropObjective: (objective: Objective, drop: ObjectiveDropAction) => void
  onDropActivity: (activity: Activity, completed: boolean) => void
  onOpenObjective: (objectiveId: string) => void
  onOpenActivity: (activityId: string) => void
}

function currentDay(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function shortDay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) {
    return value
  }
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  )
}

function areaName(areas: Area[], id: string): string {
  return areas.find((area) => area.id === id)?.name ?? 'Área'
}

const KIND_SEPARATOR = ':'

function parseId(value: string): { kind: 'objective' | 'activity'; key: string } | null {
  const index = value.indexOf(KIND_SEPARATOR)
  if (index < 0) {
    return null
  }
  const kind = value.slice(0, index)
  const key = value.slice(index + 1)
  if (!key || (kind !== 'objective' && kind !== 'activity')) {
    return null
  }
  return { kind, key }
}

export function TrackingKanban({
  board,
  objectives,
  activities,
  areas,
  summary,
  role,
  pendingId,
  actionError,
  today = currentDay(),
  onDropObjective,
  onDropActivity,
  onOpenObjective,
  onOpenActivity,
}: TrackingKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const objectiveIds = new Set(objectives.map((objective) => objective.id))
  const visibleActivities = activities.filter((activity) => objectiveIds.has(activity.objective_id))

  function evaluate(columnKey: string): { blocked: boolean } {
    if (!activeId) {
      return { blocked: false }
    }
    const source = parseId(activeId)
    const target = parseId(columnKey)
    if (!source || !target || source.kind !== target.kind) {
      return { blocked: true }
    }
    if (board === 'objectives') {
      const objective = objectives.find((item) => item.id === source.key)
      if (!objective) {
        return { blocked: true }
      }
      return { blocked: objectiveDrop(objective, target.key as ObjectiveStatus, role).action === 'blocked' }
    }
    const activity = activities.find((item) => item.id === source.key)
    if (!activity) {
      return { blocked: true }
    }
    return { blocked: activityDrop(activity, target.key as ActivityColumn).action === 'blocked' }
  }

  function handleDragStart(event: DragStartEvent) {
    setNotice(null)
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null)
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const source = parseId(String(event.active.id))
    const target = event.over ? parseId(String(event.over.id)) : null
    setActiveId(null)
    setOverId(null)
    if (!source || !target || source.kind !== target.kind) {
      return
    }
    if (board === 'objectives') {
      const objective = objectives.find((item) => item.id === source.key)
      if (!objective) {
        return
      }
      const drop = objectiveDrop(objective, target.key as ObjectiveStatus, role)
      if (drop.action === 'blocked') {
        setNotice(drop.reason)
        return
      }
      setNotice(null)
      onDropObjective(objective, drop)
      return
    }
    const activity = activities.find((item) => item.id === source.key)
    if (!activity) {
      return
    }
    const drop = activityDrop(activity, target.key as ActivityColumn)
    if (drop.action === 'blocked') {
      setNotice(drop.reason)
      return
    }
    setNotice(null)
    onDropActivity(activity, drop.completed)
  }

  const blockedColumns = new Set<string>()
  if (activeId && overId && evaluate(overId).blocked) {
    blockedColumns.add(overId)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Se levantó la tarjeta ${describeCard(String(active.id), objectives, activities)}.`,
          onDragOver: ({ over }) =>
            over
              ? `La tarjeta está sobre la columna ${columnTitle(String(over.id))}.`
              : 'La tarjeta está fuera de una columna válida.',
          onDragEnd: ({ over, active }) =>
            over
              ? `La tarjeta se soltó en la columna ${columnTitle(String(over.id))} con ${describeCard(String(active.id), objectives, activities)}.`
              : 'La tarjeta se soltó fuera del tablero.',
          onDragCancel: ({ active }) => `Se canceló el movimiento de la tarjeta ${describeCard(String(active.id), objectives, activities)}.`,
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board} data-columns={board === 'objectives' ? OBJECTIVE_COLUMNS.length : ACTIVITY_COLUMNS.length}>
        {board === 'objectives'
          ? OBJECTIVE_COLUMNS.map((status) => {
              const items = objectives.filter((objective) => objective.status === status)
              return (
                <KanbanColumn
                  key={status}
                  id={`objective${KIND_SEPARATOR}${status}`}
                  title={STATUS_LABEL[status]}
                  hint={OBJECTIVE_COLUMN_HINT[status]}
                  count={items.length}
                  blocked={blockedColumns.has(`objective${KIND_SEPARATOR}${status}`)}
                  empty="Sin objetivos en esta columna."
                >
                  {items.map((objective) => (
                    <ObjectiveKanbanCard
                      key={objective.id}
                      objective={objective}
                      activities={activities}
                      areas={areas}
                      summary={summary}
                      pending={pendingId === `submit-${objective.id}`}
                      error={actionError && actionError.id === `submit-${objective.id}` ? actionError.message : null}
                      dragging={activeId === `objective${KIND_SEPARATOR}${objective.id}`}
                      onOpen={onOpenObjective}
                    />
                  ))}
                </KanbanColumn>
              )
            })
          : ACTIVITY_COLUMNS.map((column) => {
              const items = visibleActivities.filter((activity) => activityColumn(activity, today) === column)
              return (
                <KanbanColumn
                  key={column}
                  id={`activity${KIND_SEPARATOR}${column}`}
                  title={ACTIVITY_COLUMN_LABEL[column]}
                  hint={ACTIVITY_COLUMN_HINT[column]}
                  count={items.length}
                  blocked={blockedColumns.has(`activity${KIND_SEPARATOR}${column}`)}
                  empty="Sin actividades en esta columna."
                >
                  {items.map((activity) => (
                    <ActivityKanbanCard
                      key={activity.id}
                      activity={activity}
                      objectives={objectives}
                      pending={pendingId === `done-${activity.id}`}
                      error={actionError && actionError.id === `done-${activity.id}` ? actionError.message : null}
                      dragging={activeId === `activity${KIND_SEPARATOR}${activity.id}`}
                      onOpen={onOpenActivity}
                    />
                  ))}
                </KanbanColumn>
              )
            })}
      </div>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      <p className={styles.dragHint}>
        Arrastra una tarjeta a otra columna para moverla, o ábrela con “Ver detalle” y usa sus botones. Con teclado: Tab hasta la tarjeta, Espacio para levantarla, flechas para moverla y Espacio para soltarla.
      </p>
    </DndContext>
  )
}

function describeCard(id: string, objectives: Objective[], activities: Activity[]): string {
  const parsed = parseId(id)
  if (!parsed) {
    return 'una tarjeta'
  }
  if (parsed.kind === 'objective') {
    const objective = objectives.find((item) => item.id === parsed.key)
    return objective ? `el objetivo ${objective.title}` : 'un objetivo'
  }
  const activity = activities.find((item) => item.id === parsed.key)
  return activity ? `la actividad ${activity.title}` : 'una actividad'
}

function columnTitle(id: string): string {
  const parsed = parseId(id)
  if (!parsed) {
    return ''
  }
  if (parsed.kind === 'objective') {
    return STATUS_LABEL[parsed.key as ObjectiveStatus] ?? ''
  }
  return ACTIVITY_COLUMN_LABEL[parsed.key as ActivityColumn] ?? ''
}

type ColumnProps = {
  id: string
  title: string
  hint: string
  count: number
  blocked: boolean
  empty: string
  children: ReactNode
}

function KanbanColumn({ id, title, hint, count, blocked, empty, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const className = [styles.column, isOver ? (blocked ? styles.columnBlocked : styles.columnOver) : '']
    .filter(Boolean)
    .join(' ')
  return (
    <section ref={setNodeRef} className={className} aria-label={`Columna ${title}`}>
      <header className={styles.columnHead}>
        <h3>{title}</h3>
        <span className={styles.count} aria-label={`${count} tarjetas`}>
          {count}
        </span>
      </header>
      <p className={styles.columnHint}>{hint}</p>
      <div className={styles.cards}>
        {count === 0 ? <p className={styles.empty}>{empty}</p> : children}
      </div>
    </section>
  )
}

type ObjectiveCardProps = {
  objective: Objective
  activities: Activity[]
  areas: Area[]
  summary: TrackingSummary
  pending: boolean
  error: string | null
  dragging: boolean
  onOpen: (objectiveId: string) => void
}

function ObjectiveKanbanCard({ objective, activities, areas, summary, pending, error, dragging, onOpen }: ObjectiveCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `objective${KIND_SEPARATOR}${objective.id}`,
  })
  const total = activities.filter((activity) => activity.objective_id === objective.id).length
  const progress = summary.objectives.find((item) => item.objective_id === objective.id)?.progress_percent ?? 0
  return (
    <article
      ref={setNodeRef}
      className={styles.card}
      data-dragging={isDragging || dragging ? 'true' : 'false'}
      data-status={objective.status}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners}
      {...attributes}
    >
      <div className={styles.cardHead}>
        <span className={styles.tag}>{areaName(areas, objective.area_id)}</span>
        <GripVertical aria-hidden="true" size={14} className={styles.grip} />
      </div>
      <h4>{objective.title}</h4>
      <p className={styles.cardMeta}>
        {total} {total === 1 ? 'actividad' : 'actividades'}
        {pending ? ' · Guardando…' : ''}
      </p>
      <div className={styles.cardFoot}>
        <span className={styles.progress}>
          <progress aria-label={`Avance de ${objective.title}`} value={progress} max={100} />
          {Math.round(progress)}%
        </span>
        <button type="button" className={styles.detail} onClick={() => onOpen(objective.id)}>
          Ver detalle
        </button>
      </div>
      {error ? (
        <p className={styles.cardError} role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}

type ActivityCardProps = {
  activity: Activity
  objectives: Objective[]
  pending: boolean
  error: string | null
  dragging: boolean
  onOpen: (activityId: string) => void
}

function ActivityKanbanCard({ activity, objectives, pending, error, dragging, onOpen }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `activity${KIND_SEPARATOR}${activity.id}`,
  })
  const objective = objectives.find((item) => item.id === activity.objective_id)
  return (
    <article
      ref={setNodeRef}
      className={styles.card}
      data-dragging={isDragging || dragging ? 'true' : 'false'}
      data-completed={activity.completed_at ? 'true' : 'false'}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners}
      {...attributes}
    >
      <div className={styles.cardHead}>
        <span className={styles.tag}>{objective?.title ?? 'Objetivo'}</span>
        <GripVertical aria-hidden="true" size={14} className={styles.grip} />
      </div>
      <h4>{activity.title}</h4>
      <p className={styles.cardMeta}>
        <CalendarDays aria-hidden="true" size={12} />
        {shortDay(activity.starts_on)} – {shortDay(activity.ends_on)}
        {activity.completed_at ? (
          <>
            <CheckCircle2 aria-hidden="true" size={12} />
            Completada
          </>
        ) : null}
        {pending ? ' · Guardando…' : ''}
      </p>
      <div className={styles.cardFoot}>
        <span className={styles.smallMuted}>{activity.description ? 'Con descripción' : 'Sin descripción'}</span>
        <button type="button" className={styles.detail} onClick={() => onOpen(activity.id)}>
          Ver detalle
        </button>
      </div>
      {error ? (
        <p className={styles.cardError} role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}
