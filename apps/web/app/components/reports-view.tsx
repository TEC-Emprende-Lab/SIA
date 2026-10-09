'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { parseReport, parseReports, reportRequest, reportSubmission, requestReportPdf, type Report } from '../lib/reports'
import { ReportSources } from './report-sources'
import { ReportForm } from './report-form'
import styles from './reports.module.css'

function ReportPdfButton({ cycleId, reportId }: { cycleId: string; reportId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function prepare() {
    setPending(true)
    setError('')
    try {
      setUrl((await requestReportPdf(cycleId, reportId)).url)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo preparar el PDF.')
    } finally {
      setPending(false)
    }
  }
  if (url) return <a className="btn secondary" href={url} target="_blank" rel="noopener noreferrer">Abrir PDF</a>
  return <>
    <button type="button" className="btn secondary" onClick={() => void prepare()} disabled={pending}>{pending ? 'Preparando enlace…' : 'Preparar enlace privado'}</button>
    {error ? <p role="alert">{error}</p> : <p className="small muted">El enlace se pide al abrirlo y caduca. No se muestra el archivo aquí.</p>}
  </>
}

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
    setBusy(true)
    setError('')
    try {
      const submission = reportSubmission(form, report)
      const result = await reportRequest(`${base}${submission.path}`, parseReport, submission)
      setReports((items) => [...items.filter((item) => item.id !== result.id), result].sort((a, b) =>
        a.period_start.localeCompare(b.period_start) || a.version - b.version || a.id.localeCompare(b.id)))
      setCreating(false)
      setDetail(result.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el informe.')
    } finally {
      setBusy(false)
    }
  }
  return <>
    <ProjectHeading eyebrow="El camino, documentado" title="Informes" description="El avance del proyecto, sus aprendizajes y evidencias, en una fotografía del período." action={manage && <button className="btn primary" disabled={loading || busy} onClick={() => { setError(''); setCreating(true) }}><Plus size={17} />Preparar informe</button>} />
    {error && !creating && !current && <div className="notice error" role="alert"><p>{error}</p><button className="btn secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
    {loading ? <p className="loading" role="status">Cargando informes…</p> : <div className="report-list">{reports.map((report) => <button className="report-row" key={report.id} onClick={() => setDetail(report.id)}><FileText size={24} /><div><strong>Informe {report.kind} · versión {report.version}</strong><p>{report.period_start} – {report.period_end}</p></div><span className={`badge ${report.status === 'aprobado' ? 'olive' : 'neutral'}`}>{report.status === 'aprobado' ? 'Aprobado' : 'Borrador'}</span><ChevronRight size={16} /></button>)}</div>}
    {!loading && !error && reports.length === 0 && <div className="empty"><h3>Una historia por documentar</h3><p>Aún no hay informes para este proyecto.</p></div>}
    <Dialog open={creating} onOpenChange={(open) => { if (!busy) { setCreating(open); setError('') } }}><DialogContent><DialogHeader><DialogTitle>Preparar informe</DialogTitle><DialogDescription>Se reunirán las fuentes del período y el informe se guardará como borrador.</DialogDescription></DialogHeader><ReportForm busy={busy} error={error} onSubmit={(event) => void save(event)} onCancel={() => { setCreating(false); setError('') }} /></DialogContent></Dialog>
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!open && !busy) { setDetail(''); setError('') } }}><DialogContent><DialogHeader><DialogTitle>Informe {current?.kind} · versión {current?.version}</DialogTitle><DialogDescription>{current?.period_start} – {current?.period_end} · {current?.status}</DialogDescription></DialogHeader>{current && <>
      <p className={styles.narrative}>{current.narrative || 'Pendiente de completar'}</p>
      <ReportSources composition={current.composition} />
      {manage && <ReportForm key={`${current.id}/${current.revision}`} report={current} busy={busy} error={error} onSubmit={(event) => void save(event, current)} />}
      <p className="small muted">Las versiones aprobadas son inmutables. El PDF se genera después de aprobar.</p>
      {current.status === 'aprobado' && current.pdf_generated_at ? <ReportPdfButton cycleId={cycleId} reportId={current.id} /> : current.status === 'aprobado' ? <p className="small muted">El PDF todavía no está listo.</p> : null}
    </>}</DialogContent></Dialog>
  </>
}
