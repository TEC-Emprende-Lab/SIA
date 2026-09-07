import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const temporary = await mkdtemp(join(tmpdir(), 'catalitec-domain-'))
try {
  for (const name of ['seed', 'repository']) {
    const source = await readFile(new URL(`../src/data/${name}.ts`, import.meta.url), 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
    await writeFile(join(temporary, `${name}.mjs`), result.outputText.replaceAll("'./seed'", "'./seed.mjs'"))
  }
  const { createSeed } = await import(pathToFileURL(join(temporary, 'seed.mjs')))
  const { applyCommand, createMockRepository, projectProgress, reportSources, makeReport, compareDiagnostics } = await import(pathToFileURL(join(temporary, 'repository.mjs')))
  let count = 0
  const test = async (name, body) => { await body(); count++; console.log(`✓ ${name}`) }
  await test('Seed relations resolve within one project; initial progress = 50%', () => {
    const s = createSeed()
    assert.equal(projectProgress(s), 50)
    for (const n of s.needs) { assert(s.diagnostics.some(d => d.id === n.diagnosticId && d.projectId === n.projectId)); for (const id of n.objectiveIds) assert(s.objectives.some(o => o.id === id && o.projectId === n.projectId)) }
    for (const e of s.evidence) assert(s.activities.some(a => a.id === e.activityId))
    for (const d of s.diagnostics) for (const a of d.assessments) for (const id of a.evidenceIds) assert(s.evidence.find(e => e.id === id).date <= d.date, 'Diagnostic cannot cite future evidence')
  })
  await test('Approved diagnostics reject edits and preserve the source when revised', () => {
    const s = createSeed(), original = structuredClone(s.diagnostics[0])
    assert.throws(() => applyCommand(s, { type: 'diagnostic.save', value: { ...original, status: 'DRAFT' } }, 'Gestor'), /solo lectura/)
    const next = applyCommand(s, { type: 'diagnostic.revise', id: original.id }, 'Gestor')
    assert.deepEqual(next.diagnostics[0], original); assert.equal(next.diagnostics.at(-1).supersedes, original.id)
  })
  await test('Diagnostic ratings reject fractional, zero and out-of-range values', () => {
    for (const score of [0, 1.5, 6]) { const d = structuredClone(createSeed().diagnostics[0]); d.id = 'invalid'; d.status = 'DRAFT'; d.assessments[0].score = score; assert.throws(() => applyCommand(createSeed(), { type: 'diagnostic.save', value: d }, 'Gestor'), /entera/) }
  })
  await test('Entrepreneur can submit own draft but cannot approve diagnostics or objectives', () => {
    const s = createSeed(), d = { ...s.diagnostics[0], id: 'draft', status: 'DRAFT', author: 'Andrea Morales' }
    let next = applyCommand(s, { type: 'diagnostic.save', value: d }, 'Emprendedor')
    next = applyCommand(next, { type: 'diagnostic.status', id: 'draft', status: 'SUBMITTED' }, 'Emprendedor')
    assert.throws(() => applyCommand(next, { type: 'diagnostic.status', id: 'draft', status: 'APPROVED' }, 'Emprendedor'))
    assert.throws(() => applyCommand(next, { type: 'objective.approve', id: 'o3' }, 'Emprendedor'))
  })
  await test('Comparison includes advancement, stagnation and regression', () => {
    const s = createSeed(); const changes = compareDiagnostics(s.diagnostics[1], s.diagnostics[2]); assert.equal(changes.filter(a => a.delta > 0).length, 5); assert.equal(changes.filter(a => a.delta === 0).length, 2); assert.equal(changes.find(a => a.areaId === 'finance').delta, -1)
  })
  await test('Completing activities changes progress but never auto-closes needs', () => {
    const s = createSeed(); const next = applyCommand(s, { type: 'activity.status', id: 'a3', status: 'DONE' }, 'Emprendedor')
    assert.equal(projectProgress(next), 62.5); assert.equal(next.needs[0].status, 'PARTIALLY_ADDRESSED'); assert.equal(next.activities.find(a => a.id === 'a3').completedAt, '2026-09-07')
  })
  await test('Need closure requires manager, justification and linked support', () => {
    const s = createSeed(), command = { type: 'need.status', id: 'n1', status: 'ADDRESSED', justification: 'Hallazgos revisados', supportId: 'e2' }
    assert.throws(() => applyCommand(s, { ...command, justification: '' }, 'Gestor'))
    assert.throws(() => applyCommand(s, { ...command, supportId: 'e3' }, 'Gestor'))
    assert.throws(() => applyCommand(s, command, 'Emprendedor'))
    assert.equal(applyCommand(s, command, 'Gestor').needs[0].status, 'ADDRESSED')
  })
  await test('Objective ambition reuses existing objective and validates its type fields', () => {
    const s = createSeed(), ambition = { ...s.ambitions[1], id: 'new-ambition' }
    assert.throws(() => applyCommand(s, { type: 'ambition.save', value: { ...ambition, objectiveIds: [] } }, 'Gestor'))
    assert.throws(() => applyCommand(s, { type: 'ambition.save', value: { ...ambition, measurement: '' } }, 'Gestor'))
    const next = applyCommand(s, { type: 'ambition.save', value: ambition }, 'Gestor'); assert.equal(next.objectives.length, s.objectives.length); assert.equal(projectProgress(next), projectProgress(s))
  })
  await test('Changing an approved objective invalidates approval and changes the eligible average', () => {
    const s = createSeed(); const next = applyCommand(s, { type: 'objective.save', value: { ...s.objectives[0], title: 'Objetivo ajustado' } }, 'Emprendedor'); assert.equal(next.objectives[0].status, 'PENDING_APPROVAL'); assert.equal(next.objectives[0].approvedAt, undefined); assert(next.audit.some(a => a.entityId === 'o1')); assert.equal(next.audit.at(-1).before.status, 'APPROVED'); assert.equal(next.audit.at(-1).after.title, 'Objetivo ajustado')
  })
  await test('Report selects only requested sources and marks unsupported content missing', () => {
    const s = createSeed(), start = '2026-08-01', end = '2026-08-31'; const sources = reportSources(s, start, end)
    assert(!sources.some(x => x.id === 'd3')); assert(sources.some(x => x.id === 'd2')); assert(!sources.some(x => x.id === 'e1' && x.date > end))
    const r = makeReport(s, start, end, 'FOLLOW_UP', ['e2'], 'Gestor'); assert.deepEqual(r.sources.map(x => x.id), ['e2']); assert.equal(r.sections.find(x => x.title === 'Impactos').content, 'Pendiente de completar'); assert(r.sections.filter(x => x.content !== 'Pendiente de completar').every(x => x.sourceIds.length))
  })
  await test('Approved reports remain frozen after upstream changes and revisions', async () => {
    const repo = createMockRepository(); const s = await repo.load(), original = structuredClone(s.reports[0]); let next = applyCommand(s, { type: 'activity.status', id: 'a3', status: 'DONE' }, 'Gestor')
    assert.deepEqual(next.reports[0], original)
    assert.throws(() => applyCommand(next, { type: 'report.save', value: { ...original, status: 'DRAFT' } }, 'Gestor'))
    next = applyCommand(next, { type: 'report.revise', id: original.id }, 'Gestor'); assert.deepEqual(next.reports[0], original); assert.equal(next.reports.at(-1).version, 2); assert.equal(next.reports.at(-1).supersedes, original.id)
  })
  await test('Injected save failure is recoverable and leaves repository unchanged', async () => {
    const repo = createMockRepository(), before = await repo.load(); repo.failNext(); const c = { type: 'activity.status', id: 'a3', status: 'DONE' }
    await assert.rejects(repo.execute(c, 'Gestor')); assert.deepEqual(await repo.load(), before); assert.equal((await repo.execute(c, 'Gestor')).activities.find(a => a.id === 'a3').status, 'DONE')
  })
  console.log(`${count} domain checks passed`)
} finally { await rm(temporary, { recursive: true, force: true }) }
