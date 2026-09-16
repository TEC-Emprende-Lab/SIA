# SIA

**Sistema de Incubación y Acompañamiento** para TEC Emprende Lab.

SIA centraliza el seguimiento de emprendimientos incubados: objetivos, actividades, reuniones, minutas, finanzas y compras, documentos, alertas y comunicación por proyecto.

## Estado actual

**Corte: 2026-09-16, commit inspeccionado `35775c0`. MVP en curso.** Esta es la matriz canónica de implementación; los documentos de núcleo y programa definen requisitos, no certifican funcionalidades entregadas.

| Componente | Estado real en el repositorio | Límite / pendiente |
|---|---|---|
| Fundaciones y contratos | Monorepo pnpm/uv, Dockerfiles por app, Compose con migrador, PostgreSQL/Redis/MinIO, OpenAPI y tipos TS generados con control de drift. | Stack completo y operación remota sin verificación en este corte. |
| Identidad y autorización | API de usuarios/invitaciones, JWT Clerk, bootstrap por invitación, auditoría y rate limiting Redis en creación de invitaciones. | Google OAuth/Clerk Cloud y Redis real en staging sin verificar; Revisor financiero `TBD`. |
| Expediente | Persistencia de emprendimientos, inscripciones/ciclos, asignaciones y revocación lógica auditada por alcance exacto; listados filtrados y paginados. | Alta de Puesta en marcha bloqueada con 409 por requisitos de entrada aún sin fuente verificable; Pre-incubación no habilitada. |
| Seguimiento | Canvas v1 de ambos programas, ambiciones, objetivos, actividades, evidencias por URL, validaciones, cronograma y fotografías aprobadas inmutables con comparación descriptiva. | Entregables oficiales, escalas numéricas y automatizaciones `TBD`; soporte de canvas de Puesta en marcha no habilita su admisión. |
| Web real (`apps/web`) | Base Next.js, página «en construcción» y `/api/health`. | UI funcional, login y conexión de los módulos a la API pendientes. |
| Prototipo (`visual/prototype`) | Demo React/Vite, navegación y reglas locales, Cubo 360/Kanban, finanzas e informes ficticios; HTML autónomo y Docker/Nginx. | Datos en memoria; sus puntuaciones y estados visuales no son reglas confirmadas de la API. |
| Archivos privados | La API registra referencias HTTP(S), incluso para tipos archivo/fotografía/video. | Sin carga, descarga, almacenamiento de binarios ni URLs firmadas R2. MinIO en Compose no implementa esa integración. |
| Comunicación, alertas, informes y finanzas | Requisitos y representaciones de prototipo; worker Python base que permanece activo. | Sin módulos backend de reuniones/minutas, canales/Socket.IO, notificaciones, informes/PDF o finanzas; sin cola persistente ni tareas del worker. |
| Calidad y despliegue | CI de aplicación y prototipo verde en `35775c0`; API: **94 passed**, sin omisiones, con los grupos PostgreSQL habilitados. | CI no equivale a staging: OAuth real, servicios externos y despliegue operativo del MVP **NO verificados**. |

La [guía operativa de la API](docs/operacion-api.md) conserva evidencia local/CI, enlaces a runs, arranque y restricciones. El [plan de escalabilidad](tasks/plan-escalabilidad.md) describe arquitectura objetivo y siguientes fases; [tasks/todo.md](tasks/todo.md) conserva la historia. Trazabilidad backend: US-PRO-001/002/005/006 y US-PM-001/002; detalle y límites de aceptación en el [módulo de seguimiento](apps/api/app/modules/seguimiento/README.md).

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

## Despliegue del prototipo en Coolify

El repositorio incluye un `Dockerfile` que compila el prototipo y lo sirve con Nginx en el puerto `8080`, con health check y prueba HTTP en CI. Configurar Coolify con build pack **Dockerfile**, directorio base **/** y ubicación **/Dockerfile**.

La [guía de Coolify](deploy/coolify/README.md) contiene los valores exactos, ramas, dominio, validación y actualización. Este despliegue conserva el carácter de demostración: datos ficticios en memoria, sin API ni persistencia.

## Documentación

| Documento | Propósito |
|---|---|
| [`docs/00-nucleo-comun/`](docs/00-nucleo-comun/) | Reglas, expediente, roles, seguimiento, canales, alertas, IA e informe comunes. |
| [`docs/01-pre-incubacion/`](docs/01-pre-incubacion/) | Programa futuro de estructuración y validación inicial. |
| [`docs/02-prototipado/`](docs/02-prototipado/) | Programa inicial de construcción y validación de prototipos. |
| [`docs/03-puesta-en-marcha/`](docs/03-puesta-en-marcha/) | Programa inicial de preparación operativa y comercial. |

## Colaboración

- `develop` es la rama de integración destinada a staging.
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
