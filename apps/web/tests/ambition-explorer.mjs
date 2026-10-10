import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp('/tmp/sia-ambition-test-')
const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
try {
  await writeFile(join(temporary, 'seguimiento.mjs'), compile(await readFile(new URL('../app/lib/seguimiento.ts', import.meta.url), 'utf8')))
  const compiled = compile(await readFile(new URL('../app/components/ambition-explorer.tsx', import.meta.url), 'utf8'))
    .replace(/from ["'](react\/jsx-runtime|react|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replace("from '../lib/seguimiento'", "from './seguimiento.mjs'")
    .replace("import styles from './ambition-explorer.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  await writeFile(join(temporary, 'explorer.mjs'), compiled)
  const { AmbitionExplorer } = await import(pathToFileURL(join(temporary, 'explorer.mjs')))
  const ambition = { id: 'ambition', title: 'Reducir el desperdicio de agua', description: 'Propósito a largo plazo.\nSin resultados inventados.' }
  const props = {
    ambitions: [ambition, { id: 'next', title: 'Expandir alianzas', description: '' }],
    objectives: [{ id: 'objective', ambition_id: 'ambition', area_id: 'area', title: 'Validar el prototipo', status: 'pending_validation' }, { id: 'unlinked', ambition_id: null, title: 'No debe agregarse', status: 'draft' }],
    activities: [{ id: 'task', objective_id: 'objective', completed_at: '2026-10-09' }, { id: 'task2', objective_id: 'objective', completed_at: null }, { id: 'other', objective_id: 'unlinked', completed_at: null }],
    areas: [{ id: 'area', name: 'Producto mínimo viable' }],
    createAction: createElement('button', null, 'Nueva ambición'),
    editAction: () => createElement('button', null, 'Editar ambición'),
    onObjective: () => {},
  }
  const render = (override = {}) => renderToStaticMarkup(createElement(AmbitionExplorer, { ...props, ...override }))
  const html = render()
  for (const text of ['Nueva ambición', 'Editar ambición', 'Validar el prototipo', 'Producto mínimo viable', 'Pendiente de validación', '1 de 2 actividades completadas', 'Buscar ambiciones', 'Filtrar ambiciones', 'Ambición anterior', 'Ambición siguiente', 'Ambición seleccionada', 'Sin resultados inventados.']) assert(html.includes(text), text)
  assert(html.includes('aria-pressed="true"'))
  assert(html.includes('aria-controls="ambition-detail"'))
  assert(!html.includes('No debe agregarse'))
  assert(html.includes('no un porcentaje de avance'))
  assert(render({ objectives: [] }).includes('Una ambición también puede esperar su momento'))
  assert(render({ ambitions: [] }).includes('Tu siguiente gran idea empieza aquí'))
  assert(render({ ambitions: [{ ...ambition, description: '   ' }] }).includes('todavía no tiene una descripción'))
  const escaped = render({ ambitions: [{ ...ambition, title: '<script>unsafe()</script>', description: '<img src=x>' }] })
  assert(escaped.includes('&lt;script&gt;'))
  assert(!escaped.includes('<script>'))
  assert(escaped.includes('&lt;img'))
  console.log('✓ Ambiciones: propósito íntegro, objetivos opcionales, estados y actividades reales sin duplicación')
  console.log('✓ Creación/edición, selectores accesibles, estados vacíos y contenido escapado')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
