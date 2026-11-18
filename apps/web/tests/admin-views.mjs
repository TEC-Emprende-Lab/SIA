import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createElement, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const styles = new Proxy({}, { get: (_, key) => String(key) })
const Empty = () => null
const records = new Map()
let role = 'Coordinadora'
let list = { status: 'ready', data: [] }
let mode = 'none'
let inboxAlerts = list
let inboxNotifications = list
const usedRoutes = []

function stubPagedList(page) {
  const path = page?.(50, 0)
  usedRoutes.push(path)
  let state = list
  if (path?.includes('/alerts')) state = inboxAlerts
  if (path?.includes('/notifications')) state = inboxNotifications
  return { state, reload() {} }
}

function load(path, overrides = {}) {
  const source = readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023, esModuleInterop: false },
  })
  const exports = {}
  function resolve(name) {
    if (name in overrides) return overrides[name]
    if (name.endsWith('.module.css')) return { default: styles }
    if (name === 'next/link') return { default: (props) => createElement('a', props) }
    if (name === '../lib/use-paged-list') return { usePagedList: stubPagedList }
    if (records.has(name)) return records.get(name)
    return require(name)
  }
  new Function('require', 'exports', outputText)(resolve, exports)
  return exports
}

records.set('../lib/expediente', load('lib/expediente.ts'))
records.set('../lib/administracion', load('lib/administracion.ts'))
records.set('../lib/comunicacion', load('lib/comunicacion.ts', { './expediente': records.get('../lib/expediente') }))
records.set('./ui/loading-state', load('components/ui/loading-state.tsx'))
records.set('./authenticated-shell', {
  useMe: () => ({ role }),
  StatusPanel: ({ title, description }) => createElement('p', {}, `${title}: ${description}`),
})
records.set('./load-more', { LoadMore: Empty })
records.set('./ui/confirm-action', { ConfirmAction: Empty })

const { BandejaView } = load('components/bandeja-views.tsx')
const render = (View, props) => renderToStaticMarkup(createElement(View, props))
const date = '2026-11-18T15:00:00Z'
const notifications = { status: 'ready', data: [{ id: 'n1', alert_id: 'a1', created_at: date, read_at: null }] }

inboxAlerts = { status: 'loading' }
inboxNotifications = { status: 'loading' }
assert.match(render(BandejaView), /Cargando bandeja/)
assert.doesNotMatch(render(BandejaView), /No hay alertas/)
inboxAlerts = { status: 'forbidden', message: 'Sin acceso' }
inboxNotifications = notifications
const partial = render(BandejaView)
assert.match(partial, /Puedes consultar las notificaciones/)
assert.match(partial, /Marcar como leída/)
assert.doesNotMatch(partial, /Reintentar detalles|No hay alertas/)
inboxAlerts = { status: 'ready', data: [] }
inboxNotifications = { status: 'ready', data: [] }
assert.match(render(BandejaView), /No hay alertas ni notificaciones/)
assert.match(render(BandejaView), /Cuando te mencionen en un canal/)
assert(usedRoutes.some((url) => url.includes('/notifications')))
assert(usedRoutes.some((url) => url.includes('/alerts')))

// Drive the same row action through its pending, failure and server-confirmed states.
const slots = []
let cursor = 0
let markRead
let readRequests = 0
const react = require('react')
const jsxRuntime = require('react/jsx-runtime')
const { BandejaView: ReadFixture } = load('components/bandeja-views.tsx', {
  '../lib/comunicacion': {
    ...records.get('../lib/comunicacion'),
    requestComunicacion(url, parse, options) {
      assert.equal(url, '/api/sia/bandeja/notifications/n1/read')
      assert.equal(options.method, 'PUT')
      readRequests++
      return new Promise((resolve) => { markRead = resolve })
    },
  },
  react: {
    ...react,
    useRef(initial) {
      const index = cursor++
      slots[index] ??= { current: initial }
      return slots[index]
    },
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) {
        if (typeof initial === 'function') slots[index] = initial()
        else slots[index] = initial
      }
      return [slots[index], (next) => {
        if (typeof next === 'function') slots[index] = next(slots[index])
        else slots[index] = next
      }]
    },
  },
  'react/jsx-runtime': {
    ...jsxRuntime,
    jsx(type, props, key) {
      if (type === 'button' && /Marcar como leída|Reintentar marcar/.test(props.children)) action = props.onClick
      return jsxRuntime.jsx(type, props, key)
    },
  },
})
let action
function renderRead() {
  cursor = 0
  return render(ReadFixture)
}
const notification = notifications.data[0]
inboxAlerts = { status: 'ready', data: [{ id: 'a1', kind: 'mention', detail: 'Revisa el seguimiento del emprendimiento.', entrepreneurship_id: 'e1' }] }
inboxNotifications = notifications
renderRead()
action()
action()
assert.equal(readRequests, 1)
assert.match(renderRead(), /Marcando como leída/)
markRead({ ok: false, status: 500, message: 'Conexión interrumpida' })
await Promise.resolve()
const readError = renderRead()
assert.match(readError, /No se pudo marcar como leída. Conexión interrumpida/)
assert.match(readError, /Reintentar marcar como leída/)
action()
markRead({ ok: true, data: { ...notification, read_at: date } })
await Promise.resolve()
const readSuccess = renderRead()
assert.match(readSuccess, /Notificación marcada como leída/)
assert.match(readSuccess, /Leída/)
assert.doesNotMatch(readSuccess, /Marcar como leída|Conexión interrumpida/)

// Section snapshots drive the real components with fixed local state rather than an authenticated service.
const stateFor = (initial) => {
  if (typeof initial === 'object' && initial?.status === 'loading') {
    if (mode === 'empty') return useState({ status: 'ready', items: [], complete: true })
    if (mode === 'error') return useState({ status: 'error', message: 'Conexión interrumpida' })
  }
  return useState(initial)
}
const { InvitacionesView, UsuariosView, AssignmentPanel } = load('components/administracion-views.tsx', {
  react: { ...require('react'), useState: stateFor },
})
assert.match(render(InvitacionesView), /Registrar invitación/)
assert.match(render(InvitacionesView), /Cargando invitaciones/)
mode = 'error'
const invitationError = render(InvitacionesView)
assert.match(invitationError, /No se pudo cargar el registro de invitaciones/)
assert.match(invitationError, /Registrar invitación/)
assert.doesNotMatch(invitationError, /Aún no hay invitaciones/)
mode = 'empty'
assert.match(render(InvitacionesView), /href="#[^"]+">Nueva invitación/)
assert.match(render(UsuariosView), /cuando acepten una invitación e inicien sesión/)
const scope = { kind: 'cycle', id: 'c1' }
assert.match(render(AssignmentPanel, { scope }), /href="\/invitaciones"/)
role = 'Gestor'
assert.match(render(AssignmentPanel, { scope }), /consulta con Coordinación/)
assert.doesNotMatch(render(AssignmentPanel, { scope }), /href="\/invitaciones"/)
role = 'Emprendedor'
assert.equal(render(AssignmentPanel, { scope }), '')

const dialogStubs = {
  Dialog: ({ children }) => children,
  DialogTrigger: ({ children }) => createElement('button', {}, children),
  DialogContent: Empty, DialogHeader: Empty, DialogTitle: Empty, DialogDescription: Empty,
}
const { ExpedienteListView } = load('components/expediente-views.tsx', {
  'next/navigation': { useRouter: () => ({}) },
  './administracion-views': { AssignmentPanel },
  './canales-views': { ChannelsPanel: Empty },
  './comunicacion-views': { MeetingsPanel: Empty },
  './entrepreneurship-table': { EntrepreneurshipTable: Empty },
  './project-workspace-tabs': { CycleWorkspaceTabs: Empty, ProjectWorkspaceTabs: Empty },
  './seguimiento-views': { SeguimientoPanel: Empty },
  './ui/dialog': dialogStubs,
})
assert.doesNotMatch(render(ExpedienteListView), /Nuevo emprendimiento/)
role = 'Gestor'
const pendingExpediente = render(ExpedienteListView)
assert.match(pendingExpediente, /Nuevo emprendimiento/)
assert.match(pendingExpediente, /Cargando emprendimientos/)
assert.doesNotMatch(pendingExpediente, /No hay emprendimientos/)

console.log('✓ Bandeja, administración y expediente distinguen carga, error, acceso y ausencia de registros')
console.log('✓ Marcar como leída muestra el error en la fila y actualiza solo tras la respuesta de la API')
