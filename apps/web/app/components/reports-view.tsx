'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { parseReport, parseReports, reportRequest, type Report } from '../lib/reports'
import { ReportSources } from './report-sources'
import styles from './reports.module.css'

export function ReportsView({ cycleId, focusId }: { cycleId: string; focusId?: string }) {
  const me = useMe()
  const manage = me.role === 'Coordinadora' || me.role === 'Gestor'
  const base = `/api/sia/cycles/${cycleId}/reports`
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [detail, setDetail] = useState(focusId ?? '')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void (async () => {
      try {
        const items: Report[] = []
        for (let offset = 0; ; offset += 50) {
          const page = await reportRequest(`${base}?limit=50&offset=${offset}`, parseReports)
          items.push(...page)
          if (page.length < 50) break
        }
        if (active) setReports(items)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los informes.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [base, attempt])
  const current = reports.find((report) => report.id === detail)
  async function save(event: FormEvent<HTMLFormElement>, report?: Report) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (field: string) => String(form.get(field) ?? '')
    setBusy(true)
    setError('')
    try {
      const action = text('action')
      if (action === 'approve' && form.get('reviewed') !== 'on') throw new Error('Confirma la revisión humana antes de aprobar.')
      if (action === 'approve' && text('narrative') !== report?.narrative) throw new Error('Guarda primero los cambios del borrador antes de aprobarlo.')
      const result = report ? await reportRequest(`${base}/${report.id}${action === 'approve' ? '/approval' : action === 'correct' ? '/corrections' : ''}`, parseReport, {
        method: action === 'edit' ? 'PUT' : 'POST',
        body: action === 'approve' ? { expected_revision: report.revision, observation: text('observation'), human_reviewed: true }
          : action === 'correct' ? { observation: text('observation'), narrative: text('narrative') }
          : { expected_revision: report.revision, observation: text('observation'), narrative: text('narrative') },
      }) : await reportRequest(base, parseReport, { method: 'POST', body: { period_start: text('start'), period_end: text('end'), kind: 'mensual', narrative: text('narrative') } })
      setCreating(false)
      setDetail(result.id)
      setAttempt((value) => value + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el informe.')
    } finally {
      setBusy(false)
    }
  }
  return <>
    <ProjectHeading eyebrow="El camino, documentado" title="Informes" description="El avance del proyecto, sus aprendizajes y evidencias, en una fotografía del período." action={manage && <button className="btn primary" onClick={() => setCreating(true)}><Plus size={17} />Preparar informe</button>} />
    {error && !creating && !current && <div className="notice error" role="alert"><p>{error}</p><button className="btn secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
    {loading ? <p className="loading" role="status">Cargando informes…</p> : <div className="report-list">{reports.map((report) => <button className="report-row" key={report.id} onClick={() => setDetail(report.id)}><FileText size={24} /><div><strong>Informe {report.kind} · versión {report.version}</strong><p>{report.period_start} – {report.period_end}</p></div><span className={`badge ${report.status === 'aprobado' ? 'olive' : 'neutral'}`}>{report.status === 'aprobado' ? 'Aprobado' : 'Borrador'}</span><ChevronRight size={16} /></button>)}</div>}
    {!loading && !error && reports.length === 0 && <div className="empty"><h3>Una historia por documentar</h3><p>Aún no hay informes para este proyecto.</p></div>}
    <Dialog open={creating} onOpenChange={(open) => { if (!busy) setCreating(open) }}><DialogContent><DialogHeader><DialogTitle>Preparar informe</DialogTitle><DialogDescription>El backend reúne las fuentes del período. El informe comienza como borrador.</DialogDescription></DialogHeader><form onSubmit={(event) => void save(event)}><div className="form-grid"><label className="field">Inicio del período<input name="start" type="date" required disabled={busy} /></label><label className="field">Fin del período<input name="end" type="date" required disabled={busy} /></label></div><label className="field">Redacción del borrador<textarea name="narrative" disabled={busy} /></label>{error && <p role="alert">{error}</p>}<div className="modal-actions"><button className="btn secondary" type="button" disabled={busy} onClick={() => setCreating(false)}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar borrador'}</button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!open && !busy) setDetail('') }}><DialogContent><DialogHeader><DialogTitle>Informe {current?.kind} · versión {current?.version}</DialogTitle><DialogDescription>{current?.period_start} – {current?.period_end} · {current?.status}</DialogDescription></DialogHeader>{current && <>
      <p className={styles.narrative}>{current.narrative || 'Pendiente de completar'}</p>
      <ReportSources composition={current.composition} />
      {manage && <form key={`${current.id}/${current.revision}`} onSubmit={(event) => void save(event, current)}><label className="field">Acción<select name="action" disabled={busy}>{current.status === 'aprobado' ? <option value="correct">Crear corrección vinculada</option> : <><option value="edit">Guardar borrador</option><option value="approve">Aprobar después de revisión humana</option></>}</select></label><label className="field">Redacción<textarea name="narrative" defaultValue={current.narrative} disabled={busy} /></label><label className="field">Observación de la decisión<textarea name="observation" required disabled={busy} /></label><label className="check-row"><input name="reviewed" type="checkbox" disabled={busy} />Confirmo que revisé el contenido y sus fuentes (obligatorio para aprobar).</label>{error && <p role="alert">{error}</p>}<div className="modal-actions"><button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar'}</button></div></form>}
      <p className="small muted">Las versiones aprobadas son inmutables. La descarga privada del PDF todavía requiere completar su integración.</p>
    </>}</DialogContent></Dialog>
  </>
}
