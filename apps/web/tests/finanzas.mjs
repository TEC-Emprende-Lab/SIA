import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const dir = await mkdtemp('/tmp/opencode/finanzas-web-')
const originalFetch = globalThis.fetch
try {
  const source = await readFile(new URL('../app/lib/finanzas.ts', import.meta.url), 'utf8')
  await writeFile(join(dir, 'finanzas.mjs'), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText)
  const { financeRequest, validPurchase, validSummary, financeUrl, extractInvoice, allFinanceEvents, sumFinanceAmounts, money } = await import(pathToFileURL(join(dir, 'finanzas.mjs')))
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

  assert.equal(sumFinanceAmounts(['0.10', '0.20']), '0.30')
  assert.equal(sumFinanceAmounts(['100.00', '-30.01', '-69.99']), '0.00')
  assert.equal(sumFinanceAmounts(['999999999999.99', '0.01']), '1000000000000.00')
  assert.throws(() => sumFinanceAmounts(['NaN']))
  assert(money('1000000000000000.01').endsWith('01'))
  assert(money('-0.25').startsWith('-'))
  assert.equal(money('NaN'), '—')
  const controller = new AbortController()
  globalThis.fetch = async (_url, init) => { assert.equal(init.signal, controller.signal); return Response.json([p]) }
  await financeRequest('c1', 'purchases', 'GET', undefined, controller.signal)
  console.log('✓ Summary totals retain cents and read requests can be cancelled')

  const sources = await Promise.all(['finanzas-view', 'finanzas-editors', 'finanzas-reviews', 'finanzas-ui'].map(name => readFile(new URL(`../app/components/${name}.tsx`, import.meta.url), 'utf8')))
  const view = sources.join('\n')
  assert(view.includes('human_reviewed: human'))
  assert(view.includes('expected_revision: p.revision'))
  assert(view.includes("role === 'Coordinadora'"))
  assert(view.includes('confirm_cycle: true'))
  assert(!view.includes('dangerouslySetInnerHTML'))
  assert(!view.includes('prompt('))
  assert(view.includes('Descartar cambios'))
  assert(view.includes('onPointerDownOutside'))
  assert(view.includes('disabled={busy || !canAct}'))
  assert(!sources[0].includes("key={version}"), 'Refreshing must not remount drafts or reset list filters')
  const bff = await readFile(new URL('../app/lib/sia-bff.ts', import.meta.url), 'utf8')
  assert(bff.includes('await response.arrayBuffer()'))
  console.log('✓ UI carries human review, scoped revisions and manual confirmation; BFF preserves PDF bytes')

  const require = createRequire(import.meta.url)
  const ui = ts.transpileModule(sources[3], { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react\/jsx-runtime|react|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'../lib/finanzas'", "'./finanzas.mjs'")
    .replace("import styles from './finanzas.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  await writeFile(join(dir, 'ui.mjs'), ui)
  const { FinanceStatus, FinanceEmpty, FinanceNotice, FinancePages } = await import(pathToFileURL(join(dir, 'ui.mjs')))
  const render = (Component, props) => renderToStaticMarkup(createElement(Component, props))
  assert(render(FinanceStatus, { status: 'executed' }).includes('Ejecutado'))
  assert(render(FinanceStatus, { status: 'rejected' }).includes('data-status="rejected"'))
  const empty = render(FinanceEmpty, { title: '<script>unsafe</script>', children: 'Registra tu primer trámite.' })
  assert(empty.includes('&lt;script&gt;') && !empty.includes('<script>'))
  assert(render(FinanceNotice, { tone: 'success', children: 'Guardado' }).includes('role="status"'))
  const pages = render(FinancePages, { offset: 0, count: 2, loading: false, change: () => {} })
  assert(pages.includes('Páginas de resultados') && pages.includes('disabled'))
  console.log('✓ Readable states, empty guidance, safe copy and accessible pagination render correctly')
} finally {
  globalThis.fetch = originalFetch
  await rm(dir, { recursive: true, force: true })
}
