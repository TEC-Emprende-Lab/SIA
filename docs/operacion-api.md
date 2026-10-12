# Operación del núcleo API

## Alcance y trazabilidad

Ampliación posterior al corte remoto: carpetas de evidencias (`008`), canales estándar
(`009`) y referencias de chat (`010`) después de `007`; detalle en
[carpetas](evidencias-carpetas.md). Al instalar esta rama, `alembic upgrade head` incluye
`008–010`. No se ha aplicado a staging. Las verificaciones del corte remoto siguientes no
incluyen esta ampliación.

Estado revisado el **2026-10-23**, sobre `develop` `ab5ebad` y `main` `289c731`.
Incluye identidad/invitaciones, expediente, seguimiento, comunicación, cola persistente,
informes técnicos, PDF por worker y documentos privados. Trazabilidad: US-PRO-001/002/004/005/006 y US-PM-001/002/003.
Última verificación operativa: **2026-10-06**, sobre `1725260` (sección «Verificación operativa — 2026-10-06»).
Última verificación de staging: **2026-10-12**, recorrido autenticado parcial en `https://sia.dev.neuroboard.app` (sección «Verificación de staging — 2026-10-12»). El smoke del 2026-10-06 permanece en la sección anterior.
La evidencia consolidada del corte está en [estado actual](estado-actual.md).
Las reglas de acceso proceden de `00-nucleo-comun/actores-roles-y-permisos.md`.
La implementación y aceptación de seguimiento están detalladas en
[`apps/api/app/modules/seguimiento/README.md`](../apps/api/app/modules/seguimiento/README.md).

Esto valida controles locales del núcleo backend actual. No certifica que el MVP completo,
la UI en sesión real ni los servicios externos estén terminados.

## Registro histórico — comunicación backend, 2026-09-16

Implementación local en `feature/comunicacion-backend`: reuniones, minutas manuales
y flujo de borrador asistido, acuerdos, canales, mensajes, menciones, lecturas,
alertas y notificaciones internas. Trazabilidad: **US-PRO-004 / US-PM-003**, como
fuentes del futuro informe, y reglas de comunicación/alertas del núcleo común.
No implementa UI ni informes. Contratos, permisos, errores y limitaciones en el
[módulo de comunicación](../apps/api/app/modules/comunicacion/README.md).

En ese corte, `alembic upgrade head` terminaba en **004**. Esta migración crea
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

## Evidencia histórica — 2026-09-16

Inspección del código y consulta de GitHub Actions con `gh run view`; no se repitieron suites por esta actualización documental.

| Procedencia | Resultado y alcance |
|---|---|
| [Application quality, run 35107005046](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005046), SHA `35775c0` | Jobs `api` y `web-and-contracts` en success. |
| [Log del job API](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005046/job/104830726036) | Python 3.12.3, PostgreSQL 16; **94 passed, 2 warnings in 17.70s**, sin skipped. Expediente 16, salud 4, identidad 37, paridad 11, seguimiento 26. |
| Mismo job API | Ruff lint correcto, formato de 51 archivos y mypy de 39 archivos correctos. Upgrade CLI 001–003, `003 (head)`, `alembic check` sin diferencias y bootstrap de invitación correctos. |
| Job web/contratos del mismo run | Instalación frozen, lint, typecheck, comprobación de OpenAPI y drift TypeScript correctos. No incluye build ni E2E de la web real. |
| [Prototype quality, run 35107005272](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/35107005272), mismo SHA | Instalación independiente, lint, pruebas de dominio, build, imagen Docker y prueba HTTP correctos. No verifica un servidor Coolify remoto ni ejecuta el recorrido Playwright. |
| Último local comunicado por el usuario | **87 passed, 7 skipped** sin variables PostgreSQL. Registro recibido para este corte, no reejecutado ni confirmado mediante log local en esta revisión. |
| Staging / producción | **No verificados en ese corte histórico**: los runs anteriores son controles en runners de CI, no evidencia de despliegue, Clerk/Google OAuth real ni servicios externos operativos. Consultar la verificación posterior de staging. |

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
4. Verificar `uv run --no-sync alembic current` (actualmente `007`) y
   `uv run --no-sync alembic check` (sin operaciones pendientes).
5. Arrancar las réplicas con el CMD de la imagen. En Coolify, usar `/readyz` como comprobación
   para habilitar tráfico; conservar `/healthz` como liveness.

`001` instala identidad/auditoría, `002` expediente/asignaciones y `003` seguimiento con
dos canvas v1, doce áreas y once triggers PostgreSQL de integridad/historial.
`004` incorpora comunicación y sus once triggers PostgreSQL sobre las tablas nuevas.
`005` incorpora `job_queue`, con reclamo idempotente y estados de trabajo.
`006` incorpora `technical_reports`: una fila por versión de informe, composición
trazable, revisión humana, inmutabilidad de aprobados y puntero al PDF privado.
`007` incorpora `documents` y permite que evidencias de archivo, fotografía o video
usen un documento privado autorizado en lugar de una URL externa.
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

- Configurar en Clerk Google OAuth (proveedor exclusivo del núcleo) y una plantilla JWT
  llamada `sia` con claims `email`, `email_verified` (booleano `true` o estado `verified`),
  además de `sub`, `exp`, `iat`, `iss` y `aud` igual a `SIA_CLERK_AUDIENCE` (por defecto `sia`).
- La web (`apps/web`) inicia sesión con Clerk y llama `GET /users/me` mediante
  `GET /api/sia/me`. El token de plantilla `sia` se emite con `clerkClient().sessions.getToken`
  (Backend API). `auth().getToken({ template: "sia" })` usa el Frontend API y puede responder
  404 aunque la plantilla exista en el dashboard/BAPI; en ese caso el JWT de sesión (sin `aud`)
  hacía que FastAPI devolviera `Token inválido`. Un registro en Clerk **no** crea
  Coordinadora ni consume invitación: sin invitación vigente del mismo correo la API responde 403.
  La plantilla usa `email` = `{{user.primary_email_address}}` y `email_verified` =
  `{{user.email_verified}}` (la API acepta booleano `true`, el string `true` o el estado
  `verified`). El shortcode `primary_email_address.verification.status` no se interpola y
  deja el literal en el JWT.
- En `apps/web`, `clerk env pull` escribe claves locales (ignoradas por git). No usar
  `SIA_CLERK_SECRET_KEY` como Secret Key de Clerk Cloud.
- `SIA_CLERK_ISSUER` y `SIA_CLERK_AUDIENCE` son obligatorios en todos los entornos.
- Staging/producción y OAuth local contra Clerk Cloud: configurar `SIA_CLERK_JWKS_URL` de la
  instancia y dejar `SIA_CLERK_SECRET_KEY` sin definir. La verificación utiliza RS256/JWKS.
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

## Verificación actual — 2026-10-12

Sin cambiar código, con el árbol sincronizado a `develop` `44a492e` y `main`
`289c731`, se ejecutó localmente:

| Control | Resultado |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm --filter @sia/web test`, `pnpm contract:check` | Correctos. |
| `pnpm --filter @sia/web build` | Correcto; Next.js compiló las rutas de Web y BFF. |
| `uv run --frozen --group dev pytest -q` | **130 passed, 10 skipped**; dos advertencias de deprecación Starlette/AnyIO. |
| `uv run --no-sync ruff check .`, `ruff format --check .`, `mypy` | Correctos. |
| `git diff --check` | Correcto antes de la actualización documental. |
| `https://sia.dev.neuroboard.app/` y `/api/health` | 200 sin sesión; no valida API ni permisos autenticados. |

GitHub Actions está verde para `develop` `44a492e` y `main` `289c731`; enlaces y
alcance en [estado actual](estado-actual.md). El workflow `web-and-contracts` aún no
ejecuta ni la suite ni el build de `apps/web`.

## Verificación operativa histórica — 2026-10-06

Corte del [estado actual del README](../README.md#estado-actual): `main` en `1725260`
(fusión del PR #20, 2026-10-05), que integra `develop` (`2ebfca0`, PR #19). Ese corte
incluye la revisión de evidencias y el Resumen conectado (PR #17) y el tablero Kanban
(PR #19).

Cambios del núcleo desde el corte anterior del README (`919dff5`, 2026-09-29):

- `e16c2a4` añade el avance de ciclo en `apps/api/app/modules/seguimiento/` (`routes.py`,
  `service.py`, `schemas/seguimiento.py`) con 63 líneas nuevas de pruebas y los contratos
  regenerados, sin migraciones nuevas. La regla está documentada en
  `00-nucleo-comun/objetivos-actividades-evidencias.md` («Avance del ciclo»).
- El resto de ese intervalo no toca `apps/api` ni `apps/api/alembic`: frontend,
  documentación y el `exports` de `packages/contracts/package.json` (`ba01636`). El
  tablero Kanban no añade contratos: reutiliza `submit`, `validations` y `completion`.

Evidencia remota: `Application quality` y `Prototype quality` verdes sobre `main`
`1725260` ([run 37354456543](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/37354456543),
[run 37354456484](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/37354456484)) y sobre
`develop` `2ebfca0`. El job `web-and-contracts` ejecuta `pnpm install --frozen-lockfile`,
`pnpm lint`, `pnpm typecheck`, `export_openapi.py --check` y `pnpm contract:check`; **no**
ejecuta la suite de `apps/web`, que se corrió localmente (23 grupos, 2026-10-06).

Smoke HTTP del despliegue público, 2026-10-06, sin sesión:

| Recurso | Ruta | Resultado |
|---|---|---|
| Web (`eo08w8k8oocksksw0ok4s8gk.157.151.134.169.sslip.io`) | `GET /` y `GET /api/health` | 200 |
| API (`sgc4www0cw84okgwcwggs4wo.157.151.134.169.sslip.io`) | `GET /healthz` (liveness) y `GET /readyz` (readiness) | 200 |
| Bundle publicado | marcadores de Resumen («Qué se busca lograr») y de Kanban («estados intermedios de actividad») | presentes en los chunks servidos |

Limitaciones: es un smoke sin autenticación ni roles, no un recorrido por rol. Este
registro corresponde a la URL histórica de producción; el staging actual se documenta
en la sección siguiente. Las URLs `sslip.io` pueden cambiar al recrearse. La suite de
`apps/web` sigue fuera de CI.

## Verificación de staging — 2026-10-06

Staging existe y está publicado desde `develop` en `https://sia.dev.neuroboard.app`.
La evidencia siguiente es un smoke remoto reproducido en este corte; no sustituye una
validación funcional ni autoriza un cambio de reglas de negocio.

| Recurso | Ruta o acción | Resultado |
|---|---|---|
| Web | `GET /` | 200; título `Catalitec · Espacio del proyecto` y carga de sesión de Clerk visibles. |
| Web | `GET /api/health` | 200; `{"status":"ok","service":"web"}`. |
| Navegador sin sesión | Abrir `/sign-in` | Formulario de Clerk disponible; sin errores de consola de la aplicación. |
| Navegador con cuenta de prueba de Coordinadora | Inicio de sesión con la credencial guardada fuera del repositorio | Clerk respondió 422 (`Password is incorrect`); no se validaron flujos autenticados ni permisos. |
| CI de la rama desplegada | [Application quality](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/37523769184) y [Prototype quality](https://github.com/TEC-Emprende-Lab/SIA/actions/runs/37523769182), SHA `7e0947e` | Success. |

Reconsulta de la publicación histórica (`sslip.io`) el mismo día, para contrastar con la
tabla del apartado anterior:

| Recurso | Ruta | Resultado |
|---|---|---|
| Web histórica (`eo08w8k8oocksksw0ok4s8gk.157.151.134.169.sslip.io`) | `GET /` | **404** (`404 page not found`), aunque el mismo día constaba 200. Incidencia de despliegue o ruteo de esa Web. |
| API histórica (`sgc4www0cw84okgwcwggs4wo.157.151.134.169.sslip.io`) | `GET /healthz` | 200, `environment: production`. |

Esas URLs `sslip.io` no representan el staging actual y pueden cambiar al recrearse.
No usarlas como evidencia de disponibilidad de staging; el entorno vigente es
`https://sia.dev.neuroboard.app`.

## Verificación de staging — 2026-10-12

Recorrido autenticado en el navegador sobre `https://sia.dev.neuroboard.app`. No modifica reglas, permisos, API ni datos de staging: no se registró ninguna decisión de validación ni se soltó ninguna tarjeta del Kanban. No certifica la Fase 8 ni la Fase 9. No se identificó el SHA desplegado.

El inicio de sesión de la cuenta de prueba de Coordinadora con contraseña fue rechazado por Clerk (`Password is incorrect`; quedaban dos intentos). No se reintentó la contraseña. Coordinadora y Emprendedor entraron con el código de correo de sus cuentas de prueba de Clerk Development. `GET /api/sia/me` confirmó los roles. Google OAuth no se ejerció. El widget de Clerk del sitio público muestra **Development mode**.

| Rol | Proyecto | Qué se vio |
|---|---|---|
| Coordinadora | QA Staging - Flujo completo | Resumen en vacío: 0 objetivos, sin reuniones próximas, sin acuerdos y sin alertas sin resolver. |
| Coordinadora y Emprendedor | Aula Viva · Ciencias accesibles [DEMO] | Resumen con avance de ciclo 0 % (0 de 6 objetivos aprobados), «Lo que sigue», plan compartido, acuerdos con fecha de compromiso y aviso de que el cumplimiento no está definido, y panel de alertas personales. No hay reuniones próximas. |
| Coordinadora | Aula Viva | Lista de objetivos con «Validar objetivo». Diálogo de evidencias del kit con contexto, actividades y enlace de bitácora. Formulario de decisión (aprobar, solicitar corrección o rechazar) con observación obligatoria. No se envió. |
| Emprendedor | Aula Viva | La lista no ofrece «Validar objetivo». El mismo diálogo muestra evidencias y acciones de actividad, sin formulario de decisión. |
| Coordinadora y Emprendedor | Aula Viva, Kanban | Objetivos: 3 en Borrador, 3 en Pendiente de validación; Corrección solicitada, Rechazado y Aprobado vacíos. Actividades: 5 pendientes, 10 vencidas y 9 completadas. El arrastre no se ejecutó. |
| Coordinadora | Finanzas y Equipo | Finanzas muestra el aviso de reglas y backend pendientes, sin datos de demostración. Equipo solo permite asignar durante la visita; no lista el equipo completo. |
| Emprendedor | Equipo | Aviso de que la consulta de integrantes aún no está disponible. |

El Gestor no se recorrió. Siguen sin evidencia las migraciones del despliegue, la observabilidad, los backups y el rollback.

## Pendientes vigentes

- Recorrer el rol Gestor en staging y el arrastre del Kanban en sesión autenticada. Google OAuth real sigue sin ejercerse. La contraseña de la cuenta de prueba de Coordinadora no coincide con Clerk; no reintentarla.
- Configurar el paso único de migración y probes en el despliegue real de la API; el despliegue
  actual documentado del prototipo no equivale a desplegar esta API.
- Configurar y verificar `SIA_STORAGE_*` en el entorno aplicable para cargar y entregar
  archivos privados; sin ello el módulo responde 503. Adjuntos de chat y facturas no
  usan todavía `documents`.
- PDF de informe: el consumidor y la cola están implementados, pero requiere almacenamiento
  configurado y una prueba operativa del worker desplegado. IA real, correo y finanzas no están integrados.
- Finanzas sigue sin backend. Menciones seleccionables y elegir otra persona del ciclo
  siguen `TBD`: no hay listado autorizado de personas del ámbito.
- Escalas de diagnóstico, catálogo oficial de entregables, evidencia mínima, transiciones y
  criterios de salida, condiciones de autocompletado y campos adicionales de programa: `TBD`.
- Alta de Puesta en marcha: verificar sus condiciones de entrada requiere fuentes persistentes
  aún no definidas; el alta administrativa devuelve 409, no presupone su cumplimiento.
- Añadir `pnpm --filter @sia/web test` a CI y verificar migración, observabilidad, backups y rollback del entorno de staging. El recorrido de Coordinadora y Emprendedor en Resumen, revisión de evidencias y Kanban visto quedó registrado el 2026-10-12.

Los registros de 2026-09 y 2026-10-06 son evidencia histórica: sus hashes, conteos y
limitaciones no sustituyen el corte de 2026-10-12 ni acreditan un despliegue autenticado.
