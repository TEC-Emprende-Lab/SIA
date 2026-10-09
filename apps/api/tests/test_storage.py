"""La firma de descarga usa el host que el navegador puede abrir."""

import asyncio

from app.storage.s3 import S3ObjectStore


def test_signed_url_uses_the_public_endpoint() -> None:
    store = S3ObjectStore(
        endpoint="http://minio:9000",
        public_endpoint="http://localhost:9000",
        bucket="sia-private",
        access_key="sia-local",
        secret_key="local-development-only",
        region="us-east-1",
    )
    url = asyncio.run(store.signed_get_url("documents/a/b", expires_seconds=300))
    assert url.startswith("http://localhost:9000/sia-private/documents/a/b?")
    assert "minio" not in url
