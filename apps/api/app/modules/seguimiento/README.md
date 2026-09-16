# Seguimiento persistente

## Integración

Router: `app.modules.seguimiento.routes.router`, prefijo `/cycles/{cycle_id}/seguimiento`.
Aplicar migración `003` después de `002`; contiene el seed fijo de ambos canvas v1.
Los modelos se registran explícitamente mediante `app.models`, también desde Alembic.
El router está integrado en `main.py` y los contratos OpenAPI/TypeScript están regenerados.
El arranque y la evidencia de integración se documentan en `docs/operacion-api.md`.

## Trazabilidad y aceptación

| Historia | Implementación y verificación |
|---|---|
| US-PRO-001 / US-PM-001 | Objetivos por área, actividades con fechas y responsable autorizado, referencias de evidencia y cronograma derivado. Pruebas de ambos programas y de relaciones entre ciclos/emprendimientos. |
| US-PRO-002 / US-PM-002 | Envío, aprobación, corrección y rechazo por Gestor asignado o Coordinadora. Decisión con actor, fecha, observación, revisión e instantánea de objetivo/actividades/evidencias. Cambio material reabre validación. |
| US-PRO-005 | Fotografías descriptivas con las seis áreas oficiales, aprobación inmutable, nueva fotografía con `supersedes_id` y comparación entre aprobadas del mismo ciclo/canvas. |
| US-PRO-006 | Ambición independiente del avance, persistente por emprendimiento. Objetivo con cero o una ambición; FK compuesta impide cruzar emprendimientos. |

## API

- `GET /canvas`: definición y áreas de la versión fijada al ciclo; v1 antes del primer registro.
- `GET/POST /ambitions`, `PUT /ambitions/{id}`.
- `GET/POST /objectives`, `PUT /objectives/{id}`.
- `GET/POST /activities`, `PUT /activities/{id}` y `POST /activities/{id}/completion`.
- `GET/POST /evidence`: referencias HTTP(S) inmutables, sin descarga ni subida de binarios.
- `GET/POST /diagnostics`, `PUT /diagnostics/{id}`.
- `POST /objectives/{id}/submit` y `POST /diagnostics/{id}/submit`.
- `POST /objectives/{id}/validations` y `POST /diagnostics/{id}/validations`.
- `GET /validations`, `GET /schedule`.
- `GET /diagnostics/compare/{previous_id}/{current_id}`.

Las escrituras sobre registros existentes requieren `expected_revision`. Los PUT reemplazan
los campos editables; no son PATCH. Nunca aceptan actor, scope, aprobación o estado arbitrarios.
La finalización de actividad es manual, reversible y auditada; no incorpora estados de Kanban.
Un objetivo sin actividades no puede aprobarse como tema amplio completado.

## Integridad y persistencia

- Autorización `cycle -> enrollment -> entrepreneurship` para cada lectura/escritura.
  Coordinadora global; asignación directa al emprendimiento o al ciclo exacto con rol coincidente.
  Una asignación a un ciclo no concede acceso a sus hermanos.
- Las ambiciones pertenecen al emprendimiento, conforme a los documentos. Se consultan y
  editan desde un ciclo autorizado del mismo emprendimiento; no son registros privados de un ciclo.
- Transacción única por comando: entidad, reapertura, decisión y auditoría. Cualquier fallo revierte todo.
- Bloqueo PostgreSQL de ciclo para serializar mutaciones del agregado; bloqueo adicional de ambición
  compartida y revisión optimista contra sobrescrituras y validaciones obsoletas.
- Las modificaciones de actividades, finalización y nuevas evidencias incrementan la revisión del
  objetivo e invalidan su aprobación. Una escritura sin cambios no invalida ni agrega auditoría.
- FK compuestas comprueban área/canvas, objetivo/ciclo, actividad/ciclo, ambición/emprendimiento y
  fotografía precedente/ciclo. Un trigger comprueba el vínculo canvas/ciclo/inscripción/emprendimiento.
- PostgreSQL y eventos ORM protegen definiciones, evidencias, decisiones y fotografías aprobadas;
  las tablas de seguimiento no ofrecen borrado histórico. Las validaciones guardan instantáneas.

## Decisiones pendientes (TBD)

- La escala numérica del prototipo no está confirmada en las fuentes: las evaluaciones conservan
  observaciones por área y la comparación es descriptiva, sin puntuaciones o umbrales inventados.
- Catálogo oficial de entregables, obligatoriedad y evidencia mínima. `Objective.deliverable` es
  una referencia textual de trabajo, heredada por sus actividades y cronograma; no constituye una
  definición oficial ni habilita aprobación independiente de un entregable o hito.
- Criterios de salida, transiciones entre programas, habilitación automática de bloques,
  condiciones de autocompletado y permisos de configuración de canvas.
- Binarios privados, límites MIME/tamaño y entrega firmada R2. `kind=file/photograph/video` representa
  una referencia externa HTTP(S), no un archivo almacenado ni un permiso de descarga de SIA.

## Pruebas

`tests/test_seguimiento.py` monta el router aislado y ejecuta realmente las migraciones 001–003
con upgrade/downgrade. SQLite habilita FK. `SEGUIMIENTO_TEST_DATABASE_URL` permite ejecutar la
misma batería en PostgreSQL desechable, incluyendo carreras de escritura y triggers SQL.
**La base de pruebas debe ser vacía y desechable**: las fixtures crean y eliminan sus tablas.
