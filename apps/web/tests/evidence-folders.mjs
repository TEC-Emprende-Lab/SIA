import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const temporary = await mkdtemp('/tmp/opencode/evidence-folders-')
try {
  const source = await readFile(new URL('../app/lib/evidence-folders.ts', import.meta.url), 'utf8')
  await writeFile(join(temporary, 'folders.mjs'), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText)
  const { filterEvidence, parseFolder, parseFolders, parsePlacement, parsePlacements } = await import(pathToFileURL(join(temporary, 'folders.mjs')))
  const evidence = [
    { id: 'one', activity_id: 'a1', title: 'Foto prototipo', description: 'Prueba con clientes', kind: 'photograph' },
    { id: 'two', activity_id: 'a2', title: 'Entrevista', description: 'Notas', kind: 'file' },
    { id: 'three', activity_id: 'a3', title: 'Referencia', description: '', kind: 'link' },
  ]
  const activities = [{ id: 'a1', objective_id: 'o1', title: 'Validar MVP' }, { id: 'a2', objective_id: 'o1', title: 'Entrevistar' }, { id: 'a3', objective_id: 'o2', title: 'Mercado' }]
  const placements = [{ evidence_id: 'one', folder_id: 'f1' }, { evidence_id: 'two', folder_id: null }]
  const filter = (overrides = {}) => filterEvidence(evidence, activities, placements, { location: 'all', activityId: '', query: '', kind: '', ...overrides }).map((item) => item.id)
  assert.deepEqual(filter(), ['one', 'two', 'three'])
  assert.deepEqual(filter({ location: 'objective:o1' }), ['one', 'two'])
  assert.deepEqual(filter({ location: 'objective:o1', activityId: 'a1' }), ['one'])
  assert.deepEqual(filter({ location: 'folder:f1' }), ['one'])
  assert.deepEqual(filter({ location: 'folder:missing' }), [])
  assert.deepEqual(filter({ location: 'unfiled' }), ['two', 'three'])
  assert.deepEqual(filter({ query: ' CLIENTES ' }), ['one'])
  assert.deepEqual(filter({ query: 'mvp' }), ['one'])
  assert.deepEqual(filter({ location: 'objective:o1', kind: 'link' }), [])
  assert.deepEqual(filter({ location: 'folder:f1', kind: 'photograph' }), ['one'])
  const folder = { id: 'f1', cycle_id: 'c1', name: 'Pruebas', revision: 1 }
  assert.deepEqual(parseFolder(folder), folder)
  assert.deepEqual(parseFolders([folder]), [folder])
  assert.equal(parseFolders([{}]), null)
  assert.equal(parseFolder({ ...folder, revision: 0 }), null)
  assert.equal(parsePlacement({ evidence_id: 'one', cycle_id: 'c1', folder_id: false, revision: 1 }), null)
  assert.deepEqual(parsePlacements([]), [])
  const view = await readFile(new URL('../app/components/evidence-browser.tsx', import.meta.url), 'utf8')
  assert(view.includes('expected_revision: placementOf(current.id)?.revision ?? 0'))
  assert(view.includes('aria-label="Carpetas de evidencias"'))
  assert(view.includes('Mover solo cambia la organización'))
  const bff = await readFile(new URL('../app/api/sia/cycles/[cycleId]/seguimiento/[[...path]]/route.ts', import.meta.url), 'utf8')
  assert(bff.includes("resource === 'evidence' && isUuid(second) && third === 'folder'"))
  console.log('✓ Carpetas automáticas y personalizadas filtran sin duplicar evidencias; búsqueda, tipo y actividad se combinan')
  console.log('✓ Contratos inválidos se rechazan; movimientos usan revisión optimista y BFF limitado')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
