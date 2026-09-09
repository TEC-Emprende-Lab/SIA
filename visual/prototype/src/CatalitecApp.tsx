import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  FileText,
  FolderOpen,
  GitCompareArrows,
  Home,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
  Target,
  Users,
  Wallet,
  X,
} from "lucide-react";
import brandMark from "../../brand/logo.svg";
import { createMockRepository, type Command } from "./data/repository";
import { people, TODAY } from "./data/seed";
import type { Role, Store } from "./data/types";
import { Badge, Button, Empty, Loading, Modal, Notice } from "./ui";
import { DataContext, dateLabel, initials, type Section } from "./state";
import { Diagnostics, Evolution } from "./views/Diagnostics";
import { Ambitions } from "./views/Strategy";
import { Evidences, Work } from "./views/Work";
import { Reports } from "./views/Reports";
import { ProjectSpace, Summary } from "./views/ProjectSpace";
import "./catalitec.css";

const navigation = [
  { label: "GENERAL", items: [{ name: "Resumen", icon: LayoutDashboard }] },
  {
    label: "ACOMPAÑAMIENTO",
    items: [
      { name: "Diagnóstico 360°", icon: Compass },
      { name: "Ambiciones", icon: Sparkles },
      { name: "Objetivos y actividades", icon: Target },
      { name: "Evidencias", icon: FolderOpen },
      { name: "Evolución", icon: GitCompareArrows },
      { name: "Informes", icon: FileText },
    ],
  },
  {
    label: "ESPACIO DEL PROYECTO",
    items: [
      { name: "Reuniones", icon: CalendarDays },
      { name: "Finanzas y compras", icon: Wallet },
      { name: "Chat", icon: MessageSquare },
      { name: "Equipo", icon: Users },
    ],
  },
];
const validSections = [
  ...navigation.flatMap((group) => group.items.map((item) => item.name)),
  "Alertas",
];
function readRoute(): { section: Section; id?: string } {
  try {
    const [section, id] = decodeURIComponent(
      window.location.hash.slice(1),
    ).split("/");
    return {
      section: (validSections.includes(section)
        ? section
        : "Diagnóstico 360°") as Section,
      id,
    };
  } catch {
    return { section: "Diagnóstico 360°" };
  }
}
export default function CatalitecApp() {
  const [repository] = useState(createMockRepository);
  const [data, setData] = useState<Store | null>(null);
  const [route, setRoute] = useState(readRoute);
  const [role, setRole] = useState<Role>("Coordinadora");
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [projectPicker, setProjectPicker] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [emptyPreview, setEmptyPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [failArmed, setFailArmed] = useState(false);
  useEffect(() => {
    let live = true;
    repository
      .load()
      .then((s) => {
        if (live) setData(s);
      })
      .catch((e) => setError(e.message));
    const listener = () => {
      setRoute(readRoute());
      setEmptyPreview(false);
    };
    window.addEventListener("hashchange", listener);
    return () => {
      live = false;
      window.removeEventListener("hashchange", listener);
    };
  }, [repository]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function navigate(section: Section, id?: string) {
    window.location.assign(
      "#" + encodeURIComponent(`${section}${id ? `/${id}` : ""}`),
    );
    setRoute({ section, id });
    setMenu(false);
    setQuery("");
    setEmptyPreview(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function run(command: Command, message = "Cambios guardados") {
    if (running.current) return null;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await repository.execute(command, role);
      setData(next);
      setToast(message);
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      running.current = false;
      setBusy(false);
      setFailArmed(false);
    }
  }
  const searchResults =
    data && query.trim()
      ? [
          ...data.objectives.map((o) => ({
            title: o.title,
            id: o.id,
            section: "Objetivos y actividades" as Section,
          })),
          ...data.evidence.map((e) => ({
            title: e.title,
            id: e.id,
            section: "Evidencias" as Section,
          })),
          ...data.ambitions.map((a) => ({
            title: a.title,
            id: a.id,
            section: "Ambiciones" as Section,
          })),
          ...validSections.map((s) => ({
            title: s,
            section: s as Section,
            id: undefined,
          })),
        ]
          .filter((x) => x.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 7)
      : [];
  const content = () => {
    switch (route.section) {
      case "Diagnóstico 360°":
        return <Diagnostics focusId={route.id} />;
      case "Ambiciones":
        return <Ambitions focusId={route.id} />;
      case "Objetivos y actividades":
        return <Work focusId={route.id} />;
      case "Evidencias":
        return <Evidences focusId={route.id} />;
      case "Evolución":
        return <Evolution focusId={route.id} />;
      case "Informes":
        return <Reports focusId={route.id} />;
      case "Resumen":
        return <Summary />;
      default:
        return <ProjectSpace section={route.section} focusId={route.id} />;
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar navegación"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a className="brand" href="#Diagn%C3%B3stico%20360%C2%B0">
          <span className="brand-mark">
            <img src={brandMark} alt="" />
          </span>
          <span>
            <strong>
              catalitec<span className="brand-period">.</span>
            </strong>
            <small>TEC EMPRENDE LAB</small>
          </span>
        </a>
        <button className="workspace" onClick={() => setProjectPicker(true)}>
          <span className="workspace-logo">LB</span>
          <span>
            <strong>Lumen Biotech</strong>
            <small>Espacio del proyecto</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav aria-label="Navegación del proyecto">
          {navigation.map((group, i) => (
            <div className="nav-group" key={group.label}>
              {i > 0 && <p className="nav-label">{group.label}</p>}
              {group.items.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  aria-label={name}
                  onClick={() => navigate(name as Section)}
                  className={route.section === name ? "active" : ""}
                  aria-current={route.section === name ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.7} />
                  <span>{name}</span>
                  {route.section === name && <i />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            Guía de acompañamiento
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="avatar sand">
              {initials(
                role === "Coordinadora"
                  ? people[0]
                  : role === "Gestor"
                    ? people[1]
                    : people[2],
              )}
            </span>
            <div>
              <strong>
                {role === "Coordinadora"
                  ? people[0]
                  : role === "Gestor"
                    ? people[1]
                    : people[2]}
              </strong>
              <small>{role}</small>
            </div>
            <button
              className="icon-btn"
              onClick={() => setSettings(true)}
              aria-label="Opciones de demostración"
            >
              <Settings2 size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Abrir navegación"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <button
              className="breadcrumb-home"
              onClick={() => setProjectPicker(true)}
            >
              <Home size={15} />
              <span>Proyectos</span>
            </button>
            <ChevronRight size={13} />
            <span>Lumen Biotech</span>
            <ChevronRight size={13} />
            <b>{route.section}</b>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <label>
                <Search size={17} />
                <input
                  aria-label="Buscar en el proyecto"
                  placeholder="Buscar en el proyecto…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {query && (
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        key={result.section + result.id}
                        onClick={() => navigate(result.section, result.id)}
                      >
                        <span>
                          {result.title}
                          <small>{result.section}</small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>Sin resultados para «{query}».</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="icon-btn notifications"
              aria-label="Ver alertas"
              onClick={() => navigate("Alertas")}
            >
              <Bell size={19} />
              <i />
            </button>
            <span className="top-divider" />
            <span className="demo-label">DEMO</span>
          </div>
        </header>
        <div className="project-context">
          <div>
            <span className="project-symbol">LB</span>
            <span>
              <strong>Lumen Biotech</strong>
              <small>
                Prototipado <i /> Salud y biotecnología
              </small>
            </span>
            <span className="badge olive">
              <span className="tiny-dot" />
              Activo
            </span>
          </div>
          <div className="project-team">
            <span className="avatar blue">JS</span>
            <span className="avatar sand">AM</span>
            <span className="avatar peach">CR</span>
            <span>Acompañamos tu siguiente paso</span>
          </div>
        </div>
        <div className="page" id="main-content" tabIndex={-1}>
          {data ? (
            <DataContext.Provider
              value={{ data, role, busy, run, navigate, notify: setToast }}
            >
              {loadingPreview ? (
                <Loading />
              ) : emptyPreview ? (
                <Empty
                  title="Un nuevo comienzo"
                  text="Aún no hay registros en esta vista de demostración."
                  action={
                    <Button onClick={() => setEmptyPreview(false)}>
                      Volver a los datos del proyecto
                    </Button>
                  }
                />
              ) : (
                <div key={`${route.section}/${route.id ?? ""}`}>
                  {content()}
                </div>
              )}
            </DataContext.Provider>
          ) : (
            <Loading />
          )}
        </div>
        <footer className="app-footer">
          <span>Catalitec · Sistema de Incubación y Acompañamiento</span>
          <button onClick={() => setSettings(true)}>
            Datos de demostración · {dateLabel(TODAY)}
          </button>
        </footer>
      </main>
      <Feedback>
        {busy && (
          <div className="saving" role="status">
            <LoaderCircle size={15} className="spin" />
            Guardando…
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={19} />
            <span>{toast}</span>
            <button
              className="icon-btn"
              aria-label="Cerrar confirmación"
              onClick={() => setToast("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-toast" role="alert">
            <strong>No se completó la acción</strong>
            <p>{error}</p>
            <button onClick={() => setError("")}>
              Entendido, volver a intentar
            </button>
          </div>
        )}
      </Feedback>
      {settings && (
        <Modal
          title="Opciones de demostración"
          description="Estado local en memoria. Recargar la página restaura los datos de ejemplo."
          onClose={() => setSettings(false)}
        >
          <label className="field">
            <span>Simular rol</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role);
                setSettings(false);
                setToast("Vista de rol actualizada para este proyecto");
              }}
            >
              <option>Coordinadora</option>
              <option>Gestor</option>
              <option>Emprendedor</option>
            </select>
          </label>
          <Notice>
            Todos los perfiles de ejemplo pertenecen a Lumen Biotech. No hay
            autenticación ni permisos reales.
          </Notice>
          <h3>Estados de interfaz</h3>
          <div className="demo-options">
            <Button
              variant="secondary"
              onClick={() => {
                setEmptyPreview(true);
                setSettings(false);
              }}
            >
              Ver estado vacío
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setLoadingPreview(true);
                setSettings(false);
                setTimeout(() => setLoadingPreview(false), 1600);
              }}
            >
              Simular carga
            </Button>
            <Button
              variant="secondary"
              disabled={failArmed}
              onClick={() => {
                repository.failNext();
                setFailArmed(true);
                setSettings(false);
                setToast(
                  "El próximo guardado fallará una vez. Podrás reintentarlo sin perder el formulario.",
                );
              }}
            >
              Simular error en próximo guardado
            </Button>
          </div>
        </Modal>
      )}
      {projectPicker && (
        <Modal
          title="Tu espacio de incubación"
          description="Un proyecto completo para recorrer el acompañamiento de principio a fin."
          onClose={() => setProjectPicker(false)}
        >
          <button
            className="record-row"
            onClick={() => {
              navigate("Resumen");
              setProjectPicker(false);
            }}
          >
            <span className="workspace-logo">LB</span>
            <div>
              <strong>Lumen Biotech</strong>
              <p>Prototipado · Salud y biotecnología</p>
            </div>
            <Badge status="Activo" />
            <ChevronRight size={16} />
          </button>
          <p className="muted small">
            1 proyecto activo · 0 finalizados en los datos de demostración.
          </p>
        </Modal>
      )}
      {help && (
        <Modal
          title="Del diagnóstico al siguiente paso"
          onClose={() => setHelp(false)}
        >
          <p>
            Este espacio reúne la mirada estratégica y el trabajo cotidiano de
            Lumen Biotech.
          </p>
          <ol className="help-steps">
            <li>Registra el Cubo 360 por áreas y envíalo a revisión.</li>
            <li>
              Define objetivos vinculados a una cara del Cubo y, cuando
              corresponda, a una ambición.
            </li>
            <li>Completa actividades con evidencia.</li>
            <li>Compara fotografías aprobadas para observar la evolución.</li>
            <li>
              Prepara un informe por período, revisa las fuentes y guarda el
              borrador.
            </li>
          </ol>
          <Notice>
            Los cambios duran mientras esta página permanece abierta. El
            selector de rol permite simular revisión y aprobación.
          </Notice>
          <div className="modal-actions">
            <Button
              onClick={() => {
                setHelp(false);
                navigate("Diagnóstico 360°");
              }}
            >
              Comenzar recorrido <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Feedback({ children }: { children: ReactNode }) {
  const dialogs = document.querySelectorAll("dialog[open]");
  return createPortal(
    children,
    dialogs.item(dialogs.length - 1) ?? document.body,
  );
}
