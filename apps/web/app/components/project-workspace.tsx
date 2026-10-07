'use client'

import { UserButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronRight, CircleHelp, Compass, FileText, FolderOpen, GitCompareArrows, Home, LayoutDashboard, Menu, MessageSquare, Search, Sparkles, Target, Users, Wallet } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { SeguimientoPanel } from './seguimiento-views'
import { MeetingsPanel } from './comunicacion-views'
import { ChannelsPanel } from './canales-views'
import { BandejaView } from './bandeja-views'
import { AssignmentPanel } from './administracion-views'
import { ReportsView } from './reports-view'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { ProjectHeading } from './project-reference-ui'
import { loadProjects, PROJECT_GROUPS, readProjectSection, type Project, type ProjectSection } from '../lib/project-workspace'
import { parseObjectiveList, parseEvidenceList, parseAmbitionList, requestSeguimiento, seguimientoUrl } from '../lib/seguimiento'

const icons = { Resumen: LayoutDashboard, 'Diagnóstico 360°': Compass, Ambiciones: Sparkles, 'Objetivos y actividades': Target, Evidencias: FolderOpen, Evolución: GitCompareArrows, Informes: FileText, Reuniones: CalendarDays, 'Finanzas y compras': Wallet, Chat: MessageSquare, Equipo: Users }
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
type SearchItem = { title: string; section: ProjectSection; id?: string }

export function ProjectWorkspace() {
  const me = useMe()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [route, setRoute] = useState<{ section: ProjectSection; id?: string }>({ section: 'Diagnóstico 360°' })
  const [menu, setMenu] = useState(false)
  const [picker, setPicker] = useState(false)
  const [help, setHelp] = useState(false)
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<SearchItem[]>([])
  const [searchError, setSearchError] = useState('')
  useEffect(() => {
    const update = () => { setRoute(readProjectSection(window.location.hash)); setQuery(''); setMenu(false) }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); setQuery('') } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  useEffect(() => {
    let active = true
    setLoaded(false)
    setError('')
    void loadProjects().then((items) => {
      if (!active) return
      const requested = new URLSearchParams(window.location.search).get('project')
      setProjects(items)
      setProjectId(requested ?? (items.length === 1 ? items[0]!.cycle.id : ''))
      if (!requested && items.length > 1) setPicker(true)
      setLoaded(true)
    }).catch((reason: unknown) => {
      if (!active) return
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los proyectos.')
      setLoaded(true)
    })
    return () => { active = false }
  }, [retry])
  const project = projects.find((item) => item.cycle.id === projectId)
  const cycleId = project?.cycle.id
  const searching = Boolean(query.trim())
  useEffect(() => {
    let active = true
    setRecords([])
    setSearchError('')
    if (!cycleId || !searching) return () => { active = false }
    void Promise.all([
      requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjectiveList),
      requestSeguimiento(seguimientoUrl(cycleId, 'evidence'), parseEvidenceList),
      requestSeguimiento(seguimientoUrl(cycleId, 'ambitions'), parseAmbitionList),
    ]).then(([objectives, evidence, ambitions]) => {
      if (!active) return
      if (!objectives.ok || !evidence.ok || !ambitions.ok) { setSearchError('No se pudo consultar la búsqueda del proyecto.'); return }
      setRecords([
        ...objectives.data.map((item) => ({ title: item.title, id: item.id, section: 'Objetivos y actividades' as const })),
        ...evidence.data.map((item) => ({ title: item.title, id: item.id, section: 'Evidencias' as const })),
        ...ambitions.data.map((item) => ({ title: item.title, id: item.id, section: 'Ambiciones' as const })),
      ])
    })
    return () => { active = false }
  }, [cycleId, searching])
  function navigate(section: ProjectSection, id?: string) {
    window.location.hash = encodeURIComponent(`${section}${id ? `/${id}` : ''}`)
    setRoute({ section, id })
    setMenu(false)
    setQuery('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function selectProject(item: Project) {
    setProjectId(item.cycle.id)
    const url = new URL(window.location.href)
    url.searchParams.set('project', item.cycle.id)
    window.history.replaceState(null, '', url)
    setPicker(false)
    navigate('Resumen')
  }
  const name = project?.entrepreneurship.name ?? 'Espacio del proyecto'
  const matches = [...records, ...PROJECT_GROUPS.flatMap((group) => group.sections.map((section) => ({ title: section, section })))].filter((item) => item.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).slice(0, 7)
  function content() {
    if (!project) return null
    const trackingViews = { Resumen: 'summary', 'Diagnóstico 360°': 'diagnostics', Ambiciones: 'ambitions', 'Objetivos y actividades': 'work', Evidencias: 'evidence', Evolución: 'evolution' } as const
    if (route.section in trackingViews) return <SeguimientoPanel cycleId={project.cycle.id} entrepreneurshipId={project.entrepreneurship.id} program={project.enrollment.program} view={trackingViews[route.section as keyof typeof trackingViews]} projectName={name} focusId={route.id} navigate={navigate} />
    if (route.section === 'Reuniones') return <><ProjectHeading eyebrow="Conversaciones que impulsan" title="Reuniones" /><MeetingsPanel cycleId={project.cycle.id} program={project.enrollment.program} /></>
    if (route.section === 'Chat') return <><ProjectHeading eyebrow="Cerca, incluso a la distancia" title="Chat" /><ChannelsPanel entrepreneurshipId={project.entrepreneurship.id} cycleId={project.cycle.id} /></>
    if (route.section === 'Alertas') return <><ProjectHeading eyebrow="Lo que necesita atención" title="Alertas" /><BandejaView /></>
    if (route.section === 'Equipo') return <>
      <ProjectHeading eyebrow="Personas que acompañan" title="Equipo" />
      {me.role === 'Emprendedor'
        ? <section className="panel empty"><p>La consulta de integrantes del equipo aún no está disponible en esta pantalla.</p></section>
        : <AssignmentPanel scope={{ kind: 'cycle', id: project.cycle.id }} />}
    </>
    if (route.section === 'Informes') return <ReportsView cycleId={project.cycle.id} focusId={route.id} />
    return <><ProjectHeading eyebrow="Recursos para avanzar" title={route.section} /><section className="panel"><p className="muted">Las reglas y el backend de finanzas y compras están pendientes de definición. No se muestran datos de demostración.</p></section></>
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Saltar al contenido</a>
    {menu && <button className="sidebar-scrim" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
      <button className="brand brand-button" onClick={() => navigate('Diagnóstico 360°')}><span className="brand-mark"><img src="/brand/logo.svg" alt="" /></span><span><strong>catalitec<span className="brand-period">.</span></strong><small>TEC EMPRENDE LAB</small></span></button>
      <button className="workspace" onClick={() => setPicker(true)}><span className="workspace-logo">{project ? initials(name) : '—'}</span><span><strong>{name}</strong><small>Espacio del proyecto</small></span><ChevronDown size={14} /></button>
      <nav aria-label="Navegación del proyecto">{PROJECT_GROUPS.map((group, index) => <div className="nav-group" key={group.label}>{index > 0 && <p className="nav-label">{group.label}</p>}{group.sections.map((section) => { const Icon = icons[section]; return <button key={section} onClick={() => navigate(section)} className={route.section === section ? 'active' : ''} aria-current={route.section === section ? 'page' : undefined}><Icon size={18} strokeWidth={1.7} /><span>{section}</span>{route.section === section && <i />}</button> })}</div>)}</nav>
      <div className="sidebar-bottom"><button className="help-link" onClick={() => setHelp(true)}><CircleHelp size={17} />Guía de acompañamiento<ArrowUpRight size={14} /></button><div className="profile"><span className="avatar sand">{initials(me.email)}</span><div><strong>{me.email}</strong><small>{me.role}</small></div><UserButton /></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="icon-btn mobile-menu" aria-label="Abrir navegación" onClick={() => setMenu(true)}><Menu size={21} /></button><button className="breadcrumb-home" onClick={() => setPicker(true)}><Home size={15} /><span>Proyectos</span></button><ChevronRight size={13} /><span>{name}</span><ChevronRight size={13} /><b>{route.section}</b></div><div className="top-actions"><div className="global-search"><label><Search size={17} /><input aria-label="Buscar en el proyecto" placeholder="Buscar en el proyecto…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{query && <div className="search-results">{searchError ? <p role="alert">{searchError}</p> : matches.length ? matches.map((item) => <button key={item.section + ('id' in item ? item.id : '')} onClick={() => navigate(item.section, 'id' in item ? item.id : undefined)}><span>{item.title}<small>{item.section}</small></span><ChevronRight size={15} /></button>) : <p>Sin resultados para «{query}».</p>}</div>}</div><button className="icon-btn notifications" aria-label="Ver alertas" onClick={() => navigate('Alertas')}><Bell size={19} /></button><span className="top-divider" /><UserButton /></div></header>
      <div className="project-context"><div><span className="project-symbol">{project ? initials(name) : '—'}</span><span><strong>{name}</strong><small>{project?.enrollment.program ?? 'Selecciona tu proyecto'}{project && project.cycle.name !== name ? <> <i /> {project.cycle.name}</> : null}</small></span></div><div className="project-team"><span>Acompañamos tu siguiente paso</span></div></div>
      <div className="page" id="main-content" tabIndex={-1}>
        {!loaded ? <p className="loading" role="status">Preparando tu espacio de acompañamiento…</p> : error ? <div className="notice error" role="alert"><p>{error}</p><button className="btn secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div> : !project ? <div className="empty"><h1>{projectId ? 'Proyecto no disponible' : 'Tu espacio de incubación'}</h1><p>{projectId ? 'Este proyecto no pertenece al listado autorizado para tu cuenta.' : projects.length ? 'Selecciona un proyecto para continuar.' : 'No hay proyectos con ciclos disponibles para tu cuenta.'}</p><button className="btn primary" onClick={() => setPicker(true)}>Ver proyectos</button></div> : <div key={`${project.cycle.id}/${route.section}/${route.id ?? ''}`}>{content()}</div>}
      </div>
      <footer className="app-footer"><span>Catalitec · Sistema de Incubación y Acompañamiento</span><span>Datos del expediente autorizado</span></footer>
    </main>
    <Dialog open={picker} onOpenChange={setPicker}><DialogContent><DialogHeader><DialogTitle>Tu espacio de incubación</DialogTitle><DialogDescription>Proyectos disponibles según tus asignaciones.</DialogDescription></DialogHeader>{projects.length === 0 ? <p>No hay proyectos disponibles.</p> : projects.map((item) => <button className="record-row" key={item.cycle.id} onClick={() => selectProject(item)}><span className="workspace-logo">{initials(item.entrepreneurship.name)}</span><div><strong>{item.entrepreneurship.name}</strong><p>{item.enrollment.program} · {item.cycle.name}</p></div><ChevronRight size={16} /></button>)}</DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>Del diagnóstico al siguiente paso</DialogTitle><DialogDescription>Este espacio reúne la mirada estratégica y el trabajo cotidiano de tu proyecto.</DialogDescription></DialogHeader><ol className="help-steps"><li>Registra el diagnóstico por áreas y envíalo a revisión.</li><li>Define objetivos vinculados a un área y, cuando corresponda, a una ambición.</li><li>Completa actividades con evidencia.</li><li>Compara fotografías aprobadas para observar la evolución.</li></ol></DialogContent></Dialog>
  </div>
}
