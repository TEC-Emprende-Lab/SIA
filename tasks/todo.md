# Consolidacion de decisiones

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

Estado vigente: [matriz canónica](../README.md#estado-actual). Evidencia confirmada y procedencia del último local comunicado: [operación API](../docs/operacion-api.md#evidencia-vigente--2026-09-16). Backend de identidad, expediente y seguimiento integrado; UI real y módulos restantes en curso. Staging **NO verificado**.

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
