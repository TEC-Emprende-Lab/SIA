import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp('/tmp/opencode/tracking-kanban-')
try {
  for (const name of ['seguimiento', 'kanban']) {
    const source = await readFile(new URL(`../app/lib/${name}.ts`, import.meta.url), 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
    await writeFile(join(temporary, `${name}.mjs`), result.outputText.replaceAll("'./seguimiento'", "'./seguimiento.mjs'"))
  }
  const source = await readFile(new URL('../app/components/tracking-kanban.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react|react\/jsx-runtime|lucide-react|@dnd-kit\/core)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'../lib/kanban'", "'./kanban.mjs'")
    .replaceAll("'../lib/seguimiento'", "'./seguimiento.mjs'")
    .replace("import styles from './tracking-kanban.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  await writeFile(join(temporary, 'tracking-kanban.mjs'), compiled)
  const { TrackingKanban } = await import(pathToFileURL(join(temporary, 'tracking-kanban.mjs')))
  const kanban = await import(pathToFileURL(join(temporary, 'kanban.mjs')))
  const { STATUS_LABEL } = await import(pathToFileURL(join(temporary, 'seguimiento.mjs')))
  const render = (Component, props) => renderToStaticMarkup(createElement(Component, props))

  // Isolated fixtures: never served by SIA and never a substitute for authentication.
  const today = '2026-10-05'
  const areas = [{ id: 'a1', name: 'Mercado segmentado' }]
  const objectives = [
    { id: 'o1', cycle_id: 'c1', status: 'draft', title: 'Validar la propuesta', area_id: 'a1' },
    { id: 'o2', cycle_id: 'c1', status: 'pending_validation', title: 'Probar el prototipo', area_id: 'a1' },
    { id: 'o3', cycle_id: 'c1', status: 'approved', title: 'Entender al cliente', area_id: 'a1' },
  ]
  const summary = { cycle_id: 'c1', progress_percent: 55, objectives_total: 3, objectives_approved: 1, activities_total: 4, activities_completed: 1, objectives: objectives.map((objective, index) => ({ objective_id: objective.id, status: objective.status, activities_total: 2, activities_completed: index, progress_percent: index * 40 })) }
  const activities = [
    { id: 'act1', cycle_id: 'c1', objective_id: 'o1', title: 'Entrevistar usuarios', description: 'Conversaciones con clientes.', starts_on: '2026-10-01', ends_on: '2026-10-20', completed_at: null },
    { id: 'act2', cycle_id: 'c1', objective_id: 'o2', title: 'Levantar encuestas', description: '', starts_on: '2026-08-01', ends_on: '2026-09-01', completed_at: null },
    { id: 'act3', cycle_id: 'c1', objective_id: 'o3', title: 'Documentar hallazgos', description: 'Resumen de aprendizajes.', starts_on: '2026-08-10', ends_on: '2026-08-30', completed_at: '2026-08-29T12:00:00Z' },
    { id: 'act4', cycle_id: 'c1', objective_id: 'other', title: 'Actividad fuera del filtro', description: '', starts_on: '2026-10-01', ends_on: '2026-10-30', completed_at: null },
  ]
  const base = { objectives, activities, areas, summary, role: 'Coordinadora', pendingId: null, actionError: null, today, onDropObjective() {}, onDropActivity() {}, onOpenObjective() {}, onOpenActivity() {} }

  // 1. Column model: real states only, no invented intermediate activity states.
  assert.deepEqual([...kanban.OBJECTIVE_COLUMNS], ['draft', 'pending_validation', 'correction_requested', 'rejected', 'approved'])
  assert.deepEqual([...kanban.ACTIVITY_COLUMNS], ['pending', 'overdue', 'completed'])
  assert.deepEqual(Object.keys(kanban.ACTIVITY_COLUMN_LABEL), [...kanban.ACTIVITY_COLUMNS])
  assert.equal(kanban.activityColumn(activities[0], today), 'pending')
  assert.equal(kanban.activityColumn(activities[1], today), 'overdue')
  assert.equal(kanban.activityColumn(activities[2], today), 'completed')
  assert.equal(kanban.activityColumn({ completed_at: null, ends_on: today }, today), 'pending')
  console.log('✓ Columns derive from real objective states and activity dates, without new states')

  // 2. Objective transition matrix: existing submit/validation endpoints and roles.
  assert.deepEqual(kanban.objectiveDrop({ status: 'draft' }, 'pending_validation', 'Emprendedor'), { action: 'submit' })
  assert.deepEqual(kanban.objectiveDrop({ status: 'correction_requested' }, 'pending_validation', 'Emprendedor'), { action: 'submit' })
  assert.deepEqual(kanban.objectiveDrop({ status: 'rejected' }, 'pending_validation', 'Gestor'), { action: 'submit' })
  assert.deepEqual(kanban.objectiveDrop({ status: 'pending_validation' }, 'approved', 'Coordinadora'), { action: 'validate', decision: 'approve' })
  assert.deepEqual(kanban.objectiveDrop({ status: 'pending_validation' }, 'correction_requested', 'Gestor'), { action: 'validate', decision: 'request_correction' })
  assert.deepEqual(kanban.objectiveDrop({ status: 'pending_validation' }, 'rejected', 'Coordinadora'), { action: 'validate', decision: 'reject' })
  const emprededorValidation = kanban.objectiveDrop({ status: 'pending_validation' }, 'approved', 'Emprendedor')
  assert.equal(emprededorValidation.action, 'blocked')
  assert.match(emprededorValidation.reason, /Coordinadora o un Gestor/)
  const approvedMove = kanban.objectiveDrop({ status: 'approved' }, 'pending_validation', 'Coordinadora')
  assert.equal(approvedMove.action, 'blocked')
  assert.match(approvedMove.reason, /aprobado/)
  assert.equal(kanban.objectiveDrop({ status: 'draft' }, 'approved', 'Coordinadora').action, 'blocked')
  assert.equal(kanban.objectiveDrop({ status: 'draft' }, 'draft', 'Coordinadora').action, 'blocked')
  const backToDraft = kanban.objectiveDrop({ status: 'pending_validation' }, 'draft', 'Coordinadora')
  assert.equal(backToDraft.action, 'blocked')
  assert.match(backToDraft.reason, /no vuelve a borrador/)
  console.log('✓ Objective drops map to submit/validation with role gating and explicit blocked reasons')

  // 3. Activity drops: only completion toggles; date columns stay read-only.
  assert.deepEqual(kanban.activityDrop(activities[0], 'completed'), { action: 'completion', completed: true })
  assert.deepEqual(kanban.activityDrop(activities[2], 'pending'), { action: 'completion', completed: false })
  assert.deepEqual(kanban.activityDrop(activities[2], 'overdue'), { action: 'completion', completed: false })
  const dateColumn = kanban.activityDrop(activities[0], 'overdue')
  assert.equal(dateColumn.action, 'blocked')
  assert.match(dateColumn.reason, /fecha de fin/)
  assert.equal(kanban.activityDrop(activities[2], 'completed').action, 'blocked')
  console.log('✓ Activity drops toggle completion only; date-derived columns explain why they cannot change')

  // 4. Rendered boards (static markup, no session involved).
  const objectivesBoard = render(TrackingKanban, { ...base, board: 'objectives' })
  assert(objectivesBoard.includes('data-columns="5"'))
  for (const status of kanban.OBJECTIVE_COLUMNS) {
    assert(objectivesBoard.includes(`aria-label="Columna ${STATUS_LABEL[status]}"`), `falta columna ${status}`)
  }
  for (const objective of objectives) assert(objectivesBoard.includes(objective.title))
  assert(objectivesBoard.includes('Mercado segmentado'))
  assert(objectivesBoard.includes('80%'))
  assert.equal((objectivesBoard.match(/Ver detalle<\/button>/g) ?? []).length, objectives.length)
  assert(objectivesBoard.includes('Sin objetivos en esta columna.'))
  assert(!objectivesBoard.includes('Entrevistar usuarios'), 'las tarjetas de objetivo muestran el conteo, no los títulos de actividad')
  console.log('✓ Objectives board renders every real status column with area, progress and detail access')

  const activitiesBoard = render(TrackingKanban, { ...base, board: 'activities' })
  assert(activitiesBoard.includes('data-columns="3"'))
  for (const column of kanban.ACTIVITY_COLUMNS) {
    assert(activitiesBoard.includes(`aria-label="Columna ${kanban.ACTIVITY_COLUMN_LABEL[column]}"`), `falta columna ${column}`)
  }
  const columnSegments = activitiesBoard.split('<section')
  const segmentFor = (label) => columnSegments.find((segment) => segment.includes(`Columna ${label}`))
  const pending = segmentFor('Pendientes')
  const overdue = segmentFor('Vencidas')
  const completed = segmentFor('Completadas')
  assert(pending.includes('Entrevistar usuarios') && !pending.includes('Levantar encuestas'))
  assert(overdue.includes('Levantar encuestas') && !overdue.includes('Entrevistar usuarios'))
  assert(completed.includes('Documentar hallazgos'))
  assert(!pending.includes('Actividad fuera del filtro') && !overdue.includes('Actividad fuera del filtro') && !completed.includes('Actividad fuera del filtro'))
  assert(activitiesBoard.includes('Con descripción') && activitiesBoard.includes('Sin descripción'))
  assert(!activitiesBoard.includes('<iframe') && !activitiesBoard.includes('<img'))
  console.log('✓ Activities board classifies by date/completion, honours the objective scope and stays embed-free')

  // 5. Structural checks on the panel integration; not an authenticated end-to-end run.
  const views = await readFile(new URL('../app/components/seguimiento-views.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('seguimiento-views.tsx', views, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = (name) => {
    let found = null
    const visit = (node) => {
      if (found) return
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
        found = node
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    assert(found, `falta la función ${name}`)
    return found.getText(ast)
  }
  assert(!views.includes('Los estados Kanban están pendientes de definición'), 'el botón Kanban sigue deshabilitado')
  const dropObjective = declaration('dropObjective')
  assert(dropObjective.includes('objectives/${objective.id}/submit'))
  assert(dropObjective.includes('expected_revision: objective.revision'))
  assert(dropObjective.includes('setPendingDecision(drop.decision)'))
  assert(dropObjective.includes('setSelectedObjective(objective.id)'))
  const dropActivity = declaration('dropActivity')
  assert(dropActivity.includes('activities/${activity.id}/completion'))
  assert(dropActivity.includes('expected_revision: activity.revision'))
  assert(dropActivity.includes('completed }'))
  const validationForm = declaration('ValidationForm')
  assert(validationForm.includes("defaultValue={initialDecision ?? 'approve'}"))
  assert(validationForm.includes('La observación es obligatoria.'), 'la observación sigue obligatoria en la validación')
  assert(views.includes('onDropObjective={dropObjective}'))
  assert(views.includes('onDropActivity={dropActivity}'))
  assert(views.includes('viewMode === \'board\''))
  assert(views.includes('estados intermedios de actividad'))
  const cycle = declaration('SeguimientoCycle')
  assert(cycle.includes('useState<\'list\' | \'board\'>(\'list\')'), 'la vista elegida debe sobrevivir a la recarga posterior al guardado')
  const section = declaration('ObjectiveSection')
  assert(section.includes('viewMode: \'list\' | \'board\''), 'ObjectiveSection recibe la vista en props')
  assert(!section.includes('useState<\'list\' | \'board\'>'), 'no se guarda la vista dentro de la sección que se desmonta')
  const kanbanSource = source
  assert(kanbanSource.includes('objectiveDrop(objective, target.key as ObjectiveStatus, role)'))
  assert(kanbanSource.includes('activityDrop(activity, target.key as ActivityColumn)'))
  assert(!kanbanSource.includes('fetch('), 'el tablero no habla directamente con la API')
  console.log('✓ Panel wires drops through existing endpoints with expected_revision and keeps the observation rule')

  // Optional isolated preview for responsive checks, not a connected SIA screen.
  if (process.env.SIA_KANBAN_PREVIEW) {
    const css = (await readFile(new URL('../app/components/tracking-kanban.module.css', import.meta.url), 'utf8'))
    const objectivesHtml = render(TrackingKanban, { ...base, board: 'objectives' })
    const activitiesHtml = render(TrackingKanban, { ...base, board: 'activities' })
    await writeFile(process.env.SIA_KANBAN_PREVIEW, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prueba aislada del tablero</title><style>*{box-sizing:border-box}body{margin:0;padding:16px;font:14px Arial,sans-serif;background:#f3f4ed}h2{font-size:15px;color:#37402f}button{font:inherit}${css}</style><body><p>Fixture visual aislada — no representa una sesión autenticada.</p><h2>Tablero de objetivos</h2>${objectivesHtml}<h2>Tablero de actividades</h2>${activitiesHtml}</body></html>`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
