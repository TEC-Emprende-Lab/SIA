# SIA

**Sistema de Incubación y Acompañamiento** para TEC Emprende Lab.

SIA centraliza el seguimiento de emprendimientos incubados: objetivos, actividades, reuniones, minutas, finanzas y compras, documentos, alertas y comunicación por proyecto.

## Estado actual

El alcance funcional y técnico del MVP está documentado. El repositorio contiene un prototipo navegable para validar la experiencia visual antes de iniciar la implementación con servicios reales.

## Arquitectura prevista

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

La especificación completa está en [`docs/12_DEVELOPMENT_WORKFLOW.md`](docs/12_DEVELOPMENT_WORKFLOW.md).

## Prototipo visual

El mockup está en [`visual/prototype/`](visual/prototype/). No usa base de datos, autenticación ni servicios externos.

```bash
cd visual/prototype
pnpm install
pnpm dev
```

Abrir `http://localhost:5173/`.

Para validar el build:

```bash
pnpm build
```

`visual/prototype/bundle.html` es una versión autónoma que puede abrirse directamente en un navegador.

## Documentación

| Documento | Propósito |
|---|---|
| [`docs/00_PROJECT_CONTEXT.md`](docs/00_PROJECT_CONTEXT.md) | Contexto y propósito de SIA. |
| [`docs/01_PRODUCT_REQUIREMENTS.md`](docs/01_PRODUCT_REQUIREMENTS.md) | Requerimientos funcionales. |
| [`docs/02_USER_STORIES.md`](docs/02_USER_STORIES.md) | Historias de usuario y aceptación. |
| [`docs/03_BUSINESS_RULES.md`](docs/03_BUSINESS_RULES.md) | Fuente principal de reglas de negocio. |
| [`docs/04_ROLES_PERMISSIONS.md`](docs/04_ROLES_PERMISSIONS.md) | Matriz de autorización. |
| [`docs/05_FUNCTIONAL_FLOWS.md`](docs/05_FUNCTIONAL_FLOWS.md) | Flujos funcionales. |
| [`docs/06_DATA_MODEL.md`](docs/06_DATA_MODEL.md) | Modelo conceptual de datos. |
| [`docs/07_NON_FUNCTIONAL_REQUIREMENTS.md`](docs/07_NON_FUNCTIONAL_REQUIREMENTS.md) | Seguridad, rendimiento y mantenibilidad. |
| [`docs/08_UI_UX_GUIDELINES.md`](docs/08_UI_UX_GUIDELINES.md) | Lineamientos de experiencia e interfaz. |
| [`docs/09_INTEGRATIONS.md`](docs/09_INTEGRATIONS.md) | Servicios e integraciones definidas. |
| [`docs/10_ACCEPTANCE_CRITERIA.md`](docs/10_ACCEPTANCE_CRITERIA.md) | Criterios globales verificables. |
| [`docs/11_MVP_SCOPE.md`](docs/11_MVP_SCOPE.md) | Alcance, exclusiones y decisiones confirmadas. |
| [`docs/12_DEVELOPMENT_WORKFLOW.md`](docs/12_DEVELOPMENT_WORKFLOW.md) | Desarrollo, entornos, pruebas y despliegue. |
| [`docs/13_ARCHITECTURE.md`](docs/13_ARCHITECTURE.md) | Diagrama, componentes y flujos de arquitectura. |

## Colaboración

- `develop` integra cambios y se despliega a staging.
- `main` representa producción.
- Toda funcionalidad nace desde `develop` en una rama corta.
- No se hace push directo a ramas protegidas.
- Los pull requests deben pasar las verificaciones de CI y documentar pruebas realizadas.

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo completo.

## Seguridad

No subir secretos, archivos `.env`, claves privadas, tokens ni datos de producción. Las reglas de autorización y privacidad están documentadas en `docs/03_BUSINESS_RULES.md`, `docs/04_ROLES_PERMISSIONS.md` y `docs/07_NON_FUNCTIONAL_REQUIREMENTS.md`.
