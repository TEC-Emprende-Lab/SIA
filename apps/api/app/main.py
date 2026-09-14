from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.modules.identity.routes import router as identity_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.environment in {"development", "test"}:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            pass
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version="0.0.0", lifespan=lifespan)

    @app.get("/healthz", tags=["system"])
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok", "service": "api", "environment": settings.environment}

    @app.get("/readyz", tags=["system"])
    async def readyz() -> dict[str, str]:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception:
            return {"status": "degraded", "service": "api"}
        return {"status": "ok", "service": "api"}

    app.include_router(identity_router)

    return app


app = create_app()
