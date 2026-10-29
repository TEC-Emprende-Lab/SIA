# Verificación de Finanzas y Compras — 2026-10-29

Rama de entrega: `feature/finanzas-ux-release`. Fuente funcional y decisiones:
[operación de Prototipado](02-prototipado/finanzas-operacion.md).
No es una certificación de staging/producción ni de autenticación Google real.

## Trazabilidad de aceptación

| Historia | Verificación |
|---|---|
| US-PRO-003 | Dinero Decimal; ejecución por partida; pendiente separado de ejecución/reserva; documento no genera doble gasto; tipo y scope validados. |
| US-PRO-004 | Informe compone id, revisión, partida, monto y documento de ejecuciones del período; una aprobación conserva fuentes aun tras nuevas ejecuciones. |
| US-PRO-007 | Cinco tipos parametrizados; autorización por rol/ciclo/autor; checklist; devolución; revisión humana; ejecución separada; clave idempotente; revisión obsoleta; adjunto ajeno rechazado; auditoría y rollback. |
| US-PRO-008 | Conciliación en ambas direcciones; diferencia exacta; reintento por hash; observación por fila; sin modificación automática de trámites. |
| US-PRO-009 | Gestor solicita, Coordinadora decide; no mueve entre ciclos; fondos suficientes sobre ejecutado; aprobación atómica y trazable. |
| US-PRO-010 | Listado paginado y filtros; cartera no expone hermanos/ajenos; reportes operativos PDF/texto; el BFF conserva bytes. |

## Automatización

Resultado final local de release: **178 pruebas backend aprobadas y una omitida**,
con todos los grupos PostgreSQL habilitados (incluida concurrencia). Ruff, formato,
mypy, lint/tipos Web y contratos, pruebas Web y build de producción aprobados.
Migración 001–013 desde cero: `013 (head)` y `alembic check` sin diferencias.
Finanzas usa 013 para no colisionar con las migraciones 008–012 ya publicadas.
Dos avisos de deprecación de dependencias de pruebas preexistentes; no fallos.
Esto no afirma ejecución de CI remoto.

La alternativa SQL se comprobó contra PostgreSQL 16: rechaza revisiones distintas
de 012 y repeticiones, conserva un expediente previo y coincide con los modelos.
Pruebas: `apps/api/tests/test_finanzas_sql.py`. Instrucciones de aplicación:
[finanzas-migracion.md](finanzas-migracion.md).

Refinamiento UI asociado a US-PRO-003/007–010: formulario en dos pasos, protección
de borradores, acciones condicionales, confirmación de anulación, filtros que se
conservan al actualizar, importes exactos y estados de error/vacío/carga.
Detector estático Impeccable sobre los cinco archivos UI: sin hallazgos.

Backend: `apps/api/tests/test_finanzas.py`, además de las pruebas previas del
repositorio. Ejecutar con `uv run pytest`, Ruff y mypy desde `apps/api`.
`FINANZAS_TEST_DATABASE_URL` permite probar triggers y concurrencia PostgreSQL.
La base debe ser **vacía y desechable**: las pruebas crean y eliminan tablas.
Se utilizó un contenedor PostgreSQL 16 separado; no bases existentes del equipo.

Frontend: `apps/web/tests/finanzas.mjs` verifica respuestas malformadas/ajenas,
errores de autorización/validación, lectura de historial superior a 100 registros,
revisiones, confirmación humana y carga limitada del extractor. Se ejecuta junto
a las pruebas anteriores mediante `pnpm --filter @sia/web test`.

Controles adicionales: `pnpm lint`, `pnpm typecheck`, `pnpm contract:check`,
`pnpm --filter @sia/web build`, export OpenAPI `--check`, migración desde cero y
`alembic check` en PostgreSQL desechable. No se aplicó Finanzas a bases operativas.

## Prueba manual de navegador

Se renderizó el componente real con CSS de producción en un servidor aislado
local, frente a FastAPI real y SQLite de prueba, usando identidades simuladas
solo en archivos de `/tmp/opencode/finance-preview` (no en rutas de producción).

- Comprobadas las cinco opciones del formulario.
- Comisión: crear borrador con checklist → enviar → validar con confirmación
  humana → ejecutar con fecha. El presupuesto mostró CRC 1.500,25 ejecutados
  y CRC 98.499,75 de saldo sobre ejecutado, sobre una partida de CRC 100.000.
- Emprendedor: ejecución visible, sin botones administrativos ni conciliación.
- Detalle ejecutado: sin edición ni transiciones.
- Escritorio y viewport 390×844: formulario desplazable y sin desbordamiento
  horizontal del documento; tablas con desplazamiento propio.
- Sin errores JavaScript reportados por el navegador en ese recorrido.

Capturas locales de apoyo: `/tmp/opencode/finance-preview/budget-desktop.png`,
`budget-mobile.png`, `dialog-styled.png`. No contienen información de producción.
Este recorrido no prueba Clerk, R2 real, archivos FUNDATEC institucionales ni
políticas de red de staging.

Verificación adicional de la UI refinada en la rama de release:

- Formulario guiado: información → checklist → guardar borrador → detalle,
  conservando proveedor y monto; cancelar ofrece continuar o descartar.
- Anulación deshabilitada sin motivo y confirmación; tras confirmar, el detalle
  conserva el historial y ya no ofrece edición ni transiciones.
- Emprendedor sin conciliación ni registro de partidas; Gestor con conciliación.
- Conciliación exige archivo y confirmación de pertenencia al ciclo.
- Capturas 1440×1000, 768×1024 y 390×844; el documento móvil no desborda
  horizontalmente y el detalle tiene cuerpo desplazable y pie visible.
- Sin errores JavaScript en el recorrido adicional. Identidades simuladas, no Clerk.

Capturas adicionales locales: `polished-desktop.png`, `polished-wizard.png`,
`polished-mobile.png`, `polished-mobile-detail.png`, `polished-reconciliation.png`
en `/tmp/opencode/finance-preview/`.

## Antes de activar

1. Revisar decisiones y TBD pendientes con Coordinadora.
2. Aplicar `alembic upgrade head` (revisión 013) en el ambiente destino mediante el migrador
   habitual, después de respaldo/verificación operativa.
3. Reconstruir API/worker con lockfile actualizado (pypdf) y Web.
4. Configurar Redis y almacenamiento privado. Sin Redis, finanzas falla cerrado
   con 503; no se realizan mutaciones.
5. Validar en staging con Clerk real los tres roles, archivos privados y una
   exportación FUNDATEC anonimizada vigente antes de liberar.

No hay importación de Ronda 3, conexión Supabase, automatización de login FUNDATEC
ni despliegue remoto en esta entrega. La integración API requiere confirmación
del proveedor; ver [investigación](fundatec-integracion.md).
