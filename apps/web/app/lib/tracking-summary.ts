import type { Activity, Objective, TrackingSummary } from './seguimiento'

/** Server-side compatibility for APIs deployed before the summary endpoint.
 * Same confirmed formula as FastAPI; inputs must come from authorized API reads.
 */
export function trackingSummary(cycleId: string, objectives: Objective[], activities: Activity[]): TrackingSummary {
  const progress = objectives.filter((objective) => objective.cycle_id === cycleId).map((objective) => {
    const work = activities.filter((activity) => activity.cycle_id === cycleId && activity.objective_id === objective.id)
    const completed = work.filter((activity) => activity.completed_at !== null).length
    return {
      objective_id: objective.id,
      status: objective.status,
      activities_total: work.length,
      activities_completed: completed,
      progress_percent: work.length ? completed / work.length * 100 : 0,
    }
  })
  const approved = progress.filter((objective) => objective.status === 'approved')
  return {
    cycle_id: cycleId,
    progress_percent: approved.length ? approved.reduce((sum, objective) => sum + objective.progress_percent, 0) / approved.length : 0,
    objectives_total: progress.length,
    objectives_approved: approved.length,
    activities_total: progress.reduce((sum, objective) => sum + objective.activities_total, 0),
    activities_completed: progress.reduce((sum, objective) => sum + objective.activities_completed, 0),
    objectives: progress,
  }
}
