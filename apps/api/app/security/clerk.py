from __future__ import annotations

import time
from typing import Any

import jwt
from jwt import PyJWKClient

from app.core.config import settings

_jwks_client: PyJWKClient | None = None
_jwks_url_cached: str | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client, _jwks_url_cached
    url = settings.clerk_jwks_url
    if not url:
        return None
    if _jwks_client is None or _jwks_url_cached != url:
        _jwks_client = PyJWKClient(url)
        _jwks_url_cached = url
    return _jwks_client


def verify_clerk_token(token: str) -> dict[str, Any]:
    if settings.clerk_secret_key:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.clerk_secret_key,
            algorithms=["HS256"],
            audience=settings.clerk_audience or None,
            issuer=settings.clerk_issuer or None,
            options={"verify_exp": True},
        )
        return payload
    jwks_client = _get_jwks_client()
    if jwks_client is None:
        raise ValueError(
            "Clerk JWKS not configured: set SIA_CLERK_JWKS_URL or SIA_CLERK_SECRET_KEY"
        )
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload_hs: dict[str, Any] = jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.clerk_audience or None,
        issuer=settings.clerk_issuer or None,
        options={"verify_exp": True},
    )
    return payload_hs


def create_test_token(
    clerk_user_id: str, email: str, exp_seconds: int = 3600, secret: str | None = None
) -> str:
    key = secret or settings.clerk_secret_key or "test-secret"
    now = int(time.time())
    payload = {
        "sub": clerk_user_id,
        "email": email,
        "exp": now + exp_seconds,
        "iat": now,
        "iss": settings.clerk_issuer or "test-issuer",
        "aud": settings.clerk_audience or "test-audience",
    }
    return jwt.encode(payload, key, algorithm="HS256")
