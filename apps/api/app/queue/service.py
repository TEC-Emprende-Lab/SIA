"""Primitivas de la cola de trabajos (PostgreSQL, ``FOR UPDATE SKIP LOCKED``).

Estas funciones hacen ``flush`` pero **nunca** ``commit``: se componen dentro de
la transacción de quien las llama. Dos patrones de uso:

- **Encolar** junto a una mutación de negocio (p. ej. ``enqueue`` en la misma
  transacción que crea la alerta), de modo que la tarea solo existe si el evento
  se confirmó.
- **Worker**: ``claim`` -> procesar -> ``complete``/``fail`` en su propia
  transacción. El worker mantiene el bloqueo de fila hasta que confirma, así que
  un ``claim`` concurrente en otra conexión salta esa fila (SKIP LOCKED).

No hay planificador, escalamiento ni política de cierre aquí: eso es `TBD` y
pertenece a cada módulo emisor y al worker consumidor (aún pendiente).
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Job


async def enqueue(
    db: AsyncSession,
    kind: str,
    payload: dict[str, Any] | None = None,
    *,
    idempotency_key: str | None = None,
    run_at: datetime | None = None,
) -> Job:
    """Encola una tarea. Si ``idempotency_key`` ya existe, devuelve la tarea
    existente en vez de insertar un duplicado. La garantía dura es el índice
    único: bajo carrera, el segundo INSERT concurrente falla y el llamador debe
    tratarlo como "ya encolada".
    """
    if idempotency_key is not None:
        existing = await db.scalar(select(Job).where(Job.idempotency_key == idempotency_key))
        if existing is not None:
            return existing
    job = Job(
        kind=kind,
        payload=payload or {},
        idempotency_key=idempotency_key,
        run_at=run_at or datetime.now(UTC),
    )
    db.add(job)
    await db.flush()
    return job


async def claim(
    db: AsyncSession,
    worker_id: str,
    *,
    kinds: Sequence[str] | None = None,
    now: datetime | None = None,
) -> Job | None:
    """Reclama atómicamente la próxima tarea vencida (``FOR UPDATE SKIP LOCKED``
    en PostgreSQL). Devuelve ``None`` si no hay nada listo. Incrementa
    ``attempts`` y marca ``claimed`` con ``locked_by``/``locked_at``.
    """
    now = now or datetime.now(UTC)
    query = (
        select(Job)
        .where(Job.status == "pending", Job.run_at <= now)
        .order_by(Job.run_at, Job.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    if kinds is not None:
        query = query.where(Job.kind.in_(kinds))
    job = await db.scalar(query)
    if job is None:
        return None
    job.status = "claimed"
    job.attempts += 1
    job.locked_at = now
    job.locked_by = worker_id
    await db.flush()
    return job


async def _locked(db: AsyncSession, job_id: str) -> Job:
    job = await db.scalar(select(Job).where(Job.id == job_id).with_for_update())
    if job is None:
        raise LookupError(f"Job {job_id} no existe")
    return job


async def complete(db: AsyncSession, job_id: str) -> Job:
    """Marca una tarea reclamada como ``done`` y libera su bloqueo."""
    job = await _locked(db, job_id)
    job.status = "done"
    job.locked_at = None
    job.locked_by = None
    await db.flush()
    return job


async def fail(
    db: AsyncSession,
    job_id: str,
    error: str,
    *,
    retry_in: timedelta | None = None,
    now: datetime | None = None,
) -> Job:
    """Registra un intento fallido. Reintenta (vuelve a ``pending`` con ``run_at``
    diferido) hasta que ``attempts`` alcanza ``max_attempts``; luego se rinde
    (``failed``). El backoff por defecto crece con el número de intentos.
    """
    now = now or datetime.now(UTC)
    job = await _locked(db, job_id)
    job.last_error = error
    job.locked_at = None
    job.locked_by = None
    if job.attempts >= job.max_attempts:
        job.status = "failed"
    else:
        delay = retry_in if retry_in is not None else timedelta(seconds=60 * job.attempts)
        job.status = "pending"
        job.run_at = now + delay
    await db.flush()
    return job
