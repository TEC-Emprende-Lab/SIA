# Estado actual verificable

**Corte del repositorio: 2026-11-04. Revisión documental: 2026-11-06.** Este documento
describe el estado observado en el repositorio local sincronizado con el remoto, no una
certificación de que el MVP esté terminado. En caso de conflicto sobre requisitos,
prevalecen los documentos de programa y el núcleo común según `AGENTS.md`.

El registro de la migración `013` en staging se conserva en
[release 013](release-013-staging.md). Las referencias de CI de cortes anteriores se
mantienen como evidencia histórica; antes de usar un run como certificación debe
consultarse el SHA correspondiente en GitHub Actions.

## Referencias del corte

- `develop`: `e07e6dc` (`fix(web): alinear perfil y traducir acceso`).
- `main`: `6eae158` (`Merge pull request #49 from TEC-Emprende-Lab/develop`).
- `main` contiene el mismo producto que `develop` en este corte.
- Integraciones recientes: Finanzas de Prototipado (PR #44/#45), pantallas vacías y
  acceso a Expedientes (PR #42/#43/#47) y perfil/idioma (PR #49).
- No se modificaron base de datos, entornos ni configuración durante esta revisión
  documental.

## Implementado en código

| Área | Estado y límite verificable |
|---|---|
| Fundaciones | Monorepo pnpm/uv; Web Next.js, API FastAPI, worker Python, PostgreSQL, Redis y MinIO en Compose. Contratos OpenAPI y tipos TypeScript generados con control de drift. |
| Identidad y autorización | Clerk/JWT, invitaciones, bootstrap administrativo, roles y scope persistente de emprendimiento/ciclo; FastAPI conserva la autorización. Google OAuth real se recorrió el 2026-10-28 en staging y producción con rol Coordinadora. El recorrido del Gestor y el rol Revisor financiero siguen pendientes o `TBD`. |
| Expediente y seguimiento | Expedientes, inscripciones, ciclos, asignaciones revocables, canvas v1 de Prototipado y Puesta en marcha, ambiciones, objetivos, actividades, cronograma derivado, evidencias, carpetas de evidencias, diagnósticos descriptivos y validaciones auditadas. La alta de Puesta en marcha continúa bloqueada mientras sus condiciones de entrada no tengan fuente persistente verificable. |
| Web conectada | Shell autenticado, expediente, seguimiento, diagnóstico 360 descriptivo, ambiciones, reuniones, canales, alertas, informes, revisión de evidencias, Kanban y Finanzas de Prototipado consumen API/BFF autorizados. El Kanban traduce arrastres a acciones existentes; no agrega estados de negocio. Incluye navegación a Expedientes para Coordinadora y Gestor y perfil/idioma en español. |
| Comunicación | Reuniones, minutas, acuerdos, canales, mensajes, menciones, recibos de lectura, alertas y notificaciones internas. Las minutas aprobadas son inmutables. Socket.IO, correo, adjuntos de chat, grabaciones y proveedor IA real no están integrados. |
| Archivos privados | Migración `007`: `documents`, carga autorizada, evidencia con `document_id` y URL firmada. Evidencias y respaldos financieros pueden referenciar la tabla; los adjuntos de chat todavía no. Requiere `SIA_STORAGE_*`; sin almacenamiento configurado la carga responde 503. Límites MIME y tamaño: `TBD`. |
| Informes | Migración `006`: borradores por período, composición trazable, revisión humana, aprobación inmutable, corrección vinculada y PDF privado generado por el worker desde la cola `005`. Incorpora ejecuciones financieras del período (migración `013`). Plantilla mensual y proveedor IA real: `TBD` o pendientes. |
| Finanzas | Módulo de Prototipado con cinco tipos, partidas, revisión, ejecución, traslados, adjuntos privados, extracción XML/PDF, duplicados, conciliación manual, reportes y fuentes para informes. Migración `013`, historial y auditoría. Catálogo oficial, reservas/disponible operativo, umbrales, permisos adicionales y API FUNDATEC: `TBD` o pendientes. Puesta en marcha no tiene Finanzas habilitada. |

## Verificación de este corte

- La CI de `.github/workflows/application-quality.yml` ejecuta API con PostgreSQL,
  worker con imagen real, suite Web y build de Next.js, contratos y drift. Los enlaces
  de runs del corte anterior (`44a492e`/`289c731`) se conservan como evidencia
  histórica en la sección siguiente; este documento no reejecutó CI para `6eae158`.
- Verificación local documentada del release de Finanzas: **178 pruebas backend
  aprobadas y una omitida**, con grupos PostgreSQL habilitados; Ruff, formato, mypy,
  lint/tipos Web, contratos, pruebas Web, build de producción, migración `001–013`
  desde cero y `alembic check` correctos (2026-10-29,
  [finanzas-verificacion](finanzas-verificacion.md)).
- Las correcciones de perfil/idioma y Expedientes del 2026-11-04 reportan suite Web,
  lint, TypeScript y build locales correctos. No sustituyen el recorrido autenticado.
- Staging `https://sia.dev.neuroboard.app`: login Google → Clerk → SIA verificado el
  2026-10-28 con rol Coordinadora. El registro de [release 013](release-013-staging.md)
  documenta la aplicación de la migración `013` y la comprobación de `/readyz`; la
  verificación funcional por roles sigue pendiente.
- Producción `https://sia.neuroboard.app`: el 2026-10-28 solo se comprobó login y rol;
  no se crearon datos ni se validaron módulos.

## Límites y siguientes verificaciones

- Un smoke HTTP, CI verde o una prueba local no sustituyen una sesión autenticada ni
  certifican permisos en staging o producción.
- Faltan recorridos publicados por rol (Coordinadora, Gestor y Emprendedor) para
  documentos, informes/PDF, diagnóstico, ambiciones, Kanban con arrastre, carpetas y
  movimiento de evidencias, minutas/acuerdos y Finanzas de punta a punta.
- Quedan pendientes la verificación independiente de migraciones en staging, la
  observabilidad, los backups, el rollback y un endpoint de versión/SHA desplegado.
- Configurar y verificar `SIA_STORAGE_*` para archivos privados y respaldos financieros;
  Redis para Finanzas; y el worker desplegado con generación real de PDF.
- IA real de minutas, Resend, Socket.IO/Redis, adjuntos de chat, grabaciones y taxonomía
  final de canales siguen pendientes o `TBD`.
- Finanzas conserva como `TBD` el catálogo oficial de partidas, reserva/comprometido/
  disponible operativo, umbrales de alerta, permisos adicionales de Gestor, límites
  globales de adjuntos y la API FUNDATEC.
- Diagnóstico numérico, catálogo de entregables, evidencia mínima, criterios de salida,
  transiciones entre programas y condiciones de autocompletado siguen `TBD`.
- El rol `Revisor financiero`, la importación de Ronda 3 y la habilitación financiera de
  Puesta en marcha no se infieren de esta implementación.
