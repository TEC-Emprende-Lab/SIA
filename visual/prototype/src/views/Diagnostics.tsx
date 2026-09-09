import { useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, Box, CalendarDays, ClipboardList, Target, ChevronRight, GitCompareArrows, History, Lightbulb, LockKeyhole, Megaphone, Plus, Sprout, Users, Wallet, Workflow } from 'lucide-react'
import { areas, project, TODAY } from '../data/seed'
import { actorFor, approvedDiagnostics, compareDiagnostics, uid } from '../data/repository'
import type { Assessment, Diagnostic } from '../data/types'
import { Badge, Button, Delta, Empty, Field, Heading, Modal, Notice, Panel, TextLink } from '../ui'
import { dateLabel, useData } from '../state'

const areaIcons = { Lightbulb, Box, Users, Megaphone, Wallet, Workflow, Sprout }
export function AreaIcon({ areaId }: { areaId: string }) { const area = areas.find(a => a.id === areaId)!; const Icon = areaIcons[area.icon as keyof typeof areaIcons]; return <span className={`area-icon ${area.color}`}><Icon size={21} strokeWidth={1.6} /></span> }
export function Radar({ previous, current }: { previous: Diagnostic; current: Diagnostic }) {
  const point = (index: number, score: number) => { const angle = index * (2 * Math.PI / areas.length) - Math.PI / 2; return `${180 + Math.cos(angle) * score * 23},${165 + Math.sin(angle) * score * 23}` }
  return <svg className="radar" viewBox="0 0 360 335" role="img" aria-label={`Comparación del Cubo 360 de seis áreas entre ${previous.date} y ${current.date}.`}>{[1, 2, 3, 4, 5].map(n => <polygon key={n} points={areas.map((_, i) => point(i, n)).join(' ')} fill={n % 2 ? '#f8f8f3' : '#fff'} stroke="#e5e5db" />).reverse()}{areas.map((a, i) => <line key={a.id} x1="180" y1="165" x2={point(i, 5).split(',')[0]} y2={point(i, 5).split(',')[1]} stroke="#e5e5db" />)}<polygon points={areas.map((a, i) => point(i, previous.assessments.find(x => x.areaId === a.id)?.score ?? 0)).join(' ')} fill="#8fa0d820" stroke="#8fa0d8" strokeWidth="1.8" strokeDasharray="4 4" /><polygon points={areas.map((a, i) => point(i, current.assessments.find(x => x.areaId === a.id)?.score ?? 0)).join(' ')} fill="#8a85412b" stroke="#8a8541" strokeWidth="2.2" />{areas.map((a, i) => { const p = point(i, current.assessments.find(x => x.areaId === a.id)?.score ?? 0).split(','); const pos = point(i, 6.1).split(','); return <g key={a.id}><circle cx={p[0]} cy={p[1]} r="3.4" fill="#8a8541" stroke="white" strokeWidth="1.5" /><text x={pos[0]} y={pos[1]} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#66675d">{a.short}</text></g> })}</svg>
}

// Presentation-only mapping: catalog order and stored assessments remain unchanged.
const cubeFaces: Record<string, { position: string; x: number; y: number; normal: [number, number, number] }> = {
  mvp: { position: 'front', x: 0, y: 0, normal: [0, 0, 1] },
  'business-model': { position: 'right', x: 0, y: -90, normal: [1, 0, 0] },
  'segmented-market': { position: 'back', x: 0, y: -180, normal: [0, 0, -1] },
  channels: { position: 'left', x: 0, y: 90, normal: [-1, 0, 0] },
  identity: { position: 'top', x: -90, y: 0, normal: [0, -1, 0] },
  incorporation: { position: 'bottom', x: 90, y: 0, normal: [0, 1, 0] },
}
type CubeRotation = { x: number; y: number }
const initialRotation: CubeRotation = { x: -18, y: -28 }
function faceRotation(id: string, rotation: CubeRotation): CubeRotation {
  const face = cubeFaces[id]
  return { x: face.x, y: rotation.y + ((face.y - rotation.y + 180) % 360 + 360) % 360 - 180 }
}

export function Cube360({ current, comparison, rotation, setRotation, active, setActive, onOpen }: {
  current: Diagnostic; comparison: ReturnType<typeof compareDiagnostics>;
  rotation: CubeRotation; setRotation: (rotation: CubeRotation) => void;
  active: string | null; setActive: (id: string | null) => void; onOpen: (id: string) => void;
}) {
  const instructions = useId()
  const pointer = useRef<{ id: number; x: number; y: number; rotation: CubeRotation } | null>(null)
  const moved = useRef(false)
  const [dragging, setDragging] = useState(false)
  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || event.pointerType !== 'mouse' || pointer.current) return
    moved.current = false
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation }
    // Capture on the actual face so a stationary click retains native button activation.
    const target = (event.target as Element).closest('button') ?? event.currentTarget
    target.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (!moved.current && Math.hypot(dx, dy) <= 6) return
    moved.current = true
    setDragging(true)
    setActive(null)
    setRotation({ x: Math.max(-90, Math.min(90, start.rotation.x - dy * 0.45)), y: start.rotation.y + dx * 0.45 })
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return
    pointer.current = null
    setDragging(false)
    if (event.type === 'pointercancel') moved.current = true
  }
  function orient(id: string) { setActive(id); setRotation(faceRotation(id, rotation)) }
  const rx = rotation.x * Math.PI / 180, ry = rotation.y * Math.PI / 180
  return <div className="cube360">
<div className="cube-scene" role="group" aria-label="Cubo 360 interactivo" aria-describedby={instructions}
        onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      <div className={`cube${dragging ? ' dragging' : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
        {areas.map(area => {
          const face = cubeFaces[area.id], assessment = current.assessments.find(a => a.areaId === area.id)
          const delta = comparison.find(a => a.areaId === area.id)?.delta
          const [nx, ny, nz] = face.normal
          const normalX = nx * Math.cos(ry) + nz * Math.sin(ry)
          const normalY = ny * Math.cos(rx) - (-nx * Math.sin(ry) + nz * Math.cos(ry)) * Math.sin(rx)
          const normalZ = ny * Math.sin(rx) + (-nx * Math.sin(ry) + nz * Math.cos(ry)) * Math.cos(rx)
          const shade = 0.06 + 0.16 * (1 - Math.max(0, -normalX * 0.3 - normalY * 0.5 + normalZ * 0.8))
          return <button type="button" key={area.id} data-area-id={area.id}
            className={`cube-face cube-face--${face.position} ${area.color}${active === area.id ? ' active' : ''}`}
            style={{ '--face-shade': shade } as CSSProperties}
            onClick={() => { if (!moved.current) onOpen(area.id) }}>
            <AreaIcon areaId={area.id} /><span className="cube-face-name" aria-label={area.name}>{area.short}</span>
            <span className="cube-face-score">{assessment?.score ?? '—'}<small> / 5</small></span><Delta value={delta} />
          </button>
        })}
      </div>
    </div>
    <p id={instructions} className="cube-instructions">Arrastra con el mouse o usa los controles para girar. Selecciona una cara para ver el detalle.</p>
    <div className="cube-controls" role="group" aria-label="Controles de giro">
      <Button variant="secondary" onClick={() => { setActive(null); setRotation({ x: 0, y: rotation.y + 90 }) }}><ArrowLeft size={16} /> Girar a la izquierda</Button>
      <Button variant="secondary" onClick={() => { setActive(null); setRotation({ x: 0, y: rotation.y - 90 }) }}>Girar a la derecha <ArrowRight size={16} /></Button>
      <Button variant="secondary" onClick={() => orient('identity')}>Ver cara superior</Button>
      <Button variant="secondary" onClick={() => { setActive(null); setRotation(initialRotation) }}>Restablecer vista</Button>
    </div>
  </div>
}

export function Diagnostics({ focusId }: { focusId?: string }) {
  const { data, role, run, navigate, busy } = useData()
  const approved = approvedDiagnostics(data)
  const [selected, setSelected] = useState(focusId ?? approved.at(-1)?.id ?? data.diagnostics[0]?.id)
  const [editor, setEditor] = useState<Diagnostic | 'new' | null>(null)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [rotation, setRotation] = useState<CubeRotation>(initialRotation)
  const [activeFace, setActiveFace] = useState<string | null>(null)
  const openArea = (id: string) => { setActiveFace(id); setRotation(r => faceRotation(id, r)); setAreaId(id) }
  const [history, setHistory] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const current = data.diagnostics.find(d => d.id === selected) ?? approved.at(-1)
  const previous = current ? approved.filter(d => d.date < current.date).at(-1) : undefined
  const comparison = previous && current?.status === 'APPROVED' ? compareDiagnostics(previous, current) : []
  const score = current ? current.assessments.reduce((sum, a) => sum + a.score, 0) / current.assessments.length : 0
  const assessed = current?.assessments.find(a => a.areaId === areaId)
  return <><Heading eyebrow="Comprender para avanzar" title="Diagnóstico 360°" description="El Cubo 360 reúne seis áreas de negocio para orientar los objetivos del proyecto." action={<><Button variant="secondary" onClick={() => setHistory(true)}><History size={16} /> Historial</Button><Button onClick={() => setEditor('new')}><Plus size={17} /> Nuevo diagnóstico</Button></>} />
    {!current ? <Empty text="Crea la primera fotografía del emprendimiento para comenzar su seguimiento." action={<Button onClick={() => setEditor('new')}>Crear diagnóstico</Button>} /> : <><div className="diagnostic-toolbar"><div className="inline"><span className="eyebrow">Fotografía del proyecto</span><select aria-label="Seleccionar diagnóstico" value={current.id} onChange={e => setSelected(e.target.value)}>{data.diagnostics.toSorted((a, b) => b.date.localeCompare(a.date)).map(d => <option key={d.id} value={d.id}>{dateLabel(d.date)} · {d.type === 'INITIAL' ? 'Inicial' : d.type === 'CLOSURE' ? 'Cierre' : 'Seguimiento'}</option>)}</select><Badge status={current.status} /></div><span className="muted small">Realizado por {current.author}</span></div>
      {current.status === 'DRAFT' && <Notice>Borrador guardado. <TextLink onClick={() => setEditor(current)}>Continuar diagnóstico</TextLink><Button variant="secondary" disabled={busy || role === 'Emprendedor' && current.author !== actorFor(role)} onClick={() => run({ type: 'diagnostic.status', id: current.id, status: 'SUBMITTED' }, 'Diagnóstico enviado a revisión')}>Enviar a revisión</Button></Notice>}
      {current.status === 'SUBMITTED' && role !== 'Emprendedor' && <Notice>Revisa las evaluaciones antes de aprobar esta fotografía. <Button onClick={() => setConfirm(true)}>Aprobar diagnóstico</Button></Notice>}
      <div className="diagnostic-overview"><Panel className="cube-panel"><div className="panel-heading"><h2>El Cubo 360</h2><span className="small muted">Escala de 1 a 5</span></div><Cube360 current={current} comparison={comparison} rotation={rotation} setRotation={setRotation} active={activeFace} setActive={setActiveFace} onOpen={openArea} /><div className="chart-legend"><span>Evaluación: {dateLabel(current.date)}</span>{comparison.length > 0 && previous && <span>Cambio desde {dateLabel(previous.date)}</span>}</div></Panel><div className="diagnostic-story"><p className="eyebrow">Una fotografía, nuevas posibilidades</p><div className="score"><strong>{score.toFixed(1)}</strong><span>/ 5<br /><small>promedio de las áreas</small></span></div><h2>{current.status === 'APPROVED' ? 'Cada avance cuenta.' : 'Tu próxima fotografía está en camino.'}</h2><p>{current.observation}</p><div className="evolution-counts"><div><strong>{comparison.filter(a => (a.delta ?? 0) > 0).length}</strong><span>áreas avanzan <ArrowRight size={13} /></span></div><div><strong>{comparison.filter(a => a.delta === 0).length}</strong><span>sin cambio</span></div><div><strong>{comparison.filter(a => (a.delta ?? 0) < 0).length}</strong><span>en retroceso</span></div></div>{previous && current.status === 'APPROVED' ? <TextLink onClick={() => navigate('Evolución', current.id)}>Explorar la evolución</TextLink> : <p className="small muted">La comparación estará disponible con dos diagnósticos aprobados.</p>}</div></div>
      <div className="section-heading"><div><h2>Seis caras, un mismo proyecto</h2><p className="muted">Explora cada cara del Cubo 360 para orientar los objetivos del plan.</p></div><span className="small muted">{current.assessments.length} áreas evaluadas</span></div>
      <div className="area-grid">{current.assessments.map(a => { const delta = comparison.find(c => c.areaId === a.areaId)?.delta; return <button className="area-card" key={a.areaId} onClick={() => openArea(a.areaId)}><div className="area-card-top"><AreaIcon areaId={a.areaId} /><span className="area-score">{a.score}<small>/5</small></span></div><h3>{a.name}</h3><p>{a.question}</p><div className="score-segments" aria-label={`${a.score} de 5`}>{[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= a.score ? `filled ${areas.find(x => x.id === a.areaId)?.color}` : ''} />)}</div><div className="area-card-bottom"><Delta value={delta} /><span>Ver diagnóstico <ChevronRight size={14} /></span></div></button> })}</div>
      <div className="footnote"><LockKeyhole size={14} />{current.status === 'APPROVED' ? `Fotografía aprobada por ${current.approvedBy} el ${dateLabel(current.approvedAt ?? current.date)}. Se conserva sin cambios.` : 'Los borradores aún no forman parte de la comparación histórica.'}</div></>}
    {editor && <DiagnosticEditor initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSaved={id => { setSelected(id); setEditor(null) }} />}
    {history && <Modal title="Historial de diagnósticos" description="Cada fotografía conserva su fecha, autor y aprobación." onClose={() => setHistory(false)}>{data.diagnostics.toSorted((a, b) => b.date.localeCompare(a.date)).map(d => <button className="record-row" key={d.id} onClick={() => { setSelected(d.id); setHistory(false) }}><span className="timeline-dot"><History size={18} /></span><div><strong>{dateLabel(d.date)} · {d.type === 'INITIAL' ? 'Inicial' : 'Seguimiento'}</strong><p>{d.author}</p></div><Badge status={d.status} /><ChevronRight size={16} /></button>)}</Modal>}
    {assessed && current && <AreaDetail current={current} assessed={assessed} onClose={() => setAreaId(null)} onSelect={openArea} />}
    {confirm && current && <Modal title="Aprobar diagnóstico" onClose={() => setConfirm(false)}><Notice>Esta fotografía quedará inmutable y formará parte de la comparación.</Notice><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirm(false)}>Cancelar</Button><Button disabled={busy} onClick={async () => { if (await run({ type: 'diagnostic.status', id: current.id, status: 'APPROVED' }, 'Diagnóstico aprobado y agregado a la evolución')) setConfirm(false) }}>Confirmar aprobación</Button></div></Modal>}
  </>
}

/** US-PRO-005 / US-PRO-001: historical assessment alongside explicitly current work. */
function AreaDetail({ current, assessed, onClose, onSelect }: {
  current: Diagnostic; assessed: Assessment; onClose: () => void; onSelect: (id: string) => void;
}) {
  const { data, navigate } = useData()
  const area = areas.find(a => a.id === assessed.areaId)!
  const approved = approvedDiagnostics(data).filter(d => d.projectId === current.projectId && d.date <= current.date)
  const previous = approved.filter(d => d.date < current.date).at(-1)
  const change = previous && current.status === 'APPROVED' ? compareDiagnostics(previous, current).find(a => a.areaId === area.id) : undefined
  const history = approved.flatMap(d => {
    const a = d.assessments.find(a => a.areaId === area.id)
    return a ? [{ id: d.id, date: d.date, score: a.score }] : []
  })
  const objectives = data.objectives.filter(o => o.projectId === current.projectId && o.areaId === area.id)
  const activities = data.activities.filter(a => objectives.some(o => o.id === a.objectiveId))
  const completed = activities.filter(a => a.status === 'DONE').length
  return <Modal title={assessed.name} description="Diagnóstico 360° · Prototipado" onClose={onClose} wide className={`area-detail area-detail--${area.color}`}>
    <nav className="area-detail-nav" aria-label="Explorar áreas del diagnóstico">
      {areas.map(a => <button type="button" key={a.id} aria-pressed={a.id === area.id} onClick={() => onSelect(a.id)}><AreaIcon areaId={a.id} /><span>{a.short}</span></button>)}
    </nav>
    <div className="area-detail-content" key={area.id}>
      <section className="area-detail-hero" aria-label="Evaluación del área">
        <div className="area-detail-score">
          <span className="area-detail-kicker">Calificación del área</span>
          <div className="area-detail-number"><strong>{assessed.score}</strong><span>de 5</span></div>
          <div className="area-detail-scale" aria-hidden="true">{[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= assessed.score ? 'filled' : ''} />)}</div>
          <Delta value={change?.delta} />
          <span className="area-detail-score-caption">{change && previous ? `Respecto al ${dateLabel(previous.date)}` : 'Sin comparación aprobada disponible'}</span>
        </div>
        <div className="area-detail-reading">
          <div className="area-detail-meta"><span><CalendarDays size={14} />{dateLabel(current.date)}</span><Badge status={current.status} /></div>
          <h3>{assessed.question}</h3>
          <div className="area-detail-observation"><span className="area-detail-kicker">Observaciones de la evaluación</span><p>{assessed.observation || 'No se registraron observaciones en esta evaluación.'}</p></div>
          <span className="area-detail-author">Evaluado por <strong>{current.author}</strong></span>
        </div>
      </section>
      <div className="area-detail-columns">
        <section className="area-detail-section area-detail-history" aria-label="Evolución del área">
          <div className="area-detail-section-title"><span className="area-detail-section-icon"><History size={18} /></span><div><h3>La evolución de esta área</h3><p>Fotografías aprobadas hasta esta fecha</p></div></div>
          {history.length ? <ol className="area-detail-timeline">{history.map((entry, index) => <li key={entry.id} className={entry.id === current.id ? 'selected' : ''}>
            <div><time dateTime={entry.date}>{dateLabel(entry.date)}</time><span>{entry.id === current.id ? 'Evaluación seleccionada' : index === 0 ? 'Primera evaluación' : 'Seguimiento'}</span></div>
            <div className="area-detail-history-bar" aria-hidden="true"><span style={{ width: `${entry.score * 20}%` }} /></div><strong>{entry.score}<small> / 5</small></strong>
          </li>)}</ol> : <p className="area-detail-empty">Todavía no hay fotografías aprobadas de esta área hasta la fecha seleccionada.</p>}
          {current.status !== 'APPROVED' && <p className="area-detail-history-note">Esta evaluación se incorporará a la evolución cuando sea aprobada.</p>}
        </section>
        <aside className="area-detail-context">
          <span className="area-detail-section-icon"><LockKeyhole size={18} /></span>
          <h3>{current.status === 'APPROVED' ? 'Una fotografía del proyecto' : 'Una fotografía en preparación'}</h3>
          <p>{current.status === 'APPROVED' ? 'Esta evaluación conserva el estado del área en la fecha registrada.' : 'La calificación y las observaciones aún están pendientes de aprobación.'}</p>
          {current.status === 'APPROVED' && <div className="area-detail-approval"><span>Aprobado por</span><strong>{current.approvedBy ?? 'Sin registro'}</strong><time>{dateLabel(current.approvedAt ?? current.date)}</time></div>}
        </aside>
      </div>
      <section className="area-detail-section area-detail-work" aria-label="Objetivos actuales del área">
        <div className="area-detail-section-title"><span className="area-detail-section-icon"><Target size={18} /></span><div><h3>Del diagnóstico a la acción</h3><p>Plan de trabajo actual vinculado a esta área</p></div><span className="area-detail-count">{objectives.length} {objectives.length === 1 ? 'objetivo' : 'objetivos'}</span></div>
        {objectives.length ? <>
          <div className="area-detail-work-summary"><ClipboardList size={16} /><span><strong>{completed} de {activities.length}</strong> actividades completadas</span></div>
          <div className="area-detail-objectives">{objectives.map(o => {
            const tasks = activities.filter(a => a.objectiveId === o.id)
            const done = tasks.filter(a => a.status === 'DONE').length
            const evidenceCount = data.evidence.filter(e => tasks.some(a => a.id === e.activityId)).length
            return <button type="button" className="area-detail-objective" key={o.id} onClick={() => { onClose(); navigate('Objetivos y actividades', o.id) }}>
              <div className="area-detail-objective-top"><Badge status={o.status} /><ArrowRight size={17} /></div>
              <h4>{o.title}</h4><p>{o.description}</p>
              <div className="area-detail-objective-footer"><span>{done}/{tasks.length} actividades completadas</span><span>{evidenceCount} {evidenceCount === 1 ? 'evidencia' : 'evidencias'}</span></div>
              <span className="area-detail-objective-link">Abrir objetivo y actividades <ChevronRight size={14} /></span>
            </button>
          })}</div>
        </> : <div className="area-detail-empty"><Target size={24} /><div><strong>Esta área todavía no tiene objetivos vinculados</strong><p>El plan de trabajo permite registrar un objetivo y asociarlo a esta área del Cubo 360.</p></div></div>}
        <p className="area-detail-work-note">Los objetivos y las actividades muestran su estado actual; pueden haber cambiado después de esta evaluación.</p>
      </section>
      <footer className="area-detail-footer"><span>Área {areas.findIndex(a => a.id === area.id) + 1} de {areas.length} · {area.short}</span><Button variant="secondary" onClick={onClose}>Volver al cubo</Button></footer>
    </div>
  </Modal>
}

function DiagnosticEditor({ initial, onClose, onSaved }: { initial?: Diagnostic; onClose: () => void; onSaved: (id: string) => void }) {
  const { role, run, busy } = useData()
  const [draft, setDraft] = useState<Diagnostic>(() => initial ? structuredClone(initial) : { id: uid(), projectId: project.id, date: TODAY, type: 'FOLLOW_UP', author: actorFor(role), status: 'DRAFT', observation: '', assessments: areas.map(a => ({ areaId: a.id, name: a.name, question: a.question, score: 1, observation: '' })) })
  const change = (patch: Partial<Diagnostic>) => setDraft(d => ({ ...d, ...patch }))
  const changeArea = (areaId: string, patch: Partial<Assessment>) => setDraft(d => ({ ...d, assessments: d.assessments.map(a => a.areaId === areaId ? { ...a, ...patch } : a) }))
  const save = async () => { if (await run({ type: 'diagnostic.save', value: draft }, 'Diagnóstico guardado como borrador')) onSaved(draft.id) }
  return <Modal title={initial ? 'Continuar diagnóstico' : 'Una nueva mirada al proyecto'} description="Completa las seis áreas del Cubo 360 en una sola vista." onClose={onClose} wide>
    <div className="form-grid">
      <Field label="Fecha del diagnóstico"><input required type="date" value={draft.date} max={TODAY} onChange={e => change({ date: e.target.value })} /></Field>
      <Field label="Tipo de diagnóstico"><select value={draft.type} onChange={e => change({ type: e.target.value as Diagnostic['type'] })}><option value="INITIAL">Inicial</option><option value="FOLLOW_UP">Seguimiento</option><option value="CLOSURE">Cierre</option></select></Field>
      <div className="span-2"><Field label="Observación general"><textarea value={draft.observation} onChange={e => change({ observation: e.target.value })} rows={3} /></Field></div>
    </div>
    <div className="section-heading"><div><h2>Seis caras del Cubo 360</h2><p className="muted">Califica cada área del proyecto y registra las observaciones que orienten los objetivos.</p></div></div>
    {draft.assessments.map(a => <div className="cube-edit-row" key={a.areaId}><div className="area-step-header"><AreaIcon areaId={a.areaId} /><div><h3>{a.name}</h3><p className="muted">{a.question}</p></div></div><Field label="Calificación del área"><div className="rating">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={a.score === n} className={a.score === n ? 'selected' : ''} onClick={() => changeArea(a.areaId, { score: n })}>{n}</button>)}</div></Field><Field label="Observaciones"><textarea rows={2} value={a.observation} onChange={e => changeArea(a.areaId, { observation: e.target.value })} /></Field></div>)}
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={() => void save()}>Guardar diagnóstico</Button></div>
  </Modal>
}

export function Evolution({ focusId }: { focusId?: string }) {
  const { navigate } = useData()
  const { data } = useData()
  const approved = approvedDiagnostics(data)
  const [selected, setSelected] = useState(focusId ?? approved.at(-1)?.id)
  const current = approved.find(d => d.id === selected) ?? approved.at(-1)
  const previous = approved[approved.findIndex(d => d.id === current?.id) - 1]
  return <><Heading eyebrow="El camino recorrido" title="Evolución del emprendimiento" description="Compara fotografías aprobadas consecutivas del Cubo 360." action={<Button variant="secondary" onClick={() => navigate('Diagnóstico 360°')}><ArrowLeft size={16} /> Ver diagnóstico</Button>} /><div className="comparison-picker"><GitCompareArrows size={20} /><span>{previous ? dateLabel(previous.date) : 'Sin diagnóstico anterior'}</span><ArrowRight size={18} /><select aria-label="Diagnóstico actual para comparar" value={current?.id ?? ''} onChange={e => setSelected(e.target.value)}>{approved.map(d => <option key={d.id} value={d.id}>{dateLabel(d.date)}</option>)}</select><Badge status="APPROVED" /></div>{current && previous ? <><div className="evolution-layout"><Panel title="Una perspectiva en el tiempo"><Radar current={current} previous={previous} /></Panel><Panel title="Cambio por área"><div className="table-scroll"><table><thead><tr><th>Área</th><th>Anterior</th><th>Actual</th><th>Cambio</th></tr></thead><tbody>{compareDiagnostics(previous, current).map(a => <tr key={a.areaId}><td>{a.name}</td><td>{a.before ?? '—'}/5</td><td><b>{a.score}/5</b></td><td><Delta value={a.delta} /></td></tr>)}</tbody></table></div></Panel></div><Notice>Los cambios describen la evolución observada; no atribuyen causas automáticamente.</Notice></> : <Empty title="Cada camino empieza con una fotografía" text="Necesitas dos diagnósticos aprobados para comparar la evolución." />}</>
}
