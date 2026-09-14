from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import uuid4

TODAY = "2026-09-07"
PROJECT = {
    "id": "lumen",
    "name": "Lumen Biotech",
    "model": "Prototipado",
    "description": "Diagnóstico accesible para una atención más oportuna.",
    "start": "2026-03-02",
}
AREA_IDS = {
    "identity",
    "business-model",
    "segmented-market",
    "channels",
    "mvp",
    "incorporation",
}


class DomainError(ValueError):
    pass


def _ensure(value: object, message: str) -> None:
    if not value:
        raise DomainError(message)


def _uid() -> str:
    return str(uuid4())


def actor_for(role: str) -> str:
    return {"Coordinadora": "María Calderón", "Gestor": "Javier Soto"}.get(role, "Andrea Morales")


def _find(items: list[dict[str, Any]], item_id: str) -> dict[str, Any] | None:
    return next((item for item in items if item["id"] == item_id), None)


def _upsert(items: list[dict[str, Any]], item: dict[str, Any]) -> None:
    existing = _find(items, item["id"])
    if existing is None:
        items.append(deepcopy(item))
    else:
        existing.clear()
        existing.update(deepcopy(item))


def objective_progress(store: dict[str, Any], objective_id: str) -> float:
    activities = [
        activity for activity in store["activities"] if activity["objectiveId"] == objective_id
    ]
    if not activities:
        return 0
    return float(
        sum(activity["status"] == "DONE" for activity in activities) / len(activities) * 100
    )


def project_progress(store: dict[str, Any]) -> float:
    objectives = [
        objective for objective in store["objectives"] if objective["status"] == "APPROVED"
    ]
    if not objectives:
        return 0
    return sum(objective_progress(store, objective["id"]) for objective in objectives) / len(
        objectives
    )


def approved_diagnostics(store: dict[str, Any]) -> list[dict[str, Any]]:
    return sorted(
        (diagnostic for diagnostic in store["diagnostics"] if diagnostic["status"] == "APPROVED"),
        key=lambda diagnostic: diagnostic["date"],
    )


def compare_diagnostics(previous: dict[str, Any], current: dict[str, Any]) -> list[dict[str, Any]]:
    _ensure(
        previous["status"] == "APPROVED"
        and current["status"] == "APPROVED"
        and previous["date"] <= current["date"],
        "Selecciona diagnósticos aprobados en orden cronológico.",
    )
    previous_scores = {
        assessment["areaId"]: assessment["score"] for assessment in previous["assessments"]
    }
    return [
        {
            **assessment,
            "before": previous_scores.get(assessment["areaId"]),
            "delta": assessment["score"] - previous_scores[assessment["areaId"]]
            if assessment["areaId"] in previous_scores
            else None,
        }
        for assessment in current["assessments"]
    ]


def report_sources(store: dict[str, Any], start: str, end: str) -> list[dict[str, Any]]:
    def in_period(value: str) -> bool:
        return start <= value <= end

    diagnostics = approved_diagnostics(store)
    baseline = next((item for item in reversed(diagnostics) if item["date"] < start), None)
    selected_diagnostics = [
        item
        for item in diagnostics
        if in_period(item["date"]) or item["id"] == (baseline or {}).get("id")
    ]
    sources = [
        {
            "id": PROJECT["id"],
            "kind": "Proyecto",
            "title": PROJECT["name"],
            "date": PROJECT["start"],
            "content": f"{PROJECT['description']} Modalidad: {PROJECT['model']}.",
        }
    ]
    for objective in store["objectives"]:
        if objective["date"] <= end:
            activities = [
                activity
                for activity in store["activities"]
                if activity["objectiveId"] == objective["id"] and activity["date"] <= end
            ]
            approved = objective["status"] == "APPROVED" and objective.get("approvedAt", "") <= end
            completed = sum(
                bool(activity.get("completedAt")) and activity["completedAt"] <= end
                for activity in activities
            )
            sources.append(
                {
                    "id": objective["id"],
                    "kind": "Objetivo",
                    "title": objective["title"],
                    "date": objective["date"],
                    "content": f"{objective['description']} Estado: {'Aprobado' if approved else 'Pendiente de aprobación'}. Actividades previstas hasta el cierre: {len(activities)}. Completadas al cierre: {completed}.",
                }
            )
    for activity in store["activities"]:
        activity_date = activity.get("completedAt", activity["date"])
        if in_period(activity_date):
            completed = activity.get("completedAt") and activity["completedAt"] <= end
            sources.append(
                {
                    "id": activity["id"],
                    "kind": "Actividad",
                    "title": activity["title"],
                    "date": activity_date,
                    "content": f"{'Completada el ' + activity['completedAt'] if completed else 'Pendiente al cierre del período'}. Responsable: {activity['owner']}.",
                }
            )
    for evidence in store["evidence"]:
        if in_period(evidence["date"]):
            sources.append(
                {
                    "id": evidence["id"],
                    "kind": "Evidencia",
                    "title": evidence["title"],
                    "date": evidence["date"],
                    "content": evidence["content"],
                }
            )
    for meeting in store["meetings"]:
        if in_period(meeting["date"]) and meeting["minutes"]:
            sources.append(
                {
                    "id": meeting["id"],
                    "kind": "Reunión",
                    "title": meeting["title"],
                    "date": meeting["date"],
                    "content": f"{meeting['minutes']} Acuerdos: {meeting['agreements']}",
                }
            )
    for diagnostic in selected_diagnostics:
        sources.append(
            {
                "id": diagnostic["id"],
                "kind": "Diagnóstico",
                "title": f"Diagnóstico {diagnostic['date']}{' · línea base anterior' if baseline and diagnostic['id'] == baseline['id'] else ''}",
                "date": diagnostic["date"],
                "content": "\n".join(
                    f"{assessment['name']}: {assessment['score']}/5. {assessment['observation']}"
                    for assessment in diagnostic["assessments"]
                ),
            }
        )
    return sources


def make_report(
    store: dict[str, Any], start: str, end: str, report_type: str, source_ids: list[str], role: str
) -> dict[str, Any]:
    _ensure(
        start and end and start <= end and end <= TODAY,
        "Indica un período válido que termine a más tardar el 7 de septiembre de 2026, fecha de esta demostración.",
    )
    sources = [source for source in report_sources(store, start, end) if source["id"] in source_ids]
    _ensure(sources, "Selecciona al menos una fuente para preparar el borrador.")

    def section(title: str, kinds: list[str]) -> dict[str, Any]:
        refs = [source for source in sources if source["kind"] in kinds]
        return {
            "title": title,
            "content": "\n\n".join(f"{source['title']}\n{source['content']}" for source in refs)
            if refs
            else "Pendiente de completar",
            "sourceIds": [source["id"] for source in refs],
        }

    diagnostic_sources = sorted(
        (
            diagnostic
            for diagnostic in store["diagnostics"]
            if any(
                source["id"] == diagnostic["id"] and source["kind"] == "Diagnóstico"
                for source in sources
            )
        ),
        key=lambda diagnostic: diagnostic["date"],
    )
    evolution = section("Evolución del diagnóstico 360°", ["Diagnóstico"])
    if len(diagnostic_sources) > 1:
        previous, current = diagnostic_sources[-2:]
        all_approved = approved_diagnostics(store)
        if all_approved.index(current) - all_approved.index(previous) == 1:
            changes = compare_diagnostics(previous, current)
            evolution["content"] += (
                "\n\nComparación por área ("
                + previous["date"]
                + " → "
                + current["date"]
                + "):\n"
                + "\n".join(
                    f"{change['name']}: {change['before'] if change['before'] is not None else 'Sin base'} → {change['score']}/5 · {'Sin base' if change['delta'] is None else '+' + str(change['delta']) + ' avance' if change['delta'] > 0 else str(change['delta']) + ' retroceso' if change['delta'] < 0 else 'Sin cambio'}"
                    for change in changes
                )
            )
    report_id = _uid()
    return {
        "id": report_id,
        "groupId": report_id,
        "projectId": PROJECT["id"],
        "type": report_type,
        "start": start,
        "end": end,
        "version": 1,
        "status": "DRAFT",
        "author": actor_for(role),
        "createdAt": TODAY,
        "sources": deepcopy(sources),
        "sections": [
            section("Identificación y emprendimiento", ["Proyecto"]),
            {
                "title": "Programa y perfil estructurado",
                "content": "Pendiente de completar",
                "sourceIds": [],
            },
            section("Objetivos y avances", ["Objetivo", "Actividad"]),
            {
                "title": "Modificaciones aprobadas de plan, alcance y presupuesto",
                "content": "Pendiente de completar",
                "sourceIds": [],
            },
            {"title": "Impactos", "content": "Pendiente de completar", "sourceIds": []},
            {"title": "Formalización", "content": "Pendiente de completar", "sourceIds": []},
            evolution,
            section("Dificultades y próximos pasos", ["Reunión"]),
            section("Evidencias y anexos", ["Evidencia"]),
        ],
    }


def apply_command(
    original: dict[str, Any], command: dict[str, Any], role: str, today: str = TODAY
) -> dict[str, Any]:
    store = deepcopy(original)
    manager = role != "Emprendedor"
    actor = actor_for(role)
    command_type = command["type"]
    entity_id = command.get("id", command.get("value", {}).get("id", "chat"))
    if command_type == "diagnostic.save":
        diagnostic = command["value"]
        _ensure(
            diagnostic["projectId"] == PROJECT["id"] and diagnostic["status"] == "DRAFT",
            "Solo puedes guardar borradores de este proyecto.",
        )
        _ensure(
            not any(
                item["id"] == diagnostic["id"] and item["status"] != "DRAFT"
                for item in store["diagnostics"]
            ),
            "Este diagnóstico es de solo lectura. Crea una nueva revisión.",
        )
        _ensure(
            diagnostic["date"]
            and all(
                isinstance(assessment["score"], int) and 1 <= assessment["score"] <= 5
                for assessment in diagnostic["assessments"]
            ),
            "Todas las áreas deben tener una calificación entera entre 1 y 5.",
        )
        _upsert(store["diagnostics"], diagnostic)
    elif command_type == "diagnostic.status":
        diagnostic = _find(store["diagnostics"], command["id"])
        _ensure(
            diagnostic and diagnostic["status"] != "APPROVED",
            "El diagnóstico aprobado es inmutable.",
        )
        assert diagnostic is not None
        requested = command["status"]
        _ensure(
            (
                requested == "SUBMITTED"
                and diagnostic["status"] == "DRAFT"
                and (manager or diagnostic["author"] == actor)
            )
            or (requested != "SUBMITTED" and manager and diagnostic["status"] == "SUBMITTED"),
            "Esta transición no está disponible para el rol o estado actual.",
        )
        diagnostic["status"] = requested
        if requested == "APPROVED":
            diagnostic["approvedBy"] = actor
            diagnostic["approvedAt"] = today
    elif command_type == "diagnostic.revise":
        diagnostic = _find(store["diagnostics"], command["id"])
        _ensure(
            diagnostic and diagnostic["status"] == "APPROVED", "Selecciona un diagnóstico aprobado."
        )
        assert diagnostic is not None
        revision = deepcopy(diagnostic)
        revision.update(
            {"id": _uid(), "status": "DRAFT", "author": actor, "supersedes": diagnostic["id"]}
        )
        revision.pop("approvedAt", None)
        revision.pop("approvedBy", None)
        entity_id = revision["id"]
        store["diagnostics"].append(revision)
    elif command_type == "ambition.save":
        ambition = command["value"]
        _ensure(
            ambition["projectId"] == PROJECT["id"] and ambition["title"].strip(),
            "La ambición necesita un título y proyecto.",
        )
        if ambition["type"] not in {"DREAM", "VISION", "PURPOSE"}:
            _ensure(ambition["owner"], "Selecciona una persona responsable.")
        if ambition["type"] in {"OBJECTIVE", "GOAL", "MILESTONE", "PROJECT"}:
            _ensure(ambition["due"], "Indica la fecha de cumplimiento.")
        if ambition["type"] in {"OBJECTIVE", "GOAL"}:
            _ensure(ambition["measurement"].strip(), "Indica cómo medir el cumplimiento.")
        if ambition["type"] == "MILESTONE":
            _ensure(ambition["verification"].strip(), "Indica la verificación del hito.")
        if ambition["type"] == "PROJECT":
            _ensure(
                ambition["start"] and ambition["start"] <= ambition["due"],
                "Indica inicio y fin válidos.",
            )
        _upsert(store["ambitions"], ambition)
    elif command_type == "objective.save":
        objective = command["value"]
        _ensure(
            objective["projectId"] == PROJECT["id"]
            and objective["title"].strip()
            and objective["areaId"] in AREA_IDS,
            "Indica el título y el área del Cubo 360.",
        )
        _ensure(
            not objective.get("ambitionId") or _find(store["ambitions"], objective["ambitionId"]),
            "La ambición seleccionada no existe.",
        )
        updated = {**objective, "status": "PENDING_APPROVAL"}
        updated.pop("approvedBy", None)
        updated.pop("approvedAt", None)
        _upsert(store["objectives"], updated)
    elif command_type == "objective.approve":
        _ensure(manager, "Solo un Gestor o Coordinadora puede aprobar objetivos.")
        objective = _find(store["objectives"], command["id"])
        _ensure(
            objective and objective["status"] == "PENDING_APPROVAL",
            "Selecciona un objetivo pendiente.",
        )
        assert objective is not None
        objective.update({"status": "APPROVED", "approvedAt": today, "approvedBy": actor})
    elif command_type == "activity.save":
        activity = command["value"]
        _ensure(
            activity["title"].strip() and _find(store["objectives"], activity["objectiveId"]),
            "Completa el título y selecciona un objetivo.",
        )
        _upsert(store["activities"], activity)
    elif command_type == "activity.status":
        activity = _find(store["activities"], command["id"])
        _ensure(activity and activity["status"] != "DONE", "La actividad ya está completada.")
        assert activity is not None
        activity["status"] = command["status"]
        if activity["status"] == "DONE":
            activity["completedAt"] = today
    elif command_type == "evidence.save":
        evidence = command["value"]
        _ensure(
            _find(store["activities"], evidence["activityId"]) and evidence["title"].strip(),
            "Selecciona una actividad y un título.",
        )
        if evidence["type"] == "LINK":
            _ensure(
                evidence.get("url", "").lower().startswith(("http://", "https://")),
                "Usa un enlace http o https válido.",
            )
        _upsert(store["evidence"], evidence)
    elif command_type == "report.save":
        _ensure(manager, "La preparación de informes corresponde a Gestor o Coordinadora.")
        report = command["value"]
        _ensure(
            report["projectId"] == PROJECT["id"]
            and report["status"] == "DRAFT"
            and not any(
                item["id"] == report["id"] and item["status"] != "DRAFT"
                for item in store["reports"]
            ),
            "Esta versión es de solo lectura.",
        )
        _ensure(
            all(
                section["content"] == "Pendiente de completar"
                or section["sourceIds"]
                and all(
                    any(source["id"] == source_id for source in report["sources"])
                    for source_id in section["sourceIds"]
                )
                for section in report["sections"]
            ),
            "Cada redacción debe tener fuentes seleccionadas.",
        )
        _upsert(store["reports"], report)
    elif command_type == "report.status":
        _ensure(manager, "Solo un Gestor o Coordinadora puede revisar informes.")
        report = _find(store["reports"], command["id"])
        requested = command["status"]
        _ensure(
            report
            and (
                (requested == "SUBMITTED" and report["status"] == "DRAFT")
                or (requested != "SUBMITTED" and report["status"] == "SUBMITTED")
            ),
            "Esta transición de informe no está disponible.",
        )
        assert report is not None
        report["status"] = requested
        if requested == "APPROVED":
            report["approvedBy"] = actor
            report["approvedAt"] = today
    elif command_type == "report.revise":
        _ensure(manager, "La revisión corresponde a Gestor o Coordinadora.")
        report = _find(store["reports"], command["id"])
        _ensure(report and report["status"] == "APPROVED", "Selecciona una versión aprobada.")
        assert report is not None
        revision = deepcopy(report)
        revision.update(
            {
                "id": _uid(),
                "version": max(
                    item["version"]
                    for item in store["reports"]
                    if item["groupId"] == report["groupId"]
                )
                + 1,
                "supersedes": report["id"],
                "status": "DRAFT",
                "author": actor,
                "createdAt": today,
            }
        )
        revision.pop("approvedAt", None)
        revision.pop("approvedBy", None)
        entity_id = revision["id"]
        store["reports"].append(revision)
    elif command_type == "message.send":
        _ensure(command["content"].strip(), "Escribe un mensaje.")
        store["messages"].append(
            {"id": _uid(), "author": actor, "content": command["content"].strip(), "date": today}
        )
    else:
        raise DomainError(f"Comando no soportado: {command_type}")
    entities = (
        store["diagnostics"]
        + store["ambitions"]
        + store["objectives"]
        + store["activities"]
        + store["evidence"]
        + store["reports"]
        + store["messages"]
    )
    before_entities = (
        original["diagnostics"]
        + original["ambitions"]
        + original["objectives"]
        + original["activities"]
        + original["evidence"]
        + original["reports"]
        + original["messages"]
    )
    store["audit"].append(
        {
            "id": _uid(),
            "entityId": entity_id,
            "action": command_type,
            "actor": actor,
            "date": today,
            "before": deepcopy(_find(before_entities, entity_id)),
            "after": deepcopy(_find(entities, entity_id)),
        }
    )
    return store


class InMemoryRepository:
    """Test-only adapter that proves failed commands do not change stored state."""

    def __init__(self, state: dict[str, Any]) -> None:
        self._state = deepcopy(state)
        self._fail_next = False

    def load(self) -> dict[str, Any]:
        return deepcopy(self._state)

    def fail_next(self) -> None:
        self._fail_next = True

    def execute(self, command: dict[str, Any], role: str) -> dict[str, Any]:
        if self._fail_next:
            self._fail_next = False
            raise OSError("No se pudieron guardar los cambios.")
        self._state = apply_command(self._state, command, role)
        return self.load()
