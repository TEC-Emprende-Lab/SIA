import 'next/dist/server/node-environment-baseline.js'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server.js'

const temporary = await mkdtemp(join(tmpdir(), 'sia-project-navigation-'))
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

  const require = createRequire(import.meta.url)
  const welcomeSource = await readFile(new URL('../app/components/project-welcome.tsx', import.meta.url), 'utf8')
  const welcomeCode = ts.transpileModule(welcomeSource, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react\/jsx-runtime|next\/link|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
  await writeFile(join(temporary, 'welcome.mjs'), welcomeCode)
  const { ProjectWelcome } = await import(pathToFileURL(join(temporary, 'welcome.mjs')))
  const { canRegisterExpediente } = await import(pathToFileURL(join(temporary, 'expediente.mjs')))
  const welcome = (role, overrides = {}) => renderToStaticMarkup(createElement(ProjectWelcome, { unavailable: false, hasProjects: false, canManage: canRegisterExpediente(role), onPick() {}, onRefresh() {}, ...overrides }))
  for (const role of ['Coordinadora', 'Gestor']) {
    assert(welcome(role).includes('href="/expediente"'))
    assert(welcome(role).includes('Agrega su programa y ciclo'))
  }
  assert(!welcome('Emprendedor').includes('href="/expediente"'))
  assert(welcome('Emprendedor').includes('consulta tu asignación'))
  assert(!welcome('Emprendedor').includes('Elegir proyecto'))
  assert(welcome('Coordinadora', { hasProjects: true }).includes('Elegir proyecto'))
  assert(welcome('Coordinadora', { unavailable: true }).includes('Este proyecto no está disponible'))
  console.log('✓ First-use guidance follows existing roles and distinguishes unavailable selection from an empty list')

  // Render the real sidebar without starting Clerk or loading unrelated project panels.
  await writeFile(join(temporary, 'panels.mjs'), `
    let role = 'Coordinadora'
    export const setRole = (value) => { role = value }
    export const useMe = () => ({ role, email: 'navigation@example.org' })
    export const UserButton = () => null
    export const SeguimientoPanel = () => null
    export const MeetingsPanel = () => null
    export const ChannelsPanel = () => null
    export const BandejaView = () => null
    export const AssignmentPanel = () => null
    export const ReportsView = () => null
    export const FinanzasView = () => null
    export const ProjectHeading = () => null
    export const Dialog = () => null
    export const DialogContent = () => null
    export const DialogDescription = () => null
    export const DialogHeader = () => null
    export const DialogTitle = () => null
    export const parseObjectiveList = () => null
    export const parseEvidenceList = () => null
    export const parseAmbitionList = () => null
    export const requestSeguimiento = () => null
    export const seguimientoUrl = () => null
  `)
  const workspaceSource = await readFile(new URL('../app/components/project-workspace.tsx', import.meta.url), 'utf8')
  const workspaceCode = ts.transpileModule(workspaceSource, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["']([^"']+)["']/g, (_, name) => {
      if (name === '../lib/project-workspace') return "from './project-workspace.mjs'"
      if (name === '../lib/expediente') return "from './expediente.mjs'"
      if (name === './project-welcome') return "from './welcome.mjs'"
      if (name.startsWith('.') || name === '@clerk/nextjs') return "from './panels.mjs'"
      return `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`
    })
  await writeFile(join(temporary, 'workspace.mjs'), workspaceCode)
  const { ProjectWorkspace } = await import(pathToFileURL(join(temporary, 'workspace.mjs')))
  const { setRole } = await import(pathToFileURL(join(temporary, 'panels.mjs')))
  for (const role of ['Coordinadora', 'Gestor', 'Emprendedor']) {
    setRole(role)
    const html = renderToStaticMarkup(createElement(ProjectWorkspace))
    const administration = html.match(/<nav aria-label="Administración"[^>]*>([\s\S]*?)<\/nav>/)?.[1]
    if (role === 'Emprendedor') assert.equal(administration, undefined)
    else {
      assert(administration?.includes('href="/expediente"'))
      assert(administration?.includes('Expedientes'))
    }
  }
  console.log('✓ Coordinadora and Gestor can reach Expedientes before any project loads; Emprendedor has no management link')

  const configSource = await readFile(new URL('../next.config.ts', import.meta.url), 'utf8')
  await writeFile(join(temporary, 'config.mjs'), ts.transpileModule(configSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText)
  const { default: nextConfig } = await import(pathToFileURL(join(temporary, 'config.mjs')))
  for (const path of ['/expediente', '/expediente/e1', '/expediente/e1/inscripciones/en1']) {
    const response = await unstable_getResponseFromNextConfig({ url: `https://sia.example${path}`, nextConfig })
    assert.equal(response.status, 200, path)
    assert.equal(response.headers.get('location'), null, path)
  }
  const cycleResponse = await unstable_getResponseFromNextConfig({ url: 'https://sia.example/expediente/e1/inscripciones/en1/ciclos/c1', nextConfig })
  assert.equal(cycleResponse.status, 307)
  assert.equal(cycleResponse.headers.get('location'), 'https://sia.example/?project=c1')
  console.log('✓ Registration pages stay reachable and cycle links still open their project workspace')

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
