'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { FolderOpen, Search, FileText, ChevronRight, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { PrivateDocumentButton } from './tracking-review'
import { ProjectLink } from './project-reference-ui'
import { formatDateTime } from '../lib/expediente'
import { requestSeguimiento, seguimientoUrl, type Evidence, type Activity, type Objective } from '../lib/seguimiento'
import { filterEvidence, parseFolder, parseFolders, parsePlacement, parsePlacements, type EvidenceFolder, type EvidencePlacement } from '../lib/evidence-folders'
import styles from './evidence-browser.module.css'

export function EvidenceBrowser({ cycleId, entrepreneurshipId, evidence, activities, objectives, focusId, onActivity, onFoldersChange, onFolderChange, children }: {
  cycleId: string; entrepreneurshipId?: string; evidence: Evidence[]; activities: Activity[]; objectives: Objective[]; focusId?: string; onActivity: (id: string) => void; onFoldersChange: (folders: EvidenceFolder[]) => void; onFolderChange: (id: string) => void; children: ReactNode
}) {
  const [folders, setFolders] = useState<EvidenceFolder[]>([])
  const [placements, setPlacements] = useState<EvidencePlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    setError('')
    Promise.all([
      requestSeguimiento(seguimientoUrl(cycleId, 'folders'), parseFolders),
      requestSeguimiento(seguimientoUrl(cycleId, 'evidence-placements'), parsePlacements),
    ]).then(([f, p]) => {
      if (!active) return
      if (f.ok && p.ok && f.data.every((item) => item.cycle_id === cycleId) && p.data.every((item) => item.cycle_id === cycleId)) { setFolders(f.data); setPlacements(p.data) }
      else if (f.ok && p.ok) setError('La API devolvió carpetas de otro ciclo.')
      else setError(!f.ok ? f.message : !p.ok ? p.message : '')
      setLoading(false)
    })
    return () => { active = false }
  }, [cycleId, retry, evidence])
  const folder = folders.find((item) => `folder:${item.id}` === location)
  const objective = objectives.find((item) => `objective:${item.id}` === location)
  const placementOf = (id: string) => placements.find((item) => item.evidence_id === id)
  const visible = filterEvidence(evidence, activities, placements, { location, activityId: activityFilter, query, kind })
  const current = evidence.find((item) => item.id === selected)
  function go(next: string) { setLocation(next); setActivityFilter(''); setQuery(''); onFolderChange(next.startsWith('folder:') ? next.slice(7) : '') }
  async function saveFolder() {
    if (!name.trim() || busy) return
    setBusy(true); setError('')
    const result = await requestSeguimiento(seguimientoUrl(cycleId, renaming && folder ? `folders/${folder.id}` : 'folders'), parseFolder, {
      method: renaming ? 'PUT' : 'POST', body: { name: name.trim(), ...(renaming && folder ? { expected_revision: folder.revision } : {}) },
    })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setFolders((items) => [...items.filter((item) => item.id !== result.data.id), result.data])
    go(`folder:${result.data.id}`); setCreating(false); setRenaming(false); setName('')
  }
  async function move(folderId: string) {
    if (!current || busy) return
    setBusy(true); setError('')
    const result = await requestSeguimiento(seguimientoUrl(cycleId, `evidence/${current.id}/folder`), parsePlacement, {
      method: 'PUT', body: { folder_id: folderId || null, expected_revision: placementOf(current.id)?.revision ?? 0 },
    })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    setPlacements((items) => [...items.filter((item) => item.evidence_id !== result.data.evidence_id), result.data])
  }
  const kindLabels: Record<string, string> = { link: 'Enlace', file: 'Documento', photograph: 'Fotografía', video: 'Video' }
  return <>
    <div className={styles.toolbar}>{children}<button type="button" className={styles.button} disabled={loading || busy || Boolean(error)} onClick={() => { setName(''); setRenaming(false); setCreating(true) }}><Plus size={16} />Nueva carpeta</button></div>
    {error && <div role="alert" className={styles.error}>{error} <button type="button" disabled={busy} onClick={() => setRetry((value) => value + 1)}>Volver a consultar</button></div>}
    {loading ? <p role="status">Cargando carpetas…</p> : <div className={styles.layout}>
      <nav className={styles.sidebar} aria-label="Carpetas de evidencias">
        <button type="button" aria-current={location === 'all' ? 'page' : undefined} onClick={() => go('all')}>Todas las evidencias <span>{evidence.length}</span></button>
        <button type="button" aria-current={location === 'unfiled' ? 'page' : undefined} onClick={() => go('unfiled')}>Sin carpeta personalizada</button>
        <h3>Por objetivo</h3>
        {objectives.map((item) => <button type="button" key={item.id} aria-current={location === `objective:${item.id}` ? 'page' : undefined} onClick={() => go(`objective:${item.id}`)}><FolderOpen size={17} /><span>{item.title}</span></button>)}
        <h3>Carpetas personalizadas</h3>
        {folders.map((item) => <button type="button" key={item.id} aria-current={location === `folder:${item.id}` ? 'page' : undefined} onClick={() => go(`folder:${item.id}`)}><FolderOpen size={17} /><span>{item.name}</span><small>{placements.filter((p) => p.folder_id === item.id).length}</small></button>)}
        {!folders.length && <p>Crea una carpeta para organizar respaldos por tema.</p>}
      </nav>
      <section className={styles.content} aria-label="Contenido de la carpeta">
        <div className={styles.breadcrumb}><button type="button" onClick={() => go('all')}>Evidencias</button><ChevronRight size={16} /><strong>{folder?.name ?? objective?.title ?? (location === 'unfiled' ? 'Sin carpeta personalizada' : 'Todas')}</strong>{folder && <button type="button" disabled={busy} onClick={() => { setName(folder.name); setRenaming(true); setCreating(true) }}>Renombrar</button>}</div>
        <p className={styles.help}>Las carpetas ordenan los respaldos sin cambiar sus actividades ni aprobaciones.</p>
        {objective && <div className={styles.activities}><button type="button" aria-pressed={!activityFilter} onClick={() => setActivityFilter('')}>Todo el objetivo</button>{activities.filter((a) => a.objective_id === objective.id).map((a) => <button type="button" key={a.id} aria-pressed={activityFilter === a.id} onClick={() => setActivityFilter(a.id)}><FolderOpen size={15} />{a.title}</button>)}</div>}
        <div className={styles.filters}><label><Search size={16} /><input aria-label="Buscar evidencias" placeholder="Buscar por nombre, descripción o actividad…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select aria-label="Tipo de evidencia" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos los tipos</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{visible.length} evidencias</span></div>
        <div className="evidence-grid">{visible.map((item) => <button type="button" className="evidence-card" key={item.id} onClick={() => setSelected(item.id)}><div className={`evidence-cover ${item.kind === 'link' ? 'blue' : 'sand'}`}><FileText size={32} strokeWidth={1} /><span>{kindLabels[item.kind]}</span></div><div><h3>{item.title}</h3><p>{activities.find((a) => a.id === item.activity_id)?.title}</p><footer>{formatDateTime(item.created_at)}</footer></div></button>)}</div>
        {!visible.length && <div className="empty"><FolderOpen size={32} /><h3>Sin evidencias en esta vista</h3><p>Agrega un respaldo, mueve una evidencia desde «Todas» o ajusta los filtros.</p></div>}
      </section>
    </div>}
    <Dialog open={creating} onOpenChange={(open) => { if (!busy) setCreating(open) }}><DialogContent><DialogHeader><DialogTitle>{renaming ? 'Renombrar carpeta' : 'Nueva carpeta'}</DialogTitle><DialogDescription>Visible para las personas autorizadas de este ciclo.</DialogDescription></DialogHeader><form className={styles.folderForm} onSubmit={(e) => { e.preventDefault(); void saveFolder() }}><label>Nombre de la carpeta<input required maxLength={200} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy || !name.trim()}>{busy ? 'Guardando…' : 'Guardar carpeta'}</button></form></DialogContent></Dialog>
    <Dialog open={Boolean(current)} onOpenChange={(open) => { if (!busy && !open) setSelected('') }}><DialogContent><DialogHeader><DialogTitle>{current?.title}</DialogTitle><DialogDescription>Respaldo privado vinculado a su actividad original.</DialogDescription></DialogHeader>{current && <><p>{current.description || 'Sin descripción registrada.'}</p><p className={styles.help}>{kindLabels[current.kind]} · {formatDateTime(current.created_at)}</p>{current.document_id && entrepreneurshipId ? <PrivateDocumentButton entrepreneurshipId={entrepreneurshipId} documentId={current.document_id} title={current.title} /> : current.url ? <a className="text-link" href={current.url} target="_blank" rel="noopener noreferrer">Abrir referencia</a> : null}<ProjectLink onClick={() => onActivity(current.activity_id)}>Ver actividad de origen</ProjectLink><label className={styles.move}>Carpeta personalizada<select disabled={busy || loading} value={placementOf(current.id)?.folder_id ?? ''} onChange={(e) => void move(e.target.value)}><option value="">Sin carpeta personalizada</option>{folders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className={styles.help}>Mover solo cambia la organización; no modifica la evidencia aprobada.</p>{busy && <p role="status">Guardando ubicación…</p>}{error && <p role="alert">{error}</p>}</>}</DialogContent></Dialog>
  </>
}
