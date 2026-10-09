"""Consume la cola persistente. Hoy solo genera el PDF de informes aprobados."""

import asyncio
import logging
import os
import socket

from app.db.session import async_session, engine
from app.modules.informes.service import generate_pending_pdf

logger = logging.getLogger(__name__)
_IDLE_SECONDS = 5


async def run() -> None:
    worker_id = os.environ.get("SIA_WORKER_ID") or socket.gethostname()
    logger.info('{"event":"worker.started","service":"worker","consumes":"informe.pdf"}')
    try:
        while True:
            try:
                async with async_session() as db:
                    job = await generate_pending_pdf(db, worker_id)
            except Exception:
                logger.exception("worker cycle failed")
                await asyncio.sleep(_IDLE_SECONDS)
                continue
            if job is None:
                await asyncio.sleep(_IDLE_SECONDS)
    finally:
        await engine.dispose()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(run())


if __name__ == "__main__":
    main()
