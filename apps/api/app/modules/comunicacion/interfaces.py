"""Adapters deliberately unavailable until their integrations are configured."""

from typing import Protocol


class MinutesGenerator(Protocol):
    async def draft(self, transcript: str) -> str: ...


class TranscriptDraftStub:
    async def draft(self, transcript: str) -> str:
        # TODO(TBD): selected-source AI provider/worker. No invented extraction.
        return "Pendiente de completar — borrador sin procesamiento IA.\n\n" + transcript


class CommunicationIntegrations(Protocol):
    async def send_email(self, notification_id: str) -> None: ...
    async def publish_event(self, channel_id: str, message_id: str) -> None: ...
    async def attach_file(self, message_id: str, storage_key: str) -> None: ...
    async def recording(self, meeting_id: str) -> str: ...
    async def report_template(self) -> str: ...
    async def channel_taxonomy(self) -> list[str]: ...


class UnconfiguredIntegrations:
    async def send_email(self, notification_id: str) -> None:
        # TODO(TBD): Resend delivery via persistent, idempotent worker.
        raise NotImplementedError("Resend pendiente")

    async def publish_event(self, channel_id: str, message_id: str) -> None:
        # TODO(TBD): Socket.IO/Redis with reauthorization of subscriptions.
        raise NotImplementedError("Socket.IO pendiente")

    async def attach_file(self, message_id: str, storage_key: str) -> None:
        # TODO(TBD): private attachments, MIME/size policy and signed R2 access.
        raise NotImplementedError("Adjuntos pendientes")

    async def recording(self, meeting_id: str) -> str:
        # TODO(TBD): exceptional Zoom/Meet recording retention/reference.
        raise NotImplementedError("Grabaciones pendientes")

    async def report_template(self) -> str:
        # TODO(TBD): report template and mandatory fields.
        raise NotImplementedError("Plantilla pendiente")

    async def channel_taxonomy(self) -> list[str]:
        # TODO(TBD): final taxonomy and channel-specific permissions.
        raise NotImplementedError("Taxonomía pendiente")
