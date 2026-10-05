import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const temporary = await mkdtemp('/tmp/opencode/project-summary-')
const originalFetch = globalThis.fetch
try {
  const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/from ["'](react|react\/jsx-runtime|lucide-react)["']/g, (_, name) => `from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
    .replaceAll("'./comunicacion'", "'./comunicacion.mjs'")
    .replaceAll("'../lib/comunicacion'", "'./comunicacion.mjs'")
    .replaceAll("'../lib/expediente'", "'./expediente.mjs'")
    .replaceAll("'../lib/project-summary'", "'./project-summary.mjs'")
    .replaceAll("'./project-reference-ui'", "'./project-reference-ui.mjs'")
    .replace("import styles from './summary-communication.module.css';", 'const styles = new Proxy({}, { get: (_, key) => String(key) });')
  for (const name of ['comunicacion', 'expediente', 'project-summary']) {
    await writeFile(join(temporary, `${name}.mjs`), compile(await readFile(new URL(`../app/lib/${name}.ts`, import.meta.url), 'utf8')))
  }
  for (const name of ['project-reference-ui', 'summary-communication']) {
    await writeFile(join(temporary, `${name}.mjs`), compile(await readFile(new URL(`../app/components/${name}.tsx`, import.meta.url), 'utf8')))
  }
  const { loadSummaryMeetings, loadSummaryAgreements, loadSummaryAlerts, upcomingMeetings, agreementDate } = await import(pathToFileURL(join(temporary, 'project-summary.mjs')))
  const { SummaryCommunicationContent } = await import(pathToFileURL(join(temporary, 'summary-communication.mjs')))

  // Unit/render fixtures only. They are never served by SIA or used as authentication.
  const now = '2026-10-05T16:00:00Z'
  const common = { created_at: now, created_by: 'u1', revision: 1, revoked_at: null }
  const meeting = { ...common, id: 'm1', cycle_id: 'c1', title: 'Prueba con usuarios', participants: ['Equipo de prueba'], scheduled_at: '2026-10-06T15:00:00Z', reference_url: null }
  const agreement = { ...common, id: 'a1', meeting_id: 'm1', description: 'Documentar los aprendizajes', responsible_id: 'u1', due_date: '2026-10-10', next_steps: 'Reunir los resultados de las entrevistas.' }
  const alert = { id: 'al1', created_at: now, entrepreneurship_id: 'e1', cycle_id: 'c1', recipient_id: 'u1', kind: 'mention', detail: 'Revisar el mensaje del equipo.', resolved_at: null }
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status })
  const requests = []
  const oldMeetings = Array.from({ length: 100 }, (_, index) => ({ ...meeting, id: `old-${index}`, scheduled_at: '2026-09-01T15:00:00Z' }))
  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    requests.push(url)
    return reply(Number(url.searchParams.get('offset')) === 100 ? [meeting] : oldMeetings)
  }
  const meetings = await loadSummaryMeetings('c1')
  assert(meetings.ok)
  assert.equal(meetings.data.length, 101)
  assert.equal(requests.length, 2)
  assert(requests.every((url) => url.searchParams.get('limit') === '100'))
  assert.deepEqual(upcomingMeetings(meetings.data, Date.parse(now)).map((item) => item.id), ['m1'])
  const equalNow = { ...meeting, id: 'equal', scheduled_at: now }
  const offsetEarlier = { ...meeting, id: 'earlier', scheduled_at: '2026-10-06T10:00:00-04:00' }
  assert.deepEqual(upcomingMeetings([meeting, offsetEarlier, equalNow, { ...meeting, id: 'revoked', revoked_at: now }], Date.parse(now)).map((item) => item.id), ['equal', 'earlier', 'm1'])
  console.log('✓ Meetings read every page, exclude revoked/past records and sort timestamps across time zones')

  globalThis.fetch = async () => reply([{ ...meeting, cycle_id: 'c2' }])
  assert.equal((await loadSummaryMeetings('c1')).ok, false)
  globalThis.fetch = async () => reply([{ ...meeting, scheduled_at: 'invalid' }])
  assert.equal((await loadSummaryMeetings('c1')).ok, false)
  for (const status of [401, 403, 404, 500]) {
    globalThis.fetch = async () => reply({ detail: `Error ${status}` }, status)
    const result = await loadSummaryMeetings('c1')
    assert.equal(result.ok, false)
    assert.equal(result.status, status)
  }
  globalThis.fetch = async () => reply([{}])
  assert.equal((await loadSummaryMeetings('c1')).ok, false)
  globalThis.fetch = async () => reply(oldMeetings)
  assert.match((await loadSummaryMeetings('c1')).message, /lista cambió/)
  console.log('✓ Scope mismatches, invalid payloads, repeated pages and authorization failures never become empty data')

  const historical = Array.from({ length: 100 }, (_, index) => ({ ...alert, id: `other-${index}`, entrepreneurship_id: 'e2' }))
  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    return reply(Number(url.searchParams.get('offset')) === 100 ? [
      alert, { ...alert, id: 'shared', cycle_id: null }, { ...alert, id: 'sibling', cycle_id: 'c2' },
      { ...alert, id: 'resolved', resolved_at: now }, { ...alert, id: 'new', created_at: '2026-10-06T16:00:00Z' },
    ] : historical)
  }
  const alerts = await loadSummaryAlerts('e1', 'c1', 'u1')
  assert(alerts.ok)
  assert.deepEqual(alerts.data.map((item) => item.id), ['new', 'al1', 'shared'])
  globalThis.fetch = async () => reply([{ ...alert, recipient_id: 'another-person' }])
  assert.equal((await loadSummaryAlerts('e1', 'c1', 'u1')).ok, false)
  console.log('✓ Personal alerts include the current cycle and shared project scope, excluding siblings/resolved/other-user records')

  let inFlight = 0
  let peak = 0
  const agreementRequests = []
  globalThis.fetch = async (input) => {
    const url = new URL(input, 'http://localhost')
    agreementRequests.push(url)
    inFlight++
    peak = Math.max(peak, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 2))
    inFlight--
    const meetingId = url.pathname.split('/').at(-2)
    return reply([{ ...agreement, id: `a-${meetingId}`, meeting_id: meetingId }])
  }
  const active = Array.from({ length: 9 }, (_, index) => ({ ...meeting, id: `m${index}` }))
  const agreements = await loadSummaryAgreements('c1', [...active, { ...meeting, id: 'revoked', revoked_at: now }])
  assert(agreements.ok)
  assert.equal(agreements.data.length, 9)
  assert.equal(agreementRequests.length, 9)
  assert(peak <= 4 && peak > 1)
  assert(!agreementRequests.some((url) => url.pathname.includes('revoked')))
  const pages = Array.from({ length: 100 }, (_, index) => ({ ...agreement, id: `a${index}` }))
  globalThis.fetch = async (input) => reply(new URL(input, 'http://localhost').searchParams.get('offset') === '100' ? [{ ...agreement, id: 'last', due_date: '2026-10-01' }, { ...agreement, id: 'revoked', revoked_at: now }] : pages)
  const pagedAgreements = await loadSummaryAgreements('c1', [meeting])
  assert(pagedAgreements.ok)
  assert.equal(pagedAgreements.data.length, 101)
  assert.equal(pagedAgreements.data[0].agreement.id, 'last')
  globalThis.fetch = async () => reply([{ ...agreement, meeting_id: 'another-meeting' }])
  assert.equal((await loadSummaryAgreements('c1', [meeting])).ok, false)
  globalThis.fetch = async () => reply([{ ...agreement, due_date: '2026-02-31' }])
  assert.equal((await loadSummaryAgreements('c1', [meeting])).ok, false)
  globalThis.fetch = async () => reply({ detail: 'No autorizado' }, 403)
  const failed = await loadSummaryAgreements('c1', [meeting])
  assert.equal(failed.ok, false)
  assert.equal(failed.status, 403)
  assert.deepEqual(await loadSummaryAgreements('c1', []), { ok: true, data: [] })
  assert.equal((await loadSummaryAgreements('c1', [{ ...meeting, cycle_id: 'c2' }])).ok, false)
  console.log('✓ Agreements read all pages with bounded concurrency, preserve scope and do not invent completion states')

  let receivedSignal
  globalThis.fetch = async (_input, options) => { receivedSignal = options.signal; return reply([]) }
  const controller = new AbortController()
  await loadSummaryMeetings('c1', controller.signal)
  assert.equal(receivedSignal, controller.signal)
  controller.abort()
  globalThis.fetch = async () => { throw new Error('An aborted request must not run') }
  assert.equal((await loadSummaryMeetings('c1', controller.signal)).ok, false)
  assert.equal((await loadSummaryAgreements('c1', [meeting], controller.signal)).ok, false)
  assert(agreementDate('2026-10-10').includes('10 oct'))
  console.log('✓ Requests carry cancellation signals and date-only commitments keep their calendar day')

  const ready = (data) => ({ status: 'ready', data })
  const props = { meetings: ready([meeting]), agreements: ready([{ meeting, agreement }]), alerts: ready([alert]), navigate: () => {}, onRetry: () => {} }
  const render = (changes = {}) => renderToStaticMarkup(createElement(SummaryCommunicationContent, { ...props, ...changes }))
  const markup = render()
  for (const text of [meeting.title, agreement.description, agreement.next_steps, alert.detail, 'Próximas reuniones', 'Acuerdos registrados', 'Mis alertas del proyecto', 'no se clasifican como pendientes ni completados']) assert(markup.includes(text))
  const noData = render({ meetings: ready([]), agreements: ready([]), alerts: ready([]) })
  assert(noData.includes('No hay reuniones próximas'))
  assert(noData.includes('No hay acuerdos vigentes'))
  assert(noData.includes('No hay alertas sin resolver'))
  const partial = render({ agreements: { status: 'error', message: 'No autorizado', httpStatus: 403 }, alerts: { status: 'loading' } })
  assert(partial.includes(meeting.title))
  assert(partial.includes('HTTP 403'))
  assert(partial.includes('role="alert"'))
  assert(partial.includes('role="status"'))
  assert(!partial.includes('No hay acuerdos'))
  const capped = render({ meetings: ready(Array.from({ length: 8 }, (_, index) => ({ ...meeting, id: `m${index}`, title: `Meeting ${index}` }))) })
  assert(capped.includes('5 de 8'))
  assert(!capped.includes('Meeting 5'))
  const navigation = []
  const tree = SummaryCommunicationContent({ ...props, navigate: (section) => navigation.push(section) })
  for (const panel of tree.props.children.slice(0, 3)) panel.props.action.props.onClick()
  assert.deepEqual(navigation, ['Reuniones', 'Reuniones', 'Alertas'])
  console.log('✓ Summary cards render real fields, independent failures, loading/empty states and explicit display limits')

  if (process.env.SIA_SUMMARY_PREVIEW) {
    const css = await readFile(new URL('../app/components/summary-communication.module.css', import.meta.url), 'utf8')
    const canonical = await readFile(new URL('../../../visual/prototype/src/catalitec.css', import.meta.url), 'utf8')
    await writeFile(process.env.SIA_SUMMARY_PREVIEW, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prueba aislada del resumen</title><style>${canonical}body{padding:16px}main{max-width:1100px;margin:auto}${css}</style><body><main><p>Fixture visual aislada — no representa una sesión autenticada.</p>${render({ meetings: ready([{ ...meeting, title: 'Revisión de las entrevistas realizadas y de los aprendizajes obtenidos con usuarios del prototipo' }]), agreements: ready([{ meeting, agreement: { ...agreement, description: 'Reunir todos los hallazgos y referencias que respaldan el aprendizaje del prototipo', next_steps: 'Referencias: https://example.com/' + 'resultado'.repeat(100) } }]) })}</main></body></html>`)
  }
} finally {
  globalThis.fetch = originalFetch
  await rm(temporary, { recursive: true, force: true })
}
