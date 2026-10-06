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

## Staging para validación de interfaz

Staging es el entorno de integración para comprobar la aplicación conectada antes de
producción. Debe ser independiente de producción: su propio PostgreSQL, Redis, instancia
de Clerk, dominio HTTPS y datos de prueba. No reutilizar bases, usuarios, claves ni datos
personales de producción.

El archivo [`staging.env.example`](staging.env.example) enumera las
variables necesarias sin valores reales. Cargarlas en Coolify como variables de cada recurso:
no subir una copia completa ni pegar secretos en tickets, chat o Git.

### Recursos y ramas

Crear un proyecto de Coolify llamado, por ejemplo, `sia-staging`, con recursos separados:

1. PostgreSQL 16 y Redis 7 internos, con volúmenes propios de staging.
2. API desde `develop`, usando `apps/api/Dockerfile`.
3. Web desde `develop`, usando `apps/web/Dockerfile`.

Activar *Auto Deploy* según el flujo de ramas, pero no asumir que despliega migraciones: el
Dockerfile de API no ejecuta Alembic al arrancar. Para el primer despliegue, publicar API,
ejecutar la migración indicada más abajo, comprobar `/readyz` y luego publicar Web. Repetir
esa secuencia cuando un cambio de API incluya una migración. El worker no forma parte del
recorrido de staging de UI mientras no procese trabajos reales.

### Clerk y cuentas de prueba

Crear una instancia de Clerk exclusiva para staging y configurar allí el dominio de staging
como origen, URLs de redirección y callback permitido. Crear el template JWT `sia` con la
audiencia `sia`. En la API, configurar el issuer y JWKS de **esa** instancia, y mantener
`SIA_ENVIRONMENT=staging`; HS256 solo está permitido para desarrollo/pruebas locales.

Preparar usuarios de prueba invitados y revocables, con correos no personales, para los tres
roles: `Coordinadora`, `Gestor` y `Emprendedor`. Asignarlos solo a emprendimientos ficticios
de staging. La IA o automatización de navegador debe iniciar sesión con esas cuentas; no
necesita ni debe recibir credenciales de infraestructura, Clerk admin, PostgreSQL, Redis o
producción.

### Acceso de IA y pruebas

Una vez publicado, una sesión de navegador autorizada puede revisar staging usando una cuenta
de prueba por rol. Las credenciales se entregan mediante un mecanismo de secretos o sesión
efímera controlada, nunca como texto en el repositorio o la conversación. Cada prueba debe
limitarse a los datos de prueba y registrar qué rol y flujo validó.

Staging permite validar UI y autorizaciones reales, pero no sustituye la revisión humana ni
autoriza cambios de reglas de negocio. Antes de producción se deben completar las puertas de
validación operativa descritas en `tasks/plan-escalabilidad.md`.

## API SIA

| Campo | Valor |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory | `/apps/api` |
| Dockerfile Location | `/Dockerfile` |
| Docker Build Stage / Target | Vacío |
| Ports Exposes | `8000` |
| Port Mappings | Vacío |
| Health check | `/readyz` |
| Dominio público | Opcional; no es necesario para que la Web se conecte |

Configurar solo como variables de runtime:

| Variable | Valor |
|---|---|
| `SIA_ENVIRONMENT` | `staging` para staging; `production` para producción |
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
| Base Directory | `/.` |
| Dockerfile Location | `/Dockerfile` |
| Docker Build Stage / Target | `web-runtime` |
| Ports Exposes | `3000` |
| Port Mappings | Vacío |
| Health check | `/api/health` |
| Dominio público | Dominio HTTPS de SIA |

Configurar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` para build y runtime. Configurar solo en
runtime `CLERK_SECRET_KEY`, `CLERK_JWT_TEMPLATE=sia` y `SIA_API_URL`. En staging usar
exclusivamente las claves de la instancia Clerk de staging.

`SIA_API_URL` debe ser la URL interna que Coolify asigna a la aplicación API, con puerto
`8000`. No usar `localhost`, un puerto local de desarrollo ni el dominio público de Web.
Desactivar Basic Authentication de Coolify si Clerk es el único flujo de acceso requerido.

## Prototipo visual

Para publicar únicamente la demo visual, usar el Dockerfile raíz sin target, puerto `8080` y
la guía histórica del prototipo. Esa aplicación no tiene Clerk, FastAPI, PostgreSQL ni
persistencia. El target `web-runtime` del mismo Dockerfile se reserva para la Web conectada,
que necesita el contexto raíz del monorepo.

## Operación

Ante una actualización de API, ejecutar la migración una sola vez antes de habilitar el
tráfico nuevo. Si una credencial aparece en un log, rotarla en Coolify/Clerk/PostgreSQL y
actualizar la variable runtime correspondiente. Para volver atrás, redesplegar el commit
previamente verificado; no ejecutar downgrades de Alembic sobre datos persistentes.

## Referencias oficiales

- [Dockerfile Build Pack: raíz, rama y puerto](https://coolify.io/docs/applications/build-packs/dockerfile).
- [Health checks: Dockerfile, disponibilidad y precedencia](https://coolify.io/docs/knowledge-base/health-checks).

Cambio de infraestructura para publicar la implementación existente de US-PRO-001–006. No modifica reglas de negocio ni permisos.
