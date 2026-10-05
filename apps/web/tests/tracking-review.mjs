import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp('/tmp/opencode/tracking-review-')
try {
  for (const name of ['expediente', 'seguimiento']) {
    const source = await readFile(new URL(`../app/lib/${name}.ts`, import.meta.url), 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
    await writeFile(join(temporary, `${name}.mjs`), result.outputText)
  }
  const source = await readFile(new URL('../app/components/tracking-review.tsx', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react\/jsx-runtime|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'../lib/expediente'", "'./expediente.mjs'")
    .replaceAll("'../lib/seguimiento'", "'./seguimiento.mjs'")
    .replace("import styles from './seguimiento.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  await writeFile(join(temporary, 'tracking-review.mjs'), compiled)
  const { ActivityEvidence, ObjectiveReviewContext } = await import(pathToFileURL(join(temporary, 'tracking-review.mjs')))
  const render = (Component, props) => renderToStaticMarkup(createElement(Component, props))

  // Isolated rendering fixtures: never served by SIA and never substitute real authentication.
  const now = '2026-10-05T16:00:00Z'
  const objective = { id: 'o1', cycle_id: 'c1', title: 'Validar la solución', description: 'Entender qué necesita el cliente.', deliverable: 'Prueba del prototipo' }
  const activity = { id: 'a1', objective_id: 'o1', cycle_id: 'c1', title: 'Entrevistar usuarios', completed_at: now }
  const reference = { id: 'e1', activity_id: 'a1', cycle_id: 'c1', title: 'Resultados de entrevistas', description: 'Hallazgos y aprendizaje registrados.', kind: 'link', url: 'https://example.com/resultados', created_at: now }
  const foreign = { ...reference, id: 'e2', cycle_id: 'c2', title: 'Referencia de otro ciclo' }
  const unrelated = { ...reference, id: 'e3', activity_id: 'a2', title: 'Referencia de otra actividad' }
  const context = render(ObjectiveReviewContext, { objective, area: 'Mercado segmentado', ambition: 'Conocer el mercado', activities: [activity, { ...activity, id: 'foreign', cycle_id: 'c2' }], evidence: [reference, foreign, unrelated] })
  for (const text of [objective.title, objective.description, objective.deliverable, 'Mercado segmentado', 'Conocer el mercado', '1 / 1', 'evidencias registradas']) assert(context.includes(text))
  assert(!context.includes('2 / 2'))
  const empty = render(ObjectiveReviewContext, { objective: { ...objective, description: '', deliverable: null }, area: 'Mercado segmentado', activities: [], evidence: [reference] })
  assert(empty.includes('0 / 0'))
  assert(empty.includes('Sin descripción del objetivo registrada.'))
  assert(empty.includes('Sin ambición vinculada.'))
  assert(empty.includes('Sin referencia registrada.'))
  console.log('✓ Review context shows existing purpose and scoped counts, with explicit empty states')

  const evidence = render(ActivityEvidence, { activity, evidence: [reference, foreign, unrelated] })
  for (const text of [reference.title, reference.description, reference.url, 'Registrada:', 'Abrir evidencia']) assert(evidence.includes(text))
  assert(evidence.includes('target="_blank"'))
  assert(evidence.includes('rel="noopener noreferrer"'))
  assert(!evidence.includes(foreign.title))
  assert(!evidence.includes(unrelated.title))
  assert(!evidence.includes('<iframe'))
  assert(!evidence.includes('<img'))
  assert(!evidence.includes('<video'))
  console.log('✓ Evidence cards show descriptions, dates and explicit external links without embedding remote content')

  assert(render(ActivityEvidence, { activity, evidence: [] }).includes('Esta actividad todavía no tiene evidencias registradas.'))
  assert(render(ActivityEvidence, { activity, evidence: [{ ...reference, description: '' }] }).includes('Sin descripción de la evidencia registrada.'))
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'invalid']) {
    const invalid = render(ActivityEvidence, { activity, evidence: [{ ...reference, url }] })
    assert(!invalid.includes('href='))
    assert(invalid.includes('URL inválida'))
  }
  const escaped = render(ActivityEvidence, { activity, evidence: [{ ...reference, title: '<script>alert(1)</script>', description: '<img src=x onerror=alert(1)>' }] })
  assert(escaped.includes('&lt;script&gt;'))
  assert(!escaped.includes('<script>'))
  assert(!escaped.includes('<img'))
  for (const [kind, label] of [['file', 'Documento'], ['photograph', 'Fotografía'], ['video', 'Video']]) {
    assert(render(ActivityEvidence, { activity, evidence: [{ ...reference, kind }] }).includes(`${label} · referencia externa`))
  }
  console.log('✓ Empty evidence, supported kinds, unsafe URLs and HTML-like content render safely')

  // Structural regression checks supplement rendered components; not an authenticated E2E.
  const views = await readFile(new URL('../app/components/seguimiento-views.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('seguimiento-views.tsx', views, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const objectiveCard = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'ObjectiveCard').getText(ast)
  assert(objectiveCard.indexOf('<ActivityCard') < objectiveCard.indexOf('<ValidationForm'))
  const activityCard = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'ActivityCard').getText(ast)
  assert(activityCard.indexOf('<ActivityEvidence') < activityCard.indexOf('Marcar realizada'))
  const section = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'ObjectiveSection')
  let activityAttribute
  const inspect = (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'activities') activityAttribute = node.getText(ast)
    ts.forEachChild(node, inspect)
  }
  inspect(section)
  assert(activityAttribute.includes('objective.id'))
  assert(activityAttribute.includes('objective.cycle_id'))
  assert(!activityAttribute.includes('activityFilter'))
  assert(objectiveCard.includes("objective.status === 'pending_validation' && canValidate(role)"))
  console.log('✓ Objective review keeps all scoped activities before validation and preserves role gating')

  // Optional isolated preview for responsive checks, not a connected SIA screen.
  if (process.env.SIA_REVIEW_PREVIEW) {
    const css = (await readFile(new URL('../app/components/seguimiento.module.css', import.meta.url), 'utf8')).replace(/:global\(([^)]+)\)/g, '$1')
    const longReference = { ...reference, url: `https://example.com/${'resultado'.repeat(150)}`, description: 'Hallazgos registrados tras conversar con usuarios.\nAprendizaje documentado para revisar el objetivo.' }
    const previewEvidence = render(ActivityEvidence, { activity, evidence: [longReference] })
    await writeFile(process.env.SIA_REVIEW_PREVIEW, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prueba aislada de revisión</title><style>*{box-sizing:border-box}body{margin:0;padding:16px;font:14px Arial,sans-serif;background:#f3f4ed}.project-dialog{margin:auto;background:white;border-radius:12px}button,a{min-height:36px}${css}</style><body><p>Fixture visual aislada — no representa una sesión autenticada.</p><div class="project-dialog reviewDialog"><h2>Revisión del objetivo</h2><div class="reviewLayout"><div class="reviewMain">${context}<section class="reviewWork"><h3>Qué se ha trabajado</h3><article class="nested"><div class="row"><h4>${activity.title}</h4><span class="badge">Completada</span></div>${previewEvidence}</article></section></div><aside class="reviewDecision"><h3>Revisión del objetivo</h3><p>Espacio reservado para los controles existentes de validación.</p></aside></div></div></body></html>`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
