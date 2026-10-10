'use client'

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Compass, Layers, Megaphone, Package, RotateCcw, Scale, Users, Move, Maximize2, Minimize2 } from 'lucide-react'
import type { Area, Diagnostic } from '../lib/seguimiento'
import styles from './diagnostic-explorer.module.css'

const faces = ['top', 'right', 'back', 'left', 'front', 'bottom']
const viewpoints = [{ x: -90, y: 0 }, { x: 0, y: -90 }, { x: 0, y: -180 }, { x: 0, y: 90 }, { x: 0, y: 0 }, { x: 90, y: 0 }]
const icons = [Compass, Layers, Users, Megaphone, Package, Scale]
const palette = ['#c2c99a', '#dfc697', '#b2c9d2', '#d8b9aa', '#e2bc88', '#bec3d6']
const home = { x: -24, y: -34 }
const nearestTurn = (target: number, current: number) => target + Math.round((current - target) / 360) * 360

// US-PRO-005 / US-PM-001: descriptive observations only; no maturity score.
export function DiagnosticExplorer({ areas, diagnostic }: { areas: Area[]; diagnostic: Diagnostic }) {
  const [rotation, setRotation] = useState(home)
  const [activeId, setActiveId] = useState(areas[4]?.id ?? areas[0]?.id ?? '')
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const drag = useRef<{ id: number; x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const activeIndex = Math.max(0, areas.findIndex((area) => area.id === activeId))
  const active = areas[activeIndex]
  const observation = diagnostic.assessments.find((item) => item.area_id === active?.id)?.observation
  const recorded = areas.filter((area) => diagnostic.assessments.some((item) => item.area_id === area.id && item.observation.trim())).length
  const Icon = icons[activeIndex % icons.length] ?? Compass

  function selectArea(index: number, orient = true) {
    const area = areas[index]
    if (!area) return
    setActiveId(area.id)
    if (orient) {
      const target = viewpoints[index % viewpoints.length] ?? home
      setRotation((value) => ({ x: nearestTurn(target.x, value.x), y: nearestTurn(target.y, value.y) }))
    }
  }
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY, moved: false }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const previous = drag.current
    if (!previous || previous.id !== event.pointerId) return
    const moved = previous.moved || Math.hypot(event.clientX - previous.originX, event.clientY - previous.originY) > 5
    if (moved) {
      if (!previous.moved) event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
      suppressClick.current = true
      setRotation((value) => ({ x: value.x - (event.clientY - previous.y) * .5, y: value.y + (event.clientX - previous.x) * .5 }))
    }
    drag.current = { ...previous, x: event.clientX, y: event.clientY, moved }
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function turn(x: number, y: number) {
    setRotation((value) => ({ x: value.x + x, y: value.y + y }))
  }

  return <section className={`${styles.workspace} ${expanded ? styles.expanded : ''}`} aria-label="Explorar las áreas del diagnóstico">
    <div className={styles.visual}>
      <div className={styles.visualHeading}><div><h2>Un proyecto. Seis perspectivas.</h2><p>Explora el cubo y conecta cada área con su observación.</p></div><button type="button" className={styles.iconButton} onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Reducir cubo' : 'Ampliar cubo'} aria-pressed={expanded}>{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
      <div className={styles.stage} tabIndex={0} role="group" aria-label="Cubo 360 interactivo. Usa las flechas para girar y la tecla Inicio para restablecer." onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={() => { drag.current = null; setDragging(false) }} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        const movement: Record<string, [number, number]> = { ArrowLeft: [0, -30], ArrowRight: [0, 30], ArrowUp: [30, 0], ArrowDown: [-30, 0] }
        const delta = movement[event.key]
        if (delta) { event.preventDefault(); turn(delta[0], delta[1]) }
        if (event.key === 'Home') { event.preventDefault(); setRotation(home) }
      }}>
        <div className={`${styles.cube} ${dragging ? styles.dragging : ''}`} style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}>
          {areas.map((area, index) => {
            const FaceIcon = icons[index % icons.length] ?? Compass
            const hasObservation = diagnostic.assessments.some((item) => item.area_id === area.id && item.observation.trim())
            return <button type="button" key={area.id} className={`${styles.face} ${styles[faces[index] ?? 'front']}`} style={{ '--face-color': palette[index % palette.length] } as CSSProperties} tabIndex={-1} aria-label={`Ver observación: ${area.name}`} onClick={() => { if (!suppressClick.current) selectArea(index, false) }}>
              <FaceIcon size={30} strokeWidth={1.4} /><span className={styles.faceName}>{area.name}</span><span className={styles.faceStatus}>{hasObservation ? <Check size={13} /> : null}{hasObservation ? 'Registrada' : 'Por completar'}</span>
            </button>
          })}
        </div>
      </div>
      <div className={styles.controls} role="group" aria-label="Controles de giro">
        <button type="button" className={styles.iconButton} aria-label="Girar a la izquierda" onClick={() => turn(0, -90)}><ArrowLeft size={18} /></button>
        <button type="button" className={styles.iconButton} aria-label="Girar hacia arriba" onClick={() => turn(90, 0)}><ArrowUp size={18} /></button>
        <button type="button" className={styles.reset} onClick={() => setRotation(home)}><RotateCcw size={16} /> Restablecer</button>
        <button type="button" className={styles.iconButton} aria-label="Girar hacia abajo" onClick={() => turn(-90, 0)}><ArrowDown size={18} /></button>
        <button type="button" className={styles.iconButton} aria-label="Girar a la derecha" onClick={() => turn(0, 90)}><ArrowRight size={18} /></button>
      </div>
      <p className={styles.hint}><Move size={14} /> Arrastra para girar · Elige un área para enfocarla</p>
    </div>
    <div className={styles.reader}>
      <div className={styles.readerHeading}><h2>Áreas del diagnóstico</h2><span>{recorded} de {areas.length} registradas</span></div>
      <div className={styles.areaList} role="group" aria-label="Seleccionar área">
        {areas.map((area, index) => {
          const AreaIcon = icons[index % icons.length] ?? Compass
          const hasObservation = diagnostic.assessments.some((item) => item.area_id === area.id && item.observation.trim())
          return <button type="button" key={area.id} className={styles.area} aria-pressed={active?.id === area.id} aria-controls="diagnostic-area-observation" onClick={() => selectArea(index)}>
            <span className={styles.swatch} style={{ backgroundColor: palette[index % palette.length] }}><AreaIcon size={19} strokeWidth={1.6} /></span><span>{area.name}</span>{hasObservation ? <Check size={16} className={styles.check} /> : <span className={styles.pendingDot} aria-label="Pendiente" />}
          </button>
        })}
      </div>
      {active && <article id="diagnostic-area-observation" className={styles.observation} aria-live="polite" aria-atomic="true">
        <div className={styles.observationHeading}><Icon size={21} strokeWidth={1.6} /><h3>{active.name}</h3></div>
        <span className={styles.observationStatus}>{observation?.trim() ? 'Observación registrada' : 'Pendiente de completar'}</span>
        <p>{observation?.trim() ? observation : 'Esta área todavía no tiene una observación. Puedes registrarla desde Continuar diagnóstico.'}</p>
        <div className={styles.areaNavigation}><button type="button" onClick={() => selectArea((activeIndex - 1 + areas.length) % areas.length)}><ArrowLeft size={15} /> Anterior</button><span>{activeIndex + 1} / {areas.length}</span><button type="button" onClick={() => selectArea((activeIndex + 1) % areas.length)}>Siguiente <ArrowRight size={15} /></button></div>
      </article>}
    </div>
    <p className={styles.note}>Este diagnóstico es descriptivo: las áreas registradas no representan un puntaje ni un porcentaje de avance.</p>
  </section>
}
