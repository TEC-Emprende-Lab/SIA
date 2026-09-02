import { useState, type ReactNode } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BarChart,
  Bell,
  Calendar,
  CheckCircle,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Filter,
  Folder,
  Home,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Target,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import brandMark from '../../brand/logo.svg'
import './App.css'

type ProjectSection =
  | 'Resumen'
  | 'Objetivos y actividades'
  | 'Reuniones'
  | 'Finanzas y compras'
  | 'Documentos y entregables'
  | 'Chat'
  | 'Alertas'
  | 'Equipo'

const sections: ProjectSection[] = [
  'Resumen',
  'Objetivos y actividades',
  'Reuniones',
  'Finanzas y compras',
  'Documentos y entregables',
  'Chat',
  'Alertas',
  'Equipo',
]

const navItems = [
  { label: 'Inicio', icon: Home },
  { label: 'Proyectos', icon: Folder },
  { label: 'Alertas', icon: Bell, count: 5 },
  { label: 'Reportes', icon: BarChart },
]

function App() {
  const [screen, setScreen] = useState<'dashboard' | 'project'>('dashboard')
  const [section, setSection] = useState<ProjectSection>('Resumen')
  const [menuOpen, setMenuOpen] = useState(false)

  const openProject = (nextSection: ProjectSection = 'Resumen') => {
    setSection(nextSection)
    setScreen('project')
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><img src={brandMark} alt="" /></div>
          <div><strong>SIA</strong><span>TEC Emprende Lab</span></div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><X size={19} /></button>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} className={screen === 'dashboard' && label === 'Inicio' ? 'active' : ''} onClick={() => setScreen('dashboard')}>
              <Icon size={18} /> <span>{label}</span>{count && <em>{count}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-label">Administración</div>
        <button className="admin-link"><Users size={18} /> Usuarios e invitaciones</button>
        <button className="admin-link"><Settings size={18} /> Configuración</button>
        <div className="profile-card">
          <div className="avatar avatar-sand">MC</div>
          <div><strong>María Calderón</strong><span>Coordinadora</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button>
          <div className="breadcrumb">
            {screen === 'project' && <button onClick={() => setScreen('dashboard')}><ArrowLeft size={17} /> Proyectos</button>}
            <span>{screen === 'dashboard' ? 'Visión general' : 'Lumen Biotech'}</span>
          </div>
          <div className="top-actions">
            <label className="search"><Search size={17} /><input placeholder="Buscar en SIA" /></label>
            <button className="icon-button notification"><Bell size={19} /><i>3</i></button>
            <div className="avatar avatar-blue">MC</div>
          </div>
        </header>

        {screen === 'dashboard' ? <Dashboard onOpenProject={openProject} /> : <ProjectView section={section} onSection={setSection} />}
      </main>
    </div>
  )
}

function Dashboard({ onOpenProject }: { onOpenProject: (section?: ProjectSection) => void }) {
  return (
    <div className="page dashboard-page">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">Martes, 1 de septiembre</p>
          <h1>Buenos días, María.</h1>
          <p className="welcome-copy">Esta semana hay <strong>5 acciones</strong> que necesitan seguimiento en la incubadora.</p>
        </div>
        <div className="welcome-art"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><Target size={56} strokeWidth={1.25} /></div>
      </section>

      <section className="metric-grid">
        <Metric icon={<Folder />} label="Proyectos activos" value="14" meta="2 finalizan este mes" tone="olive" />
        <Metric icon={<AlertCircle />} label="Alertas abiertas" value="5" meta="3 requieren atención" tone="orange" />
        <Metric icon={<Wallet />} label="Presupuesto disponible" value="₡18.4 M" meta="de ₡32.0 M asignados" tone="blue" />
        <Metric icon={<ClipboardList />} label="Trámites en proceso" value="9" meta="4 esperan revisión" tone="clay" />
      </section>

      <div className="content-grid dashboard-grid">
        <section className="panel projects-panel">
          <PanelHeader title="Proyectos con seguimiento pendiente" action="Ver todos" />
          <div className="project-list">
            <ProjectRow name="Lumen Biotech" category="Prototipado · Salud" progress={68} alert="Trámite por revisar" alertTone="warning" onClick={() => onOpenProject()} />
            <ProjectRow name="Raíz Circular" category="Puesta en Marcha · Economía circular" progress={41} alert="Reunión pendiente" alertTone="danger" onClick={() => onOpenProject('Reuniones')} />
            <ProjectRow name="Bruma Studio" category="Prototipado · Industrias creativas" progress={84} alert="Sin alertas" alertTone="success" onClick={() => onOpenProject('Objetivos y actividades')} />
            <ProjectRow name="Aurea Foods" category="Puesta en Marcha · Alimentos" progress={27} alert="Objetivo por aprobar" alertTone="warning" onClick={() => onOpenProject('Objetivos y actividades')} />
          </div>
        </section>

        <section className="panel agenda-panel">
          <PanelHeader title="Próximas reuniones" action="Abrir agenda" />
          <div className="agenda-date"><span>SEP</span><strong>03</strong><small>Miércoles</small></div>
          <div className="meeting-item"><div className="time">09:00</div><div><strong>Lumen Biotech</strong><span>Seguimiento mensual · Meet</span></div><ChevronRight size={18} /></div>
          <div className="meeting-item"><div className="time">14:30</div><div><strong>Raíz Circular</strong><span>Revisión de entregable · Sala Lab</span></div><ChevronRight size={18} /></div>
          <button className="quiet-button"><Calendar size={16} /> Ver calendario completo</button>
        </section>
      </div>

      <section className="panel activity-panel">
        <PanelHeader title="Actividad reciente" action="Ver historial" />
        <div className="activity-feed">
          <ActivityItem avatar="AM" color="orange" text={<><strong>Andrea Morales</strong> envió el trámite <b>Compra de reactivos</b></>} time="Hace 18 min" />
          <ActivityItem avatar="JS" color="blue" text={<><strong>Javier Soto</strong> aprobó el objetivo <b>Validar prueba piloto</b></>} time="Hace 1 h" />
          <ActivityItem avatar="MC" color="sand" text={<><strong>María Calderón</strong> publicó la minuta de la reunión de Lumen Biotech</>} time="Ayer" />
        </div>
      </section>
    </div>
  )
}

function ProjectView({ section, onSection }: { section: ProjectSection; onSection: (section: ProjectSection) => void }) {
  return (
    <div className="project-page">
      <section className="project-hero">
        <div className="project-heading">
          <div className="project-monogram">LB</div>
          <div><p className="eyebrow">Prototipado · Salud</p><h1>Lumen Biotech</h1><span className="status active-status"><Circle size={8} fill="currentColor" /> Activo</span></div>
        </div>
        <div className="project-quick-stats"><span><b>68%</b> avance</span><span><b>₡1.8 M</b> disponible</span><span><b>2</b> alertas</span></div>
        <button className="primary-button"><Plus size={17} /> Nueva acción</button>
      </section>

      <div className="section-tabs" role="tablist" aria-label="Secciones del proyecto">
        {sections.map((item) => <button key={item} className={section === item ? 'selected' : ''} onClick={() => onSection(item)}>{item}</button>)}
      </div>

      <div className="page project-content">{renderProjectSection(section)}</div>
    </div>
  )
}

function renderProjectSection(section: ProjectSection) {
  switch (section) {
    case 'Objetivos y actividades': return <Objectives />
    case 'Reuniones': return <Meetings />
    case 'Finanzas y compras': return <Finance />
    case 'Documentos y entregables': return <Documents />
    case 'Chat': return <Chat />
    case 'Alertas': return <Alerts />
    case 'Equipo': return <Team />
    default: return <ProjectSummary />
  }
}

function ProjectSummary() {
  return <>
    <div className="summary-grid">
      <section className="panel progress-panel"><PanelHeader title="Avance del proyecto" action="Ver plan de trabajo" />
        <div className="progress-ring"><div><strong>68%</strong><span>completado</span></div></div>
        <div className="progress-legend"><span><i className="dot olive-dot" /> 2 objetivos aprobados</span><span><i className="dot sand-dot" /> 1 en revisión</span></div>
      </section>
      <section className="panel attention-panel"><PanelHeader title="Requiere atención" action="Ver alertas" />
        <Attention icon={<ClipboardList />} title="Trámite por revisar" detail="Compra de reactivos · hace 2 días" />
        <Attention icon={<Calendar />} title="Reunión en 2 días" detail="Seguimiento mensual · 3 de septiembre" />
        <Attention icon={<MessageSquare />} title="3 mensajes sin leer" detail="Chat del proyecto" />
      </section>
      <section className="panel recent-panel"><PanelHeader title="Últimos movimientos" action="Ver actividad" />
        <ActivityItem avatar="AM" color="orange" text={<>Andrea agregó <b>proforma-reactivos.pdf</b></>} time="Hace 18 min" />
        <ActivityItem avatar="JS" color="blue" text={<>Javier aprobó una actividad</>} time="Ayer" />
      </section>
    </div>
    <section className="panel summary-work"><PanelHeader title="Plan de trabajo" action="Abrir objetivos y actividades" />
      <div className="objective-overview"><div><span className="number-chip">01</span><strong>Validar prueba piloto</strong><small>4 de 5 actividades completadas</small></div><ProgressBar value={80} /><span className="status success-status">Aprobado</span></div>
      <div className="objective-overview"><div><span className="number-chip">02</span><strong>Preparar estrategia regulatoria</strong><small>2 de 4 actividades completadas</small></div><ProgressBar value={50} /><span className="status review-status">En revisión</span></div>
    </section>
  </>
}

function Objectives() { return <section className="kanban-module"><div className="module-head kanban-head"><div><p className="eyebrow">Plan de trabajo</p><h2>Objetivos y actividades</h2></div><div className="view-actions"><button className="view-toggle selected"><LayoutDashboard size={15} /> Kanban</button><button className="view-toggle"><ListTodo size={15} /> Lista</button><button className="primary-button"><Plus size={17} /> Nueva actividad</button></div></div>
  <div className="objective-summary-strip"><div><span className="number-chip">01</span><p><strong>Validar prueba piloto con usuarios</strong><small>80% completado · 5 actividades</small></p><ProgressBar value={80} /></div><span className="status success-status">Objetivo aprobado</span></div>
  <div className="objective-summary-strip secondary-objective"><div><span className="number-chip">02</span><p><strong>Preparar estrategia regulatoria</strong><small>50% completado · 4 actividades</small></p><ProgressBar value={50} /></div><span className="status review-status">Objetivo en revisión</span></div>
  <div className="kanban-board">
    <KanbanColumn title="Por iniciar" count="2" accent="sand"><KanbanCard title="Documentar hallazgos" objective="01 · Prueba piloto" due="6 sep." owner="AM" evidence="0 evidencias" /><KanbanCard title="Mapear requisitos regulatorios" objective="02 · Estrategia regulatoria" due="12 sep." owner="JS" evidence="1 evidencia" /></KanbanColumn>
    <KanbanColumn title="En curso" count="2" accent="orange"><KanbanCard title="Analizar resultados de sesiones" objective="01 · Prueba piloto" due="4 sep." owner="AM" evidence="2 evidencias" emphasized /><KanbanCard title="Preparar matriz de riesgos" objective="02 · Estrategia regulatoria" due="10 sep." owner="CR" evidence="0 evidencias" /></KanbanColumn>
    <KanbanColumn title="En revisión" count="1" accent="blue"><KanbanCard title="Definir ruta de validación" objective="02 · Estrategia regulatoria" due="2 sep." owner="JS" evidence="3 evidencias" /></KanbanColumn>
    <KanbanColumn title="Completadas" count="4" accent="olive"><KanbanCard title="Realizar sesiones piloto" objective="01 · Prueba piloto" due="Completada 29 ago." owner="AM" evidence="4 evidencias" done /><KanbanCard title="Reclutar participantes" objective="01 · Prueba piloto" due="Completada 18 ago." owner="AM" evidence="2 evidencias" done /></KanbanColumn>
  </div>
</section> }

function Meetings() { return <div className="module-grid"><section className="panel full-panel"><div className="module-head"><div><p className="eyebrow">Agenda</p><h2>Próximas reuniones</h2></div><button className="primary-button"><Plus size={17} /> Agendar reunión</button></div><div className="schedule-grid"><div className="schedule-day"><span>SEP</span><strong>03</strong><small>Miércoles</small></div><div className="schedule-info"><h3>Seguimiento mensual</h3><p><Clock size={15} /> 09:00 - 10:00 &nbsp; <span>·</span> &nbsp; Google Meet</p><div className="mini-avatars"><i>MC</i><i>JS</i><i>AM</i><span>+2 participantes</span></div></div><button className="quiet-button">Abrir reunión <ArrowUpRight size={15} /></button></div></section><section className="panel full-panel"><PanelHeader title="Historial de reuniones" action="Ver todas" /><div className="history-row"><Calendar size={19} /><div><strong>Revisión de avance agosto</strong><span>22 ago. 2026 · Minuta publicada</span></div><span className="status success-status">Minuta lista</span><ChevronRight size={18} /></div><div className="history-row"><Calendar size={19} /><div><strong>Definición de prueba piloto</strong><span>24 jul. 2026 · Transcripción disponible</span></div><span className="status info-status">Con transcripción</span><ChevronRight size={18} /></div></section></div> }

function Finance() { const rows = [['Compra de reactivos', 'Orden de compra', '₡420 000', 'IN_SIGNATURE_PROCESS'], ['Servicio de laboratorio', 'Pago de contrato', '₡275 000', 'UNDER_REVIEW'], ['Materiales de prototipo', 'Orden de compra', '₡185 000', 'APPROVED']]; return <><div className="module-head finance-head"><div><p className="eyebrow">Gestión financiera</p><h2>Finanzas y compras</h2></div><button className="primary-button"><Plus size={17} /> Nueva solicitud</button></div><div className="finance-tabs"><button className="selected">Resumen</button><button>Solicitudes <b>6</b></button><button>Movimientos</button><button>Reportes</button></div><div className="metric-grid budget-metrics"><Metric icon={<Wallet />} label="Presupuesto asignado" value="₡5.0 M" meta="Actualizado el 12 de agosto" tone="olive" /><Metric icon={<CheckCircle />} label="Monto aprobado" value="₡2.1 M" meta="42% del presupuesto" tone="blue" /><Metric icon={<Clock />} label="Monto en proceso" value="₡880 k" meta="3 solicitudes activas" tone="orange" /><Metric icon={<Activity />} label="Disponible" value="₡2.9 M" meta="58% por utilizar" tone="clay" /></div><div className="finance-overview"><section className="panel finance-budget-card"><PanelHeader title="Uso del presupuesto" action="Ver movimientos" /><div className="budget-track"><div className="budget-track-bar"><span className="approved" style={{ width: '42%' }} /><span className="process" style={{ width: '18%' }} /></div><div className="budget-legend"><span><i className="dot olive-dot" /> Aprobado <b>₡2.1 M</b></span><span><i className="dot orange-dot" /> En proceso <b>₡880 k</b></span><span><i className="dot sand-dot" /> Disponible <b>₡2.9 M</b></span></div></div><div className="finance-note"><AlertCircle size={16} /><p>El monto en proceso se visualiza para planificar, pero solo los trámites aprobados descuentan el saldo.</p></div></section><section className="panel finance-status-card"><PanelHeader title="Estado de solicitudes" action="Ver todas" /><div className="status-count"><span className="status review-status">En revisión</span><b>2</b><small>Requieren gestión del equipo</small></div><div className="status-count"><span className="status warning-status">En firmas</span><b>1</b><small>En proceso administrativo</small></div><div className="status-count"><span className="status success-status">Aprobadas</span><b>2</b><small>Contabilizadas en presupuesto</small></div></section></div><section className="panel full-panel"><PanelHeader title="Solicitudes recientes" action="Ver todas las solicitudes" /><div className="table-tools"><div className="filter-group"><button className="filter active-filter">Todas <b>6</b></button><button className="filter">Pendientes <b>3</b></button><button className="filter">Aprobadas <b>2</b></button></div><button className="quiet-button"><Filter size={15} /> Filtrar</button></div><div className="data-table"><div className="table-row table-heading"><span>Solicitud</span><span>Tipo</span><span>Monto</span><span>Estado</span><span /></div>{rows.map(([name, type, amount, status]) => <div className="table-row" key={name}><div><strong>{name}</strong><small>Actualizado hoy</small></div><span>{type}</span><strong>{amount}</strong><StatusLabel status={status} /><button className="table-action"><MoreHorizontal size={18} /></button></div>)}</div></section></> }

function Documents() { return <div className="module-grid"><section className="panel full-panel"><div className="module-head"><div><p className="eyebrow">Resultados del proyecto</p><h2>Entregables</h2></div><button className="primary-button"><Upload size={17} /> Cargar entregable</button></div><div className="deliverable-grid"><Deliverable title="Informe de validación piloto" type="PDF · 3.2 MB" status="APPROVED" /><Deliverable title="Presentación de resultados" type="PPTX · 7.8 MB" status="REQUIRES_CORRECTION" /><Deliverable title="Protocolo de ensayo" type="DOCX · 1.4 MB" status="SUBMITTED" /></div></section><section className="panel full-panel"><PanelHeader title="Archivos del proyecto" action="Ver todos" /><div className="file-row"><FileText size={20} /><div><strong>Guía de marca Lumen.pdf</strong><span>Subido por Andrea Morales · 18 ago.</span></div><button className="icon-button"><Download size={17} /></button></div><div className="file-row"><FileText size={20} /><div><strong>Mapa de actores.xlsx</strong><span>Subido por Javier Soto · 12 ago.</span></div><button className="icon-button"><Download size={17} /></button></div></section></div> }

function Chat() { return <section className="panel chat-panel"><div className="chat-top"><div><p className="eyebrow">Conversación general</p><h2>Chat del proyecto</h2></div><div className="online"><i /> 5 miembros</div></div><div className="chat-messages"><ChatMessage initials="AM" color="orange" name="Andrea Morales" time="10:12" text={<>Buenos días, ya subí la cotización para los reactivos. <mark>@Javier Soto</mark>, ¿podés revisarla?</>} attachment="cotizacion-reactivos.pdf · 1.2 MB" /><ChatMessage initials="JS" color="blue" name="Javier Soto" time="10:28" text={<>Claro, Andrea. La reviso hoy y te aviso si hace falta algo.</>} /><div className="deleted-message"><Trash2 size={15} /> Andrea Morales eliminó un mensaje <span>10:31</span></div><ChatMessage initials="MC" color="sand" name="María Calderón" time="11:04" text={<>También dejé la agenda para nuestra reunión del miércoles. Nos vemos ahí.</>} /></div><div className="composer"><button className="icon-button"><Paperclip size={19} /></button><input placeholder="Escribe un mensaje..." /><button className="send-button"><Send size={17} /></button></div></section> }

function Alerts() { return <section className="panel full-panel"><div className="module-head"><div><p className="eyebrow">Seguimiento</p><h2>Alertas del proyecto</h2></div><button className="quiet-button"><Filter size={15} /> Todas las alertas</button></div><div className="alert-card urgent"><AlertCircle size={21} /><div><strong>Trámite pendiente de revisión</strong><p>“Compra de reactivos” lleva 2 días en revisión.</p></div><button className="quiet-button">Ver trámite</button></div><div className="alert-card"><Calendar size={21} /><div><strong>Reunión de seguimiento próxima</strong><p>La próxima reunión está programada para el 3 de septiembre.</p></div><button className="quiet-button">Ver agenda</button></div></section> }

function Team() { return <section className="panel full-panel"><div className="module-head"><div><p className="eyebrow">Participantes</p><h2>Equipo del proyecto</h2></div><button className="primary-button"><Plus size={17} /> Agregar persona</button></div><div className="team-list"><TeamMember initials="MC" name="María Calderón" role="Coordinadora" color="sand" /><TeamMember initials="JS" name="Javier Soto" role="Gestor" color="blue" /><TeamMember initials="AM" name="Andrea Morales" role="Emprendedora" color="orange" /><TeamMember initials="CR" name="Carlos Rojas" role="Emprendedor" color="olive" /></div></section> }

function Metric({ icon, label, value, meta, tone }: { icon: ReactNode; label: string; value: string; meta: string; tone: string }) { return <article className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><p>{label}</p><strong>{value}</strong><span>{meta}</span></article> }
function PanelHeader({ title, action }: { title: string; action: string }) { return <div className="panel-header"><h2>{title}</h2><button>{action} <ChevronRight size={15} /></button></div> }
function ProgressBar({ value }: { value: number }) { return <div className="progress"><span style={{ width: `${value}%` }} /></div> }
function ProjectRow({ name, category, progress, alert, alertTone, onClick }: { name: string; category: string; progress: number; alert: string; alertTone: string; onClick: () => void }) { return <button className="project-row" onClick={onClick}><div className="project-icon">{name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div><div className="project-row-name"><strong>{name}</strong><span>{category}</span></div><div className="row-progress"><ProgressBar value={progress} /><small>{progress}%</small></div><span className={`status ${alertTone}-status`}>{alert}</span><ChevronRight size={18} /></button> }
function ActivityItem({ avatar, color, text, time }: { avatar: string; color: string; text: ReactNode; time: string }) { return <div className="activity-item"><div className={`avatar avatar-${color}`}>{avatar}</div><p>{text}<span>{time}</span></p></div> }
function Attention({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) { return <div className="attention-row"><div>{icon}</div><p><strong>{title}</strong><span>{detail}</span></p><ChevronRight size={17} /></div> }
function KanbanColumn({ title, count, accent, children }: { title: string; count: string; accent: string; children: ReactNode }) { return <section className={`kanban-column ${accent}`}><div className="kanban-column-head"><span className="kanban-dot" /><h3>{title}</h3><b>{count}</b></div><div className="kanban-cards">{children}<button className="add-card"><Plus size={14} /> Agregar actividad</button></div></section> }
function KanbanCard({ title, objective, due, owner, evidence, emphasized = false, done = false }: { title: string; objective: string; due: string; owner: string; evidence: string; emphasized?: boolean; done?: boolean }) { return <article className={`kanban-card ${emphasized ? 'emphasized' : ''} ${done ? 'done-card' : ''}`}><div className="kanban-card-top"><span>{objective}</span><button><MoreHorizontal size={16} /></button></div><h4>{title}</h4><div className="kanban-card-bottom"><span className="due"><Calendar size={12} /> {due}</span><span className="evidence"><Paperclip size={12} /> {evidence}</span></div><div className="kanban-owner"><i>{owner}</i>{done && <span><CheckCircle size={13} /> Lista</span>}</div></article> }
function StatusLabel({ status }: { status: string }) { const names: Record<string, [string, string]> = { IN_SIGNATURE_PROCESS: ['En proceso de firmas', 'warning-status'], UNDER_REVIEW: ['En revisión', 'review-status'], APPROVED: ['Aprobado', 'success-status'] }; const [label, className] = names[status]; return <span className={`status ${className}`}>{label}</span> }
function Deliverable({ title, type, status }: { title: string; type: string; status: string }) { const labels: Record<string, [string, string]> = { APPROVED: ['Aprobado', 'success-status'], REQUIRES_CORRECTION: ['Requiere corrección', 'warning-status'], SUBMITTED: ['En revisión', 'review-status'] }; const [label, className] = labels[status]; return <article className="deliverable"><div className="deliverable-icon"><FileText size={22} /></div><h3>{title}</h3><p>{type}</p><span className={`status ${className}`}>{label}</span><button className="icon-button"><MoreHorizontal size={18} /></button></article> }
function ChatMessage({ initials, color, name, time, text, attachment }: { initials: string; color: string; name: string; time: string; text: ReactNode; attachment?: string }) { return <div className="chat-message"><div className={`avatar avatar-${color}`}>{initials}</div><div><p className="chat-author"><strong>{name}</strong><span>{time}</span></p><div className="bubble">{text}</div>{attachment && <div className="chat-file"><FileText size={16} /> <span>{attachment}</span><Download size={15} /></div>}</div></div> }
function TeamMember({ initials, name, role, color }: { initials: string; name: string; role: string; color: string }) { return <div className="team-member"><div className={`avatar avatar-${color}`}>{initials}</div><div><strong>{name}</strong><span>{role}</span></div><button className="table-action"><MoreHorizontal size={18} /></button></div> }

export default App
