"""US-PRO-003/004/007–010: finanzas autorizadas y trazables, sin datos externos."""

import base64
import os
import runpy
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import Header
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.main import create_app
from app.models.audit import AuditLog
from app.models.comunicacion import Alert
from app.models.document import Document
from app.models.expediente import (
    Entrepreneurship,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.finanzas import BudgetItem, FinanceEvent, Purchase
from app.models.user import User
from app.modules.finanzas.definitions import CHECKLISTS
from app.modules.finanzas.rate_limit import finance_rate_limit
from app.modules.informes import service as reports_service
from app.security.deps import get_current_user

BASE = "/cycles/c1/finanzas"


def migrate(connection, direction):
    files = sorted((Path(__file__).resolve().parents[1] / "alembic/versions").glob("[0-9]*.py"))
    with Operations.context(MigrationContext.configure(connection)):
        for file in files if direction == "upgrade" else reversed(files):
            runpy.run_path(str(file))[direction]()


@pytest.fixture
async def finance():
    url = os.getenv("FINANZAS_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = create_async_engine(url)
    if url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def fk(conn, _):
            conn.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(migrate, "upgrade")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        for uid, role in [
            ("coord", "Coordinadora"),
            ("manager", "Gestor"),
            ("founder", "Emprendedor"),
            ("other", "Emprendedor"),
            ("outside", "Gestor"),
        ]:
            db.add(User(id=uid, email=f"{uid}@example.test", role=role))
        for n in (1, 2):
            db.add(Entrepreneurship(id=f"e{n}", name=f"Proyecto {n}"))
        await db.flush()
        for n in (1, 2):
            db.add(
                ProgramEnrollment(id=f"en{n}", entrepreneurship_id=f"e{n}", program="Prototipado")
            )
        db.add(ProgramEnrollment(id="en3", entrepreneurship_id="e1", program="Puesta en marcha"))
        await db.flush()
        for n in (1, 2, 3):
            db.add(ProgramCycle(id=f"c{n}", enrollment_id=f"en{n}", name=f"Ciclo {n}"))
        await db.flush()
        db.add(ProgramCycle(id="sibling", enrollment_id="en1", name="Hermano"))
        for uid, role in [
            ("founder", "Emprendedor"),
            ("other", "Emprendedor"),
            ("manager", "Gestor"),
        ]:
            db.add(ProgramCycleAssignment(program_cycle_id="c1", user_id=uid, role=role))
        db.add(
            Document(
                id="doc1",
                entrepreneurship_id="e1",
                storage_key="private/one",
                name="respaldo.xml",
                mime="application/xml",
                size=30,
                uploaded_by="founder",
            )
        )
        db.add(
            Document(
                id="doc2",
                entrepreneurship_id="e2",
                storage_key="private/two",
                name="ajeno.xml",
                mime="application/xml",
                size=30,
                uploaded_by="coord",
            )
        )
        await db.commit()
    app = create_app()

    async def database():
        async with sessions() as db:
            yield db

    async def actor(x_actor: str = Header(default="coord")):
        async with sessions() as db:
            return await db.get(User, x_actor)

    async def unlimited():
        return None

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = actor
    app.dependency_overrides[finance_rate_limit] = unlimited
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client, sessions
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(migrate, "downgrade")
        await engine.dispose()


def headers(actor):
    return {"x-actor": actor}


async def item(client, name="Equipamiento", amount="10000.00", cycle="c1"):
    response = await client.post(
        f"/cycles/{cycle}/finanzas/items",
        json={"name": name, "amount": amount, "observation": "Presupuesto aprobado"},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def purchase(client, iid, kind="factura", actor="founder", **extra):
    return await client.post(
        f"{BASE}/purchases",
        headers=headers(actor),
        json={
            "item_id": iid,
            "kind": kind,
            "amount": "123.45",
            "supplier": "Proveedor",
            "invoice_number": f"INV-{kind}",
            "description": "Compra de prueba",
            "request_key": f"key-{kind}",
            "checklist": {key: True for key in CHECKLISTS[kind]},
            **extra,
        },
    )


async def step(client, p, action, actor="coord", **extra):
    return await client.post(
        f"{BASE}/purchases/{p['id']}/transitions",
        headers=headers(actor),
        json={
            "expected_revision": p["revision"],
            "action": action,
            "observation": "Revisión de respaldo",
            "human_reviewed": True,
            **extra,
        },
    )


async def execute(client, p):
    for action in ("submit", "validate", "register_fundatec", "execute"):
        response = await step(client, p, action, fundatec_number="F-123", executed_on="2026-09-15")
        assert response.status_code == 200, response.text
        p = response.json()
    return p


@pytest.mark.parametrize("kind", list(CHECKLISTS))
async def test_five_types_execution_and_exact_summary(finance, kind):
    client, sessions = finance
    iid = await item(client)
    p = (await purchase(client, iid, kind)).json()
    p = await execute(client, p)
    assert p["status"] == "executed" and p["amount"] == "123.45"
    result = (await client.get(f"{BASE}/summary")).json()
    assert result["items"][0]["executed"] == "123.45"
    assert Decimal(result["items"][0]["balance_after_execution"]) == Decimal("9876.55")
    assert result["available"] is None
    async with sessions() as db:
        audits = list(await db.scalars(select(AuditLog).where(AuditLog.entity_id == p["id"])))
        assert len(audits) == 5
        assert audits[-1].after["amount"] == "123.45"
        assert await db.scalar(select(Alert.id).where(Alert.recipient_id == "manager"))
        model = await db.get(Purchase, p["id"])
        model.amount = Decimal("1.00")
        with pytest.raises(ValueError):
            await db.flush()
        await db.rollback()


async def test_scope_roles_siblings_and_program(finance):
    client, sessions = finance
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    assert (await client.get(f"{BASE}/summary", headers=headers("outside"))).status_code == 403
    assert (
        await client.get("/cycles/sibling/finanzas/summary", headers=headers("manager"))
    ).status_code == 403
    assert (await client.get("/cycles/c3/finanzas/summary")).status_code == 409
    assert (
        await client.post(
            f"{BASE}/items",
            headers=headers("manager"),
            json={"name": "Otra", "amount": "1.00", "observation": "x"},
        )
    ).status_code == 403
    assert (await step(client, p, "validate", "founder")).status_code == 403
    assert (await step(client, p, "execute", "manager")).status_code == 403
    assert (await step(client, p, "cancel", "manager")).status_code == 403
    assert (await step(client, p, "submit", "other")).status_code == 403
    foreign = await item(client, cycle="c2")
    assert (await purchase(client, foreign, request_key="foreign")).status_code == 422
    async with sessions() as db:
        assignment = await db.scalar(
            select(ProgramCycleAssignment).where(ProgramCycleAssignment.user_id == "manager")
        )
        from datetime import UTC, datetime

        assignment.revoked_at = datetime.now(UTC)
        await db.commit()
    assert (await client.get(f"{BASE}/purchases", headers=headers("manager"))).status_code == 403


async def test_idempotency_duplicates_and_corrections(finance):
    client, _ = finance
    iid = await item(client)
    first = await purchase(client, iid)
    p = first.json()
    assert (await purchase(client, iid)).json()["id"] == p["id"]
    assert (await purchase(client, iid, amount="124.00")).status_code == 409
    assert (await purchase(client, iid, request_key="duplicate")).status_code == 409
    another = await purchase(client, iid, request_key="different", invoice_number="OTHER")
    assert another.status_code == 201
    duplicates = (await client.get(f"{BASE}/duplicates")).json()
    assert set(duplicates[0]["purchase_ids"]) == {p["id"], another.json()["id"]}
    response = await step(client, p, "submit", "founder")
    p = response.json()
    assert (await step(client, {**p, "revision": 1}, "validate")).status_code == 409
    p = (await step(client, p, "request_correction", "manager")).json()
    fields = {
        key: p[key]
        for key in (
            "item_id",
            "kind",
            "amount",
            "supplier",
            "invoice_number",
            "description",
            "submission_date",
            "checklist",
        )
    }
    edited = await client.put(
        f"{BASE}/purchases/{p['id']}",
        headers=headers("founder"),
        json={**fields, "expected_revision": p["revision"], "observation": "Corrección"},
    )
    assert edited.status_code == 200
    p = (await step(client, edited.json(), "submit", "founder")).json()
    assert (await step(client, p, "validate", human_reviewed=False)).status_code == 422
    assert (await step(client, p, "execute")).status_code == 409
    events = (await client.get(f"{BASE}/events?entity_id={p['id']}")).json()
    assert len(events) == 5


async def test_attachments_scope_checklist_and_no_delete(finance):
    client, sessions = finance
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    payload = {"expected_revision": 1, "document_id": "doc2"}
    assert (
        await client.post(f"{BASE}/purchases/{p['id']}/attachments", json=payload)
    ).status_code == 422
    payload["document_id"] = "doc1"
    assert (
        await client.post(f"{BASE}/purchases/{p['id']}/attachments", json=payload)
    ).status_code == 201
    attachments = (await client.get(f"{BASE}/purchases/{p['id']}/attachments")).json()
    assert attachments[0]["name"] == "respaldo.xml" and "storage_key" not in str(attachments)
    assert (await client.delete(f"{BASE}/purchases/{p['id']}")).status_code == 405
    async with sessions() as db:
        with pytest.raises(DBAPIError):
            await db.execute(text("DELETE FROM finance_purchases WHERE id=:id"), {"id": p["id"]})
        await db.rollback()
        with pytest.raises(DBAPIError):
            db.add(
                BudgetItem(
                    id="bad",
                    cycle_id="c1",
                    entrepreneurship_id="e2",
                    name="Ajena",
                    amount=Decimal(1),
                    created_by="coord",
                )
            )
            await db.flush()
        await db.rollback()
    incomplete = (await purchase(client, iid, kind="reintegro", checklist={})).json()
    incomplete = (await step(client, incomplete, "submit")).json()
    assert (await step(client, incomplete, "validate")).status_code == 422


async def test_budget_transfer_atomic_and_permissions(finance):
    client, sessions = finance
    source = await item(client, "Origen", "200.00")
    target = await item(client, "Destino", "100.00")
    p = (await purchase(client, source)).json()
    await execute(client, p)
    body = {
        "source_id": source,
        "target_id": target,
        "amount": "100.00",
        "reason": "Traslado solicitado",
    }
    assert (
        await client.post(f"{BASE}/changes", headers=headers("founder"), json=body)
    ).status_code == 403
    created = await client.post(f"{BASE}/changes", headers=headers("manager"), json=body)
    cid = created.json()["id"]
    decision = {
        "expected_revision": 1,
        "decision": "approve",
        "observation": "Revisado",
        "human_reviewed": True,
    }
    assert (
        await client.post(
            f"{BASE}/changes/{cid}/decision", headers=headers("manager"), json=decision
        )
    ).status_code == 403
    assert (await client.post(f"{BASE}/changes/{cid}/decision", json=decision)).status_code == 409
    async with sessions() as db:
        assert (await db.get(BudgetItem, source)).amount == Decimal("200.00")
    body["amount"] = "50.00"
    cid = (await client.post(f"{BASE}/changes", json=body)).json()["id"]
    assert (await client.post(f"{BASE}/changes/{cid}/decision", json=decision)).status_code == 200
    async with sessions() as db:
        assert (await db.get(BudgetItem, source)).amount == Decimal("150.00")
        assert (await db.get(BudgetItem, target)).amount == Decimal("150.00")
    assert (await client.post(f"{BASE}/changes/{cid}/decision", json=decision)).status_code == 409


def report_html(entries):
    html = "Proyecto: 42 - Prueba<br><table>"
    for number, amount in entries:
        cells = [
            "",
            number,
            "",
            "Proveedor",
            f"Factura# {number}",
            "15/09/2026",
            "",
            amount,
            "",
            "",
            "",
            "",
        ]
        html += "<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"
    return html + "</table>"


async def test_reconciliation_bilateral_resolution_no_side_effect(finance):
    client, sessions = finance
    iid = await item(client)
    p = (await purchase(client, iid, invoice_number="00100001010000000001")).json()
    another = (
        await purchase(client, iid, kind="reintegro", invoice_number="00100001010000000002")
    ).json()
    body = {
        "name": "rpSituacion.xls",
        "html": report_html(
            [("00100001010000000001", "-124.00"), ("00100001010000000003", "-20.00")]
        ),
        "confirm_cycle": True,
    }
    assert (
        await client.post(f"{BASE}/reconciliations", headers=headers("founder"), json=body)
    ).status_code == 403
    response = await client.post(f"{BASE}/reconciliations", headers=headers("manager"), json=body)
    assert response.status_code == 201, response.text
    result = response.json()
    assert {r["status"] for r in result["results"]} == {"difference", "only_sea", "only_fundatec"}
    assert (await client.post(f"{BASE}/reconciliations", json=body)).json()["id"] == result["id"]
    path = f"{BASE}/reconciliations/{result['id']}/resolutions"
    assert (
        await client.post(path, json={"row_key": "other", "observation": "No"})
    ).status_code == 422
    assert (
        await client.post(
            path, json={"row_key": p["id"], "observation": "Revisar diferencia con proveedor"}
        )
    ).status_code == 201
    async with sessions() as db:
        assert (await db.get(Purchase, p["id"])).amount == Decimal("123.45")
        assert (await db.get(Purchase, another["id"])).status == "draft"
        events = list(
            await db.scalars(select(FinanceEvent).where(FinanceEvent.entity_id == result["id"]))
        )
        assert len(events) == 2


async def test_report_sources_pdf_filters_and_input_validation(finance):
    client, sessions = finance
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    await execute(client, p)
    async with sessions() as db:
        composed = await reports_service._compose(db, "c1", date(2026, 9, 1), date(2026, 9, 30))
        assert composed["finances"]["executed"] == "123.45"
        assert composed["finances"]["purchases"][0]["id"] == p["id"]
    pdf = await client.get(f"{BASE}/report.pdf?status=executed")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert p["id"].encode() in pdf.content
    assert (
        await client.get(f"{BASE}/report.pdf?start=2026-10-01&end=2026-09-01")
    ).status_code == 422
    assert (await purchase(client, iid, amount="NaN")).status_code == 422
    assert (await purchase(client, iid, amount="1.001")).status_code == 422
    assert (await purchase(client, iid, status="executed")).status_code == 422
    assert (await client.get(f"{BASE}/purchases?limit=101")).status_code == 422


async def test_extraction_xml_currency_and_entities(finance):
    client, _ = finance
    xml = b"<FacturaElectronica><Emisor><Nombre>Proveedor CR</Nombre></Emisor><NumeroConsecutivo>00100001010000000001</NumeroConsecutivo><TotalComprobante>123.45</TotalComprobante><CodigoMoneda>CRC</CodigoMoneda><FechaEmision>2026-09-15T00:00:00</FechaEmision></FacturaElectronica>"

    async def send(content):
        return await client.post(
            f"{BASE}/extract",
            json={"name": "factura.xml", "content_base64": base64.b64encode(content).decode()},
        )

    result = await send(xml)
    assert result.status_code == 200 and result.json()["amount"] == "123.45"
    assert (await send(xml.replace(b"CRC", b"USD"))).json()["amount"] is None
    assert (await send(b'<!DOCTYPE foo [<!ENTITY x "evil">]><foo>&x;</foo>')).status_code == 422


async def test_anonymous_denied():
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        assert (await client.get(f"{BASE}/summary")).status_code == 401


async def test_overview_and_session_report_keep_scope(finance):
    client, _ = finance
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    p = (await step(client, p, "submit")).json()
    await step(client, p, "validate", actor="manager")
    await item(client, cycle="c2")
    result = await client.get("/finanzas/overview", headers=headers("manager"))
    assert result.status_code == 200, result.text
    assert [row["cycle_id"] for row in result.json()] == ["c1"]
    assert (await client.get("/finanzas/overview", headers=headers("outside"))).json() == []
    general = await client.get("/finanzas/report.pdf", headers=headers("manager"))
    assert (
        general.status_code == 200
        and b"Proyecto 1" in general.content
        and b"Proyecto 2" not in general.content
    )
    report = (await client.get(f"{BASE}/report-text", headers=headers("founder"))).json()["text"]
    assert p["id"] in report and "manager" in report
    report = (await client.get(f"{BASE}/report-text?start=2000-01-01&end=2000-01-02")).json()[
        "text"
    ]
    assert p["id"] not in report


async def test_audit_failure_rolls_back_mutation(finance, monkeypatch):
    from app.modules.finanzas import service

    client, sessions = finance
    iid = await item(client)

    async def fail_audit(*args, **kwargs):
        raise RuntimeError("Audit unavailable")

    monkeypatch.setattr(service, "write_audit", fail_audit)
    with pytest.raises(RuntimeError, match="Audit unavailable"):
        await purchase(client, iid)
    async with sessions() as db:
        assert await db.scalar(select(Purchase.id)) is None
        assert (
            await db.scalar(select(FinanceEvent.id).where(FinanceEvent.action == "finance.created"))
            is None
        )


async def test_rate_limit_and_unavailable_fail_closed(finance, monkeypatch):
    from app.modules.finanzas import rate_limit

    client, _ = finance
    app = client._transport.app
    del app.dependency_overrides[finance_rate_limit]

    class TooMany:
        async def eval(self, *args):
            return 100000

    monkeypatch.setattr(rate_limit, "get_redis", lambda: TooMany())
    assert (await client.get(f"{BASE}/summary")).status_code == 429

    class Unavailable:
        async def eval(self, *args):
            raise ConnectionError("No Redis")

    monkeypatch.setattr(rate_limit, "get_redis", lambda: Unavailable())
    assert (await client.get(f"{BASE}/summary")).status_code == 503


async def test_postgres_concurrent_revisions(finance):
    import asyncio

    client, sessions = finance
    async with sessions() as db:
        if db.bind.dialect.name != "postgresql":
            pytest.skip("Requires isolated PostgreSQL database")
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    result = await asyncio.gather(step(client, p, "submit"), step(client, p, "submit"))
    assert sorted(r.status_code for r in result) == [200, 409]


async def test_approved_report_financial_sources_are_frozen(finance):
    client, _ = finance
    iid = await item(client)
    p = (await purchase(client, iid)).json()
    await execute(client, p)
    response = await client.post(
        "/cycles/c1/reports", json={"period_start": "2026-09-01", "period_end": "2026-09-30"}
    )
    assert response.status_code == 201, response.text
    rid = response.json()["id"]
    approved = await client.post(
        f"/cycles/c1/reports/{rid}/approval",
        json={
            "expected_revision": 1,
            "observation": "Revisión de fuentes financieras",
            "human_reviewed": True,
        },
    )
    assert approved.status_code == 200, approved.text
    frozen = approved.json()["composition"]["finances"]
    second = (await purchase(client, iid, kind="reintegro")).json()
    await execute(client, second)
    current = await client.get(f"/cycles/c1/reports/{rid}")
    assert current.json()["composition"]["finances"] == frozen
    assert [p["id"] for p in frozen["purchases"]] == [p["id"]]
