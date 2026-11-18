import { useState, type FormEvent } from 'react'
import type { Report, ReportAction } from '../lib/reports'

export function ReportForm({ report, busy, blocked = false, error, onSubmit, onCancel }: {
  report?: Report
  busy: boolean
  blocked?: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel?: () => void
}) {
  let initialAction: ReportAction = 'edit'
  if (report?.status === 'aprobado') initialAction = 'correct'
  const [action, setAction] = useState<ReportAction>(initialAction)
  const [start, setStart] = useState('')
  const labels: Record<ReportAction, string> = {
    edit: 'Guardar borrador', approve: 'Aprobar informe', correct: 'Crear corrección',
  }
  const approving = action === 'approve'
  let label = 'Guardar borrador'
  if (report) label = labels[action]
  if (approving) label = 'Continuar a la aprobación'
  if (busy) label = 'Guardando…'
  let narrativeLabel = 'Redacción del borrador'
  if (report) narrativeLabel = 'Redacción'
  let narrativeHelp = 'Puedes completar la redacción más adelante.'
  if (approving) narrativeHelp = 'Si editaste la redacción, guarda primero el borrador antes de aprobar.'
  function submit(event: FormEvent<HTMLFormElement>) {
    if (blocked || busy) {
      event.preventDefault()
      return
    }
    onSubmit(event)
  }
  return <form onSubmit={submit} aria-busy={busy}>
    {report && <label className="field">Acción
      <select name="action" value={action} onChange={(event) => setAction(event.target.value as ReportAction)} disabled={busy}>
        {report.status === 'aprobado' && <option value="correct">Crear corrección vinculada</option>}
        {report.status !== 'aprobado' && <><option value="edit">Guardar borrador</option><option value="approve">Aprobar después de revisión humana</option></>}
      </select>
    </label>}
    {!report && <div className="form-grid">
      <label className="field">Inicio del período<input name="start" type="date" value={start} onChange={(event) => setStart(event.target.value)} required disabled={busy} /></label>
      <label className="field">Fin del período<input name="end" type="date" min={start || undefined} required disabled={busy} /><small>Debe ser igual o posterior al inicio.</small></label>
    </div>}
    {report?.status === 'aprobado' && <p className="notice">Se creará un nuevo borrador vinculado. Esta versión aprobada se conserva sin cambios.</p>}
    <label className="field">{narrativeLabel}
      <textarea name="narrative" defaultValue={report?.narrative ?? ''} readOnly={busy || approving} />
      <small>{narrativeHelp}</small>
    </label>
    {report && <label className="field">Observación de la decisión
      <textarea name="observation" required disabled={busy} onChange={(event) => {
        if (event.target.value.trim()) event.target.setCustomValidity('')
        else event.target.setCustomValidity('Escribe una observación; no puede contener solo espacios.')
      }} />
    </label>}
    {report && approving && <label className="check-row">
      <input name="reviewed" type="checkbox" required disabled={busy} />
      Confirmo que revisé el contenido y sus fuentes.
    </label>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="modal-actions">
      {onCancel && <button className="btn secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
      <button type="submit" className="btn primary" aria-disabled={busy || blocked}>{label}</button>
    </div>
  </form>
}
