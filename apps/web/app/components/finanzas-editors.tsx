'use client'

import { useId, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { uploadPrivateDocument, requestDocumentAccess } from '../lib/documents'
import { financeRequest, extractInvoice, money, type Purchase, type FinanceEvent, type Definitions, type Summary, type Kind, type Attachment } from '../lib/finanzas'
import { FinanceError, FinanceField, FinanceLoading, FinanceNotice, FinancePages, FinanceStatus, financeEventLabel, financeFailure, localDateInput, useFinanceData } from './finanzas-ui'
import styles from './finanzas.module.css'

const DOCUMENT_LABEL: Record<Kind, string> = {
  factura: 'Número de factura / orden de compra', reintegro: 'Número de recibo / factura',
  uso_tc: 'Número de comprobante', comision_bancaria: 'Referencia del movimiento', pago_contrato: 'Número de contrato / documento',
}

export function PurchaseForm({ cycle, definitions, summary, purchase, close, saved }: { cycle: string; definitions: Definitions; summary: Summary; purchase?: Purchase; close: () => void; saved: (p: Purchase) => void }) {
  const formId = useId()
  const [initial] = useState(() => ({ item_id: purchase?.item_id ?? summary.items[0]?.id ?? '', kind: purchase?.kind ?? 'factura' as Kind, amount: String(purchase?.amount ?? ''), supplier: purchase?.supplier ?? '', invoice_number: purchase?.invoice_number ?? '', description: purchase?.description ?? '', submission_date: purchase?.submission_date ?? '' }))
  const [fields, setFields] = useState(initial)
  const [checks, setChecks] = useState<Record<string, boolean>>(purchase?.checklist ?? {})
  const [observation, setObservation] = useState('')
  const [step, setStep] = useState(0)
  const [requestKey] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [discard, setDiscard] = useState(false)
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial) || JSON.stringify(checks) !== JSON.stringify(purchase?.checklist ?? {}) || !!observation
  const activeKeys = Object.keys(definitions.checklists[fields.kind])
  const checked = activeKeys.filter(key => checks[key]).length
  const unavailable = busy || extracting

  function requestClose() {
    if (unavailable) return
    if (dirty) setDiscard(true)
    else close()
  }
  async function parse(file?: File) {
    if (!file) return
    setExtracting(true); setError('')
    try {
      const result = await extractInvoice(cycle, file)
      setFields(f => ({ ...f, invoice_number: result.invoice_number || f.invoice_number, supplier: result.supplier || f.supplier, amount: result.amount ?? f.amount, submission_date: result.submission_date || f.submission_date, description: result.description || f.description }))
      setHint(`${result.warning} El archivo se adjunta después de guardar el borrador.`)
    } catch (reason) { setError(financeFailure(reason)) } finally { setExtracting(false) }
  }
  function next() {
    const form = document.getElementById(formId) as HTMLFormElement | null
    if (form?.reportValidity()) { setStep(1); setError('') }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!fields.supplier.trim() || !fields.description.trim() || Number(fields.amount) <= 0) {
      setError('Completa el proveedor, el monto y la justificación antes de guardar.'); setStep(0); return
    }
    setBusy(true); setError('')
    try {
      saved(await financeRequest<Purchase>(cycle, purchase ? `purchases/${purchase.id}` : 'purchases', purchase ? 'PUT' : 'POST', {
        ...fields, submission_date: fields.submission_date || null,
        checklist: Object.fromEntries(activeKeys.map(key => [key, checks[key] ?? false])),
        ...(purchase ? { expected_revision: purchase.revision, observation } : { request_key: requestKey }),
      }))
    } catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }

  return <Dialog open onOpenChange={open => { if (!open) requestClose() }}>
    <DialogContent className={styles.dialog} onPointerDownOutside={event => event.preventDefault()}>
      <DialogHeader className={styles.dialogHeader}>
        <DialogTitle>{purchase ? 'Editar trámite' : 'Nuevo trámite'}</DialogTitle>
        <DialogDescription>Guarda un borrador y adjunta los respaldos antes de enviarlo a revisión.</DialogDescription>
      </DialogHeader>
      <div className={styles.dialogBody}>
        <ol className={styles.steps} aria-label="Pasos del formulario"><li aria-current={step === 0 ? 'step' : undefined}><span>1</span>Información</li><li aria-current={step === 1 ? 'step' : undefined}><span>2</span>Checklist y revisión</li></ol>
        <form id={formId} className={styles.form} onSubmit={submit} aria-busy={unavailable}>
          {step === 0 ? <>
            <div className={styles.upload}>
              <FinanceField label="Prellenar desde una factura" hint="Opcional · XML o PDF de hasta 6 MB. Revisa los datos extraídos; no se adjunta ni aprueba automáticamente.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="file" accept=".xml,.pdf" disabled={unavailable} onChange={event => void parse(event.target.files?.[0])} />}</FinanceField>
              {extracting && <p role="status">Leyendo el archivo… Puedes continuar cuando termine.</p>}
            </div>
            {hint && <FinanceNotice>{hint}</FinanceNotice>}
            <div className={styles.columns}>
              <FinanceField label="Tipo de trámite">{id => <select id={id} disabled={unavailable} value={fields.kind} onChange={event => { setFields({ ...fields, kind: event.target.value as Kind }); setChecks({}) }}>{Object.entries(definitions.types).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select>}</FinanceField>
              <FinanceField label="Partida presupuestaria">{id => <select id={id} disabled={unavailable} value={fields.item_id} onChange={event => setFields({ ...fields, item_id: event.target.value })}>{summary.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</FinanceField>
            </div>
            <FinanceField label="Proveedor / beneficiario *">{id => <input id={id} autoComplete="organization" required maxLength={200} disabled={unavailable} value={fields.supplier} onChange={event => setFields({ ...fields, supplier: event.target.value })} />}</FinanceField>
            <div className={styles.columns}>
              <FinanceField label={DOCUMENT_LABEL[fields.kind]} hint="Puedes completarlo más adelante si aún no existe.">{(id, hintId) => <input id={id} aria-describedby={hintId} maxLength={100} disabled={unavailable} value={fields.invoice_number} onChange={event => setFields({ ...fields, invoice_number: event.target.value })} />}</FinanceField>
              <FinanceField label="Monto en colones *" hint="CRC · Sin conversión automática de moneda.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="number" inputMode="decimal" required min="0.01" step="0.01" max="999999999999.99" disabled={unavailable} value={fields.amount} onChange={event => setFields({ ...fields, amount: event.target.value })} />}</FinanceField>
            </div>
            <FinanceField label="Detalle / justificación *" hint="Describe qué se compra o paga y para qué se necesita.">{(id, hintId) => <textarea id={id} aria-describedby={hintId} required maxLength={4000} disabled={unavailable} value={fields.description} onChange={event => setFields({ ...fields, description: event.target.value })} />}</FinanceField>
            <FinanceField label="Fecha de ingreso">{id => <input id={id} type="date" disabled={unavailable} value={fields.submission_date} onChange={event => setFields({ ...fields, submission_date: event.target.value })} />}</FinanceField>
          </> : <>
            <div className={styles.sectionHeading}><div><h3>{definitions.types[fields.kind]}</h3><p>{fields.supplier} · {money(fields.amount)}</p></div><button type="button" className="btn secondary" onClick={() => setStep(0)}>Editar información</button></div>
            <fieldset className={styles.checks} disabled={unavailable}><legend>Checklist v1 · {checked} de {activeKeys.length} completos</legend>{Object.entries(definitions.checklists[fields.kind]).map(([key, label]) => <label key={key}><input type="checkbox" checked={checks[key] ?? false} onChange={event => setChecks({ ...checks, [key]: event.target.checked })} />{label}</label>)}</fieldset>
            <FinanceNotice>Puedes guardar aunque falten verificaciones. La validación interna requiere el checklist completo y revisión humana.</FinanceNotice>
            {fields.kind === 'uso_tc' && <FinanceNotice tone="warning">No ingreses números completos de tarjeta, CVV ni credenciales bancarias. Usa únicamente respaldos sin esos datos sensibles.</FinanceNotice>}
          </>}
          {purchase && <FinanceField label="Motivo del cambio *">{id => <textarea id={id} required maxLength={4000} disabled={unavailable} value={observation} onChange={event => setObservation(event.target.value)} />}</FinanceField>}
          {error && <FinanceError message={error} />}
        </form>
      </div>
      <footer className={styles.dialogFooter}>
        {discard ? <><p>Hay cambios sin guardar. ¿Quieres descartarlos?</p><div className={styles.actions}><button className="btn secondary" onClick={() => setDiscard(false)}>Seguir editando</button><button className={`btn secondary ${styles.danger}`} onClick={close}>Descartar cambios</button></div></> : <>
          <p>{unavailable ? 'Espera a que termine la operación.' : '* Campos obligatorios · Se guarda como borrador.'}</p>
          <div className={styles.actions}><button type="button" className="btn secondary" disabled={unavailable} onClick={requestClose}>Cancelar</button>{step === 1 && <button type="button" className="btn secondary" disabled={unavailable} onClick={() => setStep(0)}><ArrowLeft size={15} aria-hidden="true" />Atrás</button>}<button form={formId} type="submit" className={step === 1 ? 'btn primary' : 'btn secondary'} disabled={unavailable}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>{step === 0 && <button type="button" className="btn primary" disabled={unavailable} onClick={next}>Revisar checklist<ArrowRight size={15} aria-hidden="true" /></button>}</div>
        </>}
      </footer>
    </DialogContent>
  </Dialog>
}

type Action = { id: string; label: string; hint: string; sensitive?: boolean }
function availableActions(p: Purchase, role: string, editable: boolean): Action[] {
  const result: Action[] = []
  const manager = role === 'Gestor' || role === 'Coordinadora'
  if (editable) result.push({ id: 'submit', label: 'Enviar a revisión', hint: 'El Gestor o la Coordinadora revisará el trámite. Esto no confirma un pago.' })
  if (manager && p.status === 'submitted') result.push({ id: 'validate', label: 'Validar internamente', hint: 'Confirma la revisión del checklist. La ejecución se registra por separado.' }, { id: 'request_correction', label: 'Solicitar corrección', hint: 'Explica qué debe corregirse para que la persona solicitante pueda continuar.' })
  if (manager && p.status === 'validated') result.push({ id: 'register_fundatec', label: 'Registrar en FUNDATEC', hint: 'Registra el consecutivo del trámite ya ingresado en el sistema externo.' })
  if (role === 'Coordinadora' && (p.status === 'fundatec' || p.status === 'validated' && p.kind === 'comision_bancaria')) result.push({ id: 'execute', label: 'Confirmar ejecución', hint: 'Confirma un pago o movimiento ya verificado. El trámite pasará a ser inmutable.' })
  if (manager && ['submitted', 'validated'].includes(p.status)) result.push({ id: 'reject', label: 'Rechazar trámite', hint: 'El rechazo es definitivo. El registro y su historial se conservan.', sensitive: true })
  if (role === 'Coordinadora' && !['executed', 'cancelled', 'rejected'].includes(p.status)) result.push({ id: 'cancel', label: 'Anular trámite', hint: 'La anulación es definitiva y no elimina el registro histórico.', sensitive: true })
  return result
}

export function PurchaseDetail({ cycle, eid, purchase: p, definitions, role, userId, close, edit, updated }: { cycle: string; eid: string; purchase: Purchase; definitions: Definitions; role: string; userId: string; close: () => void; edit: () => void; updated: (p: Purchase) => void }) {
  const [eventOffset, setEventOffset] = useState(0)
  const history = useFinanceData<FinanceEvent[]>(cycle, `events?entity_id=${p.id}&offset=${eventOffset}`)
  const files = useFinanceData<Attachment[]>(cycle, `purchases/${p.id}/attachments`)
  const editable = ['draft', 'correction_requested'].includes(p.status) && (role !== 'Emprendedor' || p.created_by === userId)
  const actions = availableActions(p, role, editable)
  const [actionId, setActionId] = useState(actions[0]?.id ?? '')
  const [observation, setObservation] = useState('')
  const [fundatec, setFundatec] = useState('')
  const [executed, setExecuted] = useState('')
  const [human, setHuman] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const action = actions.find(a => a.id === actionId)
  const needsHuman = ['validate', 'execute'].includes(actionId)
  const checklistComplete = Object.values(p.checklist).every(Boolean)
  const canAct = !!observation.trim() && (!needsHuman || human) && (!action?.sensitive || confirmed) && (actionId !== 'register_fundatec' || !!fundatec.trim()) && (actionId !== 'execute' || !!executed) && (actionId !== 'validate' || checklistComplete)

  async function act(event: FormEvent) {
    event.preventDefault()
    if (!canAct || busy) return
    setBusy(true); setError('')
    try { updated(await financeRequest<Purchase>(cycle, `purchases/${p.id}/transitions`, 'POST', { action: actionId, expected_revision: p.revision, observation, human_reviewed: human, fundatec_number: fundatec, executed_on: executed || null })) }
    catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  async function attach(file?: File) {
    if (!file) return
    setBusy(true); setError('')
    try {
      const upload = await uploadPrivateDocument(eid, file)
      if (!upload.ok) throw new Error(upload.message)
      await financeRequest(cycle, `purchases/${p.id}/attachments`, 'POST', { document_id: upload.data.id, expected_revision: p.revision })
      updated(await financeRequest<Purchase>(cycle, `purchases/${p.id}`))
    } catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  async function openDocument(id: string) {
    setError('')
    const result = await requestDocumentAccess(eid, id)
    if (result.ok) window.open(result.data.url, '_blank', 'noopener,noreferrer')
    else setError(result.message)
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) close() }}><DialogContent className={styles.dialog} onPointerDownOutside={event => event.preventDefault()}>
    <DialogHeader className={styles.dialogHeader}><DialogTitle>{definitions.types[p.kind]}</DialogTitle><DialogDescription>{p.supplier}</DialogDescription></DialogHeader>
    <div className={styles.dialogBody}>
      <div className={styles.toolbar}><strong className={styles.detailTotal}>{money(p.amount)}</strong><FinanceStatus status={p.status} /></div>
      <dl className={styles.detailFacts}><div><dt>Documento</dt><dd>{p.invoice_number || 'Aún no registrado'}</dd></div><div><dt>Consecutivo FUNDATEC</dt><dd>{p.fundatec_number || 'Aún no registrado'}</dd></div><div><dt>Checklist v{p.checklist_version}</dt><dd>{Object.values(p.checklist).filter(Boolean).length} de {Object.keys(p.checklist).length} completos</dd></div><div><dt>Fecha de ejecución</dt><dd>{p.executed_on || 'Sin ejecución confirmada'}</dd></div></dl>
      <p className={styles.description}>{p.description}</p>
      {p.status === 'executed' && <FinanceNotice tone="success">Ejecución registrada. Este trámite es inmutable y conserva sus respaldos e historial.</FinanceNotice>}
      <section className={styles.detailSection}><h3>Respaldos privados</h3>
        {files.error ? <FinanceError message={files.error} retry={files.retry} /> : files.loading ? <FinanceLoading label="Consultando respaldos…" /> : files.data?.length ? files.data.map(a => <button key={a.id} className={styles.attachment} onClick={() => void openDocument(a.document_id)}><FileText size={18} aria-hidden="true" />{a.name}<ArrowRight size={15} aria-hidden="true" /></button>) : <p className={styles.hint}>Todavía no hay archivos adjuntos a este trámite.</p>}
        {editable && <div className={styles.upload}><FinanceField label="Adjuntar un respaldo" hint="El archivo será privado y quedará vinculado al trámite.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="file" disabled={busy} onChange={event => void attach(event.target.files?.[0])} />}</FinanceField></div>}
      </section>
      {action && <section className={styles.detailSection}><h3>Siguiente paso</h3><form className={styles.form} onSubmit={act} aria-busy={busy}>
        <FinanceField label="Acción a realizar">{id => <select id={id} value={actionId} disabled={busy} onChange={event => { setActionId(event.target.value); setHuman(false); setConfirmed(false); setError('') }}><optgroup label="Continuar el trámite">{actions.filter(a => !a.sensitive).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup><optgroup label="Acciones definitivas">{actions.filter(a => a.sensitive).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup></select>}</FinanceField>
        <FinanceNotice tone={action.sensitive ? 'warning' : 'info'}>{action.hint}</FinanceNotice>
        {actionId === 'validate' && !checklistComplete && <FinanceNotice tone="warning">El checklist está incompleto. Solicita una corrección para que la persona solicitante lo complete antes de validar.</FinanceNotice>}
        {actionId === 'register_fundatec' && <FinanceField label="Consecutivo FUNDATEC *">{id => <input id={id} required maxLength={100} disabled={busy} value={fundatec} onChange={event => setFundatec(event.target.value)} />}</FinanceField>}
        {actionId === 'execute' && <FinanceField label="Fecha de ejecución *" hint="La fecha del pago o movimiento que verificaste, no una fecha futura.">{(id, hintId) => <input id={id} aria-describedby={hintId} type="date" required max={localDateInput()} disabled={busy} value={executed} onChange={event => setExecuted(event.target.value)} />}</FinanceField>}
        <FinanceField label="Observación / motivo *">{id => <textarea id={id} required maxLength={4000} disabled={busy} value={observation} onChange={event => setObservation(event.target.value)} />}</FinanceField>
        {needsHuman && <label className={styles.checkbox}><input type="checkbox" disabled={busy} checked={human} onChange={event => setHuman(event.target.checked)} />Confirmo que revisé personalmente la información y los respaldos.</label>}
        {action.sensitive && <label className={styles.checkbox}><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Entiendo que esta decisión es definitiva y que el historial se conserva.</label>}
        <div><button className={action.sensitive ? `btn secondary ${styles.danger}` : 'btn primary'} disabled={busy || !canAct}>{busy ? 'Guardando decisión…' : action.label}<Check size={15} aria-hidden="true" /></button>{!canAct && <p className={styles.hint}>Completa los campos y las confirmaciones de esta acción para continuar.</p>}</div>
      </form></section>}
      {error && <FinanceError message={error} />}
      <section className={styles.detailSection}><h3>Historial verificable</h3>{history.error ? <FinanceError message={history.error} retry={history.retry} /> : history.loading ? <FinanceLoading label="Consultando historial…" /> : <><ol className={styles.history}>{history.data?.map(event => <li key={event.id}><strong>{financeEventLabel(event.action)}</strong><small>{new Date(event.created_at).toLocaleString('es-CR')} · {event.actor_id === userId ? 'Tú' : `Usuario ${event.actor_id}`}</small><p>{event.observation}</p></li>)}</ol><FinancePages offset={eventOffset} count={history.data?.length ?? 0} loading={history.loading} change={setEventOffset} /></>}
        <details className={styles.disclosure}><summary>Identificación para auditoría</summary><p>Trámite: {p.id}<br />Revisión vigente: {p.revision}</p></details>
      </section>
    </div>
    <footer className={styles.dialogFooter}><p>{busy ? 'Guardando los cambios…' : 'Los cambios se verifican en el servidor.'}</p><div className={styles.actions}><button className="btn secondary" disabled={busy} onClick={close}>Cerrar</button>{editable && <button className="btn primary" disabled={busy} onClick={edit}>Editar información y checklist</button>}</div></footer>
  </DialogContent></Dialog>
}

export function ItemForm({ cycle, close, saved }: { cycle: string; close: () => void; saved: () => void }) {
  const formId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try { await financeRequest(cycle, 'items', 'POST', Object.fromEntries(data)); saved() } catch (reason) { setError(financeFailure(reason)) } finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) close() }}><DialogContent className={styles.dialog} onPointerDownOutside={event => event.preventDefault()}><DialogHeader className={styles.dialogHeader}><DialogTitle>Registrar partida aprobada</DialogTitle><DialogDescription>Usa el nombre y monto del presupuesto que ya fue autorizado.</DialogDescription></DialogHeader><div className={styles.dialogBody}><form id={formId} className={styles.form} onSubmit={submit} aria-busy={busy}>
    <FinanceField label="Nombre de la partida *">{id => <input id={id} name="name" required maxLength={200} disabled={busy} />}</FinanceField>
    <FinanceField label="Monto aprobado en colones *">{id => <input id={id} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required disabled={busy} />}</FinanceField>
    <FinanceField label="Referencia de aprobación / justificación *">{id => <textarea id={id} name="observation" required maxLength={4000} disabled={busy} />}</FinanceField>
    {error && <FinanceError message={error} />}
  </form></div><footer className={styles.dialogFooter}><p>La creación queda registrada en auditoría.</p><div className={styles.actions}><button className="btn secondary" disabled={busy} onClick={close}>Cancelar</button><button form={formId} className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar partida'}</button></div></footer></DialogContent></Dialog>
}
