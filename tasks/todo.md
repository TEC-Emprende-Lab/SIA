# Consolidacion de decisiones

## Pulido de fuentes de informes — 2026-10-07

- US-PRO-004 / US-PM-003; reglas de `docs/00-nucleo-comun/ia-e-informes.md`.
- La ventana de Informes presenta secciones en español, fechas de las fuentes,
  referencias consultables y enlaces HTTP(S) de evidencia, desde la composición
  conservada en cada versión. No consulta ni recompone los registros originales.
- Conserva saltos de línea de la redacción y muestra estados explícitos sin fuentes.
- Verificación local: `pnpm --filter @sia/web exec node tests/reports.mjs` comprueba
  instantánea congelada, escape de texto, referencias, fechas y protocolos de URL.
- No modifica API, permisos, versiones aprobadas, PDF, almacenamiento privado ni finanzas.
- Validación visual autenticada en staging pendiente; la herramienta de navegador
  agotó el tiempo de espera. Los cambios locales aún no están desplegados.

## Corrección de staging — 2026-10-06

La afirmación previa de que no existía un staging separado quedó desactualizada. El
entorno de integración de `develop` está publicado en
`https://sia.dev.neuroboard.app`; `GET /` y `GET /api/health` respondieron 200 sin
sesión. También quedaron en success los workflows `Application quality` y `Prototype
quality` del SHA `7e0947e`.

La verificación autenticada no se completó: Clerk rechazó la credencial local de
Coordinadora con 422 (`Password is incorrect`). Se requieren credenciales de prueba
vigentes para confirmar los flujos y permisos por rol. El detalle verificable y los
límites están en [operación API](../docs/operacion-api.md#verificación-de-staging--2026-10-06).

## Actualización de estado documental — 2026-10-06

Actualización del estado real después de liberar el trabajo de frontend reciente. Sin
cambios de reglas, permisos, API ni contratos: no se modifican los documentos de núcleo
ni de programa, que siguen siendo la fuente de requisitos.

- [x] `README.md`: corte nuevo (`main` en `1725260`, 2026-10-05) y filas de Seguimiento
  (avance por objetivo/ciclo), Web real (revisión de evidencias, Resumen conectado,
  tablero Kanban) y Calidad y despliegue (CI verdes, smoke de producción, suite de la Web
  fuera de CI).
- [x] `docs/operacion-api.md`: sección «Verificación operativa — 2026-10-06» con los
  cambios de núcleo desde `919dff5`, enlaces a runs de CI y smoke HTTP del despliegue;
  pendientes actualizados.
- [x] Este registro: liberación y limpieza de ramas.

Estado histórico verificado antes de la corrección de staging, 2026-10-06:

- `main` `1725260` (PR #20, 2026-10-05) integra `develop` `2ebfca0` (PR #19). CI verde en
  ambas ramas: `Application quality` run 37354456543 y `Prototype quality` run 37354456484.
- Despliegue público por HTTP, sin sesión: Web `GET /` y `GET /api/health` en 200 sobre
  `http://eo08w8k8oocksksw0ok4s8gk.157.151.134.169.sslip.io`; API `GET /healthz` y
  `GET /readyz` en 200 sobre
  `http://sgc4www0cw84okgwcwggs4wo.157.151.134.169.sslip.io`. Los chunks publicados
  contienen los marcadores de Resumen («Qué se busca lograr») y de Kanban («estados
  intermedios de actividad»), lo que confirma que sirve `main`.
- Ramas de trabajo fusionadas eliminadas, locales y remotas: solo quedan `develop` y
  `main`; la rama local `main` se sincronizó a `1725260`.
- Suite de `apps/web` local: 23 grupos en verde con `pnpm --filter @sia/web test`.

Pendientes abiertos:

- [ ] Revisión autenticada por rol sobre la publicación: Coordinadora y Emprendedor en el
  Kanban, la revisión de evidencias y el Resumen. El recorrido del Gestor sigue aplazado
  por indicación del usuario.
- [ ] Añadir `pnpm --filter @sia/web test` a CI: `web-and-contracts` termina en
  `pnpm contract:check` y hoy no ejecuta esa suite.
- [x] Entorno de staging separado de `main` y HTTPS del despliegue: disponible en
  `https://sia.dev.neuroboard.app`; falta certificar sus recorridos autenticados,
  migraciones, observabilidad, backups y rollback.

## Kanban de objetivos y actividades, 2026-10-05

Alcance autorizado por el usuario en la planificación: columnas derivadas de datos
existentes, arrastre que ejecuta las acciones existentes y `@dnd-kit/core` como única
dependencia nueva. Trazabilidad: US-PRO-001/002 y US-PM-001/002,
`objetivos-actividades-evidencias.md` y `actores-roles-y-permisos.md`. No cambia reglas
de negocio, permisos ni contratos.

- [x] Habilitar el conmutador Kanban/Lista de la sección y añadir selector
  Objetivos/Actividades dentro del tablero; la Lista sigue siendo la vista por defecto.
- [x] Tablero de objetivos con las cinco columnas de su estado real (Borrador,
  Pendiente de validación, Corrección solicitada, Rechazado, Aprobado), sin estados nuevos.
- [x] Tablero de actividades con columnas derivadas: Pendientes (en plazo), Vencidas
  (fecha de fin vencida) y Completadas (finalización manual y reversible). **No** se
  crean estados intermedios de actividad: siguen `TBD` en `modelo-de-datos-detallado.md`.
- [x] Arrastre con `@dnd-kit/core` (pointer/touch/teclado, anuncios en español) que
  traduce cada soltada a un endpoint existente: `submit`, `validations` y `completion`,
  siempre con `expected_revision`; la autorización sigue validándola FastAPI.
- [x] Motivos explícitos cuando una soltada no es válida (columna de origen, rol sin
  validación, objetivo aprobado, columna derivada de fechas), con aviso `role="status"`.
- [x] Soltar sobre Aprobado/Corrección/Rechazo abre el detalle con la decisión
  preseleccionada: la observación sigue obligatoria (regla existente de la API), por lo
  que la decisión se registra allí y no por soltada ciega.
- [x] Acceso alternativo: botón “Ver detalle” en cada tarjeta y arrastre por teclado
  (Tab, Espacio, flechas, Espacio); los botones del detalle siguen siendo el camino sin
  arrastre. Sin cambios de permisos: Emprendedor ve bloqueada la validación.
- [x] Filtros de objetivo y búsqueda aplican también al tablero; el filtro de estado de
  la lista se oculta en modo tablero porque las columnas expresan ese estado.
- [x] Pruebas: `apps/web/tests/tracking-kanban.mjs` (matriz de transiciones, roles,
  clasificación por fechas, alcance por objetivo, marcado estructural del panel) y
  `pnpm --filter @sia/web test` completo (23 grupos).
- [ ] Verificar arrastre y permisos en sesión autenticada desplegada (Coordinadora y
  Emprendedor); el recorrido del Gestor sigue pendiente por decisión del usuario.

Implementación solo frontend sobre endpoints existentes de seguimiento, sin migraciones,
cambios de API ni de contratos. Dependencia nueva: `@dnd-kit/core` (^6.3.1), estándar
mantenido para React 19 con sensores touch y teclado. No se persiste orden de tarjetas
dentro de una columna (no existe endpoint de reordenamiento y queda fuera de alcance).
Verificación local: `pnpm --filter @sia/web test`, `pnpm lint`, `pnpm typecheck`,
`pnpm contract:check`, `pnpm --filter @sia/web build` y `git diff --check` en verde;
preview aislado Playwright a 360/768/1440 px sin desbordamiento horizontal de página y
con foco de teclado visible (`/tmp/opencode/tracking-kanban-{360,768,1440}.png`).

## Resumen conectado — reuniones, acuerdos y alertas, 2026-10-05

Alcance autorizado por el usuario después de la mejora de evidencias. Trazabilidad:
US-PRO-001/002/004, US-PM-001/002/003, `reuniones-minutas-y-canales.md` y
`notificaciones-y-alertas.md`. No cambia reglas de negocio ni permisos.

- [x] Añadir al Resumen próximas reuniones no revocadas del ciclo, ordenadas por
  fecha real, con participantes y horario de Costa Rica.
- [x] Mostrar acuerdos registrados de reuniones no revocadas, su fecha de compromiso,
  reunión de origen y próximos pasos. Los estados de cumplimiento siguen `TBD`:
  **no** se presentan como pendientes, vencidos ni completados.
- [x] Mostrar alertas sin resolver del usuario actual, solo del ciclo seleccionado
  o compartidas por el mismo emprendimiento; excluir ciclos hermanos y otros proyectos.
- [x] Consultar todas las páginas autorizadas antes de ordenar y limitar la vista
  a cinco registros por tarjeta; indicar explícitamente cuando existen más.
- [x] Conservar carga, vacío, errores y reintento independientes por módulo, con
  actualización manual y enlaces a Reuniones y a la bandeja personal completa.
- [x] Cancelar consultas al desmontar/cambiar proyecto; usar identidad de proyecto,
  ciclo y usuario como clave para no conservar datos de la selección anterior.
- [ ] Verificar los nuevos paneles con Clerk/API en sesión autenticada desplegada.

Implementación solo frontend sobre GET existentes de FastAPI/BFF, sin migraciones,
contratos nuevos, Socket.IO, correo ni generación automática de alertas. La API actual
ofrece acuerdos por reunión; el resumen consulta las reuniones autorizadas y sus acuerdos
con un máximo de cuatro peticiones simultáneas, sin consultar minutas ni detalles extra.
No se acredita escalabilidad con grandes expedientes; si el volumen lo exige, evaluar
un agregado backend autorizado en vez de ampliar el fan-out. La bandeja de Coordinadora
sigue siendo personal: no consulta alertas de otros usuarios.

Verificación local: 17 grupos Web pasan (11 previos + 6 del Resumen). Se prueban
paginación, cambios de zona horaria, scopes cruzados, revocaciones, fechas inválidas,
errores 401/403/404/500, cancelación, concurrencia máxima de cuatro, estados de render
independientes y acciones hacia los módulos existentes. Lint, typecheck, build Next.js,
contratos y `git diff --check` pasan. Playwright sobre fixture aislada de los componentes
con CSS canónico: 360/768/1440 px sin desbordamiento horizontal, con foco de teclado
visible. Capturas: `/tmp/opencode/project-summary-{360,768,1440}.png`.
Son pruebas unitarias/de render y visuales aisladas; no sustituyen una sesión real ni
certifican autorización backend, staging, despliegue o validación del Gestor pendiente.
Cambios preparados en `feature/evidencias-revision` para publicación por PR a `develop`.
La integración y el despliegue remotos siguen pendientes de verificación.

Preflight de publicación: Docker real disponible; build de `apps/web/Dockerfile`
completo, con lockfile congelado, pasa (`sia-web:review-summary-local`). No hay variables
runtime nuevas ni migraciones. Smoke de esa imagen sin clave Clerk de build devuelve
500 por `Missing publishableKey`; añadir solo la clave pública en runtime no sustituye
el ARG de build. La configuración real de Clerk del recurso Coolify no se modificó;
el arranque autenticado y el despliegue siguen sin certificación. No se publica directo
a `main` ni se declara lista la producción por este build.

## Mejora UX — revisión de objetivos y evidencias, 2026-10-05

Solicitud explícita del usuario durante la validación guiada como Coordinadora.
Trazabilidad: US-PRO-001/002 y US-PM-001/002; seguimiento y evidencias del núcleo común.

- [x] Ofrecer una vista de revisión más amplia que permita entender qué se buscaba
  con el objetivo y qué realizó la persona, usando la información existente.
- [x] Dar mucho más protagonismo visual a las evidencias de cada actividad: no
  reducirlas a un contador o a un enlace poco destacado al final del diálogo.
- [x] Presentar contexto del objetivo, actividades y evidencias antes o junto a
  la decisión de validación, sin obligar a buscar las evidencias debajo del formulario.
- [x] Verificar render de componentes, adaptación móvil y foco de teclado de enlaces
  en una fixture visual aislada; no sustituye el recorrido conectado.
- [ ] Revisar la vista completa con Clerk/API en sesión autenticada, teclado y móvil.

Alcance: presentación implementada localmente en `feature/evidencias-revision`,
no desplegada. No cambia permisos, reglas de aprobación ni persistencia.
Previsualizaciones y campos nuevos: TBD;
no implica habilitar cargas privadas ni integraciones externas.

Implementación: diálogo de objetivo ampliado (1120 px máx.), contexto real de
descripción/área/entregable/ambición, conteos por alcance y todas las actividades del
objetivo sin aplicar el filtro de la lista. Evidencias antes de las acciones, en
tarjetas con título, tipo, descripción, fecha, URL desplegable y apertura explícita
en pestaña nueva; sin imágenes, iframes ni peticiones automáticas al contenido externo. Decisión
de validación junto al contenido en escritorio y después de él en pantallas pequeñas.
Los datos faltantes se muestran explícitamente, sin inferir resultados ni autorías.

Verificación local: 11 grupos de pruebas Web pasan (7 existentes + 4 de render y
regresión); lint, typecheck, build Next.js y contratos pasan. Playwright sobre fixture
aislada de los componentes y su CSS: 360/768/1440 px sin desbordamiento horizontal,
incluida URL larga desplegada con teclado, enlaces externos con foco visible. Capturas locales en
`/tmp/opencode/tracking-review-{360,768,1440}.png`. No hay migraciones ni cambios API.
La prueba estructural conserva el gating del formulario por rol/estado; no se afirma
haber verificado de nuevo la autorización backend o una sesión real con esta entrega.

Evidencia de prueba guiada (capturas, no prueba automatizada): Emprendedor creó
un objetivo, una actividad, completó la actividad y envió el objetivo a validación.
Coordinadora visualiza el objetivo pendiente, la actividad completada, una evidencia
por enlace y el formulario de aprobación. Una captura posterior muestra el objetivo
aprobado y el avance general en 100 % (un objetivo aprobado con su actividad completada).
El usuario da por funcionales la persistencia tras recarga y el Resumen posterior a
aprobación, sin aportar capturas adicionales; se registra como confirmación manual,
no como verificación automatizada. Por instrucción explícita del usuario, el recorrido
del Gestor asignado queda pendiente. La validación móvil también sigue pendiente;
no se declara cerrada la validación operativa completa ni la de los tres roles.

## Corrección de 404 en seguimiento — 2026-09-29

US-PRO-001/002, US-PM-001/002. Evidencia: OpenAPI de la API desplegada consultada
en vivo no expone `/cycles/{cycle_id}/seguimiento/summary`; el frontend cargaba
ese endpoint junto con todas las secciones, propagando `Not Found` a todas ellas.

- Compatibilidad BFF: solo ante 404 de summary, consultar objetivos y actividades
  autorizados en FastAPI y calcular en servidor la misma fórmula confirmada.
- No cambiar permisos, persistencia ni reglas; conservar errores 401/403/404 de
  los recursos reales. Sin seed ni fallback de datos inventados.
- Pruebas: pesos equivalentes, ciclo vacío, objetivo sin actividades, borradores
  excluidos del avance y separación de ciclos.
- Pendiente: desplegar la API actual para que sirva summary directamente;
  verificar pantallas en sesión autenticada de producción.

## Corrección: mockup como fuente visual, backend conectado — 2026-09-29

Instrucción vigente: usar `visual/prototype` como fuente estricta del diseño y
navegación, **con backend**, según aclaración del usuario. No usar datos seed en
la aplicación conectada ni sustituir autorización por simulación de roles.

Trazabilidad: US-PRO-001/002/004/005/006, US-PM-001/002/003; núcleo común
expediente, comunicación, roles e informes. No cambian reglas ni contratos API.

- [x] Entrada `/`: espacio del proyecto con Clerk + identidad real de FastAPI.
- [x] Sidebar persistente: GENERAL, ACOMPAÑAMIENTO, ESPACIO DEL PROYECTO y todas
  las secciones en el orden del mockup; topbar, breadcrumbs, búsqueda local con
  datos autorizados, notificaciones y perfil Clerk; encabezado contextual real.
- [x] Selector de proyectos: agrega la jerarquía de persistencia internamente,
  pagina las listas autorizadas y no expone el recorrido inscripción/ciclo.
- [x] Redirigir enlaces antiguos de ciclos al proyecto correspondiente y los
  enlaces generales de Expediente a la nueva entrada; conservar código e historial.
- [x] Resumen: hero con anillo de avance backend, Lo que sigue, El plan compartido
  y decisiones recientes, en las posiciones del mockup.
- [x] Objetivos y actividades: acciones en cabecera, resumen, tira de objetivos,
  filtros y lista; detalles y formularios en diálogos; escrituras API existentes,
  revisiones optimistas y actualización tras guardar.
- [x] Separar diagnóstico, ambiciones, evidencias y evolución en sus secciones,
  no agruparlas en pestañas de un ciclo.
- [x] Diagnóstico: Cubo a la izquierda, resumen a la derecha, selector/historial y
  áreas debajo. Datos descriptivos reales, sin escalas numéricas inventadas.
- [x] Reuniones, chat, equipo y alertas reutilizan módulos conectados existentes.
- [x] Informes conectados al backend ya existente: listado paginado, composición
  trazable, borradores, revisión humana y corrección vinculada de aprobados.
- [x] Reutilizar el stylesheet canónico del mockup, sin modificar la referencia.
- [x] Pruebas de orden/grupos contra el archivo real del mockup, rutas hash,
  selector, paginación, errores/permisos y relaciones cruzadas; parsers de informes.
- [ ] Comparación visual y recorridos autenticados en desktop/móvil: bloqueados
  localmente por falta de clave/sesión Clerk y browser de escritorio desconectado.

Límites explícitos: Kanban deshabilitado mientras sus estados sean TBD; indicadores
360° numéricos pendientes, sin scores; finanzas pendiente de reglas/backend;
descarga privada del PDF pendiente de integración. No se declara réplica visual
idéntica ni despliegue verificado sin realizar revisión autenticada.

Validación de esta entrega: seis grupos de pruebas frontend pasan; lint y
typecheck de Web/contratos, build de Next.js, contract:check y diff --check pasan.
Seguimiento/informes backend: 34 pruebas pasan, 2 omitidas por entorno PostgreSQL.
El Dockerfile de Web incluye el CSS canónico utilizado durante el build.

## Dashboard del ciclo por fases — 2026-09-29

Trazabilidad: US-PRO-001/002/006, US-PM-001/002 y regla común de avance confirmada
por el usuario al autorizar ejecutar el plan por fases.

- [x] Fase 1: `GET /cycles/{cycle_id}/seguimiento/summary`, autorizado en backend,
  agregado SQL sin N+1 ni porcentajes persistidos; pruebas de igual peso, ciclo vacío,
  objetivo sin actividades, reapertura, revalidación, separación de ciclos y revocación.
- [x] Fase 2 (base funcional): cabecera y barras de avance, filtros locales,
  formularios de objetivo/actividad/evidencia en diálogos y operaciones API existentes.
- [x] Fase 3: panel lateral del seguimiento con avance del ciclo, conteos y progreso
  por objetivo. Se refresca después de escrituras y no usa datos simulados.
- [x] Fase 4 (primer bloque): pestaña Resumen del ciclo con avance, actividades
  pendientes ordenadas por fecha y objetivos pendientes de validación reales.
- [ ] Comparación visual autenticada con el mockup y validación de teclado/móvil.
- [x] Continuar el dashboard general por módulos: reuniones, acuerdos y alertas reales
  (implementación local 2026-10-05; ver límites y verificación en la sección superior).

No se implementan Kanban, puntajes de diagnóstico, cargas privadas o finanzas `TBD`.
No se afirma paridad visual idéntica: esta entrega es la base conectada de las fases.
API: 117 pruebas pasan; 9 se omiten por requisitos de entorno, incluidos PostgreSQL.
Ruff y mypy pasan; contratos OpenAPI, lint/typecheck/build Web verificados.

## Integración de `feature/shell-autenticado` — 2026-09-29

Referencias: US-PRO-001, US-PRO-002, US-PRO-005, US-PRO-006, US-PM-001 y US-PM-002;
identidad, expediente, seguimiento y comunicación según el núcleo común. No modifica
reglas de negocio: FastAPI conserva toda autorización.

- [x] Integrar el shell autenticado por rol, expediente, seguimiento, comunicación,
  bandeja, invitaciones y usuarios.
- [x] Consolidar el BFF en `sia-bff.ts`; el proxy genérico conserva su allowlist y usa la
  misma emisión y validación de JWT `sia`.
- [x] Resolver los conflictos documentales manteniendo los límites `TBD` y sin declarar
  staging verificado.
- [x] Ejecutar lint, typecheck y build de la web tras la integración.

La exploración previa del 2026-09-28 queda sustituida por esta integración: la rama remota
`feature/shell-autenticado` contenía el corte de UI conectada que no estaba disponible en
las referencias locales entonces inspeccionadas.

## Exploración previa a Fase 7 — UI conectada, 2026-09-28

Objetivo: evitar duplicar trabajo antes de implementar la UI conectada.

1. Inspeccionar ramas locales/remotas, refs y commits no integrados que incluyan trabajo de `apps/web` o Fase 7.
2. Revisar el árbol y la documentación vigente para identificar UI conectada parcial, contratos y recorridos ya existentes.
3. Consolidar hallazgos y definir el primer corte de implementación sin alterar requisitos ni decisiones `TBD`.

Resultado: no se encontraron ramas, commits ni objetos no integrados con UI conectada. La
única integración existente es Clerk → `GET /api/sia/me` → `GET /users/me`; el
prototipo visual conserva datos ficticios y no se reutilizará como fuente de reglas.

## Fase 7 — UI conectada, 2026-09-28

Alcance confirmado: identidad, expediente, seguimiento y comunicación. Informes técnicos
y Finanzas quedan fuera de esta fase; también R2/adjuntos, PDF, IA, correo, grabaciones y
Socket.IO. Referencias: US-PRO-001/002/004/005/006 y US-PM-001/002/003; reglas de
expediente, seguimiento, reuniones, minutas, canales y alertas del núcleo común.

1. Restaurar `develop` y crear `feature/ui-conectada` desde esa rama, según CONTRIBUTING.
2. Crear shell autenticado, cliente de API server-only con JWT `sia` y uso de tipos
   generados; conservar FastAPI como autoridad de autorización.
3. Conectar emprendimientos, inscripciones y ciclos con paginación, estados de carga/error
   y navegación contextual por ciclo.
4. Conectar canvas, ambiciones, objetivos, actividades, evidencias URL, validaciones,
   cronograma y diagnósticos descriptivos; no portar reglas ficticias del prototipo.
5. Conectar reuniones, minutas, acuerdos, canales, mensajes, alertas y notificaciones sin
   simular integraciones externas pendientes.
6. Añadir pruebas de interfaz y recorridos de navegador a Clerk/FastAPI locales para acceso,
   invitación, scope y acciones autorizadas/no autorizadas.
7. Ejecutar lint, typecheck, pruebas web/E2E, checks de contratos y verificaciones API
   aplicables; documentar evidencia sin declarar staging verificado.

Progreso: `develop` fue restaurada desde `main` y la rama local
`feature/ui-conectada` contiene el shell, BFF autenticado, expediente, seguimiento y
comunicación conectados. Lint, typecheck, build y drift de contratos pasan. Los E2E
autenticados quedan bloqueados hasta configurar `apps/web/.env.local` con Clerk, la
plantilla JWT `sia`, `SIA_API_URL` y un usuario invitado de prueba; ese archivo no existe
en este entorno. No se declara Fase 7 ni staging verificados.

## Evolución visual conectada desde el mockup — 2026-09-28

Objetivo: trasladar la arquitectura visual y de interacción de `visual/prototype` a la
web conectada, preservando FastAPI como autoridad y sin convertir datos demo o decisiones
`TBD` en reglas de negocio. Referencias: US-PRO-001/002/004/005/006 y US-PM-001/002/003.

1. Reemplazar el shell de cuatro pestañas por navegación persistente del proyecto,
   contexto de emprendimiento/ciclo, barra superior y adaptación móvil.
2. Separar las vistas reales de Resumen, Diagnóstico 360°, Ambiciones, Objetivos y
   actividades, Evidencias, Evolución, Reuniones, Chat y Alertas; reutilizar únicamente
   rutas BFF autorizadas y mostrar estados de carga, vacío y error.
3. Exponer Informes a través del allowlist BFF y construir su historial y acciones con
   los contratos existentes; PDF, R2 e IA se presentan como pendientes, nunca simulados.
4. Conservar diagnóstico descriptivo por área, actividades con finalización manual,
   evidencias URL inmutables y transiciones/validaciones originadas en la API. No portar
   puntajes 1–5, radar, deltas numéricos, estados Kanban ni automatizaciones del mockup.
5. Mantener Finanzas como no disponible, y Equipo/búsqueda global como pendientes de
   endpoints autorizados y decisiones funcionales; no exponer datos demo.
6. Verificar autorización visual y backend, responsive, accesibilidad, lint, tipos,
   build, contratos y recorrido autenticado local antes de documentar el corte.

Estado: en ejecución. La evaluación del mockup identifica que su shell, jerarquía,
navegación y patrones de interacción pueden implementarse en frontend; los módulos se
conectan por cortes según la disponibilidad de API indicada arriba.

Actualización de interfaz — 2026-09-29: se trasladó a la Web conectada el shell visual
de proyecto (sidebar, barra superior, migas de pan, encabezado y tabs de ciclo) y se
unificaron las superficies de expediente, seguimiento y comunicación con tarjetas,
formularios, badges y estados responsivos del lenguaje del mockup. Referencias:
US-PRO-001/002/004/005/006 y US-PM-001/002/003. No se cambió API ni autorización;
diagnósticos permanecen descriptivos, actividades solo usan su finalización real y
finanzas, puntajes, radar, búsqueda global y adjuntos privados siguen fuera por `TBD`
o ausencia de backend.

Actualización de sistema de diseño — 2026-09-29: se habilitó Tailwind CSS v4 y la
configuración local de shadcn (`components.json`, fuentes bajo `app/components/ui`) sin
retirar los CSS Modules existentes. Referencia de interacción: expediente (alcance y
consulta histórica) y US-PRO-001/US-PM-001. La lista de emprendimientos ahora usa
TanStack Table para ordenamiento local de la página recibida de FastAPI y el alta usa un
diálogo accesible; las secciones del ciclo usan tabs de Radix con teclado. La paginación,
los permisos y las escrituras siguen siendo los de la API: no se agregaron filtros de
servidor, datos demo, roles ni reglas nuevas. Lint, typecheck, build, contratos y diff
de espacios pasan. El recorrido local de navegador permanece bloqueado por ausencia de
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`; no se configuró ni creó una cuenta Clerk nueva.

Mejora UX de Expediente — 2026-09-29: referencias `expediente-del-emprendimiento`,
roles comunes y US-PRO-001/005/006. Se reordenó la experiencia en una jerarquía de
emprendimiento → inscripción → ciclo: encabezados contextuales, acciones de creación
en diálogos accesibles, búsqueda local explícitamente limitada a resultados cargados,
tabla ordenable, resúmenes, ayuda contextual y estados vacíos accionables. El ciclo ya
no presenta un estado ficticio de “Activo”. No se modificaron contratos, datos,
autorización, historial, estados del programa ni reglas `TBD`. Lint, typecheck, build,
contratos y revisión de espacios pasan; el recorrido navegador autenticado permanece
pendiente de claves y una sesión Clerk de prueba.

Navegación de ciclos — 2026-09-29: en la inscripción, múltiples ciclos autorizados
se presentan como pestañas Radix y cambian su espacio de trabajo en la misma vista, sin
convertir la selección en una redirección. La ruta individual se conserva para enlaces
directos y para abrir automáticamente el único ciclo solo cuando la página completa no
reporta más resultados. No se modifica autorización, alcance de ciclos ni contratos.

Resultado del corte visual: shell de proyecto, navegación responsive, contexto de ciclo,
vistas conectadas de seguimiento, comunicación, alertas e informes implementados. El BFF
autoriza ahora las rutas de informes existentes. `pnpm --filter @sia/web lint`,
`typecheck`, `build`, `pnpm --filter @sia/contracts check`, `git diff --check` y el
detector visual pasan. El recorrido autenticado continúa pendiente: la sesión aislada de
automatización no posee la sesión Clerk invitada; no se declara validado hasta probarla
contra FastAPI local.

## Reorganización de fases de entrega — 2026-09-16

Decisión de planificación: separar la experiencia conectada, el despliegue técnico
en staging, la validación operativa y la producción. No modifica requisitos,
User Stories ni reglas de negocio.

- [x] Corregir la Fase 4 como backend de comunicación integrado.
- [x] Definir Fase 7 como UI conectada a la API real.
- [x] Separar Fase 8 (staging), Fase 9 (validación operativa) y Fase 10
  (producción) con puertas de liberación explícitas.
- [x] Alinear la matriz del README con la comunicación integrada y los pendientes
  reales.

Ver [hoja de ruta](plan-escalabilidad.md#11-hoja-de-ruta-en-fases) y
[verificación](plan-escalabilidad.md#13-verificación-y-puertas-de-liberación).

## Fase 4 — comunicación backend, 2026-09-16

Referencias: US-PRO-004 / US-PM-003 (fuentes trazables del informe futuro),
`reuniones-minutas-y-canales.md`, `notificaciones-y-alertas.md`, roles y modelo común.

- [x] Revisar núcleo común, Prototipado, Puesta en marcha, operación, plan §11, políticas y contratos actuales.
- [x] Crear migración 004 exclusivamente para comunicación; conservar FK, scope, fuentes e historial sin modificar 001–003.
- [x] Implementar modelos, schemas, policy, service y rutas REST con autorización backend reutilizada, auditoría y revisiones.
- [x] Reuniones, minutas manuales/borrador asistido, aprobación humana inmutable y acuerdos con responsable autorizado.
- [x] Canales sin taxonomía inventada, mensajes, menciones, no leídos y notificaciones internas por ámbito exacto.
- [x] Interfaces/stubs explícitos y `TODO(TBD)` para integraciones y decisiones pendientes; documentar límites de IA y alertas.
- [x] Regenerar OpenAPI/TypeScript; verificar `check.mjs`, lint y tipos; habilitar pruebas de comunicación PostgreSQL en CI.
- [x] Verificar pytest completo, `test_comunicacion.py`, Ruff, mypy y `alembic check` en base desechable.

Resultado local: **109 passed** con PostgreSQL (94 previos + 15 comunicación), sin
omisiones; SQLite comunicación **14 passed, 1 skipped** por concurrencia exclusiva
de PostgreSQL. Ruff lint/formato, mypy, migración 004 y drift Alembic/OpenAPI/TS
correctos. `pnpm lint` y `pnpm typecheck` pasan. Dos avisos preexistentes de
Starlette/AnyIO. Evidencia y pendientes en [operación](../docs/operacion-api.md#fase-4--comunicación-backend-2026-09-16)
y [módulo](../apps/api/app/modules/comunicacion/README.md).

Backend-only: sin UI, proveedor IA real, Resend, Socket.IO ni despliegue. No se
tocaron `identity/service.py`, `security/`, `expediente/policy.py` ni migraciones
001–003. La aceptación completa de informes, chat con servicios externos y MVP
sigue pendiente. No se hizo commit, push ni migración de datos persistentes.

## Actualización documental del estado real — 2026-09-16

Plan de trabajo (documentación; no cambia requisitos ni reglas de negocio):

- [x] Leer AGENTS, núcleo común, los tres programas, README, CONTRIBUTING, plan y operación; contrastar decisiones y `TBD`.
- [x] Inspeccionar implementación, migraciones, pruebas, workflows y commits recientes; consultar evidencia CI sin repetir suites por cambios documentales.
- [x] Consolidar en README una matriz canónica que distinga backend, prototipo y UI pendiente; enlazar evidencia y pendientes desde operación, plan y módulos.
- [x] Incorporar revocación de asignaciones por scope, instalación independiente del prototipo y conteos con procedencia; marcar resultados anteriores como históricos y staging como no verificado.
- [x] Verificar enlaces internos y `git diff --check`, revisar el diff y registrar resultados. No realizar commit ni push.

Estado vigente en esa fecha: [matriz canónica](../README.md#estado-actual). Evidencia confirmada y procedencia del último local comunicado: [operación API](../docs/operacion-api.md#evidencia-histórica--2026-09-16). Backend de identidad, expediente y seguimiento integrado; UI real y módulos restantes en curso. Staging **NO verificado** en ese corte histórico; ver la [corrección de staging del 2026-10-06](#corrección-de-staging--2026-10-06).

Resultado documental: README y plan alineados con el código; operación enlaza runs y logs CI del SHA inspeccionado, separa el último local comunicado de la evidencia histórica y describe la corrección de revocación. CONTRIBUTING, README visuales e IMPLEMENTATION del prototipo reproducen `--ignore-workspace`. El borrador de modelo se conserva íntegro con nota histórica y la guía Coolify diferencia CI de despliegue remoto. Verificación con script temporal Python 3 fuera del repo: 38 documentos Markdown versionados de proyecto y 54 enlaces Markdown internos, comprobando existencia y anclas de encabezado, sin errores; `git diff --check` correcto y diff revisado. No se reejecutaron suites, ni se hizo commit/push.

## Historial de trabajo

Las secciones siguientes conservan resultados y decisiones de cada momento, incluidos conteos antiguos. Una casilla documental completada no acredita implementación. Las reglas de programa vigentes prevalecen sobre decisiones históricas de chats, finanzas, escalas o arquitectura; el estado actual se consulta en la matriz superior.

## Integración y validación del núcleo — histórico 2026-09-15

Referencias: US-PRO-001, US-PRO-002, US-PRO-005, US-PRO-006, US-PM-001 y US-PM-002; reglas comunes de identidad e invitación.

- [x] Revisar documentación obligatoria y cambios actuales de integración, autenticación y pruebas.
- [x] Corregir arranque/migraciones, readiness, imagen API y bootstrap administrativo; comprobar registro de modelos y routers.
- [x] Ejecutar suite completa, Ruff y mypy con código montado sobre `sia-api-phase2`; repetir sobre PostgreSQL desechable con las variables de pruebas existentes.
- [x] Regenerar OpenAPI y TypeScript mediante generadores y comprobar determinismo entre dos generaciones actuales.
- [x] Ajustar CI si corresponde y documentar operación local/producción, evidencia y pendientes reales (sin declarar terminado el MVP ni la UI).

Resultado histórico de esta integración (sustituía los conteos inferiores; para el corte del 2026-09-16 consultar la evidencia vigente enlazada arriba):

- Código actual montado en `sia-api-phase2`, `uv sync --frozen --group dev`: suite con las tres variables PostgreSQL **90 passed, 0 skipped** (8.73 s); sin ellas **83 passed, 7 skipped** (7.11 s). Dos advertencias de deprecación Starlette/AnyIO en ambas. Los casos no seleccionados por esas variables siguen usando SQLite.
- `ruff check .`, `ruff format --check .` (51 archivos) y `mypy` (39 archivos) pasan. Normalización de formato requerida por CI sin cambios de negocio.
- Imagen API reconstruida con Alembic; smoke sin montar código: readiness 503 en DB vacía/revisión 002 y 200 en 003. Upgrade repetible, 2 canvas, 12 áreas y 11 triggers; `alembic check` sin diferencias. DB inaccesible: readiness 503/liveness 200. CMD real HTTP: ambos 200 con DB migrada.
- Bootstrap CLI probado usando el import real de `async_session`: emite invitación, rechaza repetición, no crea usuario automáticamente y conserva auditoría. JWT de prueba → identidad → expediente → seguimiento verificado por el router de `main`. Pruebas RS256 con claves locales comprueban aud/iss; HS256 rechazado fuera de development/test.
- OpenAPI y TS regenerados dos veces, idénticos byte a byte sin HEAD; checks de drift usan el working tree. Node 24.21.0: `pnpm contract:check`, `pnpm lint` y `pnpm typecheck` pasan.
- CI configurado con PostgreSQL 16, variables de pruebas, migraciones/bootstrap y drift sin HEAD. Compose validado sintácticamente; ejecución remota de CI y stack completo no ejecutados en aquella revisión. CI remoto confirmado posteriormente, el 2026-09-16.

Evidencia, hashes, comandos, flujo local/producción y limitaciones en `docs/operacion-api.md`.
Pendientes entonces y aún abiertos: UI conectada, servicios externos/Clerk real y staging, binarios R2, módulos restantes y decisiones funcionales `TBD`. El MVP completo sigue en curso. Aquella revisión local no hizo commits; la implementación está ahora integrada en `fe6cf80`, seguida de `a5f1796` para CI del prototipo y los merges `db58086`/`35775c0`.

## Seguimiento persistente — plan de implementación 2026-09-15

Referencias: US-PRO-001, US-PRO-002, US-PRO-005, US-PRO-006, US-PM-001 y US-PM-002.

1. Revisar íntegramente núcleo común, Prototipado y Puesta en marcha; contrastar dominio puro y persistencia existente.
2. Implementar modelos y migración 003: definiciones fijas v1, alcance por ciclo, ambiciones, objetivos, actividades, referencias, fotografías y decisiones históricas.
3. Implementar esquemas y router independiente con autorización backend, transacciones auditadas, control de revisión e integridad entre ámbitos.
4. Verificar aislamiento, roles, cambios aprobados, fotografías inmutables, concurrencia y cronograma mediante pruebas; ejecutar pytest, ruff y mypy en Docker.

Las escalas, entregables oficiales y condiciones de autocompletado permanecen TBD. Los binarios están pendientes de implementación y de límites MIME/tamaño confirmados. La integración de router/contratos quedó validada en la sección superior.

Resultado verificado: modelos, migración 003 con seed v1, esquemas y router independiente de seguimiento implementados. Autorización exacta por ciclo, referencias compuestas, decisiones con instantánea, reapertura tras cambios materiales, fotografías aprobadas inmutables y cronograma derivado. Docker `sia-api-phase2`: 22 pruebas de seguimiento pasan en PostgreSQL 16 desechable (incluye migraciones upgrade/downgrade, triggers y carrera de escrituras); suite completa 41 pasan y 2 casos exclusivos de PostgreSQL se omiten en SQLite, ya probados aparte. Ruff de archivos del módulo y mypy de toda `app` pasan. Integración y TBD documentados en `apps/api/app/modules/seguimiento/README.md`.

## Fase 0 - Fundaciones (registro histórico)

- [x] Crear el monorepo y los contratos compartidos.
- [x] Crear las aplicaciones base web, API y worker con health checks.
- [x] Configurar el entorno local con PostgreSQL, Redis y MinIO.
- [x] Portar y verificar las reglas puras del prototipo en Python.
- [x] Añadir calidad y CI iniciales para las aplicaciones reales.
- [x] Revisar la Fase 0 y documentar el resultado.

User Stories de referencia: US-PRO-001, US-PRO-002, US-PRO-004, US-PRO-005 y US-PRO-006. Esta fase solo porta reglas puras y su prueba de paridad; no implementa persistencia, endpoints funcionales ni autorización de negocio, que pertenecen a las Fases 1 y 2.

Resultado: el monorepo quedó montado con `apps/web` (Next 16), `apps/api` (FastAPI), `apps/worker` y `packages/contracts` con OpenAPI y drift check. La web, la API y las dependencias se levantan con `infra/docker-compose.yml` (Postgres 16, Redis 7, MinIO) y exponen `/healthz` y `/api/health`. El dominio puro se portó a `apps/api/app/domain/prototype.py` con 12 pruebas (`pytest`) en paridad con las 11 del prototipo; no se toca el Dockerfile del prototipo ni su despliegue.

## Fase 1 - Identidad y autorización (registro histórico)

- [x] Configurar base de datos, migraciones y sesión asíncrona.
- [x] Implementar verificación JWT de Clerk y dependencia de usuario actual.
- [x] Implementar invitaciones, registro y política central por rol.
- [x] Añadir rate limiting distribuido y auditoría base.
- [x] Exponer endpoints, contrato y pruebas de la fase.
- [x] Revisar la Fase 1 y documentar el resultado.

Referencias: `docs/00-nucleo-comun/actores-roles-y-permisos.md`, `docs/00-nucleo-comun/modelo-de-datos-compartido.md` (User, Invitation, AuditLog) y `docs/00-nucleo-comun/vision-y-alcance.md` (Clerk/JWT, Redis, auditoría). `Revisor financiero` permanece `TBD`.

Resultado histórico de Fase 1: JWT, política central, Redis (429), persistencia/auditoría y endpoints `/users/me`, `/users`, `/invitations`; se registraron 19 pruebas y un recorrido local en contenedor. La revisión actual sustituye el bootstrap automático: el CLI emite una invitación de Coordinadora, el primer acceso exige invitación y correo verificado. HS256 solo development/test; aud/iss obligatorios. Los conteos y evidencia vigentes están en la sección superior.

## Fase 2 - Núcleo común (registro de implementación; entrega funcional en curso)

User Stories: US-PRO-001, US-PRO-002, US-PRO-006, US-PM-001 y US-PM-002.

1. Implementar el expediente, inscripciones, ciclos y relaciones Gestor/Emprendedor en PostgreSQL, con migración y auditoría.
2. Extender la política de autorización para validar rol y relación con emprendimiento/ciclo en backend.
3. Exponer los endpoints y contratos de expediente necesarios para administrar esos recursos.
4. Cubrir creación, asignaciones y acceso autorizado/no autorizado con pruebas de dominio, integración y API.
5. Integración backend de canvas, ambiciones, objetivos, actividades, referencias de evidencia, validaciones y cronograma completada en esta revisión. UI y binarios pendientes.

Decisiones que no se implementarán sin confirmación: bootstrap sin invitación (contradice la regla de primer acceso documentada), campos y transiciones definitivos de inscripción/programa y escalas numéricas de evolución. El seguimiento implementa fotografías descriptivas por área según US-PRO-005, sin adoptar las escalas del prototipo.

Resultado de la primera rebanada: migración `002` y API de expediente para crear y consultar emprendimientos, crear inscripciones y ciclos, y asignar Gestores o Emprendedores por emprendimiento/ciclo. La autorización comprueba el rol y la relación persistida en backend; las asignaciones y altas quedan auditadas. Los contratos OpenAPI se regeneraron. Verificado con 21 pruebas, `ruff`, `mypy` y `contracts` lint/typecheck.

La rebanada de canvas versionado, áreas y ambiciones quedó implementada e integrada; usa el ciclo/emprendimiento persistidos, autorización por alcance y auditoría. Los entregables obligatorios, criterios de salida y campos adicionales de programa siguen `TBD`; UI conectada y demás módulos siguen pendientes.

- [x] Actualizar requisitos, historias, reglas y permisos.
- [x] Actualizar flujos, modelo de datos e integraciones.
- [x] Actualizar criterios de aceptacion y alcance del MVP.
- [x] Revisar coherencia documental y registrar resultado.

## Revision

Requisitos, permisos, flujos, modelo, integraciones, criterios y alcance revisados. Las decisiones confirmadas se consolidaron y los temas no resueltos se mantienen como `TBD`.

## Tramites financieros

- [x] Actualizar requisitos, historias, reglas y permisos de tramites.
- [x] Actualizar flujo, modelo de datos, criterios y alcance.
- [x] Revisar coherencia y registrar resultado.

Resultado: el trámite financiero sustituye a la cotización como entidad operativa. Sus estados, documentos, transiciones, contabilización única, permisos y reportes quedaron alineados entre requisitos, flujos, modelo y criterios.

## Flujo detallado de solicitudes

- [x] Actualizar requisitos, historias, reglas, permisos y flujos.
- [x] Actualizar modelo, criterios de aceptación y alcance.
- [x] Revisar coherencia y registrar resultado.

Resultado: se consolidó el flujo detallado de solicitudes, con borrador, revisión, corrección, aprobación interna, firmas, FUNDATEC, aprobación final y cierre con motivo. El checklist administrativo, documentos y permisos quedaron reflejados en el modelo y criterios.

## Chat y reemplazo de Teams

- [x] Actualizar alcance, requisitos, historias, reglas y permisos.
- [x] Actualizar flujos, modelo, UX, seguridad y criterios.
- [x] Revisar coherencia y registrar resultado.

Resultado: Teams queda como historial sin integración ni migración para emprendimientos existentes. El MVP incorpora un único chat por proyecto, adjuntos privados, menciones, no leídos, notificaciones internas y por correo, y edición/eliminación visual con auditoría.

## Flujo de desarrollo e infraestructura

- [x] Documentar arquitectura de entornos y servicios.
- [x] Documentar Git, CI/CD, desarrollo local y pruebas.
- [x] Revisar coherencia con alcance e integraciones.

Resultado: se definieron desarrollo local con Docker Compose, CI obligatorio, staging desde `develop`, producción desde `main`, servicios `web` y `worker`, y PostgreSQL como cola persistente. La decisión inicial de no usar Redis fue reemplazada posteriormente.

## Prototipo visual SIA

- [x] Inicializar prototipo estático reutilizable.
- [x] Implementar dashboard de Coordinadora y navegación del proyecto.
- [x] Implementar módulos visuales del proyecto y datos ficticios.
- [x] Verificar build y documentar resultado.

Resultado: se creó un mockup navegable de SIA con dashboard de Coordinadora y vista de proyecto. No usa servicios ni persistencia; incluye datos ficticios, la paleta oficial y una versión autocontenida en `visual/prototype/bundle.html`.

## Kanban de plan de trabajo

- [x] Documentar la vista Kanban de objetivos y actividades.
- [x] Representar el Kanban en el prototipo visual.
- [x] Verificar el build del prototipo.

Resultado: el módulo Objetivos y actividades incorpora una vista Kanban por proyecto. El prototipo muestra columnas por estado y tarjetas con objetivo asociado, responsable, fecha y evidencias; la versión `bundle.html` fue actualizada.

## Base de colaboración del repositorio

- [x] Crear documentación de inicio y contribución.
- [x] Configurar plantilla de pull request y automatización de calidad.
- [x] Ajustar reglas del proyecto y verificar el prototipo.

Resultado: se añadieron README raíz, guía de contribución, EditorConfig, plantilla de PR y CI para el prototipo. Se eliminaron dependencias de plantilla no usadas; lint, build y la vista financiera unificada fueron verificados.

## Finanzas y compras unificadas

- [x] Documentar el módulo financiero unificado.
- [x] Unificar Trámites y Presupuesto en el prototipo.
- [x] Verificar build y actualizar el HTML autónomo.

Resultado: Finanzas y compras agrupa presupuesto, solicitudes, estados, movimientos y reportes en una única pestaña del proyecto. El mockup y `bundle.html` fueron actualizados.

## Arquitectura FastAPI y Clerk

- [x] Actualizar integraciones, modelo de identidad y seguridad.
- [x] Actualizar flujo de desarrollo, alcance y README.
- [x] Revisar coherencia documental.

Resultado: la arquitectura oficial usa Next.js como frontend, FastAPI como backend, Clerk Cloud para identidad y JWT, y un worker Python. PostgreSQL conserva invitaciones, roles, autorización, auditoría y la cola persistente; Redis se añadió posteriormente para rate limiting y escalabilidad de Socket.IO.

## Redis para escalabilidad

- [x] Documentar Redis para rate limiting y Socket.IO.
- [x] Actualizar seguridad, desarrollo local y alcance técnico.
- [x] Revisar coherencia documental.

Resultado: Redis se utiliza para rate limiting distribuido y para coordinar Socket.IO al escalar FastAPI. PostgreSQL conserva los datos de negocio, auditoría y cola persistente.

## Diagrama de arquitectura

- [x] Documentar componentes y flujos de arquitectura.
- [x] Enlazar el diagrama desde la documentación principal.

Resultado: la arquitectura objetivo, responsabilidades y servicios por entorno se consolidaron en `docs/00-nucleo-comun/vision-y-alcance.md`.

## Organización visual del repositorio

- [x] Agrupar marca y prototipo dentro de `visual/`.
- [x] Actualizar enlaces, CI, ignores e importaciones.
- [x] Verificar el build del prototipo en su nueva ubicación.

Resultado: la marca se organiza en `visual/brand/` y el mockup en `visual/prototype/`. README, CI, imports e ignores se actualizaron; lint, build y `bundle.html` se verificaron desde la nueva ubicación.

## Diagnóstico 360° y seguimiento evolutivo

- [x] Documentar requisitos, historias, reglas, permisos y flujos.
- [x] Documentar modelo de datos, arquitectura, UX, alcance y criterios de aceptación.
- [ ] Implementar migraciones, API, interfaz y pruebas del módulo.

Actualización 2026-09-16: migración 003, API y pruebas backend ya implementadas para fotografías descriptivas; la casilla compuesta continúa abierta por UI y alcance pendiente. Véase [seguimiento](../apps/api/app/modules/seguimiento/README.md). Las escalas numéricas de la demo no se trasladan al backend.

Resultado histórico reemplazado: el seguimiento vigente es `diagnóstico por área -> objetivo -> actividad -> evidencia -> resultado -> nuevo diagnóstico`. Las ambiciones permanecen visibles y se vinculan opcionalmente desde el objetivo; los diagnósticos aprobados son inmutables.

## Simplificación del Diagnóstico 360°

- [x] Reemplazar necesidades por el vínculo directo área de diagnóstico -> objetivo.
- [x] Definir el Cubo 360 por programa con seis áreas y ambiciones visibles opcionales.
- [x] Actualizar el mockup, documentación y criterios afectados.
- [x] Verificar el recorrido y el build del prototipo.

Resultado: Prototipado usa Identidad y dirección estratégica, Modelo de negocio, Mercado segmentado, Canales definidos, Producto mínimo viable y Constitución de sociedad. Puesta en marcha usa Modelo de negocio, Marca y canales, Marketing y comercialización, Protección de propiedad intelectual, Formalización y operaciones y Financiamiento. El mockup de Prototipado eliminó necesidades; cada objetivo requiere un área y puede vincular una ambición opcional.

## Informes técnicos periódicos y de cierre

- [x] Documentar requisitos, historias, reglas, permisos y flujo de informe.
- [x] Documentar versión, fuentes, instantáneas, PDF, UX, arquitectura y criterios.
- [ ] Implementar migraciones, API, interfaz, PDF y pruebas del módulo.

Resultado: los informes reutilizan registros fuente del proyecto para un período, muestran faltantes como `Pendiente de completar`, se aprueban antes de generar PDF y preservan cada versión como instantánea inmutable. Programa y cambios formales de alcance permanecen `TBD` hasta disponer de entidades fuente aprobadas.

## Simplificar el Diagnóstico 360°

- [x] Editor de una página: fuera asistente de 3 pasos; solo `score` + `observación` por área.
- [x] Cubo solo con botones: fuera arrastre, touch y orientación por teclado; queda giro izquierda/derecha/superior/reiniciar y clic en cara.
- [x] Quitar `notes` y `evidenceIds` de la evaluación de diagnóstico (tipo, seed, modal).
- [x] Actualizar tests de navegador y de dominio.
- [x] Verificar lint, tests, build y actualizar `bundle.html`.

Resultado: el editor quedó en una sola página con las seis áreas a la vez (calificación + observación). El cubo se gira con arrastre de mouse o botones; se eliminaron el touch táctil, la orientación por teclado y los campos `notes` y `evidenceIds` de la evaluación. El seguimiento evolutivo (múltiples fotografías, comparación, deltas, radar) se conserva. `pnpm test` (11), `pnpm lint`, `pnpm build` y el recorrido Playwright pasan.

## Verificación del mockup local

- [x] Ejecutar lint, pruebas de dominio y build del prototipo.
- [x] Verificar el recorrido de navegador sobre el archivo autónomo `bundle.html`.

Resultado: `visual/prototype/bundle.html` se genera sin recursos externos y funciona al abrirse directamente. Playwright verificó el flujo de diagnóstico, ambición, objetivo, actividad, evidencia, informe, permisos y vistas móviles sin errores de consola ni solicitudes externas.

## Reorganización documental por programas

- [x] Consolidar decisiones de la reunión del 8 de septiembre de 2026.
- [x] Reemplazar la estructura documental plana por núcleo común y programas.
- [x] Documentar Prototipado y Puesta en marcha como alcance inicial.
- [x] Marcar decisiones de programa no definidas como `TBD`.

Resultado: la documentación se organiza en `00-nucleo-comun`, `01-pre-incubacion`, `02-prototipado` y `03-puesta-en-marcha`. El expediente se conserva entre programas; Pre-incubación queda fuera del primer alcance y los vacíos de canvas, entregables, validaciones y finanzas se mantienen explícitos como `TBD`.
