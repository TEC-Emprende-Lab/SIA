# Plan: SIA escalable, limpio y extensible

Estado: borrador listo para validación.

## 1. Contexto

- La documentación funcional y de arquitectura está completa en `docs/`.
- Existe un prototipo visual (`visual/prototype/`) que valida la UX y **ya codifica las reglas de negocio** en `applyCommand` (patrón comando), con tests de dominio.
- El sistema real (API, base de datos, autenticación, worker) **aún no está implementado**. Es el momento ideal para fijar la arquitectura limpia antes de escribir la primera línea de producción.

Objetivo del plan: entregar una base que pueda crecer horizontalmente, donde agregar un módulo nuevo sea un procedimiento repetible y el código sea legible y testeable por capas.

## 2. Principios de arquitectura

1. **Vertical slices por feature.** Cada módulo de negocio (diagnóstico, objetivos, finanzas, informes) es autocontenido: dominio, persistencia, API, política de permisos y tests. No hay dependencias cruzadas entre features.
2. **Dominio puro y central.** Las reglas de negocio viven en una capa `domain` sin framework y sin SQL. Se reutilizan en API y en tests; el prototipo ya las tiene en `applyCommand` y se portan 1:1.
3. **Ports & adapters.** La capa de aplicación depende de interfaces (repository, queue, mail, storage, ia). Cada integración (PostgreSQL, R2, Resend, OpenAI) es un adapter intercambiable; un mock permite tests sin infraestructura.
4. **Un solo contrato frontend↔backend.** FastAPI publica OpenAPI; desde él se generan los tipos TypeScript. No se duplican contratos a mano.
5. **Autorización siempre en backend.** Política central por rol + relación con el emprendimiento/ciclo. La UI solo usa esa autorización; nunca decide.
6. **API stateless, estado fuera del proceso.** Todo estado en PostgreSQL/Redis. Escalar = agregar instancias.
7. **Trabajo asíncrono idempotente.** La cola persiste en PostgreSQL (como decidido); el worker es horizontal y cada tarea tolera reintentos.
8. **Trazabilidad y no-eliminación.** Auditoría de toda acción relevante; el histórico no se sobrescribe ni se borra.
9. **TBD explícito.** Toda decisión funcional sin confirmar se marca `TBD`; nunca se inventa.
10. **No adelantar optimizaciones.** Caché, réplicas de lectura y particionado entran solo con evidencia de cuello; el diseño lo permite sin acoplarse.

## 3. Estructura del repositorio (monorepo)

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

Se conserva `visual/prototype/` como referencia; la app real reutiliza sus reglas (dominio) y su apariencia (design system).

## 4. Backend — FastAPI (diseño por capas)

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

Reglas de esta capa:

- `routes.py` solo valida y llama al service; **no** contiene lógica de negocio.
- `service.py` contiene las transiciones (portadas de `applyCommand`) y emite eventos/auditoría.
- `domain.py` es puro y testeable sin base de datos; los errores de negocio se modelan como excepciones tipadas.
- `policy.py` recibe `(actor, cycle_id, accion)` y consulta roles/relaciones en Postgres; el `routes` la ejecuta antes de tocar datos.

## 5. Frontend — Next.js (diseño por features)

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

1. FastAPI emite `openapi.json` (schema de los `modules/*/schemas.py`).
2. CI regenera y valida: tipos TS via `openapi-typescript`, y JSON Schema de requests.
3. Drift check: un PR que cambie la API sin actualizar el contrato generado falla.

Beneficio: renombrar un campo, cambiar un estado o agregar una ruta se refleja en frontend de forma tipada sin mantenimiento manual.

## 7. Persistencia — PostgreSQL

- Modelo según `docs/00-nucleo-comun/modelo-de-datos-compartido.md`.
- Cada tabla de negocio incluye el scope (`entrepreneurship_id` y/o `cycle_id`, `user` donde aplique); los índices empiezan por la columna de scope.
- Alembic con migraciones versionadas; cada módulo entrega su migración con su feature.
- La cola persistente es una tabla `jobs` con claim atómico (`FOR UPDATE SKIP LOCKED`), reintentos y `idempotency_key`.

## 8. Escalamiento horizontal (cómo se logra)

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

Checklist (documentado en `docs/00-nucleo-comun/` como guía de contribución técnica):

1. Crear `apps/api/app/modules/<feature>/` (domain → models → schemas → repo → service → policy → routes → tests) siguiendo un módulo existente como plantilla.
2. Crear la migración Alembic.
3. Registrar las rutas y la política en el compositor de la app.
4. Regenerar el contrato y crear `apps/web/src/features/<feature>/`.
5. Agregar la entrada de navegación y el permiso en la política central.
6. Tests: unit (domain), integration (service+repo), policy, y contratos.
7. Referenciar la User Story y el criterio de aceptación de `docs/<programa>/historias-de-usuario.md`.

Un módulo nuevo **no modifica** módulos existentes salvo la composición raíz.

## 10. Herramientas y calidad

| Capa | Stack | Verificaciones |
|---|---|---|
| web | pnpm, Next.js, TS strict, oxlint, Vitest, Playwright | lint, typecheck, unit, e2e de recorridos |
| api/worker | uv, ruff, mypy, pytest (pytest-asyncio) | lint, typecheck, unit, integration (DB de test) |
| contratos | CI | regeneración + drift check |

Flujo Git/CI se mantiene: ramas cortas desde `develop`, PR a `develop` (staging) y `main` (producción); cada PR pasa las verificaciones de la pieza afectada.

## 11. Hoja de ruta en fases

Cada fase entrega algo usable y verificado. Las fases 0–5 constituyen el MVP por defecto (núcleo común + Prototipado + Puesta en marcha).

- **Fase 0 — Fundaciones**: monorepo, tooling (uv/pnpm), docker-compose dev (Postgres, Redis, R2-sim), CI base, port del dominio del prototipo a Python (tests 1:1).
- **Fase 1 — Identidad y autorización**: Clerk OAuth+JWT, invitaciones, usuarios/roles en Postgres, motor de política central, auditoría base, rate limiting en Redis.
- **Fase 2 — Núcleo común**: expediente, canvas/áreas por programa, ambiciones, objetivos→actividades→evidencias, validaciones, cronograma. Persistencia + servicio (reglas portadas de `applyCommand`).
- **Fase 3 — Diagnóstico 360° y evolución**: cubo 360, historial de diagnósticos aprobados, comparación/deltas. Corresponde al pendiente documentado (migraciones, API, interfaz, pruebas).
- **Fase 4 — Comunicación**: reuniones/minutas/acuerdos, chat por proyecto (Socket.IO + Redis), menciones, no leídos, alertas y notificaciones (correo vía Resend).
- **Fase 5 — Informes técnicos e IA**: borrador asistido por worker+OpenAI, fuentes trazables, versionado inmutable, aprobación y PDF en R2.
- **Fase 6 — Finanzas y compras por programa**: presupuesto, partidas, trámites financieros, movimientos, reportes, `Revisor financiero` (rol TBD hasta decisión).
- **Fase 7 — Experiencia y despliegue**: frontend completo (pantallas del prototipo), archivos adjuntos R2, staging y producción en Coolify, observabilidad y endurecimiento (trazas, límites, backups).

## 12. Trazabilidad y decisiones abiertas

- Rieles `TBD` ya conocidos: rol `Revisor financiero`, programa/cambios formales de alcance en informes, flujo de compras que habilita el programa.
- Cada módulo implementa las User Stories y criterios de aceptación de `docs/<programa>/historias-de-usuario.md`; ninguna implementación inventa requisitos (regla de `AGENTS.md`).
- El historial del prototipo se conserva; la app real no reemplaza ni elimina datos de demostración ni documentación.

## 13. Verificación global

Antes de cerrar cada fase: lint, typecheck, tests de la pieza, camino de navegación E2E y despliegue en staging. La definición de "listo" es verificable en CI y en el entorno de staging, no subjetiva.