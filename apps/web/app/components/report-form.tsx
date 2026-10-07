import { useState, type FormEvent } from 'react'
import type { Report, ReportAction } from '../lib/reports'

export function ReportForm({ report, busy, error, onSubmit, onCancel }: {
  report?: Report
  busy: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel?: () => void
}) {
  const [action, setAction] = useState<ReportAction>(report?.status === 'aprobado' ? 'correct' : 'edit')
  const [start, setStart] = useState('')
  const labels: Record<ReportAction, string> = {
    edit: 'Guardar borrador', approve: 'Aprobar informe', correct: 'Crear corrección',
  }
  return <form onSubmit={onSubmit} aria-busy={busy}>
    {report ? <label className="field">Acción
      <select name="action" value={action} onChange={(event) => setAction(event.target.value as ReportAction)} disabled={busy}>
        {report.status === 'aprobado'
          ? <option value="correct">Crear corrección vinculada</option>
          : <><option value="edit">Guardar borrador</option><option value="approve">Aprobar después de revisión humana</option></>}
      </select>
    </label> : <div className="form-grid">
      <label className="field">Inicio del período<input name="start" type="date" value={start} onChange={(event) => setStart(event.target.value)} required disabled={busy} /></label>
      <label className="field">Fin del período<input name="end" type="date" min={start || undefined} required disabled={busy} /><small>Debe ser igual o posterior al inicio.</small></label>
    </div>}
    {report?.status === 'aprobado' && <p className="notice">Se creará un nuevo borrador vinculado. Esta versión aprobada se conserva sin cambios.</p>}
    <label className="field">{report ? 'Redacción' : 'Redacción del borrador'}
      <textarea name="narrative" defaultValue={report?.narrative ?? ''} disabled={busy} />
      <small>{action === 'approve' ? 'Si editas la redacción, guarda primero el borrador antes de aprobar.' : 'Puedes completar la redacción más adelante.'}</small>
    </label>
    {report && <label className="field">Observación de la decisión
      <textarea name="observation" required disabled={busy} onChange={(event) => {
        event.target.setCustomValidity(event.target.value.trim() ? '' : 'Escribe una observación; no puede contener solo espacios.')
      }} />
    </label>}
    {report && action === 'approve' && <label className="check-row">
      <input name="reviewed" type="checkbox" required disabled={busy} />
      Confirmo que revisé el contenido y sus fuentes.
    </label>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="modal-actions">
      {onCancel && <button className="btn secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>}
      <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : report ? labels[action] : 'Guardar borrador'}</button>
    </div>
  </form>
}
