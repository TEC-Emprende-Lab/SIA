import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.script import ScriptDirectory
from fastapi import FastAPI, Response
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.modules.expediente.routes import router as expediente_router
from app.modules.identity.routes import router as identity_router
from app.modules.seguimiento.routes import router as seguimiento_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Alembic runs as a separate deployment step, never once per API worker.
    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.0.0", lifespan=lifespan)

    @app.get("/healthz", tags=["system"])
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok", "service": "api", "environment": settings.environment}

    @app.get(
        "/readyz",
        tags=["system"],
        responses={503: {"description": "Database unavailable or migration required"}},
    )
    async def readyz(response: Response) -> dict[str, str]:
        try:
            async with asyncio.timeout(3):
                async with engine.connect() as conn:
                    revisions = set(
                        (
                            await conn.execute(text("SELECT version_num FROM alembic_version"))
                        ).scalars()
                    )
                expected = set(
                    ScriptDirectory(
                        str(Path(__file__).resolve().parents[1] / "alembic")
                    ).get_heads()
                )
                if revisions != expected:
                    raise RuntimeError("Database migration required")
        except Exception as exc:
            logging.getLogger(__name__).warning(
                "Database readiness failed (%s)", type(exc).__name__
            )
            response.status_code = 503
            return {"status": "degraded", "service": "api"}
        return {"status": "ok", "service": "api"}

    app.include_router(identity_router)
    app.include_router(expediente_router)
    app.include_router(seguimiento_router)

    return app


app = create_app()
