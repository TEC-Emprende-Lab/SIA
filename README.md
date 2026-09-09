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

La especificación completa está organizada por núcleo y programa en [`docs/`](docs/).

## Prototipo visual

El mockup está en [`visual/prototype/`](visual/prototype/). No usa base de datos, autenticación ni servicios externos.

```bash
cd visual/prototype
pnpm install --frozen-lockfile
pnpm dev
```

Abrir `http://localhost:5173/`.

Para validar el mockup y generar su versión autónoma:

```bash
cd visual/prototype
pnpm lint
pnpm test
pnpm build
```

`visual/prototype/bundle.html` es una versión autónoma que puede abrirse directamente en un navegador, incluso sin servidor web ni conexión a internet. El prototipo usa datos ficticios en memoria y se reinicia al recargar la página.

## Documentación

| Documento | Propósito |
|---|---|
| [`docs/00-nucleo-comun/`](docs/00-nucleo-comun/) | Reglas, expediente, roles, seguimiento, canales, alertas, IA e informe comunes. |
| [`docs/01-pre-incubacion/`](docs/01-pre-incubacion/) | Programa futuro de estructuración y validación inicial. |
| [`docs/02-prototipado/`](docs/02-prototipado/) | Programa inicial de construcción y validación de prototipos. |
| [`docs/03-puesta-en-marcha/`](docs/03-puesta-en-marcha/) | Programa inicial de preparación operativa y comercial. |

## Colaboración

- `develop` integra cambios y se despliega a staging.
- `main` representa producción.
- Toda funcionalidad nace desde `develop` en una rama corta.
- No se hace push directo a ramas protegidas.
- Los pull requests deben pasar las verificaciones de CI y documentar pruebas realizadas.

Ver [`CONTRIBUTING.md`](CONTRIBUTING.md) para el flujo completo.

## Seguridad

No subir secretos, archivos `.env`, claves privadas, tokens ni datos de producción. Las reglas de autorización, privacidad y arquitectura están documentadas en `docs/00-nucleo-comun/`.

## Diagnóstico 360°

El MVP inicial se concentra en Prototipado y Puesta en marcha, con canvas, entregables, evidencias, validaciones y evolución trazable por programa. La implementación con API y persistencia sigue pendiente.

## Informes técnicos

El MVP también especifica informes técnicos periódicos y de cierre con versiones inmutables, fuentes trazables y PDF posterior a aprobación. El prototipo permite preparar, revisar y versionar borradores locales con fuentes trazables. La implementación con servicios y emisión institucional de PDF se planificará sobre el stack y datos de seguimiento existentes.
