import json
import logging
import re
import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger("sia.request")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

Scope = dict[str, Any]
Message = dict[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]
AsgiApp = Callable[[Scope, Receive, Send], Awaitable[None]]


class RequestLogMiddleware:
    """Registra cada petición HTTP en una línea JSON con un identificador propio.

    La decisión de observabilidad está en el plan de escalabilidad: logs JSON
    con request-id. No registra cabeceras, cuerpo ni query string.
    """

    def __init__(self, app: AsgiApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        request_id = _request_id(scope)
        started = time.perf_counter()
        status_code = 500

        async def send_with_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                headers = [*message.get("headers", []), (b"x-request-id", request_id.encode())]
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        finally:
            logger.info(
                json.dumps(
                    {
                        "event": "http_request",
                        "request_id": request_id,
                        "method": scope.get("method", ""),
                        "path": scope.get("path", ""),
                        "status": status_code,
                        "duration_ms": round((time.perf_counter() - started) * 1000),
                    },
                    separators=(",", ":"),
                )
            )


def _request_id(scope: Scope) -> str:
    headers = scope.get("headers", [])
    for key, value in headers:
        if key.lower() != b"x-request-id":
            continue
        candidate = bytes(value).decode("latin-1")
        if _SAFE_REQUEST_ID.fullmatch(candidate):
            return candidate
        break
    return str(uuid.uuid4())
