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
try {
  const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react\/jsx-runtime)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'../lib/expediente'", "'./expediente.mjs'")
    .replace("import styles from './reports.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  for (const [name, path] of [['expediente', 'lib/expediente.ts'], ['report-sources', 'components/report-sources.tsx']]) {
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
} finally {
  await rm(temporary, { recursive: true, force: true })
}
