from fastapi import HTTPException, Request
from redis.asyncio import Redis

from app.core.config import settings
from app.core.redis import get_redis


async def check_rate_limit(request: Request, key: str | None = None) -> None:
    redis: Redis = get_redis()
    identifier = key or request.client.host if request.client else "anonymous"
    redis_key = f"ratelimit:{request.url.path}:{identifier}"
    try:
        count = await redis.incr(redis_key)
        if count == 1:
            await redis.expire(redis_key, settings.rate_limit_window_seconds)
        if count > settings.rate_limit_requests:
            raise HTTPException(status_code=429, detail="Demasiadas solicitudes")
    except HTTPException:
        raise
    except Exception:
        return
