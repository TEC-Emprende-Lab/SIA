import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp(join(tmpdir(), 'sia-reports-'))
const originalFetch = globalThis.fetch
try {
  const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react|react\/jsx-runtime)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'../lib/expediente'", "'./expediente.mjs'")
    .replace("import styles from './reports.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  for (const [name, path] of [['expediente', 'lib/expediente.ts'], ['reports', 'lib/reports.ts'], ['report-sources', 'components/report-sources.tsx'], ['report-form', 'components/report-form.tsx']]) {
    await writeFile(join(temporary, `${name}.mjs`), compile(await readFile(new URL(`../app/${path}`, import.meta.url), 'utf8')))
  }
  const { ReportSources } = await import(pathToFileURL(join(temporary, 'report-sources.mjs')))
  const render = (composition) => renderToStaticMarkup(createElement(ReportSources, { composition }))
  // Snapshot fixtures only: rendering must not mutate or replace historical data.
  const snapshot = Object.freeze({
    activities_completed: Object.freeze([Object.freeze({ id: 'activity-old', title: 'Prueba documentada', completed_at: '2026-10-07T15:00:00Z' })]),
    evidence: Object.freeze([Object.freeze({ id: 'evidence-old', activity_id: 'activity-old', title: 'Resultado <original>', url: 'https://example.org/evidence?version=1&source=report' })]),
    minutes_approved: Object.freeze([Object.freeze({ id: 'minutes-old', meeting_id: 'meeting-old', approved_at: '2026-10-07T15:00:00Z' })]),
    agreements: Object.freeze([Object.freeze({ id: 'agreement-old', description: 'Compromiso registrado', due_date: '2026-10-07' })]),
    objectives: Object.freeze([]),
    finances: Object.freeze({ status: 'Pendiente de completar' }),
  })
  const before = JSON.stringify(snapshot)
  const markup = render(snapshot)
  assert.equal(JSON.stringify(snapshot), before)
  assert.match(markup, /Minuta aprobada/)
  assert.match(markup, /meeting-old/)
  assert.match(markup, /Resultado &lt;original&gt;/)
  assert.match(markup, /href="https:\/\/example.org\/evidence\?version=1&amp;source=report"/)
  assert.match(markup, /rel="noopener noreferrer"/)
  assert.match(markup, /Fecha de compromiso: 07\/10\/2026/)
  assert.match(markup, /No hay fuentes registradas en esta sección/)
  assert.match(markup, /Pendiente de completar/)
  assert.doesNotMatch(markup, /activities_completed|minutes_approved/)
  console.log('✓ Report sources preserve the snapshot, references, dates and safe evidence links')

  for (const url of ['javascript:alert(1)', 'data:text/html,bad', '/private/file', '//example.org/file', 'not a URL']) {
    assert.doesNotMatch(render({ evidence: [{ title: 'Sin enlace navegable', url }] }), /<a\b/)
  }
  assert.match(render({ evidence: [{ title: 'Enlace HTTP', url: 'http://example.org' }] }), /href="http:\/\/example.org\/"/)
  assert.match(render({}), /Este informe no tiene fuentes registradas/)
  const unknown = render({ future_sources: [null, {}, { title: { nested: true } }] })
  assert.match(unknown, /Fuentes adicionales/)
  assert.doesNotMatch(unknown, /\[object Object\]|future_sources/)
  assert.match(render({ constructor: [] }), /Fuentes adicionales/)
  console.log('✓ Missing and unknown sources stay readable; unsafe URL protocols are not linked')

  const { reportSubmission, reportRequest } = await import(pathToFileURL(join(temporary, 'reports.mjs')))
  const { ReportForm } = await import(pathToFileURL(join(temporary, 'report-form.mjs')))
  const form = (fields) => {
    const data = new FormData()
    for (const [key, value] of Object.entries(fields)) data.set(key, value)
    return data
  }
  const draft = Object.freeze({ id: 'report-1', status: 'borrador', revision: 4, narrative: 'Texto conservado' })
  const approved = Object.freeze({ ...draft, status: 'aprobado' })
  assert.throws(() => reportSubmission(form({ start: '2026-10-08', end: '2026-10-07' })), /fecha final/)
  assert.throws(() => reportSubmission(form({ start: '2026-10-07' })), /inicio y el fin/)
  const created = reportSubmission(form({ start: '2026-10-07', end: '2026-10-07' }))
  assert.deepEqual(created, { path: '', method: 'POST', body: { period_start: '2026-10-07', period_end: '2026-10-07', kind: 'mensual', narrative: '' } })
  for (const action of ['edit', 'approve', 'correct']) {
    assert.throws(() => reportSubmission(form({ action, observation: ' \n ' }), action === 'correct' ? approved : draft), /observación/)
  }
  const saved = reportSubmission(form({ action: 'edit', observation: ' Corrección de redacción ', narrative: '' }), draft)
  assert.deepEqual(saved, { path: '/report-1', method: 'PUT', body: { expected_revision: 4, observation: 'Corrección de redacción', narrative: '' } })
  console.log('✓ Period ordering and nonblank observations match the API; empty narratives and single-day periods remain allowed')

  const decision = form({ action: 'approve', observation: 'Fuentes revisadas', narrative: draft.narrative })
  assert.throws(() => reportSubmission(decision, draft), /revisión humana/)
  decision.set('reviewed', 'on')
  decision.set('narrative', 'Edición sin guardar')
  assert.throws(() => reportSubmission(decision, draft), /Guarda primero/)
  decision.set('narrative', draft.narrative)
  assert.deepEqual(reportSubmission(decision, draft), { path: '/report-1/approval', method: 'POST', body: { expected_revision: 4, observation: 'Fuentes revisadas', human_reviewed: true } })
  assert.throws(() => reportSubmission(decision, approved), /versión aprobada/)
  assert.throws(() => reportSubmission(form({ action: 'edit', observation: 'Cambio' }), approved), /versión aprobada/)
  const corrected = reportSubmission(form({ action: 'correct', observation: 'Aclaración', narrative: 'Nueva versión' }), approved)
  assert.deepEqual(corrected, { path: '/report-1/corrections', method: 'POST', body: { observation: 'Aclaración', narrative: 'Nueva versión' } })
  assert.equal(approved.narrative, 'Texto conservado')
  assert.throws(() => reportSubmission(form({ action: 'correct', observation: 'Cambio' }), draft), /acción disponible/)
  console.log('✓ Approval requires review, saved text and the current revision; corrections preserve the approved version')

  for (const report of [undefined, draft, approved]) {
    const html = renderToStaticMarkup(createElement(ReportForm, { report, busy: false, error: '', onSubmit() {} }))
    assert.doesNotMatch(html, /name="reviewed"/)
    assert.match(html, report?.status === 'aprobado' ? /Crear corrección/ : /Guardar borrador/)
  }
  const errorMarkup = renderToStaticMarkup(createElement(ReportForm, { report: draft, busy: false, error: 'Conflicto de revisión', onSubmit() {} }))
  assert.match(errorMarkup, /role="alert"/)
  assert.match(errorMarkup, /Texto conservado/)

  let requests = 0
  globalThis.fetch = async () => {
    requests += 1
    return new Response(JSON.stringify({ detail: 'Revisión obsoleta' }), { status: 409 })
  }
  await assert.rejects(reportRequest('/reports/report-1', (value) => value, saved), /Conserva una copia de tu redacción/)
  assert.equal(requests, 1, 'A conflict must not automatically retry a write')
  globalThis.fetch = async () => new Response('Gateway unavailable', { status: 502 })
  await assert.rejects(reportRequest('/reports', (value) => value), /No se pudo completar/)
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: [{ msg: 'invalid' }] }), { status: 422 })
  await assert.rejects(reportRequest('/reports', (value) => value), /Revisa los datos/)
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(reportRequest('/reports', (value) => value), /Revisa tu conexión/)
  console.log('✓ Forms explain their action; conflicts and unavailable responses produce readable errors without automatic retries')
} finally {
  globalThis.fetch = originalFetch
  await rm(temporary, { recursive: true, force: true })
}
