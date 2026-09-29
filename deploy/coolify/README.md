# Desplegar SIA en Coolify

La aplicación conectada requiere recursos separados para Web, API, PostgreSQL y Redis.
`visual/prototype` continúa siendo una demo independiente: sus datos son ficticios y no se
debe publicar como la aplicación operativa.

## Recursos requeridos

El despliegue remoto y el dominio siguen sin verificarse en este corte. La evidencia de
arranque y migraciones de la API está en [operación API](../../docs/operacion-api.md).

1. Crear PostgreSQL 16 y Redis 7 en el mismo proyecto/entorno de Coolify.
2. Crear la aplicación API desde el repositorio `TEC-Emprende-Lab/SIA`.
3. Crear la aplicación Web desde el mismo repositorio.
4. Usar `develop` para staging y `main` para producción.

Coolify construye desde Git. No usa archivos locales sin commit y no deben añadirse secretos
al repositorio.

## API SIA

| Campo | Valor |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `apps/api/Dockerfile` |
| Docker Build Stage / Target | Vacío |
| Ports Exposes | `8000` |
| Port Mappings | Vacío |
| Health check | `/readyz` |
| Dominio público | Opcional; no es necesario para que la Web se conecte |

Configurar solo como variables de runtime:

| Variable | Valor |
|---|---|
| `SIA_ENVIRONMENT` | `production` |
| `SIA_DATABASE_URL` | URL interna de PostgreSQL con prefijo `postgresql+asyncpg://` |
| `SIA_REDIS_URL` | URL interna de Redis, terminada en `/0` |
| `SIA_CLERK_JWKS_URL` | JWKS público de la instancia Clerk |
| `SIA_CLERK_ISSUER` | Issuer de la instancia Clerk |
| `SIA_CLERK_AUDIENCE` | `sia` |

No marcar secretos como variables de build. No usar `localhost`, una URL `sslip.io` ni una
URL `http` en `SIA_DATABASE_URL`. La contraseña debe estar codificada para URL si contiene
caracteres reservados.

En una base nueva, ejecutar una sola vez en el terminal de la API:

```bash
uv run --no-sync alembic upgrade head
```

La API queda lista solo cuando `GET /readyz` devuelve `200`.

## Web SIA

| Campo | Valor |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `apps/web/Dockerfile` |
| Docker Build Stage / Target | Vacío |
| Ports Exposes | `3000` |
| Port Mappings | Vacío |
| Health check | `/api/health` |
| Dominio público | Dominio HTTPS de SIA |

Configurar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` para build y runtime. Configurar solo en
runtime `CLERK_SECRET_KEY`, `CLERK_JWT_TEMPLATE=sia` y `SIA_API_URL`.

`SIA_API_URL` debe ser la URL interna que Coolify asigna a la aplicación API, con puerto
`8000`. No usar `localhost`, un puerto local de desarrollo ni el dominio público de Web.
Desactivar Basic Authentication de Coolify si Clerk es el único flujo de acceso requerido.

## Prototipo visual

Para publicar únicamente la demo visual, usar el Dockerfile raíz, puerto `8080` y la guía
histórica del prototipo. Esa aplicación no tiene Clerk, FastAPI, PostgreSQL ni persistencia.

## Operación

Ante una actualización de API, ejecutar la migración una sola vez antes de habilitar el
tráfico nuevo. Si una credencial aparece en un log, rotarla en Coolify/Clerk/PostgreSQL y
actualizar la variable runtime correspondiente. Para volver atrás, redesplegar el commit
previamente verificado; no ejecutar downgrades de Alembic sobre datos persistentes.

## Referencias oficiales

- [Dockerfile Build Pack: raíz, rama y puerto](https://coolify.io/docs/applications/build-packs/dockerfile).
- [Health checks: Dockerfile, disponibilidad y precedencia](https://coolify.io/docs/knowledge-base/health-checks).

Cambio de infraestructura para publicar la implementación existente de US-PRO-001–006. No modifica reglas de negocio ni permisos.
