# Informes técnicos (Fase 5)

Informe técnico periódico por ciclo (US: núcleo común `ia-e-informes.md`). Reúne
las fuentes autorizadas del período, se aprueba por revisión humana y, una vez
aprobado, es una **instantánea inmutable**; el PDF privado lo genera el worker.

Migración `006` tras `005`; crea solo `technical_reports` sin tocar identidad,
expediente, seguimiento, comunicación ni la cola.

## Modelo (`app/models/informes.py`)

Una fila = una **versión** de la serie `(cycle_id, period_start, period_end, kind)`.
Una corrección es una fila nueva con `version` mayor y `supersedes_id` a la
aprobada previa; la aprobada nunca se modifica ni se elimina (eventos ORM
`before_update`/`before_delete`, como `Diagnostic`). Tras aprobar, lo único
mutable es el puntero al PDF (`pdf_storage_key`, `pdf_generated_at`), que escribe
el worker.

- `narrative`: texto humano editable mientras es borrador.
- `composition` (JSON): instantánea de fuentes con su procedencia (ids). Se
  captura al crear (vista previa) y **se recompone al aprobar** (el snapshot real).
- `revision`: lock optimista para ediciones concurrentes del borrador.

## Servicio y rutas

Rutas bajo `/cycles/{cycle_id}/reports`: listar, crear, ver, editar borrador
(`PUT`), aprobar (`/approval`) y corregir (`/corrections`). La autorización es de
backend (`policy.cycle_scope`): **crear, editar, aprobar y corregir exigen Gestor
asignado o Coordinadora**; leer exige acceso al ciclo. La aprobación requiere
`human_reviewed: true` y encola el PDF en la misma transacción
(`idempotency_key=informe-pdf:{id}`).

`_compose` reúne objetivos aprobados, actividades completadas en el período, sus
evidencias, minutas aprobadas y acuerdos de reuniones del período. Nada se
inventa; **finanzas se marca `Pendiente de completar`** (Fase 6 pendiente).

## Worker

`service.generate_pending_pdf(db, worker_id, *, store)` es un ciclo del consumidor:
reclama un `informe.pdf` de la cola (`FOR UPDATE SKIP LOCKED`), genera+almacena el
PDF del informe aprobado, escribe el puntero y marca la tarea `done`; ante error
la cola reintenta con backoff. `store` es inyectable; el default es **`TBD`**
(R2/render pendiente) y falla de forma controlada, como el resto de integraciones
externas del backend.

## Pruebas

`tests/test_informes.py` (SQLite; `INFORMES_TEST_DATABASE_URL` para PostgreSQL):
composición trazable + finanzas pendiente, solo gestores aprueban, aprobación
inmutable + encolado del PDF, corrección vinculada, worker éxito/idle y
reintento, período inválido y autenticación.

## Decisiones pendientes (TBD)

- **Plantilla y campos obligatorios** del informe mensual: sin definir; el
  contenido vive en `narrative` + `composition` genéricos, sin inventar secciones.
- **Render de PDF y almacenamiento privado R2** con URL firmada: pendiente.
- **Proveedor IA real** para borradores asistidos: pendiente (no se inventan hechos).
- **Fuente de finanzas** (Fase 6): ausente, marcada como pendiente.
- **Cableado del deployable `apps/worker`**: el consumidor vive en el paquete de la
  API (donde están cola y modelos); ejecutarlo desde `apps/worker` es un paso de
  despliegue (Fase 8).
