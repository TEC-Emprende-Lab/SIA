# Operación del núcleo API

## Alcance y trazabilidad

Estado revisado el **2026-09-16**, sobre `35775c0`: identidad/invitaciones, expediente y seguimiento persistente para
US-PRO-001, US-PRO-002, US-PRO-005, US-PRO-006, US-PM-001 y US-PM-002.
Las reglas de acceso proceden de `00-nucleo-comun/actores-roles-y-permisos.md`.
La implementación y aceptación de seguimiento están detalladas en
[`apps/api/app/modules/seguimiento/README.md`](../apps/api/app/modules/seguimiento/README.md).

Esto valida el núcleo backend actual. No certifica que el MVP completo ni su UI estén terminados.
El inventario canónico de componentes está en el [estado actual del README](../README.md#estado-actual).

## Fase 4 — comunicación backend, 2026-09-16

Implementación local en `feature/comunicacion-backend`: reuniones, minutas manuales
y flujo de borrador asistido, acuerdos, canales, mensajes, menciones, lecturas,
alertas y notificaciones internas. Trazabilidad: **US-PRO-004 / US-PM-003**, como
fuentes del futuro informe, y reglas de comunicación/alertas del núcleo común.
No implementa UI ni informes. Contratos, permisos, errores y limitaciones en el
[módulo de comunicación](../apps/api/app/modules/comunicacion/README.md).

Aplicar `alembic upgrade head`: la cabeza pasa a **004**. Esta migración crea
nueve tablas de comunicación y sus restricciones, sin alterar las migraciones
001–003 ni sus tablas. Las FK heredan emprendimiento/ciclo, un FK compuesto
protege lecturas del canal y los triggers protegen ámbito, fuentes e historial.
`identity/service.py`, `security/` y `expediente/policy.py` se reutilizan sin cambios.

Pruebas locales con Python 3.12.3 y PostgreSQL 16 desechable, con las cuatro
variables PostgreSQL activas: **109 passed, 0 skipped**, incluidas las 94 pruebas
previas y 15 de comunicación. Dos advertencias preexistentes de Starlette/AnyIO.
Comunicación en SQLite con FK y migraciones reales: **14 passed, 1 skipped**
(la carrera de aprobación/edición se verifica en PostgreSQL).
Ruff lint/formato (61 archivos), mypy (46 archivos), `alembic upgrade head` y
`alembic check` correctos; sin diferencias esquema/modelos. OpenAPI y TypeScript
regenerados por sus herramientas; los 33 paths y 38 esquemas anteriores conservan
exactamente su contrato. `export_openapi.py --check`, `check.mjs`,
`pnpm lint` y `pnpm typecheck` correctos. Esta evidencia es local, no CI remoto
ni staging; no se migraron bases persistentes del usuario.

Agregar `COMUNICACION_TEST_DATABASE_URL=postgresql+asyncpg://...` a las tres
variables indicadas en la sección de reproducción. Su fixture ejecuta upgrade
y downgrade 001–004; requiere una base vacía desechable. CI ya incluye esta
variable. Mantener ejecución secuencial: las fixtures comparten la base y
eliminan únicamente sus tablas al terminar.

La API expone `/cycles/{cycle_id}/meetings`, sus subrecursos `/minutes` y
`/agreements`, `/channels`, `/channels/{channel_id}/messages`, `/read-receipt`,
`/unread`, `/alerts` y `/notifications`. Los listados son paginados; mutaciones
con revisión esperada y observación conservan auditoría. La autorización se
revalida en cada petición, incluidas lecturas personales y menciones.

## Evidencia vigente — 2026-09-16

Inspección del código y consulta de GitHub Actions con `gh run view`; no se repitieron suites por esta actualización documental.

| Procedencia | Resultado y alcance |
|---|---|
| [Application quality, run 35107005046](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005046), SHA `35775c0` | Jobs `api` y `web-and-contracts` en success. |
| [Log del job API](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005046/job/104830726036) | Python 3.12.3, PostgreSQL 16; **94 passed, 2 warnings in 17.70s**, sin skipped. Expediente 16, salud 4, identidad 37, paridad 11, seguimiento 26. |
| Mismo job API | Ruff lint correcto, formato de 51 archivos y mypy de 39 archivos correctos. Upgrade CLI 001–003, `003 (head)`, `alembic check` sin diferencias y bootstrap de invitación correctos. |
| Job web/contratos del mismo run | Instalación frozen, lint, typecheck, comprobación de OpenAPI y drift TypeScript correctos. No incluye build ni E2E de la web real. |
| [Prototype quality, run 35107005272](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005272), mismo SHA | Instalación independiente, lint, pruebas de dominio, build, imagen Docker y prueba HTTP correctos. No verifica un servidor Coolify remoto ni ejecuta el recorrido Playwright. |
| Último local comunicado por el usuario | **87 passed, 7 skipped** sin variables PostgreSQL. Registro recibido para este corte, no reejecutado ni confirmado mediante log local en esta revisión. |
| Staging / producción | **NO verificados**: los runs anteriores son controles en runners de CI, no evidencia de despliegue, Clerk/Google OAuth real ni servicios externos operativos. |

El conteo de 94 está confirmado por el log, no inferido de 90 + 4. Los cuatro casos adicionales están en seguimiento (26 frente a los 22 históricos). Activar los grupos PostgreSQL no convierte las fixtures restantes de SQLite en PostgreSQL.

Los commits `fe6cf80` (núcleo persistente y autorización por alcance) y `a5f1796` (instalación independiente del prototipo) están integrados por los merges `db58086` y `35775c0`. Las cifras, hashes y smokes locales del 2026-09-15 se conservan más abajo como evidencia histórica.

## Revocación y alcance de asignaciones

La corrección incluida en `fe6cf80` aplica en el servicio de expediente el mismo scope que en las rutas: una asignación directa exige administración del emprendimiento; una asignación de ciclo exige administración de ese ciclo exacto. Un Gestor asignado solo a un ciclo puede revocar Emprendedores de ese ciclo, sin adquirir acceso administrativo a ciclos hermanos ni al emprendimiento completo. Solo Coordinadora puede asignar o remover Gestores.

Los DELETE de asignaciones conservan la fila con `revoked_at` y auditoría, no borran historia. Una asignación ajena al scope de la URL devuelve 404 tras autorizar el ámbito; un ámbito no autorizado devuelve 403. Repetir una revocación devuelve 409. Las consultas excluyen asignaciones revocadas; otras relaciones activas conservan sus permisos.

Evidencia: [rutas](../apps/api/app/modules/expediente/routes.py), [servicio](../apps/api/app/modules/expediente/service.py), [política](../apps/api/app/modules/expediente/policy.py) y [test_expediente.py](../apps/api/tests/test_expediente.py), incluido `test_cycle_only_gestor_revokes_only_own_entrepreneurs`. Las pruebas de migración comprueban unicidad activa, reasignación con otra fila y conservación de revocación/auditoría. Solo los conflictos de unicidad de asignación se presentan como duplicados; otros errores de integridad no se ocultan bajo ese mensaje.

## Arranque local

Desde la raíz, `docker compose -f infra/docker-compose.yml up --build -d` utiliza los valores locales
de Compose. PostgreSQL debe estar saludable; el servicio de una sola ejecución `migrate` aplica
`uv run --no-sync alembic upgrade head` antes de permitir que arranque la API.
API y migrador deben apuntar a la misma `SIA_DATABASE_URL` si se personaliza Compose.

Comprobar `docker compose -f infra/docker-compose.yml logs migrate api` y
`docker compose -f infra/docker-compose.yml ps -a`. La migración debe terminar con código 0;
la API debe responder en `http://localhost:8000/readyz` con 200.
En una actualización local de un stack existente, ejecutar explícitamente
`docker compose -f infra/docker-compose.yml run --rm migrate` con la imagen recién construida
antes de recrear la API. No reutilizar una imagen antigua del migrador.

Para ejecutar fuera de Docker: en `apps/api`, instalar con `uv sync --frozen --group dev`,
configurar `SIA_DATABASE_URL` con el host/puerto accesible desde el host, ejecutar
`uv run --no-sync alembic upgrade head` y después
`uv run --no-sync fastapi run app/main.py --host 0.0.0.0 --port 8000`.

**El lifespan no crea tablas ni ejecuta migraciones.** `metadata.create_all` no instala semillas,
triggers ni el historial Alembic. Solo se usa donde las fixtures de pruebas lo requieren.
La imagen API incluye `alembic.ini` y todo `alembic/`; `app.models` registra también comunicación.

## Migraciones y despliegue staging/producción

1. Construir la imagen con `docker build -f apps/api/Dockerfile -t <imagen-api> .` desde la raíz.
2. Ejecutar **un único paso de release**, con esa misma imagen, red y `SIA_DATABASE_URL`, usando
   `uv run --no-sync alembic upgrade head`. No ejecutar una migración por réplica/worker.
3. Si el comando falla, detener el despliegue y revisar los logs; no continuar con `stamp head`.
4. Verificar `uv run --no-sync alembic current` (actualmente `004`) y
   `uv run --no-sync alembic check` (sin operaciones pendientes).
5. Arrancar las réplicas con el CMD de la imagen. En Coolify, usar `/readyz` como comprobación
   para habilitar tráfico; conservar `/healthz` como liveness.

`001` instala identidad/auditoría, `002` expediente/asignaciones y `003` seguimiento con
dos canvas v1, doce áreas y once triggers PostgreSQL de integridad/historial.
`004` incorpora comunicación y sus once triggers PostgreSQL sobre las tablas nuevas.
Los sucesivos `upgrade head` son idempotentes. `alembic check` compara esquema/modelos,
pero no comprueba por sí mismo el contenido de las semillas ni la presencia de los triggers.

Antes de migrar datos persistentes, disponer de respaldo recuperable. Las bases que provengan
del antiguo `create_all` sin historial Alembic requieren inspección y reconciliación explícita:
no se adopta automáticamente un esquema ni se marca como migrado. Si son exclusivamente datos
locales desechables, se puede preparar una nueva base vacía. Un downgrade elimina tablas e historial;
solo se ha validado en pruebas desechables, no constituye un rollback seguro de producción.

### Salud y disponibilidad

- `/healthz`: 200 mientras el proceso responde, incluso si falla la base.
- `/readyz`: 200 únicamente si puede leer `alembic_version` y sus revisiones coinciden con
  las cabezas incluidas en la imagen. DB caída, base sin migrar, revisión atrasada/incompatible
  o timeout devuelven 503 con `status=degraded`.
- El chequeo tiene un límite de tres segundos; los logs registran el tipo de fallo sin exponer
  credenciales ni detalles de conexión en la respuesta.
- Readiness verifica DB/revisión; no certifica disponibilidad de Clerk, Redis, R2 ni correo,
  ni detecta manipulación manual de semillas/triggers después de migrar.

## Bootstrap administrativo y Clerk

Sobre una base migrada, emitir la primera invitación mediante
`uv run --no-sync python -m app.modules.identity.service --email <correo> --operator <administrador>`.
En Compose se antepone `docker compose -f infra/docker-compose.yml exec api` al comando.
El CLI importa `async_session` de `app.db.session`, exige registro de usuarios vacío y ausencia
de invitaciones vigentes, emite una invitación de Coordinadora y registra el operador en auditoría.
No imprime el token de invitación. Una segunda emisión con invitación pendiente falla con código 2.

El primer acceso sigue necesitando esa invitación vigente y el mismo correo verificado en el JWT;
la primera persona que llegue a una base vacía **no** se convierte automáticamente en Coordinadora.
La aceptación registra auditoría y no permite reasignar una identidad por coincidencia de correo.

- Configurar en Clerk Google OAuth y claims firmados `email` y `email_verified` (booleano `true`
  para ese correo), además de `sub`, `exp`, `iat`, `iss` y `aud`.
- `SIA_CLERK_ISSUER` y `SIA_CLERK_AUDIENCE` son obligatorios en todos los entornos.
- Staging/producción: configurar `SIA_CLERK_JWKS_URL` de la instancia y dejar
  `SIA_CLERK_SECRET_KEY` sin definir. La verificación utiliza RS256/JWKS.
- `SIA_CLERK_SECRET_KEY` es una clave simétrica para JWT locales de prueba, no una API key
  de Clerk. HS256 solo se permite cuando `SIA_ENVIRONMENT` es exactamente `development` o `test`.
  Si se configura esa clave en otro entorno, la autenticación falla cerrada con 401.

Las pruebas de RS256 usan claves RSA locales y un proveedor JWKS sustituido; no prueban la
configuración de una instancia Clerk Cloud ni el recorrido real de Google OAuth.

### Alcance actual de Redis

El rate limiter está conectado a `POST /invitations`, no globalmente a toda la API. Devuelve 429 al superar el contador; si Redis falla, el código actual permite continuar (fail-open). Readiness tampoco comprueba Redis. La cobertura de los demás endpoints sensibles y la operación distribuida real siguen pendientes de validación; ver [implementación](../apps/api/app/core/rate_limit.py) y [ruta de identidad](../apps/api/app/modules/identity/routes.py).

## Reproducir validaciones

### Python y PostgreSQL desechable

Usar Python 3.12 y `uv sync --frozen --group dev`. En `apps/api`, los controles son
`uv run --no-sync pytest -ra`, `uv run --no-sync ruff check .`,
`uv run --no-sync ruff format --check .` y `uv run --no-sync mypy`.

Para validar el código actual con la imagen base de esta integración, montar el repositorio
en `/workspace`, usar `/workspace/apps/api` como directorio y
`UV_PROJECT_ENVIRONMENT=/tmp/sia-venv`; ejecutar primero el sync frozen dentro de `sia-api-phase2`.
Así se prueba el working tree, no el código antiguo incorporado en la imagen.

Activar los tres grupos PostgreSQL con URLs `postgresql+asyncpg://...` hacia una base vacía
**exclusivamente desechable**, sin datos de aplicación:

| Variable | Cobertura |
|---|---|
| `EXPEDIENTE_TEST_DATABASE_URL` | Migraciones 001/002, unicidad de asignaciones activas y conservación de revocaciones. |
| `SIA_TEST_POSTGRES_URL` | Tres carreras de identidad, con sesiones independientes y esquemas temporales. |
| `SEGUIMIENTO_TEST_DATABASE_URL` | Batería de seguimiento con upgrade/downgrade 001–003, bloqueos y triggers SQL. |

Las tres variables pueden apuntar a la misma base si se ejecuta la suite secuencialmente como CI.
No usar `pytest-xdist` sobre esa base compartida: expediente y seguimiento crean/eliminan tablas.
El resto de las fixtures continúa usando SQLite; activar las variables no transforma toda la suite
en pruebas PostgreSQL. Sin ellas, siete casos se omiten explícitamente.

### Contratos y TypeScript

Usar Node 24 y pnpm 9.15.9 con el lockfile del repositorio.
Desde `apps/api`, `uv run --no-sync python scripts/export_openapi.py` genera OpenAPI de `app.main`.
Desde la raíz, `pnpm --filter @sia/contracts generate` produce `src/generated.ts` mediante
`openapi-typescript`. No editar contratos a mano.

`uv run --no-sync python scripts/export_openapi.py --check` comprueba OpenAPI frente a la
aplicación actual; `pnpm contract:check` compara el TypeScript presente antes/después de regenerar.
Ambos usan el working tree y funcionan con cambios sin commit. Para comprobar determinismo,
generar ambos archivos dos veces y comparar los bytes o SHA-256 entre esas dos salidas, sin usar HEAD.
Completar con `pnpm lint` y `pnpm typecheck` (web y contratos).

CI incluye PostgreSQL 16, las tres variables, suite y controles Python, migración real mediante
CLI, comprobación de metadata y bootstrap administrativo. El job de contratos comprueba drift
sin Git como referencia. La ejecución remota está confirmada en la evidencia vigente superior.

El [workflow del prototipo](../.github/workflows/prototype-quality.yml) usa, desde `visual/prototype`, `pnpm install --frozen-lockfile --ignore-workspace` (corrección `a5f1796`). El lockfile y las dependencias del prototipo son independientes del workspace de web/contratos.

## Evidencia histórica local — integración del 2026-09-15

Registro conservado de la integración previa a los cuatro casos adicionales de seguimiento. No representa el último conteo ni una ejecución nueva en este corte documental.

Validado con el código montado sobre `sia-api-phase2`
(`sha256:603fdab96ad165c9486e58c5853a9a8a0baa1a7f3ddefc7eaf2c7e460b1cb529`),
Python 3.12.12 y dependencias congeladas; PostgreSQL 16 independiente con almacenamiento tmpfs.

| Check | Resultado observado |
|---|---|
| `uv sync --frozen --group dev` | Correcto; lockfile sin modificaciones. |
| Suite con las tres variables PostgreSQL | **90 passed**, 0 skipped, 8.73 s. Expediente 16, salud 4, identidad 37, paridad 11, seguimiento 22. |
| Suite sin variables PostgreSQL | **83 passed, 7 skipped**, 7.11 s; omisiones: expediente 2, identidad 3, seguimiento 2. |
| Ruff lint / formato | Correctos; 51 archivos con formato válido. Se normalizaron 21 archivos para cumplir el control de CI existente. |
| mypy | Sin errores en 39 archivos de aplicación. |
| Imagen API reconstruida | Build correcto; incluye configuración y versiones Alembic. |
| Smoke desde imagen, sin montar código fuente | Base vacía: healthz 200/readiness 503; revisión 002: 503; revisión 003: 200. |
| Migración CLI repetida | `upgrade head` idempotente; 2 canvas, 12 áreas y 11 triggers verificados por SQL. |
| `alembic check` | `No new upgrade operations detected.` |
| Bootstrap CLI y recorrido integrado | Emisión correcta, repetición rechazada, JWT HS256 de prueba aceptado; alta de expediente/inscripción/ciclo y lectura del canvas por el router real. Auditoría bootstrap/aceptación presente; lectura sin JWT: 401. |
| DB inaccesible desde imagen | healthz 200, readiness 503 (conexión rechazada). |
| CMD predeterminado de la imagen | Servidor HTTP real: healthz 200 y readiness 200 con base migrada. |
| Compose | `docker compose -f infra/docker-compose.yml config --quiet` correcto. No se levantó el stack completo de web/worker/MinIO en esta revisión. |
| OpenAPI/TS | Dos generaciones completas idénticas byte a byte; `--check` y `pnpm contract:check` correctos. |
| Node 24.21.0 / pnpm 9.15.9 | `pnpm lint` y `pnpm typecheck` correctos para web y contratos. |

SHA-256 de las dos generaciones idénticas:

- `packages/contracts/openapi.json` (108602 bytes): `4accba6b1b69a010fbd3af307abece2f5c5e8381f2b2b721f7a5aeeb2f7c99a3`.
- `packages/contracts/src/generated.ts` (78293 bytes): `6641d09662ea88e8c206c0db2fb3cbc9b8ac7b4c1c9ecc2dc59f3369a3a6fd60`.

Las suites emiten dos advertencias de deprecación de Starlette/TestClient (httpx y el alias
BlockingPortal de AnyIO); no son fallos de pruebas. La primera pasada TypeScript usó Node 20
del host y avisó de engine no soportado; los controles finales se repitieron con Node 24.21.0.

## Pendientes

- Validación real en staging con Clerk/Google OAuth, Redis y servicios externos configurados.
- Configurar el paso único de migración y probes en el despliegue real de la API; el despliegue
  actual documentado del prototipo no equivale a desplegar esta API.
- UI conectada, binarios privados R2, informes/PDF y finanzas según los requisitos de cada programa.
- Comunicación: taxonomía definitiva y permisos particulares de canales, límites MIME/tamaño,
  grabaciones/referencias excepcionales Zoom/Meet y plantilla de informe: `TBD`.
  Interfaces y stubs explícitos en `comunicacion/interfaces.py`; no hay categorías sembradas
  ni endpoints de adjuntos, grabaciones o informes que simulen estar implementados.
- Resend y Socket.IO/Redis reales pendientes (`TODO(TBD)`): solo hay notificaciones internas
  persistentes. Los stubs externos fallan con `NotImplementedError`, sin marcar entregas ficticias.
- Generador IA/worker real pendiente: `MinutesGenerator` tiene un stub que conserva la
  transcripción y muestra `Pendiente de completar`; no invoca modelos ni extrae acuerdos.
  El borrador asistido requiere revisión humana antes de publicarse, igual que el manual.
- Periodicidad, escalamiento, cierre de alertas, estados de acuerdos y definición independiente
  de `MeetingAction`: `TBD`. Se registra el próximo paso textual sin automatizar actividades.
  Menciones generan alertas/notificaciones; `emit_alert` permite ingestión interna idempotente
  para futuros eventos de seguimiento, validaciones, acuerdos, actividades, entregables,
  presupuesto e informes, sin un programador ni creación pública arbitraria.
- Escalas de diagnóstico, catálogo oficial de entregables, evidencia mínima, transiciones y
  criterios de salida, condiciones de autocompletado y campos adicionales de programa: `TBD`.
- Alta de Puesta en marcha: verificar sus condiciones de entrada requiere fuentes persistentes
  aún no definidas; el alta administrativa devuelve 409, no presupone su cumplimiento.

En la integración local histórica no se hicieron commits ni se migró una base persistente del usuario. Los cambios de implementación ya figuran en los commits indicados arriba. Esta revisión documental tampoco realiza commit, push ni migraciones.
