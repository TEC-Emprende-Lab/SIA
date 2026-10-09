# Archivos privados

Tabla `documents` y entrega por URL firmada. Trazabilidad: US-PRO-001/002, US-PM-001/002 y
`docs/00-nucleo-comun/objetivos-actividades-evidencias.md`.

## Qué hace

- `POST /entrepreneurships/{id}/documents` guarda el binario y devuelve metadatos.
  Quien no tiene acceso al emprendimiento recibe 403. La clave de almacenamiento no
  sale en la respuesta.
- `GET /entrepreneurships/{id}/documents/{document_id}/access` autoriza y devuelve
  una URL firmada de vida corta. Cada entrega queda en auditoría, sin guardar la URL.
- Una evidencia `file`, `photograph` o `video` puede usar `document_id` del mismo
  emprendimiento en lugar de `url`. El enlace (`kind=link`) sigue siendo solo URL.
  Las referencias HTTP(S) ya guardadas no se reescriben.

## Qué no hace

- No define límites de MIME ni de tamaño: siguen `TBD`. Un archivo vacío se rechaza.
- No adjunta archivos al chat, no guarda facturas y no renderiza el PDF del informe.
- Sin endpoint, bucket y credenciales (`SIA_STORAGE_*`) la carga responde 503.
  En Compose, MinIO crea el bucket `sia-private`. La API sube a `http://minio:9000`
  y firma la descarga con `SIA_STORAGE_PUBLIC_ENDPOINT` (`http://localhost:9000`),
  porque el navegador no resuelve el nombre `minio`.
