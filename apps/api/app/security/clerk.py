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
    if not settings.clerk_issuer or not settings.clerk_audience:
        raise ValueError("Clerk issuer and audience must be configured")
    if settings.clerk_secret_key:
        if settings.environment not in {"development", "test"}:
            raise ValueError("HS256 is only permitted in development/test; configure Clerk JWKS")
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.clerk_secret_key,
            algorithms=["HS256"],
            audience=settings.clerk_audience or None,
            issuer=settings.clerk_issuer or None,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
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
        options={"require": ["exp", "iat", "sub", "iss", "aud"]},
    )
    return payload_hs


def create_test_token(
    clerk_user_id: str,
    email: str,
    exp_seconds: int = 3600,
    secret: str | None = None,
    *,
    email_verified: bool = True,
) -> str:
    key = secret or settings.clerk_secret_key or "test-secret"
    now = int(time.time())
    payload = {
        "sub": clerk_user_id,
        "email": email,
        "email_verified": email_verified,
        "exp": now + exp_seconds,
        "iat": now,
        "iss": settings.clerk_issuer or "test-issuer",
        "aud": settings.clerk_audience or "test-audience",
    }
    return jwt.encode(payload, key, algorithm="HS256")
