import json
import logging

from fastapi.testclient import TestClient

from app.main import app


def test_request_log_keeps_a_safe_id_and_omits_the_query(caplog) -> None:
    caplog.set_level(logging.INFO, logger="sia.request")

    response = TestClient(app).get(
        "/healthz?token=secret",
        headers={"X-Request-ID": "staging-probe-1"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "staging-probe-1"
    record = json.loads(caplog.records[-1].message)
    assert record["event"] == "http_request"
    assert record["request_id"] == "staging-probe-1"
    assert record["method"] == "GET"
    assert record["path"] == "/healthz"
    assert record["status"] == 200
    assert "secret" not in caplog.text
    assert "token" not in record["path"]


def test_request_log_replaces_an_unsafe_id() -> None:
    response = TestClient(app).get("/healthz", headers={"X-Request-ID": "bad id"})

    request_id = response.headers["x-request-id"]
    assert request_id != "bad id"
    assert " " not in request_id
