# Desplegar el prototipo SIA en Coolify

Este despliegue publica el prototipo de `visual/prototype`: React/Vite compilado y servido por Nginx. Los datos son ficticios, viven en memoria y se restablecen al recargar. No activa FastAPI, PostgreSQL, Clerk, R2, correo ni la aplicación operativa futura. No necesita variables de entorno, secretos ni volúmenes.

## Configuración en Coolify

Crear una aplicación desde el repositorio `TEC-Emprende-Lab/SIA`, con GitHub App o Deploy Key si es privado. Usar estos valores:

| Campo | Valor |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory / contexto | `/` (raíz del repositorio) |
| Dockerfile Location | `/Dockerfile` |
| Docker Build Stage / Target | Vacío; usa la etapa final `runtime` |
| Ports Exposes | `8080` |
| Port Mappings | Vacío; Coolify enruta mediante su proxy |
| Domains | URL HTTPS del dominio elegido para la demo |
| Variables de entorno / Build Args | Ninguno requerido |
| Volúmenes | Ninguno |
| Comandos pre/post deployment | Vacíos |
| Health check | Incluido en la imagen: `/healthz` y `/index.html` sobre HTTP, puerto `8080` |

La raíz es necesaria porque el frontend importa `visual/brand/logo.svg`, fuera de `visual/prototype`. No seleccionar Nixpacks ni ejecutar `pnpm dev` o `vite preview` como servidor de despliegue. No marcar una etapa de build como destino final.

La imagen compila con Node 24 y pnpm 9.15.9, instala con lockfile congelado y ejecuta lint, pruebas de dominio y build. La etapa final contiene Nginx y `dist/`; no incluye fuentes, dependencias Node ni `bundle.html`. HTML se revalida en cada visita y los assets con hash tienen caché larga. Los assets inexistentes devuelven 404.

## Primera publicación

1. Incorporar los archivos y los cambios del prototipo en un commit revisado y publicarlo mediante el flujo de pull requests del repositorio. Coolify construye desde Git, no desde los archivos locales sin commit.
2. Usar `develop` para staging y `main` para producción conforme a `CONTRIBUTING.md`. La rama `develop` debe existir en el remoto antes de seleccionarla. Para una demo de revisión de una feature, usar una aplicación separada vinculada a esa rama publicada.
3. Elegir el servidor, proyecto y entorno en Coolify. Asignar un dominio de demo cuyo DNS apunte al servidor y configurar su URL con HTTPS en Coolify.
4. Aplicar los valores de la tabla y desplegar. Esperar al estado `healthy`; revisar los logs de build si falla la compilación.
5. Abrir el dominio, girar el Cubo 360, abrir una cara y cambiar de área en la ficha. Revisar también la vista móvil. Guardar un borrador y recargar debe restaurar los datos ficticios.
6. Ejecutar `python3 visual/prototype/tests/deployment.py https://DOMINIO-DE-LA-DEMO` para comprobar HTTP después de publicar.

El dominio, servidor y recurso concretos se eligen en Coolify; no hay ninguno codificado en el repositorio. Esta preparación no crea recursos remotos, no modifica DNS y no realiza push ni despliegue.

## Validación local de la imagen

Desde la raíz, con Docker disponible:

```bash
docker build --pull --tag sia-prototype:local .
docker run --detach --name sia-prototype-local --publish 127.0.0.1:8080:8080 sia-prototype:local
docker inspect --format '{{.State.Health.Status}}' sia-prototype-local
python3 visual/prototype/tests/deployment.py http://127.0.0.1:8080
python3 visual/prototype/tests/browser.py http://127.0.0.1:8080/
docker stop sia-prototype-local
docker rm sia-prototype-local
```

Esperar a que `/healthz` responda antes de ejecutar las pruebas. Playwright requiere la instalación Python y su Chromium. El workflow `prototype-quality.yml` construye la imagen y ejecuta la prueba HTTP en cada PR/push a `develop` y `main`; no publica imágenes ni dispara despliegues. El recorrido Playwright se ejecuta localmente.

## Operación y actualizaciones

Nginx escribe accesos y errores en stdout/stderr, disponibles en los logs de Coolify. Si aparece `No available server`, verificar puerto `8080`, estado del health check y logs; no desactivar la comprobación para ocultar un error. `/healthz` responde `200 ok`; el health check también verifica que exista el HTML.

Para actualizar, publicar el commit mediante PR y desplegar la rama configurada. Para volver atrás, redesplegar el commit previamente verificado desde Coolify. No hay migraciones ni datos persistentes que recuperar en este prototipo. Las imágenes base siguen las líneas Node 24 y Nginx stable-alpine: `--pull` toma sus actualizaciones; cada reconstrucción debe superar los controles de CI.

## Referencias oficiales

- [Dockerfile Build Pack: raíz, rama y puerto](https://coolify.io/docs/applications/build-packs/dockerfile).
- [Health checks: Dockerfile, disponibilidad y precedencia](https://coolify.io/docs/knowledge-base/health-checks).

Cambio de infraestructura para publicar la implementación existente de US-PRO-001–006. No modifica reglas de negocio ni permisos.
