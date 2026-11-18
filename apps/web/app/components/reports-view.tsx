'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { ProjectHeading } from './project-reference-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { ConfirmAction } from './ui/confirm-action'
import { LoadingState, SkeletonBar } from './ui/loading-state'
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
  let label = 'Preparar enlace privado'
  if (pending) label = 'Preparando enlace…'
  if (error) label = 'Reintentar enlace privado'
  if (url) label = 'Renovar enlace privado'
  return <div className={styles.pdfAccess}>
    {url && <a className="btn secondary" href={url} target="_blank" rel="noopener noreferrer">Abrir PDF (pestaña nueva)</a>}
    <button type="button" className="btn secondary" onClick={() => void prepare()} disabled={pending}>{label}</button>
    {error && <p role="alert">{error}</p>}
    <p role="status" className="small muted">
      {url && 'Enlace privado preparado. Si caduca, puedes renovarlo.'}
      {!url && !error && 'El enlace privado caduca. El PDF se abre en otra pestaña.'}
    </p>
  </div>
}

function ReportsLoading() {
  return <LoadingState label="Cargando informes…">
    <div className="report-list">
      {[0, 1, 2].map((row) => <div className={`report-row ${styles.loadingRow}`} key={row}>
        <SkeletonBar size="short" />
        <div className={styles.loadingReportInfo}><SkeletonBar /><SkeletonBar size="text" /></div>
        <span className={styles.loadingReportStatus}><SkeletonBar size="text" /></span>
        <SkeletonBar size="short" />
      </div>)}
    </div>
  </LoadingState>
}

export function ReportsView({ cycleId, focusId }: { cycleId: string; focusId?: string }) {
  return <CycleReports key={`${cycleId}/${focusId ?? ''}`} cycleId={cycleId} focusId={focusId} />
}

const PAGE_SIZE = 50
type Submission = ReturnType<typeof reportSubmission>

function reportError(reason: unknown, fallback: string) {
  if (reason instanceof Error) return reason.message
  return fallback
}

function sortReports(reports: Report[]) {
  return reports.sort((a, b) => a.period_start.localeCompare(b.period_start) || a.version - b.version || a.id.localeCompare(b.id))
}

function CycleReports({ cycleId, focusId }: { cycleId: string; focusId?: string }) {
  const me = useMe()
  const manage = me.role === 'Coordinadora' || me.role === 'Gestor'
  const base = `/api/sia/cycles/${cycleId}/reports`
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [moreError, setMoreError] = useState('')
  const [morePending, setMorePending] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [detail, setDetail] = useState(focusId ?? '')
  const [directReport, setDirectReport] = useState<Report | null>(null)
  const [directPending, setDirectPending] = useState(Boolean(focusId))
  const [directError, setDirectError] = useState('')
  const [directAttempt, setDirectAttempt] = useState(0)
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [approvalError, setApprovalError] = useState('')
  const [approval, setApproval] = useState<{ submission: Submission; report: Report } | null>(null)
  const writeLock = useRef(false)
  const pageLock = useRef(false)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const approvalTrigger = useRef<HTMLElement | null>(null)
  const epoch = useRef(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    setListError('')
    void reportRequest(`${base}?limit=${PAGE_SIZE}&offset=0`, parseReports).then((page) => {
      if (!active) return
      setReports(page)
      setOffset(page.length)
      setHasMore(page.length === PAGE_SIZE)
    }).catch((reason) => {
      if (active) setListError(reportError(reason, 'No se pudieron consultar los informes.'))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [base, attempt])
  const focusIsListed = reports.some((report) => report.id === focusId)
  useEffect(() => {
    if (!focusId || loading || focusIsListed) return
    let active = true
    setDirectPending(true)
    setDirectError('')
    void reportRequest(`${base}/${encodeURIComponent(focusId)}`, parseReport).then((report) => {
      if (active) setDirectReport(report)
    }).catch((reason) => {
      if (active) setDirectError(reportError(reason, 'No se pudo abrir el informe.'))
    }).finally(() => {
      if (active) setDirectPending(false)
    })
    return () => { active = false }
  }, [base, focusId, directAttempt, focusIsListed, loading])
  useEffect(() => () => { epoch.current += 1 }, [])

  const listedReport = reports.find((report) => report.id === detail)
  let current = listedReport
  if (directReport?.id === detail && (!listedReport || directReport.revision > listedReport.revision)) {
    current = directReport
  }
  const openingDirect = Boolean(detail && detail === focusId && !current)

  async function loadMore() {
    if (pageLock.current || writeLock.current || !hasMore || loading) return
    pageLock.current = true
    const requestEpoch = epoch.current
    setMorePending(true)
    setMoreError('')
    try {
      const page = await reportRequest(`${base}?limit=${PAGE_SIZE}&offset=${offset}`, parseReports)
      if (epoch.current !== requestEpoch) return
      const knownIds = new Set(reports.map((report) => report.id))
      if (page.length === PAGE_SIZE && page.every((report) => knownIds.has(report.id))) {
        setHasMore(false)
        setMoreError('La consulta devolvió una página repetida. Recarga la página para volver a consultar el historial.')
        return
      }
      setOffset(offset + page.length)
      setHasMore(page.length === PAGE_SIZE)
      setReports((items) => {
        const merged = new Map(items.map((item) => [item.id, item]))
        for (const item of page) {
          const previous = merged.get(item.id)
          if (!previous || item.revision >= previous.revision) merged.set(item.id, item)
        }
        return sortReports([...merged.values()])
      })
    } catch (reason) {
      if (epoch.current === requestEpoch) setMoreError(`No se pudieron cargar más informes. ${reportError(reason, '')}`)
    } finally {
      if (epoch.current === requestEpoch) {
        setMorePending(false)
        pageLock.current = false
      }
    }
  }

  async function save(submission: Submission, confirming = false) {
    if (writeLock.current || pageLock.current) return
    writeLock.current = true
    const requestEpoch = epoch.current
    setBusy(true)
    setFormError('')
    setApprovalError('')
    setNotice('')
    try {
      const result = await reportRequest(`${base}${submission.path}`, parseReport, submission)
      if (epoch.current !== requestEpoch) return
      setReports((items) => sortReports([...items.filter((item) => item.id !== result.id), result]))
      let feedback = 'Borrador guardado. Puedes seguir editándolo.'
      if (confirming) feedback = 'Informe aprobado. Esta versión no se puede editar y el PDF queda pendiente de generación.'
      if (submission.path.endsWith('/corrections')) feedback = 'Corrección guardada como borrador. La versión aprobada se conserva sin cambios.'
      setNotice(feedback)
      setApproval(null)
      setCreating(false)
      setDetail(result.id)
    } catch (reason) {
      if (epoch.current !== requestEpoch) return
      const message = reportError(reason, 'No se pudo guardar el informe.')
      if (confirming) setApprovalError(message)
      else setFormError(message)
    } finally {
      if (epoch.current === requestEpoch) {
        writeLock.current = false
        setBusy(false)
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>, report?: Report) {
    event.preventDefault()
    if (writeLock.current || pageLock.current || approval) return
    const form = new FormData(event.currentTarget)
    try {
      const submission = reportSubmission(form, report)
      if (report && form.get('action') === 'approve') {
        setFormError('')
        setApprovalError('')
        setApproval({ submission, report })
      } else {
        void save(submission)
      }
    } catch (reason) {
      setFormError(reportError(reason, 'Revisa los datos del informe.'))
    }
  }

  function openCreate() {
    setFormError('')
    setNotice('')
    setDetail('')
    setCreating(true)
  }
  const actionsBusy = loading || busy || morePending
  const empty = !loading && !listError && reports.length === 0
  let nextPageLabel = 'Cargar más informes'
  if (morePending) nextPageLabel = 'Cargando más informes…'
  else if (moreError) nextPageLabel = 'Reintentar carga de informes'
  let detailStatus = 'Borrador'
  if (current?.status === 'aprobado') detailStatus = 'Aprobado'
  return <>
    <ProjectHeading title="Informes" description="Consulta los avances, acuerdos y evidencias que respaldan cada período del ciclo." action={manage && !empty && <button type="button" className="btn primary" disabled={actionsBusy || Boolean(listError)} onClick={openCreate}><Plus size={17} />Preparar informe</button>} />
    {!current && <p role="status" className={styles.feedback}>{notice}</p>}
    {listError && <div className="notice error" role="alert"><p>{listError}</p><button type="button" className="btn secondary" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
    {openingDirect && directPending && <p role="status">Abriendo informe solicitado…</p>}
    {openingDirect && directError && <div className="notice error" role="alert">
      <p>{directError}</p>
      <button type="button" className="btn secondary" onClick={() => setDirectAttempt((value) => value + 1)}>Volver a abrir informe</button>
    </div>}
    {loading && <ReportsLoading />}
    {!loading && reports.length > 0 && <div className="report-list">{reports.map((report) => {
      let status = 'Borrador'
      let badge = 'neutral'
      if (report.status === 'aprobado') {
        status = 'Aprobado'
        badge = 'olive'
      }
      return <button type="button" className="report-row" key={report.id} disabled={morePending} onClick={() => {
        setFormError('')
        setNotice('')
        setDetail(report.id)
      }}><FileText size={24} aria-hidden="true" /><div><strong>Informe {report.kind}, versión {report.version}</strong><p>{report.period_start} – {report.period_end}</p></div><span className={`badge ${badge}`}>{status}</span><ChevronRight size={16} aria-hidden="true" /></button>
    })}</div>}
    {morePending && <div className={styles.moreLoading}><LoadingState label="Cargando más informes…"><SkeletonBar /></LoadingState></div>}
    {moreError && <p className="notice error" role="alert">{moreError} Puedes seguir consultando los informes ya cargados.</p>}
    {hasMore && <button type="button" className={`btn secondary ${styles.moreButton}`} aria-disabled={actionsBusy} onClick={() => void loadMore()}>{nextPageLabel}</button>}
    {empty && <div className="empty">
      <h3>Este ciclo todavía no tiene informes</h3>
      {manage && <><p>Elige un período para reunir sus fuentes en el primer borrador.</p><button type="button" className="btn primary" disabled={actionsBusy} onClick={openCreate}>Preparar informe</button></>}
      {!manage && <p>Cuando se registren informes de este ciclo, podrás consultarlos aquí.</p>}
    </div>}
    <Dialog open={creating} onOpenChange={(open) => { if (!busy) { setCreating(open); setFormError('') } }}><DialogContent><DialogHeader><DialogTitle>Preparar informe</DialogTitle><DialogDescription>Se reunirán las fuentes del período y el informe se guardará como borrador.</DialogDescription></DialogHeader><ReportForm busy={busy} error={formError} onSubmit={submit} onCancel={() => { setCreating(false); setFormError('') }} /></DialogContent></Dialog>
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!open && !busy && !approval) { setDetail(''); setFormError('') } }}><DialogContent><DialogHeader><DialogTitle><span ref={detailHeading} tabIndex={-1}>Informe {current?.kind}, versión {current?.version}</span></DialogTitle><DialogDescription>{current?.period_start} – {current?.period_end}, {detailStatus}</DialogDescription></DialogHeader>{current && <>
      <p role="status" className={styles.feedback}>{notice}</p>
      <p className={styles.narrative}>{current.narrative || 'Pendiente de completar'}</p>
      <ReportSources composition={current.composition} />
      {manage && <ReportForm key={`${current.id}/${current.revision}`} report={current} busy={busy} blocked={morePending} error={formError} onSubmit={(event) => {
        if (document.activeElement instanceof HTMLElement) approvalTrigger.current = document.activeElement
        submit(event, current)
      }} />}
      <p className="small muted">Las versiones aprobadas son inmutables. El PDF se genera después de aprobar.</p>
      {current.status === 'aprobado' && current.pdf_generated_at && <ReportPdfButton key={current.id} cycleId={cycleId} reportId={current.id} />}
      {current.status === 'aprobado' && !current.pdf_generated_at && <p className="small muted">El PDF todavía no está listo. Vuelve a consultar el informe más tarde.</p>}
      {approval && <ConfirmAction title="Aprobar informe"
        subject={`Versión ${approval.report.version}: ${approval.report.period_start} – ${approval.report.period_end}`}
        description="Esta versión y sus fuentes quedarán fijas. El PDF se generará después de aprobar; cualquier corrección deberá guardarse en una nueva versión."
        confirmLabel="Confirmar aprobación" pendingLabel="Aprobando informe…" pending={busy} error={approvalError}
        onCancel={() => setApproval(null)} onConfirm={() => void save(approval.submission, true)}
        restoreFocus={() => {
          if (approvalTrigger.current?.isConnected) approvalTrigger.current.focus()
          else detailHeading.current?.focus()
        }} />}
    </>}</DialogContent></Dialog>
  </>
}
