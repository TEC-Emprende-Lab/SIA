# Estado actual verificable

**Trabajo local posterior al corte:** [carpetas de evidencias](evidencias-carpetas.md),
migración `008`, backend y UI con pruebas locales. No está publicado ni acredita una
migración o sesión autenticada en staging. Las referencias remotas siguientes se
mantienen como corte verificable anterior a esa ampliación.

**Corte: 2026-10-12.** Este documento describe el estado observado en el
repositorio local sincronizado con el remoto, no una certificación de que el
MVP esté terminado. En caso de conflicto sobre requisitos, prevalecen los
documentos de programa y el núcleo común según `AGENTS.md`.

## Referencias del corte

- `develop`: `44a492e` (`Merge pull request #32 from TEC-Emprende-Lab/feature/ambiciones-ui`).
- `main`: `289c731` (`chore(release): promover mejoras validadas de SIA a main`).
- `main` contiene el mismo producto que `develop` en este corte, promovido por
  el commit de release.
- No había pull requests abiertos ni cambios locales al hacer el corte.

## Implementado en código

| Área | Estado y límite verificable |
|---|---|
| Fundaciones | Monorepo pnpm/uv; Web Next.js, API FastAPI, worker Python, PostgreSQL, Redis y MinIO en Compose. Contratos OpenAPI y tipos TypeScript generados con control de drift. |
| Identidad y autorización | Clerk/JWT, invitaciones, bootstrap administrativo, roles y scope persistente de emprendimiento/ciclo; FastAPI conserva la autorización. Google OAuth y los flujos remotos por rol no están certificados. |
| Expediente y seguimiento | Expedientes, inscripciones, ciclos, asignaciones revocables, canvas v1 de Prototipado y Puesta en marcha, ambiciones, objetivos, actividades, cronograma derivado, evidencias, diagnósticos descriptivos y validaciones auditadas. La alta de Puesta en marcha continúa bloqueada mientras sus condiciones de entrada no tengan fuente persistente verificable. |
| Web conectada | Shell autenticado, expediente, seguimiento, diagnóstico 360 descriptivo, ambiciones, reuniones, canales, alertas, informes, revisión de evidencias y Kanban consumen API/BFF autorizados. El Kanban traduce arrastres a acciones existentes; no agrega estados de negocio. |
| Comunicación | Reuniones, minutas, acuerdos, canales, mensajes, menciones, recibos de lectura, alertas y notificaciones internas. Las minutas aprobadas son inmutables. Socket.IO, correo, adjuntos de chat y proveedor IA real no están integrados. |
| Archivos privados | Migración `007`: `documents`, carga autorizada, evidencia con `document_id` y URL firmada. Requiere `SIA_STORAGE_*`; sin almacenamiento configurado la carga responde 503. Límites MIME y tamaño: `TBD`. |
| Informes | Migración `006`: borradores por período, composición trazable, revisión humana, aprobación inmutable, corrección vinculada y PDF privado generado por el worker desde la cola `005`. Plantilla mensual, IA real y datos financieros: `TBD` o pendientes. |
| Finanzas | No hay backend financiero. El prototipo visual no representa reglas ni datos operativos. |

## Verificación de este corte

- CI remota verde para `develop` `44a492e` y `main` `289c731`: [Application quality](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/38021590931) y [Prototype quality](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/38021590932) en `develop`; ambas también verdes en `main` ([Application](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/38021700909), [Prototype](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/38021700912)).
- Local: `pnpm lint`, `pnpm typecheck`, `pnpm --filter @sia/web test`, `pnpm contract:check` y `pnpm --filter @sia/web build` correctos.
- API local: `uv run --frozen --group dev pytest -q` = **130 passed, 10 skipped**; `ruff check`, `ruff format --check` y `mypy` correctos. Hay dos advertencias de deprecación de Starlette/AnyIO.
- Staging `https://sia.dev.neuroboard.app`: `GET /` y `GET /api/health` respondieron 200 sin sesión en este corte.

## Límites y siguientes verificaciones

- Un smoke HTTP, CI verde o una prueba local no sustituyen una sesión autenticada ni certifican permisos en staging.
- Faltan recorridos publicados por rol (Coordinadora, Gestor y Emprendedor), incluyendo documentos, informes, diagnóstico, ambiciones, Kanban y revisión de evidencias.
- La CI no ejecuta todavía `pnpm --filter @sia/web test` ni `pnpm --filter @sia/web build`.
- Quedan pendientes evidencia de migraciones/API, observabilidad, backups y rollback en staging; finanzas, rol Revisor financiero, escalas numéricas, catálogo de entregables y otros `TBD` funcionales no se infieren de esta implementación.
