# Plan: SIA escalable, limpio y extensible

Estado: plan de arquitectura y evolución, actualizado el **2026-09-16** sobre `35775c0`. La [matriz canónica del README](../README.md#estado-actual) registra lo implementado; la [guía operativa](../docs/operacion-api.md) conserva evidencia local/CI y restricciones. Este plan no certifica escalamiento horizontal ni staging.

## 1. Contexto

- La documentación funcional y de arquitectura está organizada en `docs/`; conserva decisiones de programa `TBD` y Pre-incubación fuera del primer alcance.
- Existe un prototipo visual (`visual/prototype/`) con `applyCommand` y pruebas de dominio. Es referencia de UX y paridad, no fuente de aprobación de escalas, estados o reglas aún no confirmadas.
- Ya existe backend persistente de identidad, expediente y seguimiento, con autorización, auditoría, migraciones 001–003 y contratos. `apps/web` es una base sin UI funcional conectada; `apps/worker` permanece activo, pero no procesa tareas ni tiene cola persistente.

Antecedente histórico: el borrador original de este plan se redactó antes de implementar la aplicación real y decía «aún no está implementado». Esa premisa quedó superada por `d9b8cf2` y `fe6cf80`. Se conserva la arquitectura propuesta a continuación, con sus diferencias respecto al código actual explícitas.

Objetivo del plan: entregar una base que pueda crecer horizontalmente, donde agregar un módulo nuevo sea un procedimiento repetible y el código sea legible y testeable por capas.

## 2. Principios de arquitectura

Estos principios expresan la dirección de diseño, no una descripción literal de todas las capas actuales.

1. **Vertical slices por feature.** Agrupar API, servicio y política por módulo con dependencias explícitas. Actualmente seguimiento reutiliza identidad y expediente; modelos, esquemas y tests están en directorios compartidos de la API.
2. **Dominio puro y central.** Conservar reglas puras comprobables. El port de paridad del prototipo ya existe en `app/domain/prototype.py`; el servicio persistente implementa solo reglas respaldadas por los documentos vigentes, sin trasladar automáticamente escalas o estados de demo.
3. **Ports & adapters.** La capa de aplicación depende de interfaces (repository, queue, mail, storage, ia). Cada integración (PostgreSQL, R2, Resend, OpenAI) es un adapter intercambiable; un mock permite tests sin infraestructura.
4. **Un solo contrato frontend↔backend.** FastAPI publica OpenAPI; desde él se generan los tipos TypeScript. No se duplican contratos a mano.
5. **Autorización siempre en backend.** Política central por rol + relación con el emprendimiento/ciclo. La UI solo usa esa autorización; nunca decide.
6. **API stateless, estado fuera del proceso.** Todo estado en PostgreSQL/Redis. Escalar = agregar instancias.
7. **Trabajo asíncrono idempotente.** La cola persiste en PostgreSQL (como decidido); el worker es horizontal y cada tarea tolera reintentos.
8. **Trazabilidad y no-eliminación.** Auditoría de toda acción relevante; el histórico no se sobrescribe ni se borra.
9. **TBD explícito.** Toda decisión funcional sin confirmar se marca `TBD`; nunca se inventa.
10. **No adelantar optimizaciones.** Caché, réplicas de lectura y particionado entran solo con evidencia de cuello; el diseño lo permite sin acoplarse.

## 3. Estructura del repositorio (monorepo)

Estructura **objetivo** del plan original. En el árbol actual no existe `packages/tsconfig`; los contratos entregan OpenAPI y tipos TS, sin generación separada de JSON Schema ni cliente HTTP. Los Dockerfiles actuales están en cada app y la configuración Nginx de la demo está en `deploy/coolify/nginx.conf`. Compose incorpora además el servicio `migrate`. El prototipo queda fuera del workspace pnpm y conserva su lockfile independiente.

```text
/ (raíz)
├── apps/
│   ├── web/                # Next.js App Router + TypeScript
│   ├── api/                # FastAPI (reglas, autorización, cola)
│   └── worker/             # Worker Python (correo, IA, PDF, R2)
├── packages/
│   ├── contracts/          # OpenAPI + tipos TS/JSON Schema generados (única fuente del contrato)
│   └── tsconfig/           # base TS/ESLint compartida
├── infra/
│   ├── docker-compose.yml  # dev: postgres, redis, api, worker, web, minio(R2-sim)
│   └── (dockerfiles por app, nginx)
├── visual/
│   ├── brand/              # marca
│   └── prototype/          # mockup: referencia visual y de dominio
├── docs/                   # núcleo común + programas (fuente de funcionalidad)
└── tasks/
```

Se conserva `visual/prototype/` como referencia; la reutilización visual en la web real sigue pendiente. Su instalación local/CI usa `pnpm install --frozen-lockfile --ignore-workspace` desde ese directorio (`a5f1796`).

## 4. Backend — FastAPI (diseño por capas)

El árbol siguiente conserva la **propuesta objetivo**, no rutas que deban existir hoy. Actualmente hay `modules/identity`, `modules/expediente` y `modules/seguimiento`, cada uno con rutas, servicio y política; modelos en `app/models`, esquemas en `app/schemas`, sesión en `app/db`, pruebas en `tests` y migraciones en `alembic/`. Los servicios usan SQLAlchemy directamente; no están implementadas las abstracciones repository/ports ni la cola del diagrama. Adoptarlas requerirá necesidad concreta, no una reestructuración automática por cumplir este dibujo.

```text
apps/api/
  app/
    core/                  # config, logging JSON, db (sesiones/transacciones), redis, errores, rate limiting
    security/              # validación JWT (Clerk JWKS), current_user, current_cycle, política base
    audit/                 # escritor de auditoría (port + adapter Postgres)
    queue/                 # port de cola + adapter Postgres (FOR UPDATE SKIP LOCKED)
    modules/
      expediente/
        domain.py          # reglas puras (sin framework)
        models.py          # SQLAlchemy
        schemas.py         # Pydantic (contrato API)
        repository.py      # port (dataclass/ABC)
        repository_postgres.py  # adapter
        service.py         # orquesta dominio + repo + auditoría + eventos
        policy.py          # permisos: rol × relación × acción
        routes.py          # endpoints delgados (validación + service)
        tests/             # unit (domain), integration (service+repo), policy
      diagnostico/         # migra applyCommand → service
      ambiciones/
      objetivos-actividades/
      evidencias/
      reuniones-minutas/
      chat/
      alertas/
      informes/
      finanzas/            # por programa (partidas, tramites, movimientos)
      programa-comun/      # canvas, áreas, entregables, ciclos, invitaciones
    tests/conftest.py      # DB de test, client, fixtures
  migrations/              # Alembic, versionadas
```

Reglas propuestas para evolucionar esta capa:

- `routes.py` solo valida y llama al service; **no** contiene lógica de negocio.
- `service.py` contiene las transiciones (portadas de `applyCommand`) y emite eventos/auditoría.
- `domain.py` es puro y testeable sin base de datos; los errores de negocio se modelan como excepciones tipadas.
- `policy.py` recibe `(actor, cycle_id, accion)` y consulta roles/relaciones en Postgres; el `routes` la ejecuta antes de tocar datos.

## 5. Frontend — Next.js (diseño por features)

Diseño **pendiente**: la web actual usa `apps/web/app/` (sin `src/`), página de construcción, layout y health check. No hay shell autenticado, features conectadas, cliente HTTP generado ni Socket.IO.

```text
apps/web/src/
  app/
    (shell)/                  # layout autenticado (sidebar, topbar) — replica del prototipo
      projects/[projectId]/.../page.tsx   # una página por sección del proyecto
  features/
    diagnostico/              # componentes, hooks, api.ts del módulo (espejo del backend)
    ambiciones/
    objetivos-actividades/
    ...
  lib/
    auth/                     # Clerk: sign-in, guard de ruta (no es autorización)
    api-client/               # tipos y cliente generados desde OpenAPI
    realtime/                 # cliente Socket.IO (rooms por proyecto)
  ui/                         # design system (derivado de catalitec.css)
```

Reglas:

- Server Components para lectura y datos iniciales; Client Components solo para formularios/edición.
- Las mutaciones llaman a la API FastAPI (cliente generado). Socket.IO solo notifica en vivo; los datos autoritativos salen de la API.
- La UI puede ocultar acciones por permisos, pero la autorización de fondo la valida el backend (principio 5).

## 6. Contrato único (packages/contracts)

1. FastAPI emite `openapi.json` desde `app.main` y los esquemas actuales de `app/schemas/` (la propuesta original los situaba en `modules/*/schemas.py`).
2. CI comprueba OpenAPI y regenera tipos TS via `openapi-typescript`; no existe una salida independiente de JSON Schema de requests (era parte de la propuesta original).
3. Drift check: un PR que cambie la API sin actualizar el contrato generado falla.

Beneficio: renombrar un campo, cambiar un estado o agregar una ruta se refleja en frontend de forma tipada sin mantenimiento manual.

## 7. Persistencia — PostgreSQL

- Modelo conceptual en `docs/00-nucleo-comun/modelo-de-datos-compartido.md`; **modelo ER detallado** (con estado de implementación por tabla) en `docs/00-nucleo-comun/modelo-de-datos-detallado.md`.
- Cada tabla de negocio incluye el scope (`entrepreneurship_id` y/o `cycle_id`, `user` donde aplique); los índices empiezan por la columna de scope.
- Alembic con migraciones versionadas; cada módulo entrega su migración con su feature.
- La cola persistente propuesta será una tabla de jobs con claim atómico (`FOR UPDATE SKIP LOCKED`), reintentos e idempotencia; aún no hay tabla ni worker consumidor.

Persistencia actual: 001 identidad/auditoría, 002 expediente/asignaciones, 003 seguimiento con canvas v1. La revocación de asignaciones es lógica, auditada y autorizada por scope exacto; la corrección integrada permite al Gestor de ciclo remover Emprendedores de ese ciclo sin administrar hermanos. Detalle y prueba en [operación](../docs/operacion-api.md#revocación-y-alcance-de-asignaciones).

## 8. Escalamiento horizontal (cómo se logra)

La tabla conserva el **diseño objetivo**, no resultados de carga ni capacidades desplegadas. JWT y rate limiting Redis están implementados; cola/consumidores, Socket.IO, R2, tracing y métricas quedan pendientes. Los listados de expediente usan `limit/offset` y los de seguimiento no tienen paginación; keyset no está implementado. Bloqueos PostgreSQL y pruebas de concurrencia del núcleo no equivalen a una validación de escalamiento multiinstancia.

| Recurso | Decisión | Permite |
|---|---|---|
| API FastAPI | stateless; JWT validado por request (JWKS de Clerk) | N instancias detrás de load balancer |
| Socket.IO | adaptador Redis; rooms por proyecto | mensajes en vivo entre instancias |
| Rate limiting | Redis distribuido; 429 sin ejecutar acción | protección global consistente |
| Worker | reclama jobs con SKIP LOCKED; idempotente por tarea | tantos workers como sea necesario |
| Archivos | R2 con URLs firmadas emitidas por API | tráfico de archivos sin pasar por la API |
| Consultas | índices por scope + paginación por keyset | crecimiento del volumen sin tiempo lineal |
| Observabilidad | logs JSON con request-id, métricas, tracing | diagnóstico de cuellos reales |

Caché de lectura y réplicas quedan definidos como extensiones posibles, no dependencias iniciales (principio 10).

## 9. Procedimiento repetible: "cómo agregar un módulo"

Checklist objetivo de este plan; aplicar el flujo real de [CONTRIBUTING](../CONTRIBUTING.md) y reutilizar la estructura existente sin introducir capas innecesarias:

1. Crear `apps/api/app/modules/<feature>/` (domain → models → schemas → repo → service → policy → routes → tests) siguiendo un módulo existente como plantilla.
2. Crear la migración Alembic.
3. Registrar las rutas y la política en el compositor de la app.
4. Regenerar el contrato y crear `apps/web/src/features/<feature>/`.
5. Agregar la entrada de navegación y el permiso en la política central.
6. Tests: unit (domain), integration (service+repo), policy, y contratos.
7. Referenciar la User Story y el criterio de aceptación de `docs/<programa>/historias-de-usuario.md`.

Minimizar cambios en otros módulos y documentar las dependencias comunes necesarias, sin duplicar identidad, expediente ni autorización.

## 10. Herramientas y calidad

La tabla es la meta de calidad. CI actual comprueba API (Ruff, mypy, pytest, Alembic/bootstrap) y web/contratos (lint, typecheck, drift). El prototipo tiene su propio workflow de lint, dominio, build e imagen/HTTP. No hay job de worker ni E2E/build de la web real en `application-quality.yml`; Playwright de la demo no valida la aplicación conectada. Ver runs y conteos en [evidencia vigente](../docs/operacion-api.md#evidencia-vigente--2026-09-16).

| Capa | Stack | Verificaciones |
|---|---|---|
| web | pnpm, Next.js, TS strict, oxlint, Vitest, Playwright | lint, typecheck, unit, e2e de recorridos |
| api/worker | uv, ruff, mypy, pytest (pytest-asyncio) | lint, typecheck, unit, integration (DB de test) |
| contratos | CI | regeneración + drift check |

Flujo Git/CI se mantiene: ramas cortas desde `develop`, PR a `develop` (staging) y `main` (producción); cada PR pasa las verificaciones de la pieza afectada.

## 11. Hoja de ruta en fases

Las fases son una secuencia técnica, no una redefinición del MVP. **Nota histórica:** el plan original llamó «MVP por defecto» a las fases 0–5; esa etiqueta era incompleta frente al alcance vigente, que incluye finanzas según programa y una interfaz usable. El cierre se rige por [visión y alcance](../docs/00-nucleo-comun/vision-y-alcance.md) y los documentos de programa, incluidos sus `TBD`.

- **Fase 0 — Fundaciones, implementada como base**: monorepo, tooling, Compose y port de dominio. Worker y web son esqueletos; evidencia del stack completo no confirmada en este corte.
- **Fase 1 — Identidad y autorización, backend implementado**: JWT, invitaciones, usuarios/roles, política, auditoría y rate limiting. OAuth real/Clerk Cloud y staging pendientes.
- **Fase 2 — Núcleo común, backend integrado / entrega en curso**: expediente, canvas, ambiciones, objetivos, actividades, referencias HTTP(S), validaciones y cronograma. UI y binarios pendientes; no automatizar decisiones `TBD`.
- **Fase 3 — Diagnóstico y evolución, backend descriptivo integrado**: fotografías de seis áreas, aprobación inmutable y comparación entre aprobadas. UI del cubo pendiente; escalas y deltas numéricos del prototipo no confirmados.
- **Fase 4 — Comunicación, backend integrado**: reuniones, minutas con aprobación humana inmutable, acuerdos, canales, mensajes, menciones, no leídos, alertas y notificaciones internas. La taxonomía y permisos particulares de canales, Socket.IO/Redis, Resend, adjuntos, grabaciones y proveedor IA real permanecen `TBD` o pendientes de integración.
- **Fase 5 — Informes técnicos, backend integrado**: informe por período que compone fuentes trazables (objetivos, actividades, evidencias, minutas, acuerdos), edición de borrador, aprobación humana con revisión explícita, versión inmutable, corrección vinculada y encolado del PDF; consumidor del worker sobre la cola persistente (`005`). Render de PDF/R2, proveedor IA real, fuente de finanzas y el cableado del deployable `apps/worker` siguen `TBD` o pendientes. Detalle en el [módulo de informes](../apps/api/app/modules/informes/README.md).
- **Fase 6 — Finanzas por programa, pendiente**: implementar solo definiciones confirmadas; partidas, flujo exacto, integración administrativa, rol Revisor financiero y habilitación en Puesta en marcha siguen `TBD`.
- **Fase 7 — UI conectada, pendiente**: conectar `apps/web` con la API real para identidad, expediente, seguimiento y comunicación; sustituir datos ficticios por respuestas autorizadas, cubrir carga, errores, paginación y permisos, y probar los recorridos críticos de navegador a API. Finanzas se incorpora cuando su Fase 6 esté implementada.
- **Fase 8 — Staging, pendiente**: desplegar `develop` con migraciones, probes y configuración real de Clerk, PostgreSQL, Redis, R2 y demás servicios habilitados; verificar observabilidad, backups y rollback. La imagen del prototipo y el CI verde no acreditan este entorno.
- **Fase 9 — Validación operativa, pendiente**: ejecutar los flujos priorizados con Coordinadora, Gestores y Emprendedores autorizados en staging; confirmar alcance, permisos, comunicación, seguimiento y registro de incidencias antes de liberar.
- **Fase 10 — Producción, pendiente**: desplegar desde `main` después de superar la validación operativa, con dominio, secretos, migraciones, monitoreo, backups y un plan de reversión verificado.

## 12. Trazabilidad y decisiones abiertas

- Rieles `TBD` ya conocidos: rol `Revisor financiero`, programa/cambios formales de alcance en informes, flujo de compras que habilita el programa.
- Restricciones efectivas y demás `TBD`: [pendientes operativos](../docs/operacion-api.md#pendientes) y [decisiones de seguimiento](../apps/api/app/modules/seguimiento/README.md#decisiones-pendientes-tbd). Las escalas son pendientes; lo implementado es comparación descriptiva. Los tipos archivo/fotografía/video son enlaces sin binarios.
- Cada módulo implementa las User Stories y criterios de aceptación de `docs/<programa>/historias-de-usuario.md`; ninguna implementación inventa requisitos (regla de `AGENTS.md`).
- El historial del prototipo se conserva; la app real no reemplaza ni elimina datos de demostración ni documentación.

## 13. Verificación y puertas de liberación

Antes de cerrar una fase de implementación: lint, typecheck y pruebas de la pieza. La Fase 7 añade recorridos críticos de navegador a API. La Fase 8 exige evidencia técnica en staging; la Fase 9 exige validación operativa documentada en ese entorno; la Fase 10 requiere las puertas anteriores y evidencia del despliegue productivo. La definición de "listo" es verificable, no subjetiva.

Al 2026-09-16, la evidencia de CI y la evidencia local histórica están documentadas; **staging NO verificado**. Por ello, «backend integrado» no significa que UI, staging, validación operativa, producción ni MVP estén terminados. Esta revisión comprueba documentación y enlaces sin volver a ejecutar suites de aplicación.
