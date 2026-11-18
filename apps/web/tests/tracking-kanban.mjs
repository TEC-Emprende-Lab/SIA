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
  assert(cycle.includes('<TrackingLoading view={view} projectName={projectName} program={program} viewMode={viewMode} board={board} />'))
  assert(cycle.includes('writing.current'))
  assert(cycle.includes('Cambios guardados.'))
  const diagnosticSection = declaration('DiagnosticSection')
  assert(diagnosticSection.includes('immutableSubject={`Fotografía del ${formatDay(diagnostic.assessed_on)}`}'))
  assert(diagnosticSection.includes('expected_revision: diagnostic.revision'))
  assert(validationForm.includes("onConfirm={() => { setApprovalAttempted(true); onSubmit('approve', approvalNote) }}"))
  const section = declaration('ObjectiveSection')
  assert(section.includes('viewMode: \'list\' | \'board\''), 'ObjectiveSection recibe la vista en props')
  assert(!section.includes('useState<\'list\' | \'board\'>'), 'no se guarda la vista dentro de la sección que se desmonta')
  const kanbanSource = source
  assert(kanbanSource.includes('objectiveDrop(objective, target.key as ObjectiveStatus, role)'))
  assert(kanbanSource.includes('activityDrop(activity, target.key as ActivityColumn)'))
  assert(!kanbanSource.includes('fetch('), 'el tablero no habla directamente con la API')
  console.log('✓ Panel wires drops through existing endpoints with expected_revision and keeps the observation rule')

  // Render the loading components in isolation, using the actual shared primitives.
  const evidenceSource = await readFile(new URL('../app/components/evidence-browser.tsx', import.meta.url), 'utf8')
  assert(evidenceSource.includes('{loading && <LoadingState label="Cargando carpetas…"'))
  assert(!evidenceSource.includes('{!loading && <div className={styles.layout}>'))
  const readComponent = (name) => readFile(new URL(`../app/components/${name}.tsx`, import.meta.url), 'utf8')
  const [loadingSource, headingSource] = await Promise.all([readComponent('ui/loading-state'), readComponent('project-reference-ui')])
  const compileLoading = (code) => ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replace(/from ["'](react|react\/jsx-runtime|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
  await writeFile(join(temporary, 'tracking-load-plan.mjs'), compileLoading(`
    let mockRequest
    export function useRequest(handler) { mockRequest = handler }
    const seguimientoUrl = (cycleId, resource) => cycleId + '/' + resource
    const requestSeguimiento = (path) => mockRequest(path)
    const parseCanvas = null, parseAmbitionList = null, parseObjectiveList = null, parseActivityList = null
    const parseEvidenceList = null, parseDiagnosticList = null, parseValidationList = null, parseTrackingSummary = null
    ${declaration('loadFailure')}
    ${declaration('loadTrackingView')}
    export { loadTrackingView }
  `))
  const { loadTrackingView, useRequest } = await import(pathToFileURL(join(temporary, 'tracking-load-plan.mjs')))
  const requiredReads = {
    work: ['objectives', 'activities', 'canvas', 'summary', 'ambitions', 'evidence', 'validations'],
    summary: ['objectives', 'activities', 'canvas', 'summary'],
    evidence: ['objectives', 'activities', 'evidence'],
    ambitions: ['objectives', 'activities', 'canvas', 'ambitions'],
    diagnostics: ['canvas', 'diagnostics', 'validations'],
    evolution: ['canvas', 'diagnostics'],
  }
  for (const [view, resources] of Object.entries(requiredReads)) {
    const pending = new Map()
    useRequest((path) => new Promise((resolve) => pending.set(path, resolve)))
    const loaded = loadTrackingView('c1', view)
    assert.deepEqual([...pending.keys()], resources.map((resource) => `c1/${resource}`), `consultas paralelas de ${view}`)
    for (const resolve of pending.values()) resolve({ ok: true, data: [] })
    assert.equal((await loaded).view, view)
  }
  useRequest(async (path) => {
    if (path === 'c1/canvas') return { ok: false, status: 500, message: 'Error de consulta' }
    if (path === 'c1/validations') return { ok: false, status: 403, message: 'Acceso denegado' }
    return { ok: true, data: [] }
  })
  assert.deepEqual(await loadTrackingView('c1', 'work'), { status: 'forbidden', message: 'Acceso denegado' })
  assert.deepEqual(await loadTrackingView('c1', 'evolution'), { status: 'error', message: 'Error de consulta (API: seguimiento/canvas, HTTP 500).' })
  assert.equal((await loadTrackingView('c1', 'evidence')).view, 'evidence')
  console.log('✓ Las vistas consultan solo sus dependencias, en paralelo; los errores obligatorios no se publican como vacíos')
  await writeFile(join(temporary, 'tracking-loading.mjs'), compileLoading(`
    import { ACTIVITY_COLUMNS, OBJECTIVE_COLUMNS } from './kanban.mjs'
    const styles = new Proxy({}, { get: (_, key) => String(key) })
    const kanbanStyles = styles
    ${loadingSource.replace("import styles from './interaction-states.module.css'", '')}
    ${headingSource}
    ${evidenceSource.slice(evidenceSource.indexOf('export function EvidenceBrowserLoading'), evidenceSource.indexOf('export function EvidenceBrowser('))}
    ${views.slice(views.indexOf('const trackingTitle:'), views.indexOf('export function SeguimientoPanel'))}
    export { TrackingLoading }
  `))
  const { EvidenceBrowserLoading, TrackingLoading } = await import(pathToFileURL(join(temporary, 'tracking-loading.mjs')))
  const loadingBase = { program: 'prototipado', projectName: 'Proyecto de prueba', viewMode: 'list', board: 'objectives' }
  const loadingList = render(TrackingLoading, { ...loadingBase, view: 'work' })
  const loadingSummary = render(TrackingLoading, { ...loadingBase, view: 'summary' })
  assert.match(loadingList, /objectiveGroup/)
  assert.match(loadingSummary, /class="summary-grid"/)
  for (const [board, count] of [['objectives', 5], ['activities', 3]]) {
    const html = render(TrackingLoading, { ...loadingBase, view: 'work', viewMode: 'board', board })
    assert.match(html, new RegExp(`data-columns="${count}"`))
    assert.equal([...html.matchAll(/class="column loadingPanel"/g)].length, count)
  }
  const evidenceLoading = render(TrackingLoading, { ...loadingBase, view: 'evidence' })
  const foldersLoading = render(EvidenceBrowserLoading, { label: 'Cargando carpetas…' })
  for (const [html, label] of [[evidenceLoading, 'Cargando evidencias…'], [foldersLoading, 'Cargando carpetas…']]) {
    assert.match(html, /loadingSidebar/)
    assert.equal([...html.matchAll(/class="evidence-card"/g)].length, 3)
    assert.match(html, new RegExp(`<span class="sr-only" role="status">${label}</span>`))
    assert.match(html, /<div aria-hidden="true"><div class="layout">/)
  }
  for (const [view, label] of [['diagnostics', 'diagnóstico'], ['ambitions', 'ambiciones'], ['evolution', 'evolución']]) {
    const html = render(TrackingLoading, { ...loadingBase, view })
    assert.match(html, new RegExp(`role="status">Cargando ${label}…`))
    assert.match(html, /data-layout="list"/)
  }
  for (const html of [loadingList, loadingSummary, evidenceLoading, foldersLoading]) {
    assert.equal([...html.matchAll(/role="status"/g)].length, 1)
    assert.doesNotMatch(html, /<(button|input|select|a)\b/)
  }
  console.log('✓ Seguimiento y carpetas anuncian su carga una vez, sin controles falsos y con geometría de cada vista')

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
