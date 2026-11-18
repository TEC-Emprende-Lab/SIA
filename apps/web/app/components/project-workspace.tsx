'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { ArrowUpRight, Bell, CalendarDays, ChevronDown, ChevronRight, CircleHelp, Compass, FileText, FolderOpen, GitCompareArrows, Home, LayoutDashboard, Menu, MessageSquare, Search, Flag, Target, Users, Wallet, X } from 'lucide-react'
import { useMe } from './authenticated-shell'
import { SeguimientoPanel } from './seguimiento-views'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { LoadingRows, LoadingState, SkeletonBar } from './ui/loading-state'
import { ProjectHeading } from './project-reference-ui'
import { ProjectWelcome } from './project-welcome'
import { loadProjects, PROJECT_GROUPS, readProjectSection, type Project, type ProjectSection } from '../lib/project-workspace'
import { parseObjectiveList, parseEvidenceList, parseAmbitionList, requestSeguimiento, seguimientoUrl } from '../lib/seguimiento'
import { canRegisterExpediente } from '../lib/expediente'
import { canViewTeam } from '../lib/administracion'

const icons = { Resumen: LayoutDashboard, 'Diagnóstico 360°': Compass, Ambiciones: Flag, 'Objetivos y actividades': Target, Evidencias: FolderOpen, Evolución: GitCompareArrows, Informes: FileText, Reuniones: CalendarDays, 'Finanzas y compras': Wallet, Chat: MessageSquare, Equipo: Users }
const MeetingsPanel = lazy(() => import('./comunicacion-views').then((module) => ({ default: module.MeetingsPanel })))
const ChannelsPanel = lazy(() => import('./canales-views').then((module) => ({ default: module.ChannelsPanel })))
const BandejaView = lazy(() => import('./bandeja-views').then((module) => ({ default: module.BandejaView })))
const AssignmentPanel = lazy(() => import('./administracion-views').then((module) => ({ default: module.AssignmentPanel })))
const ReportsView = lazy(() => import('./reports-view').then((module) => ({ default: module.ReportsView })))
const FinanzasView = lazy(() => import('./finanzas-view').then((module) => ({ default: module.FinanzasView })))
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
type SearchItem = { title: string; section: ProjectSection; id?: string }
const searchSections = ['Objetivos y actividades', 'Evidencias', 'Ambiciones'] as const
type SearchSection = typeof searchSections[number]
type SearchResource = { status: 'ready'; items: SearchItem[] } | { status: 'error' }
type SearchResult = { cycleId: string; sources: Partial<Record<SearchSection, SearchResource>> }

class ProjectModuleBoundary extends Component<{ children: ReactNode; title: string }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <>
      <ProjectHeading title={this.props.title} />
      <div className="notice error" role="alert">
        <p>No se pudo abrir esta sección. Puedes continuar en otro módulo o recargar la página.</p>
        <button type="button" className="btn secondary" onClick={() => window.location.reload()}>Recargar página</button>
      </div>
    </>
  }
}

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
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [searchAttempt, setSearchAttempt] = useState(0)
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
    const controller = new AbortController()
    setLoaded(false)
    setError('')
    void loadProjects(controller.signal).then((items) => {
      if (controller.signal.aborted) return
      const requested = new URLSearchParams(window.location.search).get('project')
      setProjects(items)
      setProjectId(requested ?? (items.length === 1 ? items[0]!.cycle.id : ''))
      if (!requested && items.length > 1) setPicker(true)
      setLoaded(true)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los proyectos.')
      setLoaded(true)
    })
    return () => controller.abort()
  }, [retry])
  const project = projects.find((item) => item.cycle.id === projectId)
  const cycleId = project?.cycle.id
  const searching = Boolean(query.trim())
  useEffect(() => {
    let active = true
    setSearchResult(null)
    if (!cycleId || !searching) return () => { active = false }
    const targetCycle = cycleId

    function complete(section: SearchSection, result: { ok: true; data: { id: string; title: string }[] } | { ok: false }) {
      if (!active) return
      let resource: SearchResource = { status: 'error' }
      if (result.ok) {
        resource = { status: 'ready', items: result.data.map(({ id, title }) => ({ id, title, section })) }
      }
      setSearchResult((current) => {
        const sources: SearchResult['sources'] = {}
        if (current?.cycleId === targetCycle) Object.assign(sources, current.sources)
        sources[section] = resource
        return { cycleId: targetCycle, sources }
      })
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void requestSeguimiento(seguimientoUrl(cycleId, 'objectives'), parseObjectiveList, undefined, controller.signal).then((result) => complete('Objetivos y actividades', result))
      void requestSeguimiento(seguimientoUrl(cycleId, 'evidence'), parseEvidenceList, undefined, controller.signal).then((result) => complete('Evidencias', result))
      void requestSeguimiento(seguimientoUrl(cycleId, 'ambitions'), parseAmbitionList, undefined, controller.signal).then((result) => complete('Ambiciones', result))
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [cycleId, searching, searchAttempt])
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
  const canManageProjects = canRegisterExpediente(me.role)
  const showTeam = canViewTeam(me.role)
  const projectGroups = PROJECT_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) => section !== 'Equipo' || showTeam),
  }))
  function searchContent() {
    const items: SearchItem[] = []
    const missing: string[] = []
    let loading = !loaded
    if (cycleId) {
      for (const section of searchSections) {
        const resource = searchResult?.cycleId === cycleId && searchResult.sources[section]
        if (!resource) loading = true
        else if (resource.status === 'error') missing.push(section)
        else items.push(...resource.items)
      }
    }
    for (const group of projectGroups) {
      for (const section of group.sections) items.push({ title: section, section })
    }
    const normalized = query.trim().toLocaleLowerCase('es')
    const matches = items.filter((item) => item.title.toLocaleLowerCase('es').includes(normalized)).slice(0, 7)
    return <>
      {matches.map((item) => (
        <button key={`${item.section}/${item.id ?? 'section'}`} onClick={() => navigate(item.section, item.id)}>
          <span>{item.title}<small>{item.section}</small></span><ChevronRight size={15} />
        </button>
      ))}
      {loading && <div className="project-search-loading"><LoadingRows label="Buscando en el proyecto…" rows={2} /></div>}
      {!loading && missing.length > 0 && <div className="project-search-feedback">
        <p role="status">No se pudo consultar: {missing.join(', ')}.</p>
        <button type="button" onClick={() => setSearchAttempt((value) => value + 1)}>Reintentar búsqueda</button>
      </div>}
      {!loading && missing.length === 0 && matches.length === 0 && <p>Sin resultados para «{query}».</p>}
    </>
  }
  function projectContext() {
    if (!loaded) {
      return <div aria-hidden="true">
        <span className="project-symbol" />
        <div className="project-context-placeholder"><SkeletonBar /><SkeletonBar size="text" /></div>
      </div>
    }
    let symbol = '—'
    let subtitle = 'Selecciona tu proyecto'
    if (project) {
      symbol = initials(name)
      subtitle = project.enrollment.program
      if (project.cycle.name !== name) subtitle += `, ${project.cycle.name}`
    }
    return <div><span className="project-symbol">{symbol}</span><span><strong>{name}</strong><small>{subtitle}</small></span></div>
  }
  function projectLoadError() {
    return <div className="notice error" role="alert"><p>{error}</p><button className="btn secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>
  }
  function workspaceContent() {
    if (!loaded) {
      return <LoadingState label="Cargando proyectos…">
        <div className="project-page-loading"><SkeletonBar /><SkeletonBar size="text" /></div>
      </LoadingState>
    }
    if (error) return projectLoadError()
    if (!project) return <ProjectWelcome unavailable={Boolean(projectId)} hasProjects={projects.length > 0} canManage={canManageProjects} onPick={() => setPicker(true)} onRefresh={() => setRetry((value) => value + 1)} />
    return <ProjectModuleBoundary key={`${project.cycle.id}/${route.section}/${route.id ?? ''}`} title={route.section}>
      <Suspense fallback={<>
        <ProjectHeading title={route.section} />
        <LoadingRows label={`Abriendo ${route.section}…`} />
      </>}>
        {content()}
      </Suspense>
    </ProjectModuleBoundary>
  }
  function pickerContent() {
    if (!loaded) return <LoadingRows label="Consultando proyectos…" rows={3} />
    if (error) return projectLoadError()
    if (projects.length === 0) {
      let message = 'Los proyectos aparecerán cuando tengas una asignación vigente y un ciclo disponible.'
      if (canManageProjects) message = 'Crea o completa un expediente con un programa y un ciclo. Después actualiza este listado.'
      return <div className="picker-empty"><FolderOpen size={28} aria-hidden="true" /><h3>Aún no hay ciclos disponibles</h3><p>{message}</p></div>
    }
    return projects.map((item) => (
      <button className="record-row project-choice" aria-pressed={item.cycle.id === projectId} key={item.cycle.id} onClick={() => selectProject(item)}>
        <span className="workspace-logo">{initials(item.entrepreneurship.name)}</span>
        <div><strong>{item.entrepreneurship.name}</strong><p>{item.enrollment.program}, {item.cycle.name}</p></div>
        <ChevronRight size={16} />
      </button>
    ))
  }
  function content() {
    if (!project) return null
    const trackingViews = { Resumen: 'summary', 'Diagnóstico 360°': 'diagnostics', Ambiciones: 'ambitions', 'Objetivos y actividades': 'work', Evidencias: 'evidence', Evolución: 'evolution' } as const
    if (route.section in trackingViews) return <SeguimientoPanel cycleId={project.cycle.id} entrepreneurshipId={project.entrepreneurship.id} program={project.enrollment.program} view={trackingViews[route.section as keyof typeof trackingViews]} projectName={name} focusId={route.id} navigate={navigate} />
    if (route.section === 'Reuniones') return <><ProjectHeading eyebrow="Conversaciones que impulsan" title="Reuniones" /><MeetingsPanel cycleId={project.cycle.id} program={project.enrollment.program} /></>
    if (route.section === 'Chat') return <><ProjectHeading eyebrow="Cerca, incluso a la distancia" title="Chat" /><ChannelsPanel entrepreneurshipId={project.entrepreneurship.id} cycleId={project.cycle.id} /></>
    if (route.section === 'Alertas') return <><ProjectHeading eyebrow="Lo que necesita atención" title="Alertas" /><BandejaView /></>
    if (route.section === 'Equipo') {
      if (!showTeam) {
        return <section className="panel"><h1>Acceso no disponible</h1><p>Tu rol no puede consultar las asignaciones.</p></section>
      }
      return <>
        <ProjectHeading title="Equipo" />
        <AssignmentPanel scope={{ kind: 'cycle', id: project.cycle.id }} />
      </>
    }
    if (route.section === 'Informes') return <ReportsView cycleId={project.cycle.id} focusId={route.id} />
    if (route.section === 'Finanzas y compras') return <FinanzasView cycleId={project.cycle.id} entrepreneurshipId={project.entrepreneurship.id} program={project.enrollment.program} />
    return <><ProjectHeading eyebrow="Recursos para avanzar" title={route.section} /><section className="panel"><p className="muted">Las reglas y el backend de finanzas y compras están pendientes de definición. No se muestran datos de demostración.</p></section></>
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Saltar al contenido</a>
    {menu && <button className="sidebar-scrim" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
      <button className="brand brand-button" onClick={() => project ? navigate('Diagnóstico 360°') : setPicker(true)}><span className="brand-mark"><img src="/brand/logo.svg" alt="" /></span><span><strong>SIA</strong><small>TEC Emprende Lab</small></span></button>
      <button className="workspace" onClick={() => setPicker(true)}><span className="workspace-logo">{project ? initials(name) : '—'}</span><span><strong>{name}</strong><small>Espacio del proyecto</small></span><ChevronDown size={14} /></button>
      {canManageProjects && <nav aria-label="Administración" className="workspace-administration">
        <Link className="expediente-link" href="/expediente" onClick={() => setMenu(false)}>
          <FolderOpen size={18} strokeWidth={1.7} aria-hidden="true" />
          <span>Expedientes</span>
        </Link>
      </nav>}
      <nav aria-label="Navegación del proyecto">{projectGroups.map((group, index) => <div className="nav-group" key={group.label}>{index > 0 && <p className="nav-label">{group.label}</p>}{group.sections.map((section) => { const Icon = icons[section]; const current = Boolean(project) && route.section === section; return <button key={section} onClick={() => project ? navigate(section) : setPicker(true)} className={current ? 'active' : ''} aria-current={current ? 'page' : undefined}><Icon size={18} strokeWidth={1.7} /><span>{section}</span>{current && <i />}</button> })}</div>)}</nav>
      <div className="sidebar-bottom"><button className="help-link" onClick={() => setHelp(true)}><CircleHelp size={17} />Guía de acompañamiento<ArrowUpRight size={14} /></button><div className="profile"><span className="profile-avatar"><UserButton appearance={{ elements: { avatarBox: { width: '38px', height: '38px' }, userButtonTrigger: { padding: 0 } } }} /></span><div className="profile-details"><strong title={me.email}>{me.email}</strong><small>{me.role}</small></div></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-btn mobile-menu" aria-label="Abrir navegación" onClick={() => setMenu(true)}><Menu size={21} /></button><button className="breadcrumb-home" onClick={() => setPicker(true)}><Home size={15} /><span>Proyectos</span></button><ChevronRight size={13} /><span>{name}</span><ChevronRight size={13} /><b>{project ? route.section : 'Inicio'}</b></div>
        <div className="top-actions">
          <div className="global-search">
            <label><Search size={17} /><input aria-label="Buscar en el proyecto" placeholder="Buscar en el proyecto…" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            {query && <button className="icon-btn search-clear" aria-label="Limpiar búsqueda del proyecto" onClick={() => setQuery('')}><X size={15} /></button>}
            {searching && <div className="search-results"><p className="search-scope">Objetivos, evidencias, ambiciones y secciones</p>{searchContent()}</div>}
          </div>
          <Link href="/bandeja" className="icon-btn notifications" aria-label="Abrir bandeja"><Bell size={19} aria-hidden="true" /></Link><span className="top-divider" /><UserButton />
        </div>
      </header>
      <div className="project-context">{projectContext()}</div>
      <div className="page" id="main-content" tabIndex={-1}>
        {workspaceContent()}
      </div>
      <footer className="app-footer"><span>Catalitec<span className="footer-description">Sistema de Incubación y Acompañamiento</span></span><span>Datos del expediente autorizado</span></footer>
    </main>
    <Dialog open={picker} onOpenChange={setPicker}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tu espacio de incubación</DialogTitle><DialogDescription>Elige el ciclo en el que quieres trabajar. Cada uno conserva su propio seguimiento.</DialogDescription></DialogHeader>
        {pickerContent()}
        <div className="picker-footer">{canManageProjects && <Link className="btn secondary" href="/expediente">Gestionar expedientes <ArrowUpRight size={15} /></Link>}<button className="btn secondary" disabled={!loaded} onClick={() => setRetry((value) => value + 1)}>Actualizar listado</button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>Del diagnóstico al siguiente paso</DialogTitle><DialogDescription>Este espacio reúne la mirada estratégica y el trabajo cotidiano de tu proyecto.</DialogDescription></DialogHeader><ol className="help-steps"><li>Registra el diagnóstico por áreas y envíalo a revisión.</li><li>Define objetivos vinculados a un área y, cuando corresponda, a una ambición.</li><li>Completa actividades con evidencia.</li><li>Compara fotografías aprobadas para observar la evolución.</li></ol></DialogContent></Dialog>
  </div>
}
