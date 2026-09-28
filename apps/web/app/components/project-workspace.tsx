'use client'

import type { components } from '@sia/contracts/src/generated'
import { UserButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

type Schema = components['schemas']
type Me = Schema['MeOut']
type Entrepreneurship = Schema['EntrepreneurshipOut']
type Enrollment = Schema['ProgramEnrollmentOut']
type Cycle = Schema['ProgramCycleOut']
type Canvas = Schema['CanvasOut']
type Ambition = Schema['AmbitionOut']
type Objective = Schema['ObjectiveOut']
type Activity = Schema['ActivityOut']
type Evidence = Schema['EvidenceOut']
type Diagnostic = Schema['DiagnosticOut']
type ScheduleItem = Schema['ScheduleItem']
type Validation = Schema['ValidationOut']
type Meeting = Schema['MeetingOut']
type Minutes = Schema['MinutesOut']
type Agreement = Schema['AgreementOut']
type Channel = Schema['ChannelOut']
type Message = Schema['MessageOut']
type Alert = Schema['AlertOut']
type Notification = Schema['NotificationOut']
type Report = Schema['ReportOut']

type Tab = 'overview' | 'diagnostics' | 'ambitions' | 'work' | 'evidence' | 'evolution' | 'reports' | 'meetings' | 'chat' | 'inbox' | 'finance'
type LoadState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T }

const emptyCycleData = {
  canvas: null as Canvas | null,
  ambitions: [] as Ambition[],
  objectives: [] as Objective[],
  activities: [] as Activity[],
  evidence: [] as Evidence[],
  diagnostics: [] as Diagnostic[],
  schedule: [] as ScheduleItem[],
  validations: [] as Validation[],
  meetings: [] as Meeting[],
  reports: [] as Report[],
}

type CycleData = typeof emptyCycleData

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    'Resumen': <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    'Diagnóstico 360°': <><circle cx="12" cy="12" r="8" /><path d="m9 15 6-6M12 4v3M20 12h-3" /></>,
    'Ambiciones': <><path d="M12 3 14.2 9.8 21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" /></>,
    'Objetivos y actividades': <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M22 12h-2" /></>,
    'Evidencias': <><path d="M4 6.5h6l2 2h8v10H4z" /><path d="M4 6.5V5h6" /></>,
    'Evolución': <><path d="M5 7h12l-3-3M19 17H7l3 3M17 7l2 2-2 2M7 17l-2-2 2-2" /></>,
    'Informes': <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    'Reuniones': <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    'Finanzas y compras': <><path d="M5 7h14v12H5z" /><path d="M5 10h14M9 15h3" /></>,
    'Chat': <><path d="M5 5h14v11H9l-4 3z" /></>,
    'Alertas': <><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" /></>,
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/sia/${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: unknown }
    throw new Error(typeof body.detail === 'string' ? body.detail : `Error ${response.status}`)
  }
  return response.json() as Promise<T>
}

function displayDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(value))
}

function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <p className={`notice${error ? ' error' : ''}`}>{children}</p>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel stack"><h2>{title}</h2>{children}</section>
}

export function ProjectWorkspace() {
  const [identity, setIdentity] = useState<LoadState<Me>>({ status: 'loading' })
  const [projects, setProjects] = useState<LoadState<Entrepreneurship[]>>({ status: 'loading' })
  const [selectedProject, setSelectedProject] = useState<Entrepreneurship | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null)
  const [cycleData, setCycleData] = useState<LoadState<CycleData>>({ status: 'loading' })
  const [tab, setTab] = useState<Tab>('overview')
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  async function reloadProjects() {
    try {
      const data = await api<Entrepreneurship[]>('entrepreneurships?limit=50&offset=0')
      setProjects({ status: 'ready', data })
      setSelectedProject((current) => current && data.some((item) => item.id === current.id) ? current : (data[0] ?? null))
    } catch (error) {
      setProjects({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el expediente' })
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const me = await api<Me>('me')
        if (active) setIdentity({ status: 'ready', data: me })
      } catch (error) {
        if (active) setIdentity({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo consultar la identidad' })
      }
      if (active) void reloadProjects()
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setEnrollments([])
      setCycles([])
      setSelectedCycle(null)
      return
    }
    const project = selectedProject
    let active = true
    async function loadProject() {
      try {
        const enrollmentData = await api<Enrollment[]>(`entrepreneurships/${project.id}/enrollments?limit=50&offset=0`)
        const cyclesByEnrollment = await Promise.all(
          enrollmentData.map(async (enrollment) => ({
            enrollment,
            cycles: await api<Cycle[]>(`entrepreneurships/enrollments/${enrollment.id}/cycles?limit=50&offset=0`),
          })),
        )
        if (!active) return
        const nextCycles = cyclesByEnrollment.flatMap((entry) => entry.cycles)
        setEnrollments(enrollmentData)
        setCycles(nextCycles)
        setSelectedCycle((current) => current && nextCycles.some((cycle) => cycle.id === current.id) ? current : (nextCycles[0] ?? null))
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'No se pudo cargar los ciclos')
      }
    }
    void loadProject()
    return () => { active = false }
  }, [selectedProject])

  async function reloadCycle() {
    if (!selectedCycle) return
    setCycleData({ status: 'loading' })
    try {
      const base = `cycles/${selectedCycle.id}`
      const [canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations, meetings, reports] = await Promise.all([
        api<Canvas>(`${base}/seguimiento/canvas`),
        api<Ambition[]>(`${base}/seguimiento/ambitions`),
        api<Objective[]>(`${base}/seguimiento/objectives`),
        api<Activity[]>(`${base}/seguimiento/activities`),
        api<Evidence[]>(`${base}/seguimiento/evidence`),
        api<Diagnostic[]>(`${base}/seguimiento/diagnostics`),
        api<ScheduleItem[]>(`${base}/seguimiento/schedule`),
        api<Validation[]>(`${base}/seguimiento/validations`),
        api<Meeting[]>(`${base}/meetings?limit=50&offset=0`),
        api<Report[]>(`${base}/reports?limit=50&offset=0`),
      ])
      setCycleData({ status: 'ready', data: { canvas, ambitions, objectives, activities, evidence, diagnostics, schedule, validations, meetings, reports } })
    } catch (error) {
      setCycleData({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el ciclo' })
    }
  }

  useEffect(() => { void reloadCycle() }, [selectedCycle])

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api<Entrepreneurship>('entrepreneurships', { method: 'POST', body: JSON.stringify({ name: form.get('name') }) })
      event.currentTarget.reset()
      setMessage('Emprendimiento creado.')
      await reloadProjects()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear el emprendimiento')
    }
  }

  if (identity.status === 'loading' || projects.status === 'loading') return <main className="workspace"><p>Conectando con SIA…</p></main>
  if (identity.status === 'error') return <main className="workspace"><Notice error>{identity.message}</Notice></main>
  if (projects.status === 'error') return <main className="workspace"><Notice error>{projects.message}</Notice></main>

  const navigation: { id: Tab; label: string; group: string }[] = [
    { id: 'overview', label: 'Resumen', group: 'General' }, { id: 'diagnostics', label: 'Diagnóstico 360°', group: 'Acompañamiento' }, { id: 'ambitions', label: 'Ambiciones', group: 'Acompañamiento' }, { id: 'work', label: 'Objetivos y actividades', group: 'Acompañamiento' }, { id: 'evidence', label: 'Evidencias', group: 'Acompañamiento' }, { id: 'evolution', label: 'Evolución', group: 'Acompañamiento' }, { id: 'reports', label: 'Informes', group: 'Acompañamiento' }, { id: 'meetings', label: 'Reuniones', group: 'Espacio del proyecto' }, { id: 'finance', label: 'Finanzas y compras', group: 'Espacio del proyecto' }, { id: 'chat', label: 'Chat', group: 'Espacio del proyecto' }, { id: 'inbox', label: 'Alertas', group: 'Espacio del proyecto' },
  ]

  return <main className="app-shell">
    <aside className="project-sidebar">
      <button className="wordmark" type="button" onClick={() => setTab('overview')}><span className="brand-mark">c</span><span><strong>catalitec<span>.</span></strong><small>TEC EMPRENDE LAB</small></span></button>
      <div className="project-picker"><span className="project-monogram">{selectedProject?.name.slice(0, 2).toUpperCase() ?? 'SIA'}</span><div><strong>{selectedProject?.name ?? 'Espacio del proyecto'}</strong><small>Espacio del proyecto</small></div><span className="picker-chevron">⌄</span></div>
      <div className="project-list sidebar-projects" aria-label="Emprendimientos autorizados">
        {projects.data.map((project) => <button key={project.id} className="project-button" aria-current={selectedProject?.id === project.id || undefined} onClick={() => setSelectedProject(project)}>{project.name}</button>)}
      </div>
      {projects.data.length === 0 && <p className="sidebar-empty">No hay emprendimientos autorizados.</p>}
      <nav className="sidebar-nav" aria-label="Navegación del proyecto">
        {['General', 'Acompañamiento', 'Espacio del proyecto'].map((group) => <div className="nav-group" key={group}>{group !== 'General' && <p>{group}</p>}{navigation.filter((item) => item.group === group).map(({ id, label }) => <button key={id} className="module-button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><NavIcon name={label} /><span>{label}</span>{tab === id && <i />}</button>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><button className="guide-button" type="button" onClick={() => setMessage('La guía de acompañamiento está pendiente de definición.')}>Guía de acompañamiento <span>↗</span></button><div className="profile"><span className="avatar">{identity.data.email.slice(0, 2).toUpperCase()}</span><div><strong>{identity.data.email}</strong><small>{identity.data.role}</small></div></div></div>
    </aside>
    <div className="app-canvas">
      <header className="project-topbar"><div className="crumb">Proyectos <span>›</span> {selectedProject?.name ?? 'Expediente'} <span>›</span> <b>{navigation.find((item) => item.id === tab)?.label}</b></div><div className="top-actions"><label className="global-search"><NavIcon name="Evidencias" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en el proyecto…" aria-label="Buscar en el proyecto" /></label><button className="alert-button" type="button" onClick={() => setTab('inbox')} aria-label="Ver alertas"><NavIcon name="Alertas" /></button><span className="top-divider" /><UserButton /></div></header>
      {message && <Notice error={message.startsWith('No se pudo') || message.startsWith('No autorizado')}>{message}</Notice>}
      {!selectedProject ? <section className="empty-state"><h1>Tu espacio de acompañamiento empieza aquí.</h1><p>Cuando tengas acceso a un emprendimiento, su expediente y ciclos autorizados aparecerán en este espacio.</p>{(identity.data.role === 'Coordinadora' || identity.data.role === 'Gestor') && <form className="create-project" onSubmit={createProject}><label>Nombre del emprendimiento<input required name="name" maxLength={200} /></label><button className="button">Crear expediente</button></form>}</section> : <>
        <section className="project-context"><div><span className="project-symbol">{selectedProject.name.slice(0, 2).toUpperCase()}</span><span><strong>{selectedProject.name}</strong><small>{enrollments.find((item) => item.id === selectedCycle?.enrollment_id)?.program ?? 'Expediente conectado'} <i /> {cycles.length} ciclos autorizados</small></span><span className="tag">Activo</span></div><label className="cycle-select">Ciclo de trabajo<select value={selectedCycle?.id ?? ''} onChange={(event) => setSelectedCycle(cycles.find((cycle) => cycle.id === event.target.value) ?? null)}><option value="">Selecciona un ciclo</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{enrollments.find((item) => item.id === cycle.enrollment_id)?.program ?? 'Programa'} · {cycle.name}</option>)}</select></label></section>
        {selectedCycle && <><div className="mobile-module-nav"><select value={tab} onChange={(event) => setTab(event.target.value as Tab)}>{navigation.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}</select></div><div className="page">{cycleData.status === 'loading' && <section className="content-panel loading-state">Cargando los datos autorizados del ciclo…</section>}{cycleData.status === 'error' && <Notice error>{cycleData.message}</Notice>}{cycleData.status === 'ready' && <CyclePanel tab={tab} project={selectedProject} cycle={selectedCycle} role={identity.data.role} data={cycleData.data} onRefresh={reloadCycle} onMessage={setMessage} />}</div></>}
        {cycles.length === 0 && <section className="empty-state"><h1>Este expediente aún no tiene ciclos.</h1><p>La creación de inscripciones y ciclos se administra desde los flujos autorizados de la API.</p></section>}
      </>}
    </div>
  </main>
}

function CyclePanel({ tab, project, cycle, role, data, onRefresh, onMessage }: { tab: Tab; project: Entrepreneurship; cycle: Cycle; role: string; data: CycleData; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  if (tab === 'overview') return <Overview data={data} cycle={cycle} />
  if (tab === 'diagnostics') return <Diagnostics data={data} />
  if (tab === 'ambitions') return <Ambitions data={data} cycle={cycle} onRefresh={onRefresh} onMessage={onMessage} />
  if (tab === 'work') return <Tracking data={data} cycle={cycle} role={role} onRefresh={onRefresh} onMessage={onMessage} />
  if (tab === 'evidence') return <EvidenceView data={data} />
  if (tab === 'evolution') return <Evolution data={data} />
  if (tab === 'reports') return <Reports data={data} cycle={cycle} role={role} onRefresh={onRefresh} onMessage={onMessage} />
  if (tab === 'meetings') return <div className="stack"><MeetingRecords meetings={data.meetings} cycle={cycle} role={role} onMessage={onMessage} /><MinutesApprovals meetings={data.meetings} cycle={cycle} role={role} onMessage={onMessage} /></div>
  if (tab === 'chat') return <Communication data={data} project={project} cycle={cycle} role={role} onMessage={onMessage} />
  if (tab === 'inbox') return <InboxHub onMessage={onMessage} />
  return <section className="empty-state"><h1>Finanzas y compras</h1><p>Este módulo requiere definiciones funcionales y un backend financiero aprobado. No se muestran datos simulados.</p></section>
}

function Diagnostics({ data }: { data: CycleData }) {
  return <div className="view-stack"><header className="view-heading"><h1>Diagnóstico 360°</h1><p>Una fotografía descriptiva por cada área oficial del canvas. Las escalas numéricas siguen pendientes de definición.</p></header><div className="area-grid">{data.canvas?.areas.map((area) => <article className="area-card" key={area.id}><span>{String(area.position).padStart(2, '0')}</span><h2>{area.name}</h2><p>{area.description}</p></article>)}</div><Section title="Historial de diagnósticos"><ul className="list diagnostic-list">{data.diagnostics.map((item) => <li className="item" key={item.id}><div><strong>{displayDate(item.assessed_on)}</strong><p>{item.assessments.length} áreas registradas · {item.status}</p></div><span className="tag">{item.status}</span></li>)}{data.diagnostics.length === 0 && <li className="empty">No hay diagnósticos registrados para este ciclo.</li>}</ul></Section></div>
}

function Ambitions({ data, cycle, onRefresh, onMessage }: { data: CycleData; cycle: Cycle; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  async function createAmbition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api<Ambition>(`cycles/${cycle.id}/seguimiento/ambitions`, { method: 'POST', body: JSON.stringify({ title: form.get('title'), description: form.get('description') || '' }) })
      event.currentTarget.reset()
      onMessage('Ambición registrada.')
      await onRefresh()
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo guardar la ambición') }
  }
  return <div className="view-stack"><header className="view-heading"><h1>Ambiciones</h1><p>Direcciones persistentes del emprendimiento. Se pueden vincular de forma opcional a un objetivo del ciclo.</p></header><div className="ambition-grid">{data.ambitions.map((ambition) => <article className="ambition-card" key={ambition.id}><h2>{ambition.title}</h2><p>{ambition.description || 'Sin descripción adicional.'}</p></article>)}{data.ambitions.length === 0 && <p className="empty">No hay ambiciones registradas.</p>}</div><Section title="Registrar una ambición"><form className="form-grid" onSubmit={createAmbition}><label>Ambición<input name="title" required maxLength={200} /></label><label className="wide">Descripción<textarea name="description" maxLength={20000} /></label><button className="button">Guardar ambición</button></form></Section></div>
}

function EvidenceView({ data }: { data: CycleData }) {
  return <div className="view-stack"><header className="view-heading"><h1>Evidencias</h1><p>Referencias inmutables vinculadas a actividades. Los adjuntos privados aún no forman parte de este flujo.</p></header><div className="evidence-grid">{data.evidence.map((item) => <a className="evidence-card" href={item.url} target="_blank" rel="noreferrer" key={item.id}><span>{item.kind}</span><h2>{item.title}</h2><p>{item.description || 'Abrir referencia externa'}</p></a>)}{data.evidence.length === 0 && <p className="empty">No hay evidencias URL registradas.</p>}</div></div>
}

function Evolution({ data }: { data: CycleData }) {
  const approved = data.diagnostics.filter((item) => item.status === 'approved')
  return <div className="view-stack"><header className="view-heading"><h1>Evolución</h1><p>La comparación conserva las observaciones aprobadas de un mismo canvas; no atribuye un puntaje ni progreso automático.</p></header><Section title="Fotografías aprobadas"><ul className="list timeline-list">{approved.map((item) => <li className="item" key={item.id}><strong>{displayDate(item.assessed_on)}</strong><p>{item.assessments.length} áreas descriptivas aprobadas.</p></li>)}{approved.length < 2 && <li className="empty">Se requieren al menos dos diagnósticos aprobados del mismo ciclo para comparar su evolución.</li>}</ul></Section></div>
}

function Reports({ data, cycle, role, onRefresh, onMessage }: { data: CycleData; cycle: Cycle; role: string; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  const canManage = role === 'Coordinadora' || role === 'Gestor'
  async function createReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api<Report>(`cycles/${cycle.id}/reports`, { method: 'POST', body: JSON.stringify({ period_start: form.get('period_start'), period_end: form.get('period_end'), kind: 'mensual', narrative: form.get('narrative') || '' }) })
      event.currentTarget.reset()
      onMessage('Informe creado como borrador.')
      await onRefresh()
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo crear el informe') }
  }
  return <div className="view-stack"><header className="view-heading"><h1>Informes</h1><p>Versiones trazables construidas con fuentes del período. La emisión PDF se muestra solo cuando la API la registra.</p></header><ul className="report-list">{data.reports.map((report) => <li className="report-row" key={report.id}><div><strong>Informe {report.kind} · versión {report.version}</strong><p>{displayDate(report.period_start)} — {displayDate(report.period_end)} · {report.narrative || 'Sin narrativa adicional'}</p></div><span className="tag">{report.status}</span></li>)}{data.reports.length === 0 && <li className="empty">No hay informes para este ciclo.</li>}</ul>{canManage && <Section title="Nuevo informe"><form className="form-grid" onSubmit={createReport}><label>Inicio del período<input name="period_start" type="date" required /></label><label>Fin del período<input name="period_end" type="date" required /></label><label className="wide">Narrativa<textarea name="narrative" maxLength={20000} /></label><button className="button">Crear borrador</button></form></Section>}</div>
}

function Overview({ data, cycle }: { data: CycleData; cycle: Cycle }) {
  return <div className="split"><Section title="Ciclo activo"><p><strong>{cycle.name}</strong></p><p>Canvas {data.canvas?.program ?? 'no disponible'} · {data.canvas?.areas.length ?? 0} áreas.</p><p>{data.objectives.length} objetivos, {data.activities.length} actividades y {data.meetings.length} reuniones registradas.</p></Section><Section title="Próximas actividades"><ul className="list">{data.schedule.slice(0, 5).map((item) => <li className="item" key={item.id}><strong>{item.title}</strong><p>{displayDate(item.starts_on)} — {displayDate(item.ends_on)}</p></li>)}{data.schedule.length === 0 && <li className="empty">El cronograma se deriva de las actividades.</li>}</ul></Section></div>
}

function Tracking({ data, cycle, role, onRefresh, onMessage }: { data: CycleData; cycle: Cycle; role: string; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  const canEdit = role === 'Coordinadora' || role === 'Gestor' || role === 'Emprendedor'
  async function createObjective(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api<Objective>(`cycles/${cycle.id}/seguimiento/objectives`, { method: 'POST', body: JSON.stringify({ title: form.get('title'), description: form.get('description') || '', area_id: form.get('area_id'), ambition_id: form.get('ambition_id') || null, deliverable: form.get('deliverable') || null }) })
      event.currentTarget.reset(); onMessage('Objetivo creado como borrador.'); await onRefresh()
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo crear el objetivo') }
  }
  return <div className="stack">
    <Section title="Canvas y ambiciones"><div className="split"><ul className="list">{data.canvas?.areas.map((area) => <li className="item" key={area.id}><strong>{area.position}. {area.name}</strong><p>{area.description}</p></li>)}</ul><ul className="list">{data.ambitions.map((ambition) => <li className="item" key={ambition.id}><strong>{ambition.title}</strong><p>{ambition.description || 'Sin descripción'}</p></li>)}{data.ambitions.length === 0 && <li className="empty">No hay ambiciones registradas.</li>}</ul></div></Section>
    <Section title="Objetivos y actividades"><ul className="list">{data.objectives.map((objective) => <li className="item" key={objective.id}><span className="tag">{objective.status}</span><strong> {objective.title}</strong><p>{objective.description || 'Sin descripción'} · {data.activities.filter((activity) => activity.objective_id === objective.id).length} actividades</p></li>)}{data.objectives.length === 0 && <li className="empty">Todavía no hay objetivos para este ciclo.</li>}</ul>{canEdit && data.canvas && <form className="form-grid" onSubmit={createObjective}><label>Objetivo<input name="title" required maxLength={200} /></label><label>Área<select name="area_id" required defaultValue=""><option value="" disabled>Selecciona un área</option>{data.canvas.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label>Ambición opcional<select name="ambition_id" defaultValue=""><option value="">Sin ambición</option>{data.ambitions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Entregable opcional<input name="deliverable" maxLength={200} /></label><label className="wide">Descripción<textarea name="description" maxLength={20000} /></label><button className="button">Crear objetivo</button></form>}</Section>
    <div className="split"><Section title="Evidencias"><ul className="list">{data.evidence.map((item) => <li className="item" key={item.id}><a href={item.url} target="_blank" rel="noreferrer"><strong>{item.title}</strong></a><p>{item.kind} · {item.description || 'Sin descripción'}</p></li>)}{data.evidence.length === 0 && <li className="empty">Solo se admiten referencias URL autorizadas; los archivos privados siguen pendientes.</li>}</ul></Section><Section title="Diagnósticos y validaciones"><ul className="list">{data.diagnostics.map((item) => <li className="item" key={item.id}><strong>{displayDate(item.assessed_on)}</strong><p>{item.status} · {item.assessments.length} áreas descriptivas</p></li>)}{data.validations.map((item) => <li className="item" key={item.id}><strong>{item.decision}</strong><p>{item.observation}</p></li>)}{data.diagnostics.length === 0 && data.validations.length === 0 && <li className="empty">No hay fotografías ni decisiones registradas.</li>}</ul></Section></div>
    {canEdit && data.canvas && <TrackingForms data={data} cycle={cycle} onRefresh={onRefresh} onMessage={onMessage} />}
    <TrackingActions data={data} cycle={cycle} role={role} onRefresh={onRefresh} onMessage={onMessage} />
  </div>
}

function TrackingForms({ data, cycle, onRefresh, onMessage }: { data: CycleData; cycle: Cycle; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  async function submit(event: React.FormEvent<HTMLFormElement>, path: string, payload: (form: FormData) => object, success: string) {
    event.preventDefault()
    try {
      await api(path, { method: 'POST', body: JSON.stringify(payload(new FormData(event.currentTarget))) })
      event.currentTarget.reset(); onMessage(success); await onRefresh()
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo guardar el registro') }
  }
  return <div className="split">
    <Section title="Registrar avance"><form className="form-grid" onSubmit={(event) => void submit(event, `cycles/${cycle.id}/seguimiento/ambitions`, (form) => ({ title: form.get('title'), description: form.get('description') || '' }), 'Ambición registrada.')}><label>Ambición<input name="title" required maxLength={200} /></label><label className="wide">Descripción<textarea name="description" maxLength={20000} /></label><button className="button">Guardar ambición</button></form><form className="form-grid" onSubmit={(event) => void submit(event, `cycles/${cycle.id}/seguimiento/activities`, (form) => ({ title: form.get('title'), description: form.get('description') || '', objective_id: form.get('objective_id'), responsible_id: form.get('responsible_id'), starts_on: form.get('starts_on'), ends_on: form.get('ends_on') }), 'Actividad registrada.')}><label>Actividad<input name="title" required maxLength={200} /></label><label>Objetivo<select name="objective_id" required defaultValue=""><option value="" disabled>Selecciona un objetivo</option>{data.objectives.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Responsable (ID SIA)<input name="responsible_id" required /></label><label>Inicio<input name="starts_on" type="date" required /></label><label>Fin<input name="ends_on" type="date" required /></label><label className="wide">Descripción<textarea name="description" maxLength={20000} /></label><button className="button">Registrar actividad</button></form></Section>
    <Section title="Evidencia y diagnóstico"><form className="form-grid" onSubmit={(event) => void submit(event, `cycles/${cycle.id}/seguimiento/evidence`, (form) => ({ title: form.get('title'), description: form.get('description') || '', activity_id: form.get('activity_id'), kind: 'link', url: form.get('url') }), 'Referencia de evidencia registrada.')}><label>Evidencia<input name="title" required maxLength={200} /></label><label>Actividad<select name="activity_id" required defaultValue=""><option value="" disabled>Selecciona una actividad</option>{data.activities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="wide">URL HTTPS<input name="url" type="url" required /></label><label className="wide">Descripción<textarea name="description" maxLength={20000} /></label><button className="button">Registrar enlace</button></form><form className="form-grid" onSubmit={(event) => void submit(event, `cycles/${cycle.id}/seguimiento/diagnostics`, (form) => ({ assessed_on: form.get('assessed_on'), assessments: data.canvas!.areas.map((area) => ({ area_id: area.id, observation: form.get(`area-${area.id}`) })) }), 'Fotografía descriptiva creada como borrador.')}><label className="wide">Fecha de fotografía<input name="assessed_on" type="date" required /></label>{data.canvas!.areas.map((area) => <label className="wide" key={area.id}>{area.name}<textarea name={`area-${area.id}`} required maxLength={20000} /></label>)}<button className="button">Crear diagnóstico</button></form></Section>
  </div>
}

function TrackingActions({ data, cycle, role, onRefresh, onMessage }: { data: CycleData; cycle: Cycle; role: string; onRefresh: () => Promise<void>; onMessage: (message: string) => void }) {
  const canValidate = role === 'Coordinadora' || role === 'Gestor'
  async function transition(path: string, payload: object, success: string) {
    try { await api(path, { method: 'POST', body: JSON.stringify(payload) }); onMessage(success); await onRefresh() } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo aplicar la transición') }
  }
  async function validate(event: React.FormEvent<HTMLFormElement>, kind: 'objectives' | 'diagnostics') {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const id = String(form.get('entity_id'))
    const entity = kind === 'objectives' ? data.objectives.find((item) => item.id === id) : data.diagnostics.find((item) => item.id === id)
    if (!entity) return
    await transition(`cycles/${cycle.id}/seguimiento/${kind}/${id}/validations`, { expected_revision: entity.revision, decision: form.get('decision'), observation: form.get('observation') }, 'Decisión registrada con trazabilidad.')
    event.currentTarget.reset()
  }
  return <Section title="Enviar, completar y validar"><div className="split"><div className="stack"><h2>Objetivos y actividades</h2><ul className="list">{data.objectives.filter((item) => item.status === 'draft' || item.status === 'correction_requested').map((item) => <li className="item" key={item.id}><strong>{item.title}</strong><button className="button secondary" type="button" onClick={() => void transition(`cycles/${cycle.id}/seguimiento/objectives/${item.id}/submit`, { expected_revision: item.revision }, 'Objetivo enviado a validación.')}>Enviar a validación</button></li>)}{data.activities.filter((item) => !item.completed_at).map((item) => <li className="item" key={item.id}><strong>{item.title}</strong><button className="button secondary" type="button" onClick={() => void transition(`cycles/${cycle.id}/seguimiento/activities/${item.id}/completion`, { expected_revision: item.revision, completed: true }, 'Actividad marcada como completada.')}>Marcar completada</button></li>)}</ul></div><div className="stack"><h2>Diagnósticos</h2><ul className="list">{data.diagnostics.filter((item) => item.status === 'draft' || item.status === 'correction_requested').map((item) => <li className="item" key={item.id}><strong>{displayDate(item.assessed_on)}</strong><button className="button secondary" type="button" onClick={() => void transition(`cycles/${cycle.id}/seguimiento/diagnostics/${item.id}/submit`, { expected_revision: item.revision }, 'Diagnóstico enviado a validación.')}>Enviar a validación</button></li>)}</ul></div></div>{canValidate && <div className="split"><form className="form-grid" onSubmit={(event) => void validate(event, 'objectives')}><label>Objetivo<select name="entity_id" required defaultValue=""><option value="" disabled>Selecciona un objetivo</option>{data.objectives.filter((item) => item.status === 'pending_validation').map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Decisión<select name="decision" defaultValue="approve"><option value="approve">Aprobar</option><option value="request_correction">Solicitar corrección</option><option value="reject">Rechazar</option></select></label><label className="wide">Observación<textarea name="observation" required maxLength={20000} /></label><button className="button">Validar objetivo</button></form><form className="form-grid" onSubmit={(event) => void validate(event, 'diagnostics')}><label>Diagnóstico<select name="entity_id" required defaultValue=""><option value="" disabled>Selecciona un diagnóstico</option>{data.diagnostics.filter((item) => item.status === 'pending_validation').map((item) => <option key={item.id} value={item.id}>{displayDate(item.assessed_on)}</option>)}</select></label><label>Decisión<select name="decision" defaultValue="approve"><option value="approve">Aprobar</option><option value="request_correction">Solicitar corrección</option><option value="reject">Rechazar</option></select></label><label className="wide">Observación<textarea name="observation" required maxLength={20000} /></label><button className="button">Validar diagnóstico</button></form></div>}</Section>
}

function MinutesApprovals({ meetings, cycle, role, onMessage }: { meetings: Meeting[]; cycle: Cycle; role: string; onMessage: (message: string) => void }) {
  const [meetingId, setMeetingId] = useState('')
  const [minutes, setMinutes] = useState<Minutes[]>([])
  const canApprove = role === 'Coordinadora' || role === 'Gestor'
  useEffect(() => {
    if (!meetingId) { setMinutes([]); return }
    void api<Minutes[]>(`cycles/${cycle.id}/meetings/${meetingId}/minutes?limit=50&offset=0`).then(setMinutes).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudieron cargar las minutas'))
  }, [meetingId, cycle.id])
  async function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const minute = minutes.find((item) => item.id === form.get('minutes_id'))
    if (!minute || !meetingId) return
    try {
      const approved = await api<Minutes>(`cycles/${cycle.id}/meetings/${meetingId}/minutes/${minute.id}/approval`, { method: 'POST', body: JSON.stringify({ expected_revision: minute.revision, observation: form.get('observation'), human_reviewed: true }) })
      setMinutes((items) => items.map((item) => item.id === approved.id ? approved : item))
      event.currentTarget.reset(); onMessage('Minuta aprobada. Su contenido ahora es inmutable.')
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo aprobar la minuta') }
  }
  if (!canApprove || meetings.length === 0) return null
  return <Section title="Aprobación humana de minutas"><form className="form-grid" onSubmit={approve}><label>Reunión<select value={meetingId} onChange={(event) => setMeetingId(event.target.value)} required><option value="" disabled>Selecciona una reunión</option>{meetings.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Minuta borrador<select name="minutes_id" required defaultValue=""><option value="" disabled>Selecciona una minuta</option>{minutes.filter((item) => item.status === 'borrador' && !item.revoked_at).map((item) => <option key={item.id} value={item.id}>{item.content.slice(0, 80)}</option>)}</select></label><label className="wide">Observación de revisión<textarea name="observation" required maxLength={20000} /></label><button className="button">Aprobar minuta revisada</button></form></Section>
}

function MeetingRecords({ meetings, cycle, role, onMessage }: { meetings: Meeting[]; cycle: Cycle; role: string; onMessage: (message: string) => void }) {
  const [meeting, setMeeting] = useState<Meeting | null>(meetings[0] ?? null)
  const [minutes, setMinutes] = useState<Minutes[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const canManage = role === 'Coordinadora' || role === 'Gestor'
  useEffect(() => { setMeeting((current) => current && meetings.some((item) => item.id === current.id) ? current : (meetings[0] ?? null)) }, [meetings])
  useEffect(() => {
    if (!meeting) { setMinutes([]); setAgreements([]); return }
    void Promise.all([
      api<Minutes[]>(`cycles/${cycle.id}/meetings/${meeting.id}/minutes?limit=50&offset=0`),
      api<Agreement[]>(`cycles/${cycle.id}/meetings/${meeting.id}/agreements?limit=50&offset=0`),
    ]).then(([nextMinutes, nextAgreements]) => { setMinutes(nextMinutes); setAgreements(nextAgreements) }).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudieron cargar minutas y acuerdos'))
  }, [meeting, cycle.id])
  async function addMinutes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!meeting) return
    const form = new FormData(event.currentTarget)
    try { const record = await api<Minutes>(`cycles/${cycle.id}/meetings/${meeting.id}/minutes`, { method: 'POST', body: JSON.stringify({ content: form.get('content') }) }); setMinutes((items) => [...items, record]); event.currentTarget.reset(); onMessage('Minuta guardada como borrador.') } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo guardar la minuta') }
  }
  async function addAgreement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!meeting) return
    const form = new FormData(event.currentTarget)
    try { const record = await api<Agreement>(`cycles/${cycle.id}/meetings/${meeting.id}/agreements`, { method: 'POST', body: JSON.stringify({ description: form.get('description'), responsible_id: form.get('responsible_id'), due_date: form.get('due_date'), next_steps: form.get('next_steps') || '' }) }); setAgreements((items) => [...items, record]); event.currentTarget.reset(); onMessage('Acuerdo registrado.') } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo guardar el acuerdo') }
  }
  return <Section title="Minutas y acuerdos"><label>Reunión<select value={meeting?.id ?? ''} onChange={(event) => setMeeting(meetings.find((item) => item.id === event.target.value) ?? null)}><option value="">Selecciona una reunión</option>{meetings.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{!meeting && <p className="empty">Registra o selecciona una reunión para consultar sus minutas y acuerdos.</p>}{meeting && <div className="split"><div className="stack"><ul className="list">{minutes.map((item) => <li className="item" key={item.id}><span className="tag">{item.status}</span><p>{item.content}</p></li>)}{minutes.length === 0 && <li className="empty">No hay minutas.</li>}</ul>{canManage && <form className="stack" onSubmit={addMinutes}><label>Minuta manual<textarea name="content" required maxLength={20000} /></label><button className="button">Guardar borrador</button></form>}</div><div className="stack"><ul className="list">{agreements.map((item) => <li className="item" key={item.id}><strong>{item.description}</strong><p>Responsable: {item.responsible_id} · {displayDate(item.due_date)}</p><p>{item.next_steps}</p></li>)}{agreements.length === 0 && <li className="empty">No hay acuerdos.</li>}</ul>{canManage && <form className="form-grid" onSubmit={addAgreement}><label className="wide">Acuerdo<textarea name="description" required maxLength={20000} /></label><label>Responsable (ID SIA)<input name="responsible_id" required /></label><label>Vencimiento<input name="due_date" type="date" required /></label><label className="wide">Próximos pasos<textarea name="next_steps" maxLength={20000} /></label><button className="button">Registrar acuerdo</button></form>}</div></div>}</Section>
}

function Communication({ data, project, cycle, role, onMessage }: { data: CycleData; project: Entrepreneurship; cycle: Cycle; role: string; onMessage: (message: string) => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const canManage = role === 'Coordinadora' || role === 'Gestor'
  useEffect(() => { void api<Channel[]>(`channels?entrepreneurship_id=${project.id}&cycle_id=${cycle.id}&limit=50&offset=0`).then((items) => { setChannels(items); setSelectedChannel(items[0] ?? null) }).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudieron cargar los canales')) }, [project.id, cycle.id])
  useEffect(() => { if (selectedChannel) void api<Message[]>(`channels/${selectedChannel.id}/messages?limit=50&offset=0`).then(setMessages).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudieron cargar los mensajes')) }, [selectedChannel])
  async function createMeeting(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { await api<Meeting>(`cycles/${cycle.id}/meetings`, { method: 'POST', body: JSON.stringify({ title: form.get('title'), scheduled_at: new Date(String(form.get('scheduled_at'))).toISOString(), participants: String(form.get('participants')).split(',').map((item) => item.trim()).filter(Boolean), reference_url: form.get('reference_url') || null }) }); event.currentTarget.reset(); onMessage('Reunión registrada. Recarga el ciclo para verla.') } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo registrar la reunión') } }
  async function createChannel(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const channel = await api<Channel>('channels', { method: 'POST', body: JSON.stringify({ entrepreneurship_id: project.id, cycle_id: cycle.id, name: form.get('name') }) }); setChannels((items) => [...items, channel]); setSelectedChannel(channel); event.currentTarget.reset() } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo crear el canal') } }
  async function sendMessage(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selectedChannel) return; const form = new FormData(event.currentTarget); try { const entry = await api<Message>(`channels/${selectedChannel.id}/messages`, { method: 'POST', body: JSON.stringify({ content: form.get('content'), mentioned_user_ids: [] }) }); setMessages((items) => [...items, entry]); event.currentTarget.reset() } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo enviar el mensaje') } }
  return <div className="stack"><div className="split"><Section title="Reuniones"><ul className="list">{data.meetings.map((meeting) => <li className="item" key={meeting.id}><strong>{meeting.title}</strong><p>{displayDate(meeting.scheduled_at)} · {meeting.participants.join(', ')}</p></li>)}{data.meetings.length === 0 && <li className="empty">No hay reuniones registradas.</li>}</ul>{canManage && <form className="form-grid" onSubmit={createMeeting}><label>Reunión<input name="title" required /></label><label>Fecha y hora<input name="scheduled_at" type="datetime-local" required /></label><label className="wide">Participantes, separados por coma<input name="participants" required /></label><label className="wide">Enlace opcional<input name="reference_url" type="url" /></label><button className="button">Registrar reunión</button></form>}</Section><Section title="Canales y mensajes"><div className="project-list">{channels.map((channel) => <button className="project-button" aria-current={selectedChannel?.id === channel.id || undefined} key={channel.id} onClick={() => setSelectedChannel(channel)}>{channel.name}</button>)}</div>{canManage && <form className="toolbar" onSubmit={createChannel}><label className="sr-only">Nombre del canal<input name="name" required /></label><input name="name" required placeholder="Nuevo canal" maxLength={200} /><button className="button secondary">Crear</button></form>}<ul className="list">{messages.map((entry) => <li className="item" key={entry.id}><strong>{entry.revoked_at ? 'Mensaje revocado' : entry.created_by}</strong><p>{entry.content ?? 'Contenido no disponible'}</p></li>)}</ul>{selectedChannel && <form className="toolbar" onSubmit={sendMessage}><label className="sr-only">Mensaje<input name="content" required /></label><input name="content" required maxLength={20000} placeholder="Escribe un mensaje" /><button className="button">Enviar</button></form>}</Section></div><Section title="Minutas y acuerdos"><p className="notice">Selecciona una reunión registrada para gestionar sus minutas y acuerdos. Las minutas aprobadas permanecen inmutables; las integraciones de IA y grabaciones no están habilitadas.</p></Section></div>
}

function InboxHub({ onMessage }: { onMessage: (message: string) => void }) {
  return <div className="stack"><Inbox onMessage={onMessage} /><NotificationActions onMessage={onMessage} /></div>
}

function NotificationActions({ onMessage }: { onMessage: (message: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  useEffect(() => { void api<Notification[]>('notifications?limit=50&offset=0').then(setNotifications).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones')) }, [])
  async function markRead(notification: Notification) {
    try {
      const updated = await api<Notification>(`notifications/${notification.id}/read`, { method: 'PUT', body: '{}' })
      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item))
      onMessage('Notificación marcada como leída.')
    } catch (error) { onMessage(error instanceof Error ? error.message : 'No se pudo actualizar la notificación') }
  }
  const unread = notifications.filter((item) => !item.read_at)
  if (unread.length === 0) return null
  return <Section title="Pendientes de lectura"><ul className="list">{unread.map((item) => <li className="item" key={item.id}><p>Notificación del {displayDate(item.created_at)}</p><button className="button secondary" type="button" onClick={() => void markRead(item)}>Marcar como leída</button></li>)}</ul></Section>
}

function Inbox({ onMessage }: { onMessage: (message: string) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  useEffect(() => { void Promise.all([api<Alert[]>('alerts?limit=50&offset=0'), api<Notification[]>('notifications?limit=50&offset=0')]).then(([nextAlerts, nextNotifications]) => { setAlerts(nextAlerts); setNotifications(nextNotifications) }).catch((error) => onMessage(error instanceof Error ? error.message : 'No se pudo cargar la bandeja')) }, [])
  return <div className="split"><Section title="Alertas"><ul className="list">{alerts.map((alert) => <li className="item" key={alert.id}><span className="tag">{alert.kind}</span><p>{alert.detail}</p></li>)}{alerts.length === 0 && <li className="empty">No tienes alertas pendientes.</li>}</ul></Section><Section title="Notificaciones"><ul className="list">{notifications.map((item) => <li className="item" key={item.id}><strong>{item.read_at ? 'Leída' : 'Pendiente'}</strong><p>{displayDate(item.created_at)}</p></li>)}{notifications.length === 0 && <li className="empty">No tienes notificaciones.</li>}</ul></Section></div>
}
