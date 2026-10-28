"""Ciclo del consumidor PDF: espera, recuperación y cierre de recursos."""

import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app import worker


@pytest.fixture
def runtime(monkeypatch):
    sessions = []

    @asynccontextmanager
    async def session():
        entry = {"db": object(), "closed": False}
        sessions.append(entry)
        try:
            yield entry["db"]
        finally:
            entry["closed"] = True

    dispose = AsyncMock()
    generate = AsyncMock()
    sleep = AsyncMock(side_effect=asyncio.CancelledError)
    monkeypatch.setattr(worker, "async_session", session)
    monkeypatch.setattr(worker, "engine", SimpleNamespace(dispose=dispose))
    monkeypatch.setattr(worker, "generate_pending_pdf", generate)
    monkeypatch.setattr(worker.asyncio, "sleep", sleep)
    return sessions, dispose, generate, sleep


@pytest.mark.parametrize("configured_id", [None, "pdf-worker-ci"])
async def test_idle_worker_uses_identity_and_releases_session_before_sleep(
    monkeypatch, runtime, configured_id
):
    sessions, dispose, generate, sleep = runtime
    monkeypatch.delenv("SIA_WORKER_ID", raising=False)
    if configured_id:
        monkeypatch.setenv("SIA_WORKER_ID", configured_id)
    monkeypatch.setattr(worker.socket, "gethostname", lambda: "container-ci")
    generate.return_value = None

    async def idle(seconds):
        assert seconds == worker._IDLE_SECONDS
        assert sessions[0]["closed"]
        raise asyncio.CancelledError

    sleep.side_effect = idle
    with pytest.raises(asyncio.CancelledError):
        await worker.run()

    generate.assert_awaited_once_with(sessions[0]["db"], configured_id or "container-ci")
    dispose.assert_awaited_once()


async def test_completed_job_continues_without_idle_delay(runtime):
    sessions, dispose, generate, sleep = runtime
    generate.side_effect = [object(), None]

    with pytest.raises(asyncio.CancelledError):
        await worker.run()

    assert generate.await_count == 2
    assert all(entry["closed"] for entry in sessions)
    sleep.assert_awaited_once_with(worker._IDLE_SECONDS)
    dispose.assert_awaited_once()


async def test_cycle_failure_waits_then_retries_with_new_session(runtime, caplog):
    sessions, dispose, generate, sleep = runtime
    generate.side_effect = [ConnectionError("database unavailable"), None]
    sleep.side_effect = [None, asyncio.CancelledError]

    with pytest.raises(asyncio.CancelledError):
        await worker.run()

    assert generate.await_count == 2
    assert len(sessions) == 2
    assert sessions[0]["db"] is not sessions[1]["db"]
    assert all(entry["closed"] for entry in sessions)
    assert sleep.await_count == 2
    assert "worker cycle failed" in caplog.text
    dispose.assert_awaited_once()


async def test_cancellation_during_processing_is_not_retried(runtime):
    sessions, dispose, generate, sleep = runtime
    generate.side_effect = asyncio.CancelledError

    with pytest.raises(asyncio.CancelledError):
        await worker.run()

    generate.assert_awaited_once()
    assert sessions[0]["closed"]
    sleep.assert_not_awaited()
    dispose.assert_awaited_once()
