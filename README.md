# SIA

**Sistema de Incubación y Acompañamiento** para TEC Emprende Lab.

SIA centraliza el seguimiento de emprendimientos incubados: objetivos, actividades, reuniones, minutas, finanzas y compras, documentos, alertas y comunicación por proyecto.

## Estado actual

**Ampliación pendiente de staging:** [carpetas de evidencias](docs/evidencias-carpetas.md),
canales estándar y referencias de chat. Incluye las migraciones `008`, `009` y `010`,
aún no aplicadas a staging. El corte remoto anterior se conserva como evidencia histórica.

**Corte del repositorio: 2026-10-23, `develop` en `ab5ebad` y `main` en `289c731`. MVP en curso.** Esta matriz resume la implementación; [el estado verificable](docs/estado-actual.md) conserva referencias de commits, CI, pruebas y límites. Los documentos de núcleo y programa definen requisitos, no certifican funcionalidades entregadas.

| Componente | Estado real en el repositorio | Límite / pendiente |
|---|---|---|
| Fundaciones y contratos | Monorepo pnpm/uv, Dockerfiles por app, Compose con migrador, PostgreSQL/Redis/MinIO, OpenAPI y tipos TS generados con control de drift. | Stack completo; el smoke remoto de 2026-10-06 cubre la salud HTTP, no el ciclo operativo completo. |
| Identidad y autorización | API de usuarios/invitaciones, JWT Clerk, bootstrap por invitación, auditoría y rate limiting Redis en creación de invitaciones. Web: Clerk en `apps/web` (`/sign-in`, `/sign-up`, BFF `GET /api/sia/me`). | El 2026-10-12, Coordinadora y Emprendedor entraron en staging con cuentas de prueba de Clerk Development y `GET /api/sia/me` confirmó el rol. Google OAuth real y el recorrido del Gestor siguen pendientes; Revisor financiero `TBD`. |
| Expediente | Persistencia de emprendimientos, inscripciones/ciclos, asignaciones y revocación lógica auditada por alcance exacto; listados filtrados y paginados. | Alta de Puesta en marcha bloqueada con 409 por requisitos de entrada aún sin fuente verificable; Pre-incubación no habilitada. |
| Seguimiento | Canvas v1 de ambos programas, ambiciones, objetivos, actividades, evidencias por URL o documento privado, carpetas de evidencias, validaciones, cronograma, fotografías aprobadas inmutables con comparación descriptiva y avance por objetivo y por ciclo calculado en FastAPI. | Entregables oficiales, escalas numéricas y automatizaciones `TBD`; soporte de canvas de Puesta en marcha no habilita su admisión. |
| Web real (`apps/web`) | Next.js con Clerk (Google), shell autenticado por rol, BFF server-only con JWT `sia`, expediente, seguimiento, diagnóstico 360 descriptivo, ambiciones, comunicación, alertas, informes y documentos conectados a FastAPI. Incluye revisión de evidencias, carpetas de evidencias, canales estándar, referencias de chat y Kanban sobre endpoints existentes. | El 2026-10-12 se vieron en staging, como Coordinadora y Emprendedor, el Resumen, la revisión de evidencias y el Kanban de Aula Viva, sin arrastrar tarjetas. Siguen pendientes el Gestor, el arrastre, menciones, asignación por Gestor y el alcance de Equipo/búsqueda global; Finanzas no tiene backend. |
| Prototipo (`visual/prototype`) | Demo React/Vite, navegación y reglas locales, Cubo 360/Kanban, finanzas e informes ficticios; HTML autónomo y Docker/Nginx. | Datos en memoria; sus puntuaciones y estados visuales no son reglas confirmadas de la API. |
| Archivos privados | Tabla `documents`, carga autorizada y URL firmada. La evidencia de archivo, fotografía o video puede apuntar a ese documento; el enlace externo se conserva. | Límites MIME y tamaño `TBD`. Adjuntos de chat y facturas aún no usan la tabla. Sin almacenamiento configurado la carga responde 503. |
| Comunicación y alertas | API integrada para reuniones, minutas, acuerdos, canales, mensajes, menciones, recibos de lectura, alertas y notificaciones internas; las minutas aprobadas son inmutables. | Socket.IO/Redis, Resend, adjuntos privados, grabaciones y proveedor IA/worker reales siguen pendientes o `TBD`. |
| Informes técnicos (Fase 5) | API por período que compone fuentes trazables, aprobación humana, versión inmutable y PDF privado de esa instantánea. El worker lo guarda en el almacén de objetos; la descarga es una URL firmada. | Plantilla mensual, IA real y fuente de finanzas (Fase 6) siguen `TBD` o pendientes. |
| Finanzas | Solo representaciones de prototipo. | Sin backend (Fase 6); partidas, flujo, integración administrativa y Revisor financiero `TBD`. |
| Calidad y despliegue | Dockerfiles de Web/API/worker, Compose y guía Coolify para recursos separados. La API registra cada petición en JSON con `request_id`, la imagen incluye `scripts/release.sh` y la CI ejecuta la suite y el build de `apps/web`. Staging público en `https://sia.dev.neuroboard.app`; el 2026-10-12 se recorrió con sesión de Coordinadora y de Emprendedor. | La Fase 8 no está cerrada: faltan el Gestor, el arrastre del Kanban y la evidencia de migraciones, observabilidad, backups y rollback. El widget de Clerk en staging muestra Development mode. |

La [guía operativa de la API](docs/operacion-api.md) conserva arranque, migraciones y restricciones. El [plan de escalabilidad](tasks/plan-escalabilidad.md) describe arquitectura objetivo y siguientes fases; [tasks/todo.md](tasks/todo.md) conserva la historia. Trazabilidad backend: US-PRO-001/002/004/005/006 y US-PM-001/002/003; detalle y límites de aceptación en los módulos de [seguimiento](apps/api/app/modules/seguimiento/README.md), [informes](apps/api/app/modules/informes/README.md) y [documentos](apps/api/app/modules/documents/README.md).

## Arquitectura objetivo

La lista siguiente expresa el destino técnico; el grado de implementación de cada servicio está en la matriz anterior.

- Next.js y TypeScript para el frontend.
- FastAPI y Python para el backend.
- PostgreSQL.
- Clerk Cloud para Google OAuth, sesiones y JWT.
- FastAPI para invitaciones, roles y autorización de SIA.
- Cloudflare R2 para archivos privados.
- Resend para correo.
- OpenAI para minutas.
- Socket.IO servido por FastAPI para el chat en tiempo real.
- Worker Python y PostgreSQL como cola persistente.
- Redis para rate limiting distribuido y escalabilidad de Socket.IO.
- Coolify para staging y producción.

La especificación completa está organizada por núcleo y programa en [`docs/`](docs/).

## Prototipo visual

El mockup está en [`visual/prototype/`](visual/prototype/). No usa base de datos, autenticación ni servicios externos.

```bash
cd visual/prototype
pnpm install --frozen-lockfile --ignore-workspace
pnpm dev
```

Abrir `http://localhost:5173/`.

Usar Node 24 y pnpm 9.15.9. El prototipo tiene lockfile propio y está fuera del workspace raíz; `--ignore-workspace` reproduce la corrección de CI de `a5f1796` y evita instalar solo las dependencias del monorepo.

Para validar el mockup y generar su versión autónoma:

```bash
cd visual/prototype
pnpm lint
pnpm test
pnpm build
```

`visual/prototype/bundle.html` es una versión autónoma que puede abrirse directamente en un navegador, incluso sin servidor web ni conexión a internet. El prototipo usa datos ficticios en memoria y se reinicia al recargar la página.

## Despliegue en Coolify

La aplicación operativa usa dos recursos: Web desde `apps/web/Dockerfile`, puerto `3000`, y
API desde `apps/api/Dockerfile`, puerto `8000`, además de PostgreSQL y Redis. El entorno de
integración de `develop` está publicado en `https://sia.dev.neuroboard.app`. La
[guía de Coolify](deploy/coolify/README.md) contiene la configuración, variables runtime,
migraciones y validación. El Dockerfile raíz mantiene solo la demo del prototipo en `8080`.

## Documentación

| Documento | Propósito |
|---|---|
| [`docs/00-nucleo-comun/`](docs/00-nucleo-comun/) | Reglas, expediente, roles, seguimiento, canales, alertas, IA e informe comunes. Incluye el [modelo de datos ER detallado](docs/00-nucleo-comun/modelo-de-datos-detallado.md). |
| [`docs/01-pre-incubacion/`](docs/01-pre-incubacion/) | Programa futuro de estructuración y validación inicial. |
| [`docs/02-prototipado/`](docs/02-prototipado/) | Programa inicial de construcción y validación de prototipos. |
| [`docs/03-puesta-en-marcha/`](docs/03-puesta-en-marcha/) | Programa inicial de preparación operativa y comercial. |

## Colaboración

- `develop` es la rama de integración desplegada a staging (`https://sia.dev.neuroboard.app`).
- `main` es la rama destinada a producción; su CI verde no certifica un despliegue remoto.
- Toda funcionalidad nace desde `develop` en una rama corta.
- No se hace push directo a ramas protegidas.
- Los pull requests deben pasar las verificaciones de CI y documentar pruebas realizadas.

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo completo.

## Seguridad

No subir secretos, archivos `.env`, claves privadas, tokens ni datos de producción. Las reglas de autorización, privacidad y arquitectura están documentadas en `docs/00-nucleo-comun/`.

## Diagnóstico 360°

El MVP inicial se concentra en Prototipado y Puesta en marcha. El [módulo de seguimiento](apps/api/app/modules/seguimiento/README.md) detalla API, integridad y aceptación parcial de las historias. La evaluación persistida conserva observaciones por área: las escalas numéricas del Cubo 360 visual siguen `TBD`.

## Informes técnicos

El MVP también especifica informes técnicos periódicos y de cierre con versiones inmutables, fuentes trazables y PDF posterior a aprobación. El prototipo permite preparar, revisar y versionar borradores locales con fuentes trazables. La implementación con servicios y emisión institucional de PDF se planificará sobre el stack y datos de seguimiento existentes.
