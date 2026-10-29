import asyncio
from collections.abc import Awaitable
from typing import Annotated, cast

from fastapi import Depends, HTTPException

from app.core.config import settings
from app.core.redis import get_redis
from app.models.user import User
from app.security.deps import get_current_user


async def finance_rate_limit(actor: Annotated[User, Depends(get_current_user)]) -> None:
    """Límite financiero por identidad, compartido entre workers; falla cerrado."""
    try:
        async with asyncio.timeout(2):
            redis = get_redis()
            key = f"ratelimit:finance:{actor.id}"
            count = await cast(
                Awaitable[int],
                redis.eval(
                    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
                    1,
                    key,
                    str(settings.rate_limit_window_seconds),
                ),
            )
        if count > settings.rate_limit_requests:
            raise HTTPException(429, "Demasiadas operaciones financieras; intente más tarde")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            503, "Control de frecuencia no disponible; operación no ejecutada"
        ) from exc
