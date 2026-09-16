# Cola de trabajos (job_queue)

Primitiva de **infraestructura** para tareas asíncronas persistentes en
PostgreSQL. Es la base que necesitan las fases pendientes (correo Resend,
generación de PDF de informes, borradores de minutas IA, entrega de
notificaciones). **No es dominio**: no tiene columnas de alcance ni endpoints
HTTP; nadie crea trabajos desde fuera de la API.

Migración `005` después de `004`; solo crea la tabla `job_queue` y su índice, sin
tocar identidad, expediente, seguimiento ni comunicación.

## Decidido vs. TBD

Implementa lo ya **decidido** en el [plan de escalabilidad](../../../../tasks/plan-escalabilidad.md)
(§7 y principio 7): cola en PostgreSQL, reclamo atómico con `FOR UPDATE SKIP
LOCKED`, reintentos e idempotencia. **No** implementa (sigue `TBD`): el worker
consumidor, el planificador/escalamiento/cierre, ni los productores concretos de
cada tipo de tarea. El módulo de comunicación ya dejó las costuras (`emit_alert`,
`MinutesGenerator`) que en su día encolarán aquí.

## Modelo (`app/models/queue.py`)

Tabla `job_queue`: `id`, `kind`, `payload` (JSON), `status`
(`pending → claimed → done | failed`), `attempts`, `max_attempts`, `run_at`
(programación/backoff), `idempotency_key` (único), `locked_at`/`locked_by`,
`last_error`, `created_at`/`updated_at`. Índice `(status, run_at)` para el
reclamo.

## Servicio (`app/queue/service.py`)

Funciones que hacen `flush` pero **nunca `commit`**: se componen en la
transacción del llamador.

- `enqueue(db, kind, payload, *, idempotency_key=None, run_at=None)` — encola;
  si la clave ya existe, devuelve la tarea existente (el índice único es la
  garantía dura).
- `claim(db, worker_id, *, kinds=None, now=None)` — reclama la próxima tarea
  vencida con `FOR UPDATE SKIP LOCKED` (N workers en horizontal); incrementa
  `attempts`. Devuelve `None` si no hay nada listo.
- `complete(db, job_id)` — marca `done` y libera el bloqueo.
- `fail(db, job_id, error, *, retry_in=None, now=None)` — reintenta (vuelve a
  `pending` con `run_at` diferido) hasta `max_attempts`; luego `failed`.

Uso típico en un worker: `claim` → procesar → `complete`/`fail`, cada ciclo en su
propia transacción. El worker mantiene el bloqueo de fila hasta confirmar, así
que un `claim` concurrente salta esa fila.

## Pruebas

`tests/test_queue.py` corre las migraciones reales (upgrade/downgrade) sobre
SQLite en memoria: idempotencia, reclamo/completado, respeto de `run_at`, filtro
por `kind` y reintentos hasta rendirse. `QUEUE_TEST_DATABASE_URL` ejecuta la
misma batería en PostgreSQL desechable e incluye la prueba de `SKIP LOCKED` con
dos workers concurrentes. En SQLite `FOR UPDATE` se omite (sin efecto), por lo
que esa prueba se salta fuera de PostgreSQL. **La base de pruebas debe ser vacía
y desechable.**
