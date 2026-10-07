"""Adaptador S3 para Cloudflare R2 y para MinIO en desarrollo."""

import asyncio

import boto3
from botocore.client import Config


class S3ObjectStore:
    def __init__(
        self,
        *,
        endpoint: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        region: str,
    ) -> None:
        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    async def put(self, key: str, body: bytes, mime: str) -> None:
        await asyncio.to_thread(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=body,
            ContentType=mime,
        )

    async def signed_get_url(self, key: str, *, expires_seconds: int) -> str:
        url = await asyncio.to_thread(
            self._client.generate_presigned_url,
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=expires_seconds,
        )
        if not isinstance(url, str) or not url:
            raise RuntimeError("No se pudo firmar la URL de descarga")
        return url
