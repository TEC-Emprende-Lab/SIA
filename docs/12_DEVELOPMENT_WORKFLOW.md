# Desarrollo, entornos y despliegue

Este documento define el flujo de desarrollo del MVP. Su objetivo es mantener un proceso sencillo para equipos pequeños, con pruebas suficientes antes de producción y sin dependencias operativas innecesarias.

## Arquitectura base

- Aplicación web: Next.js con TypeScript.
- Base de datos: PostgreSQL.
- Autenticación: Better Auth con Google OAuth e invitaciones.
- Archivos privados: Cloudflare R2.
- Correo: Resend.
- Minutas con IA: OpenAI.
- Despliegue: Coolify en servidor propio.
- Chat en tiempo real: Socket.IO integrado en el servicio web.
- Procesamiento asíncrono: worker interno con PostgreSQL como cola persistente.

Redis no forma parte del MVP. Podrá incorporarse si se requiere escalar horizontalmente el chat, compartir eventos entre múltiples instancias web o resolver una necesidad de caché demostrada por métricas reales.

## Servicios por entorno

Cada entorno remoto dispone de estos servicios en Coolify:

| Servicio | Responsabilidad |
|---|---|
| `web` | Next.js, Better Auth, API, autorización backend y Socket.IO. |
| `worker` | Procesa correos, notificaciones, generación de minutas, reintentos y tareas asíncronas. |
| `postgres` | Fuente de verdad para datos de negocio, auditoría y cola de tareas. |

El servicio `web` guarda primero mensajes, notificaciones y demás datos en PostgreSQL antes de emitir eventos en tiempo real. El `worker` consume tareas persistidas en PostgreSQL mediante una cola basada en `pg-boss` o un patrón outbox equivalente.

Las tareas no deben depender de la memoria del proceso web. Si Resend u OpenAI falla temporalmente, el worker debe registrar el error y reintentar según una política definida.

## Entornos

| Entorno | Rama fuente | Propósito |
|---|---|---|
| Local | Ramas de trabajo | Desarrollo, depuración y pruebas. |
| Staging | `develop` | Validación integrada antes de producción. |
| Producción | `main` | Operación real. |

Staging y producción usan la misma arquitectura, pero recursos y credenciales completamente separados:

- Base PostgreSQL independiente.
- Bucket o prefijo de Cloudflare R2 independiente.
- Variables de entorno independientes.
- Credenciales o configuraciones OAuth con URLs de redirección propias.
- Configuración de Resend independiente.
- Claves OpenAI separadas o límites de uso menores en staging.

No hay integración, migración ni sincronización con Microsoft Teams. Teams conserva únicamente el historial de emprendimientos existentes.

## Git y GitHub

### Ramas

- `main`: rama protegida y desplegable a producción.
- `develop`: rama protegida de integración y desplegable a staging.
- `feature/<descripcion>`: funcionalidades nuevas.
- `fix/<descripcion>`: correcciones.
- `docs/<descripcion>`: cambios documentales.
- `chore/<descripcion>`: mantenimiento o configuración.

Toda rama de trabajo nace desde `develop`. Cada cambio cohesivo se entrega mediante pull request hacia `develop`. El paso de `develop` a `main` se realiza mediante un pull request de release.

No se permite hacer push directo a `develop` ni a `main`. Todos los integrantes del equipo con acceso al repositorio pueden aprobar pull requests y desplegar producción, siempre que se cumplan las verificaciones obligatorias.

### Commits

Usar Conventional Commits:

```text
feat(chat): add project message mentions
fix(tramites): prevent approved procedure changes
test(auth): cover invitation email validation
docs(workflow): define staging deployment
chore(ci): add pull request checks
```

### Pull requests

Un pull request debe incluir:

- objetivo y User Story relacionada cuando aplique;
- cambios funcionales y de datos;
- pruebas ejecutadas;
- migraciones incluidas si cambia PostgreSQL;
- impacto en seguridad, permisos o rendimiento;
- actualización de documentación cuando cambie una regla o flujo.

Antes de fusionar, la rama debe estar actualizada con su rama destino y todas las verificaciones de CI deben aprobar.

## CI/CD

GitHub Actions se ejecuta en pull requests hacia `develop` y `main`. Debe bloquear la fusión si falla alguno de estos controles:

- formato y lint;
- comprobación de tipos TypeScript;
- pruebas unitarias;
- pruebas de integración con PostgreSQL;
- aplicación de migraciones desde una base vacía;
- build de producción;
- pruebas end-to-end críticas con Playwright.

Despliegues:

1. Un merge a `develop` despliega automáticamente a staging en Coolify.
2. El equipo valida el cambio integrado en staging.
3. Un pull request aprobado de `develop` a `main` despliega a producción en Coolify.
4. Toda migración de producción debe ejecutarse como parte controlada del despliegue y conservar compatibilidad con la versión de aplicación desplegada.

No se crean vistas temporales por pull request en el MVP.

## Desarrollo local

El repositorio debe incluir `docker-compose.yml` y `.env.example`. Cada desarrollador usa servicios locales, nunca datos o credenciales de producción.

| Servicio local | Uso |
|---|---|
| `app` | Next.js y Socket.IO durante desarrollo. |
| `postgres` | Base de datos local. |
| `minio` | Almacenamiento compatible con S3 para simular R2. |
| `mailpit` | Captura local de invitaciones y notificaciones por correo. |

Flujo local esperado:

1. Copiar `.env.example` a `.env.local`.
2. Iniciar dependencias con `docker compose up -d`.
3. Aplicar migraciones.
4. Cargar datos semilla con usuarios, proyectos, reuniones, trámites, documentos y mensajes de ejemplo.
5. Iniciar la aplicación y el worker en modo desarrollo.
6. Verificar correos en Mailpit y adjuntos en MinIO.
7. Ejecutar las pruebas relevantes antes de abrir un pull request.

Las pruebas automatizadas usan una base de datos independiente de la utilizada para desarrollo local. La suite debe crear y limpiar sus datos de prueba de manera aislada.

## Pruebas

### Unitarias

Cubren reglas puras y cálculos, especialmente:

- permisos por rol y relación con proyecto;
- transiciones de objetivos, entregables y trámites;
- presupuesto, monto aprobado, monto en proceso y saldo disponible;
- avance de objetivos y actividades;
- validación de menciones y eliminación visual de mensajes.

### Integración

Cubren PostgreSQL y servicios internos:

- autorización backend;
- invitaciones y activación con correo Google coincidente;
- migraciones y restricciones de datos;
- R2/MinIO mediante URLs firmadas;
- persistencia del chat, lecturas, auditoría y notificaciones;
- worker, reintentos e idempotencia de tareas.

### End-to-end

Playwright cubre al menos:

- activación por invitación y acceso autorizado;
- aislamiento entre proyectos;
- creación, corrección, aprobación y contabilización de un trámite;
- creación y aprobación de objetivos;
- chat con adjuntos, menciones, no leídos, edición y eliminación visual;
- acceso privado a archivos.

## Rendimiento y fiabilidad

Objetivos iniciales bajo carga normal esperada:

- vistas principales interactivas en menos de 2 segundos;
- acciones comunes confirmadas en menos de 500 ms, excluyendo carga de archivos y generación IA;
- mensajes de chat recibidos por los miembros conectados en menos de 1 segundo;
- listas paginadas con 25 a 50 elementos por consulta;
- adjuntos cargados directamente a R2 o MinIO mediante URLs firmadas.

La aplicación debe evitar cascadas de solicitudes en cliente, cargar datos en servidor cuando corresponda y consultar solo las columnas necesarias. Chat, auditoría, documentos y trámites deben usar paginación por cursor o equivalente; no se carga el historial completo de una vez.

## Operación

- PostgreSQL de producción se respalda diariamente con retención de 30 días en un destino externo al servidor.
- La restauración de backups debe probarse periódicamente en staging.
- Los logs deben incluir nivel, servicio, solicitud o tarea, usuario cuando corresponda y contexto de error sin exponer secretos.
- Los errores de worker deben ser observables y las tareas fallidas no deben perderse silenciosamente.
- Se deben definir monitoreo y alertas de infraestructura antes de la salida a producción.
