import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const temporary = await mkdtemp('/tmp/opencode/project-navigation-')
const originalFetch = globalThis.fetch
try {
  for (const name of ['expediente', 'project-workspace', 'reports', 'tracking-summary']) {
    const source = await readFile(new URL(`../app/lib/${name}.ts`, import.meta.url), 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
    await writeFile(join(temporary, `${name}.mjs`), result.outputText.replaceAll("'./expediente'", "'./expediente.mjs'"))
  }
  const { readProjectSection, loadProjects, PROJECT_GROUPS } = await import(pathToFileURL(join(temporary, 'project-workspace.mjs')))
  const reference = await readFile(new URL('../../../visual/prototype/src/CatalitecApp.tsx', import.meta.url), 'utf8')
  assert.deepEqual(PROJECT_GROUPS.flatMap((group) => [...group.sections]), [...reference.matchAll(/name: "([^"]+)", icon:/g)].map((match) => match[1]))
  assert.deepEqual(PROJECT_GROUPS.map((group) => group.label), ['GENERAL', 'ACOMPAÑAMIENTO', 'ESPACIO DEL PROYECTO'])
  for (const section of PROJECT_GROUPS.flatMap((group) => [...group.sections])) {
    assert.equal(readProjectSection(`#${encodeURIComponent(section)}`).section, section)
  }
  assert.deepEqual(readProjectSection(`#${encodeURIComponent('Objetivos y actividades/activity-id')}`), { section: 'Objetivos y actividades', id: 'activity-id' })
  assert.equal(readProjectSection('#Alertas').section, 'Alertas')
  assert.equal(readProjectSection('#%invalid').section, 'Diagnóstico 360°')
  assert.equal(readProjectSection('#Expediente').section, 'Diagnóstico 360°')
  console.log('✓ Navigation groups, order and hash routes match the reference')

  // Transport fixtures only: these are not served by the application or used as identity.
  const now = '2026-09-29T12:00:00Z'
  const entrepreneurship = { id: 'e1', name: 'Proyecto real de prueba', created_at: now, updated_at: now }
  const enrollment = { id: 'en1', entrepreneurship_id: 'e1', program: 'Prototipado', enrolled_at: now }
  const cycle = { id: 'c1', enrollment_id: 'en1', name: 'Proyecto', created_at: now }
  const requests = []
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status })
  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    requests.push(url.pathname)
    if (url.pathname.endsWith('/en1/cycles')) return reply([cycle])
    if (url.pathname.endsWith('/e1/enrollments')) return reply([enrollment])
    return reply([entrepreneurship])
  }
  assert.deepEqual(await loadProjects(), [{ cycle, enrollment, entrepreneurship }])
  assert.equal(requests.length, 3)
  console.log('✓ Picker flattens the authorized storage tree into projects')

  globalThis.fetch = async () => reply([])
  assert.deepEqual(await loadProjects(), [])
  globalThis.fetch = async () => reply({ detail: 'Acceso denegado' }, 403)
  await assert.rejects(loadProjects(), /Acceso denegado/)
  globalThis.fetch = async () => reply([{ id: 'incomplete' }])
  await assert.rejects(loadProjects())
  console.log('✓ Empty, forbidden and malformed responses never produce seed projects')

  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname.endsWith('/en1/cycles')) return reply([{ ...cycle, enrollment_id: 'other' }])
    if (url.pathname.endsWith('/e1/enrollments')) return reply([enrollment])
    return reply([entrepreneurship])
  }
  await assert.rejects(loadProjects(), /El ciclo no pertenece/)
  console.log('✓ Cross-project relations fail closed')

  const paged = Array.from({ length: 51 }, (_, index) => ({ ...entrepreneurship, id: `e${index}` }))
  let secondPage = false
  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname.endsWith('/entrepreneurships')) {
      const offset = Number(url.searchParams.get('offset'))
      if (offset === 50) secondPage = true
      return reply(paged.slice(offset, offset + 50))
    }
    if (url.pathname.endsWith('/e50/enrollments')) return reply([{ ...enrollment, entrepreneurship_id: 'e50' }])
    if (url.pathname.endsWith('/en1/cycles')) return reply([cycle])
    return reply([])
  }
  const projects = await loadProjects()
  assert(secondPage)
  assert.equal(projects.length, 1)
  assert.equal(projects[0].entrepreneurship.id, 'e50')
  console.log('✓ Picker reads all authorized pages before deciding project availability')

  const { parseReport, parseReports } = await import(pathToFileURL(join(temporary, 'reports.mjs')))
  const report = { id: 'r1', entrepreneurship_id: 'e1', cycle_id: 'c1', period_start: '2026-09-01', period_end: '2026-09-29', kind: 'mensual', status: 'aprobado', narrative: 'Informe aprobado', version: 1, revision: 1, composition: {}, created_by: 'manager', created_at: now }
  assert.equal(parseReport(report)?.status, 'aprobado')
  assert.deepEqual(parseReports([report]), [report])
  assert.equal(parseReports([report, {}]), null)
  assert.equal(parseReport({ ...report, status: 'inventado' }), null)
  assert.equal(parseReport({ ...report, composition: [] }), null)
  console.log('✓ Reports accept only backend states and well-formed source compositions')

  const { trackingSummary } = await import(pathToFileURL(join(temporary, 'tracking-summary.mjs')))
  const objectives = ['o1', 'o2', 'o3'].map((id) => ({ id, cycle_id: 'c1', status: id === 'o3' ? 'draft' : 'approved' }))
  const activities = [
    { id: 'a1', objective_id: 'o1', cycle_id: 'c1', completed_at: now },
    ...Array.from({ length: 4 }, (_, index) => ({ id: `b${index}`, objective_id: 'o2', cycle_id: 'c1', completed_at: index === 0 ? now : null })),
    { id: 'foreign', objective_id: 'o1', cycle_id: 'c2', completed_at: now },
  ]
  const summary = trackingSummary('c1', objectives, activities)
  assert.equal(summary.progress_percent, 62.5)
  assert.equal(summary.activities_total, 5)
  assert.equal(summary.activities_completed, 2)
  assert.equal(summary.objectives[2].progress_percent, 0)
  assert.equal(trackingSummary('c1', [], []).progress_percent, 0)
  assert.equal(trackingSummary('c2', objectives, activities).objectives_total, 0)
  console.log('✓ Legacy API summary uses equal weights, excludes drafts and isolates cycles')
} finally {
  globalThis.fetch = originalFetch
  await rm(temporary, { recursive: true, force: true })
}
