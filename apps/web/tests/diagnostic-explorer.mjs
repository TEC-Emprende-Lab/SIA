import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp('/tmp/sia-diagnostic-test-')
try {
  const source = await readFile(new URL('../app/components/diagnostic-explorer.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react\/jsx-runtime|react|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replace("import styles from './diagnostic-explorer.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  await writeFile(join(temporary, 'explorer.mjs'), compiled)
  const { DiagnosticExplorer } = await import(pathToFileURL(join(temporary, 'explorer.mjs')))
  const names = ['Identidad y dirección estratégica', 'Modelo de negocio', 'Mercado segmentado', 'Canales definidos', 'Producto mínimo viable', 'Constitución de sociedad']
  const areas = names.map((name, position) => ({ id: `area-${position}`, name, position }))
  const diagnostic = { id: 'fixture', assessments: areas.map((area) => ({ area_id: area.id, observation: `Observación de ${area.name}` })) }
  const render = (value, values = areas) => renderToStaticMarkup(createElement(DiagnosticExplorer, { areas: values, diagnostic: value }))
  const html = render(diagnostic)
  for (const name of names) assert(html.includes(name))
  assert(html.includes('6 de 6 registradas'))
  assert(html.includes('Observación de Producto mínimo viable'))
  assert(html.includes('aria-live="polite"'))
  assert(html.includes('aria-controls="diagnostic-area-observation"'))
  assert(html.includes('aria-pressed="true"'))
  for (const control of ['Girar a la izquierda', 'Girar a la derecha', 'Girar hacia arriba', 'Girar hacia abajo', 'Restablecer', 'Anterior', 'Siguiente', 'Ampliar cubo']) assert(html.includes(control))
  assert(html.includes('no representan un puntaje ni un porcentaje de avance'))
  const empty = render({ ...diagnostic, assessments: [{ area_id: 'area-0', observation: '  ' }, { area_id: 'foreign-area', observation: 'No corresponde' }] })
  assert(empty.includes('0 de 6 registradas'))
  assert(empty.includes('Esta área todavía no tiene una observación.'))
  assert(!empty.includes('No corresponde'))
  assert(render(diagnostic, []).includes('0 de 0 registradas'))
  const escaped = render({ ...diagnostic, assessments: [{ area_id: 'area-4', observation: '<script>unsafe()</script>' }] })
  assert(escaped.includes('&lt;script&gt;'))
  assert(!escaped.includes('<script>'))
  console.log('✓ Cubo: seis áreas, observación seleccionada, controles accesibles y estados vacíos sin puntajes inventados')
  console.log('✓ Contenido escapado, áreas ajenas excluidas y observaciones en blanco no contabilizadas')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
