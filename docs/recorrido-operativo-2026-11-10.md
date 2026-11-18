# Recorrido operativo — 2026-11-10

Lectura de staging, producción y Coolify con la sesión ya abierta de Coordinadora.
No se crearon emprendimientos, ciclos, invitaciones, trámites ni archivos. No se
arrastró el Kanban ni se recorrieron Gestor ni Emprendedor.

Trazabilidad: acceso e invitaciones de
[actores, roles y permisos](00-nucleo-comun/actores-roles-y-permisos.md),
US-PRO-001 y US-PRO-003. Las pantallas vistas no cierran la aceptación de esas
historias ni la Fase 9.

La cuenta es la misma del [recorrido del 2026-10-28](recorrido-login-2026-10-28.md).
`GET /api/sia/users/me` respondió **200** y rol **Coordinadora** en los dos entornos.

## Entornos publicados

Coolify 4.7.3, proyecto SIA, un servidor alcanzable y ningún recurso marcado como
caído. No hay métricas de CPU, memoria ni disco: Sentinel está apagado.

| Pieza | Staging | Producción |
|---|---|---|
| Web | `https://sia.dev.neuroboard.app`, `develop` `e07e6dc`, despliegue terminado el 2026-11-04 | `https://sia.neuroboard.app`, `main` `6eae158`, despliegue terminado el 2026-11-04 |
| API | Healthy. `GET /healthz` declara `environment: staging`. `GET /readyz` 200 | Healthy. `GET /healthz` declara `environment: production`. `GET /readyz` 200 |
| Worker PDF | Imagen del commit `40ccf50`, despliegue del 2026-10-28 | Imagen del commit `296ad05`, despliegue del 2026-10-28 |
| Postgres 16 | `sia_staging`, healthy, sin puerto público | `sia`, healthy, sin puerto público |
| Redis y archivos | Redis y Garage healthy | Redis y Garage healthy |
| Clerk | `bright-lobster-8405.clerk.accounts.dev` | `clerk.neuroboard.app` |

`GET /api/health` de las dos webs respondió 200, `{"status":"ok","service":"web"}`.
El healthcheck de Coolify está apagado en las webs y en los workers, por eso figuran
`running:unknown` aunque el contenedor está presente.

Las dos APIs sirven la misma imagen de registro local,
`127.0.0.1:5005/sia-staging-finanzas`, con el mismo digest, publicada el 2026-10-29
en staging y el 2026-10-30 en producción. Su empaquetado es imagen Docker, no el
Dockerfile de Git: un push a `develop` o `main` no reconstruye la API. OpenAPI expone
80 rutas en los dos entornos, 18 de ellas de finanzas. Sin sesión, el resumen de
finanzas responde 401 `No autenticado`.

`origin/main` avanzó después a `95b6f77` (2026-11-06, solo documentación). Ese commit
no está en el despliegue de producción observado.

Las variables de runtime de las dos APIs incluyen Clerk, base, Redis y
`SIA_STORAGE_*`. No se leyeron los valores. El worker de producción también tiene
base y almacenamiento configurados por nombre de variable.

## Datos y pantallas

En staging se abrió el ciclo QA del 2026-10-28
(`360bd390-ce8b-44cc-af9e-4033e57ce44c`). El seguimiento devolvió avance 0 %, un
objetivo y una actividad, ninguno cerrado. Había una reunión y ningún informe. El
resumen de finanzas respondió 200 en CRC, con cero partidas y cero trámites. El
disponible operativo vino `null`; el texto de la API mantiene reserva y disponible
como `TBD`. El PDF del ciclo y el PDF general respondieron 200, `application/pdf`,
930 y 2436 bytes. La pantalla mostró presupuesto, trámites, cambios, duplicados,
conciliación y cartera.

El resumen general de finanzas en staging devolvió 9 ciclos. Cuatro tenían un
trámite. El listado de emprendimientos, con límite 50, devolvió 5.

En producción el listado de emprendimientos y el resumen de finanzas respondieron
200 y venían vacíos. La entrada dice «Todo comienza con un proyecto». Expedientes
ofrece «Nuevo emprendimiento»; el formulario pide el nombre y no se envió. El PDF
general respondió 200 y pesa 830 bytes.

Invitaciones, en producción, permite elegir Coordinadora, Gestor o Emprendedor. El
texto indica que la invitación se acepta cuando la persona entra con Google usando
el mismo correo. No se emitió ninguna. El registro histórico mostró una invitación
de Coordinadora aceptada y otra vencida.

## Lo que esta lectura no acredita

- `alembic current`. El terminal de Postgres en Coolify no abrió el websocket. Las
  consultas de finanzas en 200 indican que esas tablas existen; no sustituyen la
  revisión de Alembic.
- Carga o descarga de un archivo privado, arrastre del Kanban, minutas, acuerdos,
  diagnóstico, informe técnico generado por el worker y alta de Puesta en marcha.
- Roles Gestor y Emprendedor, y el aislamiento entre cuentas.
- Backups: los dos Postgres tienen la programación de respaldos vacía. La Web de
  producción conserva imágenes locales de `6eae158`, `296ad05` y `289c731`. No se
  ejecutó una reversión. El listado de imágenes de la API no identificó la imagen
  en ejecución como rollback actual.
- Este recorrido no cierra la Fase 8, la Fase 9 ni el uso con un grupo real.
