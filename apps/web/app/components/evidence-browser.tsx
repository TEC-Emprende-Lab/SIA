'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { FolderOpen, Search, FileText, ChevronRight, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { PrivateDocumentButton } from './tracking-review'
import { ProjectLink } from './project-reference-ui'
import { LoadingState, SkeletonBar } from './ui/loading-state'
import { formatDateTime } from '../lib/expediente'
import { httpUrl, requestSeguimiento, seguimientoUrl, type Evidence, type Activity, type Objective } from '../lib/seguimiento'
import { filterEvidence, parseFolder, parseFolders, parsePlacement, parsePlacements, type EvidenceFolder, type EvidencePlacement } from '../lib/evidence-folders'
import styles from './evidence-browser.module.css'

export function EvidenceBrowserLoading({ label }: { label: string }) {
  return <LoadingState label={label}>
    <div className={styles.layout}>
      <div className={`${styles.sidebar} ${styles.loadingSidebar}`}>
        <SkeletonBar />
        <SkeletonBar size="text" />
        <SkeletonBar size="short" />
        <SkeletonBar />
      </div>
      <div className={styles.content}>
        <div className={styles.breadcrumb}><SkeletonBar size="short" /><SkeletonBar /></div>
        <div className={styles.loadingFilters}><SkeletonBar size="text" /><SkeletonBar /></div>
        <div className="evidence-grid">
          {[1, 2, 3].map((slot) => <div className="evidence-card" key={slot}>
            <div className="evidence-cover"><SkeletonBar size="short" /></div>
            <div className={styles.loadingCardCopy}><SkeletonBar /><SkeletonBar size="text" /><SkeletonBar size="short" /></div>
          </div>)}
        </div>
      </div>
    </div>
  </LoadingState>
}

export function EvidenceBrowser({ cycleId, entrepreneurshipId, evidence, activities, objectives, focusId, onActivity, onFoldersChange, onFolderChange, onPlan, emptyAction }: {
  cycleId: string; entrepreneurshipId?: string; evidence: Evidence[]; activities: Activity[]; objectives: Objective[]; focusId?: string; onActivity: (id: string) => void; onFoldersChange: (folders: EvidenceFolder[]) => void; onFolderChange: (id: string) => void; emptyAction?: ReactNode; onPlan?: () => void
}) {
  const [folders, setFolders] = useState<EvidenceFolder[]>([])
  const [placements, setPlacements] = useState<EvidencePlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [folderError, setFolderError] = useState<{ message: string; forbidden: boolean } | null>(null)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [location, setLocation] = useState('all')
  const [activityFilter, setActivityFilter] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')
  const [selected, setSelected] = useState(focusId ?? '')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  useEffect(() => { onFoldersChange(folders) }, [folders, onFoldersChange])
  useEffect(() => {
    let active = true
    setLoading(true)
    setFolderError(null)
    setFolders([])
    setPlacements([])
    Promise.all([
      requestSeguimiento(seguimientoUrl(cycleId, 'folders'), parseFolders),
      requestSeguimiento(seguimientoUrl(cycleId, 'evidence-placements'), parsePlacements),
    ]).then(([f, p]) => {
      if (!active) return
      if (!f.ok) {
        setFolderError({ message: f.message, forbidden: f.status === 403 || (!p.ok && p.status === 403) })
      } else if (!p.ok) {
        setFolderError({ message: p.message, forbidden: p.status === 403 })
      } else if (f.data.some((item) => item.cycle_id !== cycleId) || p.data.some((item) => item.cycle_id !== cycleId)) {
        setFolderError({ message: 'La API devolvió carpetas de otro ciclo.', forbidden: false })
      } else {
        setFolders(f.data)
        setPlacements(p.data)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [cycleId, retry, evidence])
  const organizationReady = !loading && !folderError
  const folder = folders.find((item) => `folder:${item.id}` === location)
  const objective = objectives.find((item) => `objective:${item.id}` === location)
  let visibleLocation = 'all'
  if (objective || (organizationReady && (folder || location === 'unfiled'))) visibleLocation = location
  const placementOf = (id: string) => placements.find((item) => item.evidence_id === id)
  const visible = filterEvidence(evidence, activities, placements, { location: visibleLocation, activityId: activityFilter, query, kind })
  const current = evidence.find((item) => item.id === selected)
  const external = httpUrl(current?.url)
  function go(next: string) {
    setLocation(next)
    setActivityFilter('')
    setQuery('')
    let folderId = ''
    if (next.startsWith('folder:')) folderId = next.slice(7)
    onFolderChange(folderId)
  }
  async function saveFolder() {
    if (!name.trim() || busy || !organizationReady) return
    setBusy(true); setActionError(''); setNotice('')
    const body: { name: string; expected_revision?: number } = { name: name.trim() }
    let resource = 'folders'
    let method: 'POST' | 'PUT' = 'POST'
    let success = 'Carpeta creada.'
    if (renaming) {
      if (!folder) {
        setActionError('La carpeta ya no está disponible.')
        setBusy(false)
        return
      }
      resource = `folders/${folder.id}`
      method = 'PUT'
      body.expected_revision = folder.revision
      success = 'Nombre de la carpeta guardado.'
    }
    const result = await requestSeguimiento(seguimientoUrl(cycleId, resource), parseFolder, { method, body })
    setBusy(false)
    if (!result.ok) { setActionError(result.message); return }
    setFolders((items) => [...items.filter((item) => item.id !== result.data.id), result.data])
    go(`folder:${result.data.id}`); setCreating(false); setRenaming(false); setName('')
    setNotice(success)
  }
  async function move(folderId: string) {
    if (!current || busy || !organizationReady) return
    setBusy(true); setActionError(''); setNotice('')
    const result = await requestSeguimiento(seguimientoUrl(cycleId, `evidence/${current.id}/folder`), parsePlacement, {
      method: 'PUT', body: { folder_id: folderId || null, expected_revision: placementOf(current.id)?.revision ?? 0 },
    })
    setBusy(false)
    if (!result.ok) { setActionError(result.message); return }
    setPlacements((items) => [...items.filter((item) => item.evidence_id !== result.data.evidence_id), result.data])
    setNotice('Ubicación de la evidencia guardada.')
  }
  function retryFolders() {
    setActionError('')
    setLoading(true)
    setRetry((value) => value + 1)
  }
  function openEvidence(id: string) {
    setActionError('')
    setNotice('')
    setSelected(id)
  }
  function emptyEvidence() {
    let title = 'Esta vista aún no tiene evidencias'
    let description = 'Consulta Todas las evidencias para ver los respaldos del ciclo.'
    let action: ReactNode = <button type="button" className="btn secondary" onClick={() => go('all')}>Ver todas las evidencias</button>
    if (query.trim() || kind || activityFilter) {
      title = 'No hay coincidencias en esta vista'
      description = 'Prueba con otro nombre o restablece los filtros para ver el contenido disponible.'
      action = <button type="button" className="btn secondary" onClick={() => { setQuery(''); setKind(''); setActivityFilter('') }}>Limpiar filtros</button>
    } else if (!evidence.length) {
      title = 'El ciclo aún no tiene evidencias'
      if (activities.length > 0) {
        description = 'Vincula un archivo o enlace a una actividad. Puedes organizarlo en carpetas después.'
        action = emptyAction
      } else {
        description = 'Registra primero un objetivo y una actividad en el plan de trabajo. Después podrás añadir sus archivos o enlaces aquí.'
        action = null
        if (onPlan) action = <button type="button" className="btn secondary" onClick={onPlan}>Ir al plan de trabajo</button>
      }
    }
    return <div className="guided-empty"><h3>{title}</h3><p>{description}</p>{action && <div className="welcome-actions">{action}</div>}</div>
  }
  const kindLabels: Record<string, string> = { link: 'Enlace', file: 'Documento', photograph: 'Fotografía', video: 'Video' }
  let locationLabel = objective?.title ?? 'Todas'
  if (organizationReady && folder) locationLabel = folder.name
  if (visibleLocation === 'unfiled') locationLabel = 'Sin carpeta personalizada'
  let folderTitle = 'Nueva carpeta'
  if (renaming) folderTitle = 'Renombrar carpeta'
  let saveLabel = 'Guardar carpeta'
  if (busy) saveLabel = 'Guardando…'
  const actionFeedback = actionError && <>
    <p role="alert">{actionError}</p>
    <button type="button" className="btn secondary" onClick={retryFolders}>Volver a consultar carpetas</button>
  </>
  return <>
    <div className={styles.toolbar}><button type="button" className={styles.button} disabled={!organizationReady || busy} onClick={() => { setName(''); setRenaming(false); setCreating(true); setActionError(''); setNotice('') }}><Plus size={16} aria-hidden="true" />Nueva carpeta</button></div>
    {!current && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.layout}>
      <nav className={styles.sidebar} aria-label="Carpetas de evidencias">
        <button type="button" aria-current={currentLocation('all')} onClick={() => go('all')}>Todas las evidencias <span>{evidence.length}</span></button>
        <h3>Por objetivo</h3>
        {objectives.map((item) => <button type="button" key={item.id} aria-current={currentLocation(`objective:${item.id}`)} onClick={() => go(`objective:${item.id}`)}><FolderOpen size={17} aria-hidden="true" /><span>{item.title}</span></button>)}
        <h3>Carpetas personalizadas</h3>
        {loading && <LoadingState label="Cargando carpetas…"><SkeletonBar size="text" /><SkeletonBar size="short" /></LoadingState>}
        {folderError && <div className={styles.folderFeedback}>
          <p role="alert">No se pudieron consultar las carpetas personalizadas. {folderError.message} Todavía puedes consultar evidencias por objetivo.</p>
          {!folderError.forbidden && <button type="button" className="btn secondary" onClick={retryFolders}>Reintentar carpetas</button>}
        </div>}
        {organizationReady && <>
          <button type="button" aria-current={currentLocation('unfiled')} onClick={() => go('unfiled')}>Sin carpeta personalizada</button>
          {folders.map((item) => <button type="button" key={item.id} aria-current={currentLocation(`folder:${item.id}`)} onClick={() => go(`folder:${item.id}`)}><FolderOpen size={17} aria-hidden="true" /><span>{item.name}</span><small>{placements.filter((p) => p.folder_id === item.id).length}</small></button>)}
          {!folders.length && <p>Usa Nueva carpeta para organizar respaldos por tema.</p>}
        </>}
      </nav>
      <section className={styles.content} aria-label="Contenido de la carpeta">
        <div className={styles.breadcrumb}><button type="button" onClick={() => go('all')}>Evidencias</button><ChevronRight size={16} aria-hidden="true" /><strong>{locationLabel}</strong>{organizationReady && folder && <button type="button" disabled={busy} onClick={() => { setName(folder.name); setRenaming(true); setCreating(true); setActionError(''); setNotice('') }}>Renombrar</button>}</div>
        <p className={styles.help}>Las carpetas ordenan los respaldos sin cambiar sus actividades ni aprobaciones.</p>
        {objective && <div className={styles.activities}><button type="button" aria-pressed={!activityFilter} onClick={() => setActivityFilter('')}>Todo el objetivo</button>{activities.filter((a) => a.objective_id === objective.id).map((a) => <button type="button" key={a.id} aria-pressed={activityFilter === a.id} onClick={() => setActivityFilter(a.id)}><FolderOpen size={15} />{a.title}</button>)}</div>}
        <div className={styles.filters}><label><Search size={16} /><input aria-label="Buscar evidencias" placeholder="Buscar por nombre, descripción o actividad…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Tipo de evidencia" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos los tipos</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{visible.length} evidencias</span></div>
        <div className="evidence-grid">{visible.map((item) => {
          let cover = 'sand'
          if (item.kind === 'link') cover = 'blue'
          return <button type="button" className="evidence-card" key={item.id} onClick={() => openEvidence(item.id)}><div className={`evidence-cover ${cover}`}><FileText size={32} strokeWidth={1} aria-hidden="true" /><span>{kindLabels[item.kind]}</span></div><div><h3>{item.title}</h3><p>{activities.find((a) => a.id === item.activity_id)?.title}</p><footer>{formatDateTime(item.created_at)}</footer></div></button>
        })}</div>
        {!visible.length && emptyEvidence()}
      </section>
    </div>
    <Dialog open={creating} onOpenChange={(open) => { if (!busy) setCreating(open) }}><DialogContent>
      <DialogHeader><DialogTitle>{folderTitle}</DialogTitle><DialogDescription>Visible para las personas autorizadas de este ciclo.</DialogDescription></DialogHeader>
      <form className={styles.folderForm} onSubmit={(e) => { e.preventDefault(); void saveFolder() }}>
        <label>Nombre de la carpeta<input required maxLength={200} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} /></label>
        {actionFeedback}
        {!organizationReady && <p className={styles.help}>No puedes guardar mientras las carpetas no estén disponibles.</p>}
        <button type="submit" disabled={busy || !name.trim() || !organizationReady}>{saveLabel}</button>
        {busy && <p role="status">Guardando carpeta…</p>}
      </form>
    </DialogContent></Dialog>
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!busy && !open) setSelected('') }}><DialogContent>
      <DialogHeader><DialogTitle>{current?.title}</DialogTitle><DialogDescription>Respaldo vinculado a su actividad original.</DialogDescription></DialogHeader>
      {current && <>
        <p>{current.description || 'Sin descripción registrada.'}</p>
        <p className={styles.help}>{kindLabels[current.kind]}, {formatDateTime(current.created_at)}</p>
        {current.document_id && entrepreneurshipId && <PrivateDocumentButton key={current.document_id} entrepreneurshipId={entrepreneurshipId} documentId={current.document_id} title={current.title} />}
        {!current.document_id && 'url' in external && <a className="text-link" href={external.url} target="_blank" rel="noopener noreferrer">Abrir referencia</a>}
        {!current.document_id && 'error' in external && <p className={styles.help}>Referencia no disponible: URL inválida.</p>}
        <ProjectLink onClick={() => onActivity(current.activity_id)}>Ver actividad de origen</ProjectLink>
        {organizationReady && <>
          <label className={styles.move}>Carpeta personalizada<select disabled={busy} value={placementOf(current.id)?.folder_id ?? ''} onChange={(e) => void move(e.target.value)}><option value="">Sin carpeta personalizada</option>{folders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <p className={styles.help}>Mover solo cambia la organización; no modifica la evidencia aprobada.</p>
        </>}
        {loading && <p role="status">Consultando ubicación…</p>}
        {folderError && <p className={styles.help}>Ubicación no disponible. Cierra este detalle para consultar el estado de las carpetas.</p>}
        {busy && <p role="status">Guardando ubicación…</p>}
        {actionFeedback}
        <p className={styles.notice} role="status">{notice}</p>
      </>}
    </DialogContent></Dialog>
  </>

  function currentLocation(key: string) {
    if (visibleLocation === key) return 'page'
    return undefined
  }
}
