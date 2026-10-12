import type { components } from '@sia/contracts'
import type { Activity, Evidence } from './seguimiento'

export type EvidenceFolder = components['schemas']['FolderOut']
export type EvidencePlacement = components['schemas']['PlacementOut']

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseFolder(value: unknown): EvidenceFolder | null {
  if (!record(value) || typeof value.id !== 'string' || typeof value.cycle_id !== 'string' || typeof value.name !== 'string' || !Number.isInteger(value.revision) || Number(value.revision) < 1) return null
  return value as EvidenceFolder
}

export function parseFolders(value: unknown): EvidenceFolder[] | null {
  return Array.isArray(value) && value.every((item) => parseFolder(item) !== null) ? value as EvidenceFolder[] : null
}

export function parsePlacement(value: unknown): EvidencePlacement | null {
  if (!record(value) || typeof value.evidence_id !== 'string' || typeof value.cycle_id !== 'string' || !(value.folder_id === null || typeof value.folder_id === 'string') || !Number.isInteger(value.revision) || Number(value.revision) < 1) return null
  return value as EvidencePlacement
}

export function parsePlacements(value: unknown): EvidencePlacement[] | null {
  return Array.isArray(value) && value.every((item) => parsePlacement(item) !== null) ? value as EvidencePlacement[] : null
}

/** Automatic folders are views of existing relationships, never copies. */
export function filterEvidence(evidence: Evidence[], activities: Activity[], placements: EvidencePlacement[], filters: {
  location: string; activityId: string; query: string; kind: string
}): Evidence[] {
  const activityById = new Map(activities.map((item) => [item.id, item]))
  const folderByEvidence = new Map(placements.map((item) => [item.evidence_id, item.folder_id]))
  const query = filters.query.trim().toLocaleLowerCase('es')
  return evidence.filter((item) => {
    const activity = activityById.get(item.activity_id)
    const matches = filters.location === 'all'
      || (filters.location === 'unfiled' && !folderByEvidence.get(item.id))
      || (filters.location.startsWith('folder:') && folderByEvidence.get(item.id) === filters.location.slice(7))
      || (filters.location.startsWith('objective:') && activity?.objective_id === filters.location.slice(10))
    return matches && (!filters.activityId || item.activity_id === filters.activityId)
      && (!filters.kind || item.kind === filters.kind)
      && `${item.title} ${item.description} ${activity?.title ?? ''}`.toLocaleLowerCase('es').includes(query)
  })
}
