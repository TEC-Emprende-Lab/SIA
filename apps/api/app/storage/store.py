"""Puerto de objetos privados. R2 y MinIO hablan S3; los tests usan memoria."""

from typing import Protocol

from app.core.config import settings


class StorageNotConfigured(Exception):
    """No hay endpoint, bucket ni credenciales. No se simula un archivo."""


class ObjectStore(Protocol):
    async def put(self, key: str, body: bytes, mime: str) -> None: ...

    async def signed_get_url(self, key: str, *, expires_seconds: int) -> str: ...


class UnconfiguredObjectStore:
    async def put(self, key: str, body: bytes, mime: str) -> None:
        raise StorageNotConfigured

    async def signed_get_url(self, key: str, *, expires_seconds: int) -> str:
        raise StorageNotConfigured


class MemoryObjectStore:
    """Doble de pruebas. La URL no es una firma real."""

    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    async def put(self, key: str, body: bytes, mime: str) -> None:
        self.objects[key] = (body, mime)

    async def signed_get_url(self, key: str, *, expires_seconds: int) -> str:
        if key not in self.objects:
            raise KeyError(key)
        return f"https://storage.test/{key}?expires={expires_seconds}"


def storage_configured() -> bool:
    return bool(
        settings.storage_endpoint.strip()
        and settings.storage_bucket.strip()
        and settings.storage_access_key.strip()
        and settings.storage_secret_key.strip()
    )


def get_object_store() -> ObjectStore:
    if not storage_configured():
        return UnconfiguredObjectStore()
    from app.storage.s3 import S3ObjectStore

    return S3ObjectStore(
        endpoint=settings.storage_endpoint.strip(),
        public_endpoint=settings.storage_public_endpoint.strip(),
        bucket=settings.storage_bucket.strip(),
        access_key=settings.storage_access_key.strip(),
        secret_key=settings.storage_secret_key.strip(),
        region=settings.storage_region.strip() or "auto",
    )
