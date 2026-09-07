import type { Activity, Ambition, Diagnostic, Evidence, Need, NeedStatus, Objective, Report, Role, Source, Store } from './types'
import { createSeed, project, TODAY } from './seed'

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`
export const actorFor = (role: Role) => role === 'Coordinadora' ? 'María Calderón' : role === 'Gestor' ? 'Javier Soto' : 'Andrea Morales'
export function objectiveProgress(s: Store, id: string) { const activities = s.activities.filter(a => a.objectiveId === id); return activities.length ? activities.filter(a => a.status === 'DONE').length / activities.length * 100 : 0 }
export function projectProgress(s: Store) { const objectives = s.objectives.filter(o => o.status === 'APPROVED'); return objectives.length ? objectives.reduce((sum, o) => sum + objectiveProgress(s, o.id), 0) / objectives.length : 0 }
export const approvedDiagnostics = (s: Store) => s.diagnostics.filter(d => d.status === 'APPROVED').toSorted((a, b) => a.date.localeCompare(b.date))
export function compareDiagnostics(previous: Diagnostic, current: Diagnostic) {
  if (previous.status !== 'APPROVED' || current.status !== 'APPROVED' || previous.date > current.date) throw new Error('Selecciona diagnósticos aprobados en orden cronológico.')
  return current.assessments.map(a => { const before = previous.assessments.find(b => b.areaId === a.areaId)?.score; return { ...a, before, delta: before === undefined ? undefined : a.score - before } })
}
export function reportSources(s: Store, start: string, end: string): Source[] {
  const inPeriod = (date: string) => date >= start && date <= end
  const ds = approvedDiagnostics(s).filter(d => d.date <= end)
  const baseline = ds.filter(d => d.date < start).at(-1)
  const diagnostics = ds.filter(d => inPeriod(d.date) || d.id === baseline?.id)
  return [
    { id: 'lumen', kind: 'Proyecto', title: project.name, date: project.start, content: `${project.description} Modalidad: ${project.model}.` },
    ...s.objectives.filter(o => o.date <= end).map(o => {
      const acts = s.activities.filter(a => a.objectiveId === o.id && a.date <= end)
      return { id: o.id, kind: 'Objetivo', title: o.title, date: o.date, content: `${o.description} Estado: ${o.status === 'APPROVED' && (o.approvedAt ?? '') <= end ? 'Aprobado' : 'Pendiente de aprobación'}. Actividades previstas hasta el cierre: ${acts.length}. Completadas al cierre: ${acts.filter(a => a.completedAt && a.completedAt <= end).length}.` }
    }),
    ...s.activities.filter(a => inPeriod(a.completedAt ?? a.date)).map(a => ({ id: a.id, kind: 'Actividad', title: a.title, date: a.completedAt ?? a.date, content: a.completedAt && a.completedAt <= end ? `Completada el ${a.completedAt}. Responsable: ${a.owner}.` : `Pendiente al cierre del período. Responsable: ${a.owner}.` })),
    ...s.evidence.filter(e => inPeriod(e.date)).map(e => ({ id: e.id, kind: 'Evidencia', title: e.title, date: e.date, content: e.content })),
    ...s.meetings.filter(m => inPeriod(m.date) && m.minutes).map(m => ({ id: m.id, kind: 'Reunión', title: m.title, date: m.date, content: `${m.minutes} Acuerdos: ${m.agreements}` })),
    ...diagnostics.map(d => ({ id: d.id, kind: 'Diagnóstico', title: `Diagnóstico ${d.date}${d.id === baseline?.id ? ' · línea base anterior' : ''}`, date: d.date, content: d.assessments.map(a => `${a.name}: ${a.score}/5. ${a.observation}`).join('\n') })),
    ...s.needs.filter(n => inPeriod(n.date)).map(n => ({ id: n.id, kind: 'Necesidad', title: n.title, date: n.date, content: n.description })),
  ]
}
export function makeReport(s: Store, start: string, end: string, type: Report['type'], sourceIds: string[], role: Role): Report {
  if (!start || !end || start > end || end > TODAY) throw new Error('Indica un período válido que termine a más tardar el 7 de septiembre de 2026, fecha de esta demostración.')
  const sources = reportSources(s, start, end).filter(x => sourceIds.includes(x.id))
  if (!sources.length) throw new Error('Selecciona al menos una fuente para preparar el borrador.')
  const section = (title: string, kinds: string[]) => { const refs = sources.filter(x => kinds.includes(x.kind)); return { title, content: refs.length ? refs.map(x => `${x.title}\n${x.content}`).join('\n\n') : 'Pendiente de completar', sourceIds: refs.map(x => x.id) } }
  const diagnosticSources = s.diagnostics.filter(d => sources.some(src => src.id === d.id && src.kind === 'Diagnóstico')).toSorted((a, b) => a.date.localeCompare(b.date))
  const evolution = section('Evolución del diagnóstico 360°', ['Diagnóstico'])
  if (diagnosticSources.length > 1) {
    const current = diagnosticSources.at(-1)!
    const previous = diagnosticSources.at(-2)!
    const allApproved = approvedDiagnostics(s)
    if (allApproved.findIndex(d => d.id === current.id) - allApproved.findIndex(d => d.id === previous.id) === 1) {
      evolution.content += '\n\nComparación por área (' + previous.date + ' → ' + current.date + '):\n' + compareDiagnostics(previous, current).map(a => a.name + ': ' + (a.before ?? 'Sin base') + ' → ' + a.score + '/5 · ' + (a.delta === undefined ? 'Sin base' : a.delta > 0 ? '+' + a.delta + ' avance' : a.delta < 0 ? a.delta + ' retroceso' : 'Sin cambio')).join('\n')
    }
  }
  const id = uid()
  return { id, groupId: id, projectId: project.id, type, start, end, version: 1, status: 'DRAFT', author: actorFor(role), createdAt: TODAY, sources: structuredClone(sources), sections: [section('Identificación y emprendimiento', ['Proyecto']), { title: 'Programa y perfil estructurado', content: 'Pendiente de completar', sourceIds: [] }, section('Objetivos y avances', ['Objetivo', 'Actividad']), { title: 'Modificaciones aprobadas de plan, alcance y presupuesto', content: 'Pendiente de completar', sourceIds: [] }, { title: 'Impactos', content: 'Pendiente de completar', sourceIds: [] }, { title: 'Formalización', content: 'Pendiente de completar', sourceIds: [] }, evolution, section('Necesidades, dificultades y próximos pasos', ['Necesidad', 'Reunión']), section('Evidencias y anexos', ['Evidencia'])] }
}
export type Command =
  | { type: 'diagnostic.save'; value: Diagnostic }
  | { type: 'diagnostic.status'; id: string; status: 'SUBMITTED' | 'APPROVED' | 'DRAFT' }
  | { type: 'diagnostic.revise'; id: string }
  | { type: 'need.save'; value: Need }
  | { type: 'need.status'; id: string; status: NeedStatus; justification?: string; supportId?: string }
  | { type: 'ambition.save'; value: Ambition }
  | { type: 'objective.save'; value: Objective }
  | { type: 'objective.approve'; id: string }
  | { type: 'activity.save'; value: Activity }
  | { type: 'activity.status'; id: string; status: Activity['status'] }
  | { type: 'evidence.save'; value: Evidence }
  | { type: 'report.save'; value: Report }
  | { type: 'report.status'; id: string; status: 'SUBMITTED' | 'APPROVED' | 'DRAFT' }
  | { type: 'report.revise'; id: string }
  | { type: 'message.send'; content: string }

function ensure(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
const upsert = <T extends { id: string }>(items: T[], item: T) => { const index = items.findIndex(i => i.id === item.id); if (index < 0) items.push(item); else items[index] = item }

// Local simulator only. An endpoint adapter can implement this same contract.
// Real authorization and persistence belong to FastAPI, per BR-016.
export function applyCommand(original: Store, command: Command, role: Role): Store {
  const s = structuredClone(original)
  const manager = role !== 'Emprendedor'
  const actor = actorFor(role)
  let entityId = 'id' in command ? command.id : 'value' in command ? command.value.id : 'chat'
  switch (command.type) {
    case 'diagnostic.save': {
      const d = command.value
      ensure(d.projectId === project.id && d.status === 'DRAFT', 'Solo puedes guardar borradores de este proyecto.')
      ensure(!s.diagnostics.some(x => x.id === d.id && x.status !== 'DRAFT'), 'Este diagnóstico es de solo lectura. Crea una nueva revisión.')
      ensure(d.date && d.assessments.every(a => Number.isInteger(a.score) && a.score >= 1 && a.score <= 5), 'Todas las áreas deben tener una calificación entera entre 1 y 5.')
      upsert(s.diagnostics, d); break
    }
    case 'diagnostic.status': {
      const d = s.diagnostics.find(x => x.id === command.id)!
      ensure(d && d.status !== 'APPROVED', 'El diagnóstico aprobado es inmutable.')
      ensure(command.status === 'SUBMITTED' ? d.status === 'DRAFT' && (manager || d.author === actor) : manager && d.status === 'SUBMITTED', 'Esta transición no está disponible para el rol o estado actual.')
      d.status = command.status
      if (command.status === 'APPROVED') { d.approvedBy = actor; d.approvedAt = TODAY }
      break
    }
    case 'diagnostic.revise': {
      const d = s.diagnostics.find(x => x.id === command.id)
      ensure(d?.status === 'APPROVED', 'Selecciona un diagnóstico aprobado.')
      const revision: Diagnostic = { ...structuredClone(d), id: uid(), status: 'DRAFT', author: actor, supersedes: d.id, approvedAt: undefined, approvedBy: undefined }
      entityId = revision.id; s.diagnostics.push(revision); break
    }
    case 'need.save': {
      const n = command.value
      ensure(n.projectId === project.id && s.diagnostics.some(d => d.id === n.diagnosticId && d.assessments.some(a => a.areaId === n.areaId)), 'La necesidad debe pertenecer a un diagnóstico y área del proyecto.')
      ensure(n.title.trim() && n.description.trim() && n.owner, 'Completa título, descripción y responsable.')
      ensure(n.objectiveIds.every(id => s.objectives.some(o => o.id === id)), 'El objetivo vinculado no existe.')
      const old = s.needs.find(x => x.id === n.id)
      ensure(!old || old.status === n.status, 'Usa la revisión de estado para validar esta necesidad.')
      if (!old) ensure(n.status === 'IDENTIFIED', 'Las necesidades nuevas empiezan como identificadas.')
      upsert(s.needs, n); break
    }
    case 'need.status': {
      ensure(manager, 'Solo un Gestor o Coordinadora puede validar necesidades.')
      const n = s.needs.find(x => x.id === command.id)!
      ensure(n, 'No se encontró la necesidad.')
      if (['PARTIALLY_ADDRESSED', 'ADDRESSED', 'DISCARDED'].includes(command.status)) ensure(command.justification?.trim(), 'Incluye una justificación para este cambio.')
      if (command.status === 'ADDRESSED') ensure(s.evidence.some(e => e.id === command.supportId && (n.evidenceIds.includes(e.id) || n.activityIds.includes(e.activityId) || n.objectiveIds.includes(s.activities.find(a => a.id === e.activityId)?.objectiveId ?? ''))) || s.diagnostics.some(d => d.id === command.supportId && d.status === 'APPROVED' && d.date > n.date && d.assessments.some(a => a.areaId === n.areaId)), 'Selecciona una evidencia vinculada o un diagnóstico aprobado posterior.')
      n.status = command.status; n.justification = command.justification; n.supportId = command.supportId
      if (command.status === 'ADDRESSED') n.resolvedAt = TODAY
      break
    }
    case 'ambition.save': {
      const a = command.value
      ensure(a.projectId === project.id && a.title.trim(), 'La ambición necesita un título y proyecto.')
      ensure(a.needIds.every(id => s.needs.some(n => n.id === id)) && a.objectiveIds.every(id => s.objectives.some(o => o.id === id)), 'Revisa los vínculos seleccionados.')
      if (!['DREAM', 'VISION', 'PURPOSE'].includes(a.type)) ensure(a.owner, 'Selecciona una persona responsable.')
      if (['OBJECTIVE', 'GOAL', 'MILESTONE', 'PROJECT'].includes(a.type)) ensure(a.due, 'Indica la fecha de cumplimiento.')
      if (['OBJECTIVE', 'GOAL'].includes(a.type)) ensure(a.measurement.trim(), 'Indica cómo medir el cumplimiento.')
      if (a.type === 'MILESTONE') ensure(a.verification.trim(), 'Indica la verificación del hito.')
      if (a.type === 'PROJECT') ensure(a.start && a.start <= a.due, 'Indica inicio y fin válidos.')
      if (a.type === 'OBJECTIVE') ensure(a.objectiveIds.length > 0, 'Vincula al menos un objetivo operativo existente.')
      upsert(s.ambitions, a)
      for (const n of s.needs.filter(n => a.needIds.includes(n.id))) n.objectiveIds = [...new Set([...n.objectiveIds, ...a.objectiveIds])]
      break
    }
    case 'objective.save': {
      ensure(command.value.projectId === project.id && command.value.title.trim(), 'Indica el título del objetivo.')
      upsert(s.objectives, { ...command.value, status: 'PENDING_APPROVAL', approvedBy: undefined, approvedAt: undefined }); break
    }
    case 'objective.approve': {
      ensure(manager, 'Solo un Gestor o Coordinadora puede aprobar objetivos.')
      const o = s.objectives.find(x => x.id === command.id)!; ensure(o && o.status === 'PENDING_APPROVAL', 'Selecciona un objetivo pendiente.'); o.status = 'APPROVED'; o.approvedAt = TODAY; o.approvedBy = actor; break
    }
    case 'activity.save': ensure(command.value.title.trim() && s.objectives.some(o => o.id === command.value.objectiveId), 'Completa el título y selecciona un objetivo.'); upsert(s.activities, command.value); break
    case 'activity.status': { const a = s.activities.find(x => x.id === command.id)!; ensure(a && a.status !== 'DONE', 'La actividad ya está completada.'); a.status = command.status; if (a.status === 'DONE') a.completedAt = TODAY; break }
    case 'evidence.save': ensure(s.activities.some(a => a.id === command.value.activityId) && command.value.title.trim(), 'Selecciona una actividad y un título.'); if (command.value.type === 'LINK') ensure(/^https?:\/\//i.test(command.value.url ?? ''), 'Usa un enlace http o https válido.'); upsert(s.evidence, command.value); break
    case 'report.save': {
      ensure(manager, 'La preparación de informes corresponde a Gestor o Coordinadora.')
      const r = command.value
      ensure(r.projectId === project.id && r.status === 'DRAFT' && !s.reports.some(x => x.id === r.id && x.status !== 'DRAFT'), 'Esta versión es de solo lectura.')
      ensure(r.sections.every(x => x.content === 'Pendiente de completar' || x.sourceIds.length > 0 && x.sourceIds.every(id => r.sources.some(src => src.id === id))), 'Cada redacción debe tener fuentes seleccionadas.')
      upsert(s.reports, r); break
    }
    case 'report.status': {
      ensure(manager, 'Solo un Gestor o Coordinadora puede revisar informes.')
      const r = s.reports.find(x => x.id === command.id)!
      ensure(r && (command.status === 'SUBMITTED' ? r.status === 'DRAFT' : r.status === 'SUBMITTED'), 'Esta transición de informe no está disponible.')
      r.status = command.status; if (r.status === 'APPROVED') { r.approvedBy = actor; r.approvedAt = TODAY }; break
    }
    case 'report.revise': {
      ensure(manager, 'La revisión corresponde a Gestor o Coordinadora.')
      const r = s.reports.find(x => x.id === command.id); ensure(r?.status === 'APPROVED', 'Selecciona una versión aprobada.')
      const copy: Report = { ...structuredClone(r), id: uid(), version: Math.max(...s.reports.filter(x => x.groupId === r.groupId).map(x => x.version)) + 1, supersedes: r.id, status: 'DRAFT', author: actor, createdAt: TODAY, approvedBy: undefined, approvedAt: undefined }
      entityId = copy.id; s.reports.push(copy); break
    }
    case 'message.send': ensure(command.content.trim(), 'Escribe un mensaje.'); s.messages.push({ id: uid(), author: actor, content: command.content.trim(), date: TODAY }); break
  }
  const findEntity = (store: Store) => [...store.diagnostics, ...store.needs, ...store.ambitions, ...store.objectives, ...store.activities, ...store.evidence, ...store.reports, ...store.messages].find(x => x.id === entityId)
  s.audit.push({ id: uid(), entityId, action: command.type, actor, date: TODAY, before: structuredClone(findEntity(original)), after: structuredClone(findEntity(s)) })
  return s
}
export interface MockRepository { load(): Promise<Store>; execute(command: Command, role: Role): Promise<Store>; failNext(): void }
export function createMockRepository(): MockRepository {
  let state = createSeed()
  // Historical seed is generated from the same entities, then frozen independently.
  const report = makeReport(state, '2026-06-01', '2026-09-04', 'FOLLOW_UP', reportSources(state, '2026-06-01', '2026-09-04').map(x => x.id), 'Gestor')
  state.reports.push({ ...report, id: 'r1', groupId: 'r1', status: 'APPROVED', author: 'Javier Soto', createdAt: '2026-09-05', approvedBy: 'María Calderón', approvedAt: '2026-09-06' })
  let fail = false
  const delay = () => new Promise<void>((resolve, reject) => setTimeout(() => { if (fail) { fail = false; reject(new Error('No se pudieron guardar los cambios. Tus datos siguen aquí; vuelve a intentarlo.')) } else resolve() }, 350))
  return { async load() { await delay(); return structuredClone(state) }, async execute(command, role) { await delay(); state = applyCommand(state, command, role); return structuredClone(state) }, failNext() { fail = true } }
}
