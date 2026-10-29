import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const dir = await mkdtemp('/tmp/opencode/finanzas-web-')
const originalFetch = globalThis.fetch
try {
  const source = await readFile(new URL('../app/lib/finanzas.ts', import.meta.url), 'utf8')
  await writeFile(join(dir, 'finanzas.mjs'), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText)
  const { financeRequest, validPurchase, validSummary, financeUrl, extractInvoice, allFinanceEvents } = await import(pathToFileURL(join(dir, 'finanzas.mjs')))
  const p = { id: 'p1', cycle_id: 'c1', item_id: 'i1', kind: 'factura', status: 'draft', amount: '123.45', supplier: 'Proveedor', invoice_number: '001', description: 'Compra', fundatec_number: '', created_by: 'u1', created_at: '2026-10-29T00:00:00Z', revision: 1, checklist: { monto: true } }
  assert(validPurchase(p, 'c1'))
  assert(!validPurchase(p, 'other'))
  assert(!validPurchase({ ...p, status: 'invented' }, 'c1'))
  assert(!validPurchase({ ...p, amount: 'NaN' }, 'c1'))
  assert(!validPurchase({ ...p, checklist: null }, 'c1'))
  assert(validSummary({ currency: 'CRC', available: null, detail: 'Reservas TBD', items: [] }))
  assert(!validSummary({ currency: 'CRC', available: '100', detail: 'Inventado', items: [] }))
  assert.equal(financeUrl('c1', 'summary'), '/api/sia/cycles/c1/finanzas/summary')
  console.log('✓ Finance data rejects unknown states, malformed amounts and cross-cycle records')

  globalThis.fetch = async (_url, init) => { assert.equal(init.method, 'GET'); assert(!('body' in init)); return Response.json([p]) }
  assert.deepEqual(await financeRequest('c1', 'purchases'), [p])
  globalThis.fetch = async () => Response.json({ detail: 'No autorizado' }, { status: 403 })
  await assert.rejects(financeRequest('c1', 'purchases'), /No autorizado/)
  globalThis.fetch = async () => Response.json([{ ...p, cycle_id: 'c2' }])
  await assert.rejects(financeRequest('c1', 'purchases'), /otro ciclo/)
  globalThis.fetch = async () => Response.json({ detail: [{ loc: ['body', 'amount'] }] }, { status: 422 })
  await assert.rejects(financeRequest('c1', 'purchases', 'POST', {}), /Revise los campos/)
  await assert.rejects(extractInvoice('c1', { size: 6_000_001 }), /hasta 6 MB/)
  console.log('✓ Requests preserve backend errors and revisions; oversized extraction fails before reading')

  const history = Array.from({ length: 101 }, (_, i) => ({ id: `event-${i}`, entity_id: 'r1', action: 'finance.resolved', observation: 'Revisado', actor_id: 'u1', created_at: '2026-10-29T00:00:00Z', snapshot: { row_key: `row-${i}` } }))
  globalThis.fetch = async input => { const offset = Number(new URL(input, 'http://local').searchParams.get('offset')); return Response.json(history.slice(offset, offset + 100)) }
  assert.equal((await allFinanceEvents('c1', 'r1')).length, 101)
  globalThis.fetch = async () => Response.json(history.slice(0, 100))
  await assert.rejects(allFinanceEvents('c1', 'r1'), /historial cambió/)
  console.log('✓ Reconciliation history reads beyond 100 resolutions and rejects repeated pages')

  const view = await readFile(new URL('../app/components/finanzas-view.tsx', import.meta.url), 'utf8')
  assert(view.includes('human_reviewed: human'))
  assert(view.includes('expected_revision: p.revision'))
  assert(view.includes("role === 'Coordinadora'"))
  assert(view.includes('confirm_cycle: true'))
  assert(!view.includes('dangerouslySetInnerHTML'))
  assert(!view.includes('prompt('))
  const bff = await readFile(new URL('../app/lib/sia-bff.ts', import.meta.url), 'utf8')
  assert(bff.includes('await response.arrayBuffer()'))
  console.log('✓ UI carries human review, scoped revisions and manual confirmation; BFF preserves PDF bytes')
} finally {
  globalThis.fetch = originalFetch
  await rm(dir, { recursive: true, force: true })
}
