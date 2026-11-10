# SIA

**Sistema de Incubación y Acompañamiento** para TEC Emprende Lab.

SIA centraliza el seguimiento de emprendimientos incubados: objetivos, actividades, reuniones, minutas, finanzas y compras, documentos, alertas y comunicación por proyecto.

## Estado actual

**Lectura del 2026-11-10:** staging y producción responden con Coordinadora. Finanzas de Prototipado devuelve resumen y PDF en los dos. Producción no tiene emprendimientos visibles. La fase que falta para un grupo real es la 9. El detalle está en [estado actual](docs/estado-actual.md) y en el [recorrido](docs/recorrido-operativo-2026-11-10.md).

**Corte publicado: 2026-11-04, `develop` en `e07e6dc` y `main` en `6eae158`. MVP en curso.** `origin/main` tiene además `95b6f77` (2026-11-06, documentación), no desplegado. Esta matriz resume la implementación. Los documentos de núcleo y programa definen requisitos, no certifican funcionalidades entregadas.

| Componente | Estado real en el repositorio | Límite / pendiente |
|---|---|---|
| Fundaciones y contratos | Monorepo pnpm/uv, Dockerfiles por app, Compose con migrador, PostgreSQL/Redis/MinIO, OpenAPI y tipos TS generados con control de drift. | Stack completo; el smoke remoto de 2026-10-06 cubre la salud HTTP, no el ciclo operativo completo. |
| Identidad y autorización | API de usuarios/invitaciones, JWT Clerk, bootstrap por invitación, auditoría y rate limiting Redis en creación de invitaciones. Web: Clerk en `apps/web` (`/sign-in`, `/sign-up`, BFF `GET /api/sia/me`). | El 2026-11-10, Coordinadora entró en staging y producción. En producción, Invitaciones deja elegir Coordinadora, Gestor o Emprendedor y se acepta al entrar con el mismo Google. Falta el recorrido del Gestor y del Emprendedor. Revisor financiero `TBD`. No hay correo de invitación. |
| Expediente | Persistencia de emprendimientos, inscripciones/ciclos, asignaciones y revocación lógica auditada por alcance exacto; listados filtrados y paginados. | Alta de Puesta en marcha bloqueada con 409 por requisitos de entrada aún sin fuente verificable; Pre-incubación no habilitada. |
| Seguimiento | Canvas v1 de ambos programas, ambiciones, objetivos, actividades, evidencias por URL o documento privado, carpetas de evidencias, validaciones, cronograma, fotografías aprobadas inmutables con comparación descriptiva y avance por objetivo y por ciclo calculado en FastAPI. | Entregables oficiales, escalas numéricas y automatizaciones `TBD`; soporte de canvas de Puesta en marcha no habilita su admisión. |
| Web real (`apps/web`) | Next.js con Clerk (Google), shell autenticado por rol, BFF server-only con JWT `sia`, expediente, seguimiento, diagnóstico 360 descriptivo, ambiciones, comunicación, alertas, informes y documentos conectados a FastAPI. Incluye revisión de evidencias, carpetas de evidencias, canales estándar, referencias de chat, Kanban y Finanzas de Prototipado. | El 2026-11-10, Coordinadora vio en staging Finanzas del ciclo QA y en producción el alta de expediente por nombre, con la base vacía. Siguen pendientes el Gestor, el Emprendedor, el arrastre del Kanban, menciones, asignación por Gestor y el listado de Equipo. |
| Prototipo (`visual/prototype`) | Demo React/Vite, navegación y reglas locales, Cubo 360/Kanban, finanzas e informes ficticios; HTML autónomo y Docker/Nginx. | Datos en memoria; sus puntuaciones y estados visuales no son reglas confirmadas de la API. |
| Archivos privados | Tabla `documents`, carga autorizada y URL firmada. Evidencias y respaldos financieros pueden referenciarla; el enlace externo se conserva. Los PDF de informe usan el almacén de objetos. | Límites globales MIME y tamaño `TBD`. Los adjuntos de chat aún no usan la tabla. En Coolify, Garage está healthy y `SIA_STORAGE_*` está declarado; el 2026-11-10 no se probó una carga. |
| Comunicación y alertas | API integrada para reuniones, minutas, acuerdos, canales, mensajes, menciones, recibos de lectura, alertas y notificaciones internas; las minutas aprobadas son inmutables. | Socket.IO/Redis, Resend, adjuntos privados, grabaciones y proveedor IA/worker reales siguen pendientes o `TBD`. |
| Informes técnicos (Fase 5) | API por período que compone fuentes trazables, aprobación humana, versión inmutable y PDF privado de esa instantánea. El worker lo guarda en el almacén de objetos; la descarga es una URL firmada. Incorpora ejecuciones financieras registradas del período. | Plantilla mensual e IA real siguen `TBD` o pendientes. Los workers publicados son del 2026-10-28; no se generó un PDF de informe en esa imagen. |
| Finanzas (actualización 2026-11-10) | Módulo FastAPI y Web de Prototipado con cinco tipos, partidas, revisión, ejecución, traslados, adjuntos privados, extracción XML/PDF, duplicados, reportes y conciliación manual. Migración `013`, historial/auditoría y fuentes financieras de informes. | El 2026-11-10, Coordinadora obtuvo resumen y PDF en staging y en producción. Staging tiene trámites de prueba; producción está en cero. Catálogo oficial, reservas/disponible operativo, permisos adicionales y API FUNDATEC `TBD`. Sin importación de Ronda 3 ni habilitación financiera de Puesta en marcha. Ver [operación](apps/api/app/modules/finanzas/README.md). |
| Calidad y despliegue | Dockerfiles de Web/API/worker, Compose y guía Coolify para recursos separados. La API registra cada petición en JSON con `request_id`, la imagen incluye `scripts/release.sh` y la CI ejecuta API, worker, suite y build de `apps/web`. Staging en `https://sia.dev.neuroboard.app` y producción en `https://sia.neuroboard.app`. | La Fase 8 no está cerrada. Las dos APIs usan la misma imagen del 29–30 oct, no el build de Git. No hay respaldos de Postgres ni métricas del servidor. Clerk de staging sigue en Development. La Fase 9 es la que falta para operar un grupo. |

La [guía operativa de la API](docs/operacion-api.md) conserva arranque, migraciones y restricciones. El [plan de escalabilidad](tasks/plan-escalabilidad.md) describe arquitectura objetivo y siguientes fases; [tasks/todo.md](tasks/todo.md) conserva la historia. Trazabilidad backend: US-PRO-001/002/004/005/006, US-PRO-003/007–010 y US-PM-001/002/003; detalle y límites de aceptación en los módulos de [seguimiento](apps/api/app/modules/seguimiento/README.md), [informes](apps/api/app/modules/informes/README.md), [documentos](apps/api/app/modules/documents/README.md) y [finanzas](apps/api/app/modules/finanzas/README.md).

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
