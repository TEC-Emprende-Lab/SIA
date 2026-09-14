from copy import deepcopy

import pytest

from app.domain.prototype import (
    DomainError,
    InMemoryRepository,
    apply_command,
    compare_diagnostics,
    make_report,
    project_progress,
    report_sources,
)
from app.domain.seed import create_seed


def test_seed_relations_and_initial_progress() -> None:
    store = create_seed()

    assert project_progress(store) == 50
    assert all(objective["areaId"] for objective in store["objectives"])
    assert all(
        not objective.get("ambitionId")
        or any(ambition["id"] == objective["ambitionId"] for ambition in store["ambitions"])
        for objective in store["objectives"]
    )
    assert all(
        any(activity["id"] == evidence["activityId"] for activity in store["activities"])
        for evidence in store["evidence"]
    )


def test_approved_diagnostic_is_immutable_and_can_be_revised() -> None:
    store = create_seed()
    original = deepcopy(store["diagnostics"][0])

    with pytest.raises(DomainError, match="solo lectura"):
        apply_command(
            store, {"type": "diagnostic.save", "value": {**original, "status": "DRAFT"}}, "Gestor"
        )

    next_store = apply_command(store, {"type": "diagnostic.revise", "id": original["id"]}, "Gestor")
    assert next_store["diagnostics"][0] == original
    assert next_store["diagnostics"][-1]["supersedes"] == original["id"]


def test_diagnostic_rejects_invalid_scores() -> None:
    for score in [0, 1.5, 6]:
        store = create_seed()
        diagnostic = deepcopy(store["diagnostics"][0])
        diagnostic.update({"id": "invalid", "status": "DRAFT"})
        diagnostic["assessments"][0]["score"] = score

        with pytest.raises(DomainError, match="entera"):
            apply_command(store, {"type": "diagnostic.save", "value": diagnostic}, "Gestor")


def test_entrepreneur_can_submit_own_draft_but_cannot_approve() -> None:
    store = create_seed()
    diagnostic = {
        **store["diagnostics"][0],
        "id": "draft",
        "status": "DRAFT",
        "author": "Andrea Morales",
    }
    next_store = apply_command(
        store, {"type": "diagnostic.save", "value": diagnostic}, "Emprendedor"
    )
    next_store = apply_command(
        next_store,
        {"type": "diagnostic.status", "id": "draft", "status": "SUBMITTED"},
        "Emprendedor",
    )

    with pytest.raises(DomainError):
        apply_command(
            next_store,
            {"type": "diagnostic.status", "id": "draft", "status": "APPROVED"},
            "Emprendedor",
        )
    with pytest.raises(DomainError):
        apply_command(next_store, {"type": "objective.approve", "id": "o3"}, "Emprendedor")


def test_diagnostic_comparison_covers_all_six_areas() -> None:
    store = create_seed()
    changes = compare_diagnostics(store["diagnostics"][1], store["diagnostics"][2])

    assert len(changes) == 6
    assert sum(change["delta"] > 0 for change in changes) == 4
    assert sum(change["delta"] == 0 for change in changes) == 2


def test_completed_activity_changes_project_progress() -> None:
    next_store = apply_command(
        create_seed(), {"type": "activity.status", "id": "a3", "status": "DONE"}, "Emprendedor"
    )

    assert project_progress(next_store) == 62.5
    assert (
        next(activity for activity in next_store["activities"] if activity["id"] == "a3")[
            "completedAt"
        ]
        == "2026-09-07"
    )


def test_objective_owns_optional_ambition_link() -> None:
    store = create_seed()
    next_store = apply_command(
        store,
        {"type": "objective.save", "value": {**store["objectives"][2], "ambitionId": "am2"}},
        "Gestor",
    )

    assert (
        next(objective for objective in next_store["objectives"] if objective["id"] == "o3")[
            "ambitionId"
        ]
        == "am2"
    )
    with pytest.raises(DomainError):
        apply_command(
            store,
            {
                "type": "objective.save",
                "value": {**store["objectives"][2], "ambitionId": "missing"},
            },
            "Gestor",
        )


def test_changing_approved_objective_reopens_approval() -> None:
    store = create_seed()
    next_store = apply_command(
        store,
        {
            "type": "objective.save",
            "value": {**store["objectives"][0], "title": "Objetivo ajustado"},
        },
        "Emprendedor",
    )
    objective = next_store["objectives"][0]

    assert objective["status"] == "PENDING_APPROVAL"
    assert "approvedAt" not in objective
    assert next_store["audit"][-1]["before"]["status"] == "APPROVED"
    assert next_store["audit"][-1]["after"]["title"] == "Objetivo ajustado"


def test_report_uses_selected_sources_and_marks_missing_content() -> None:
    store = create_seed()
    sources = report_sources(store, "2026-08-01", "2026-08-31")
    report = make_report(store, "2026-08-01", "2026-08-31", "FOLLOW_UP", ["e2"], "Gestor")

    assert all(source["id"] != "d3" for source in sources)
    assert any(source["id"] == "d2" for source in sources)
    assert [source["id"] for source in report["sources"]] == ["e2"]
    assert (
        next(section for section in report["sections"] if section["title"] == "Impactos")["content"]
        == "Pendiente de completar"
    )


def test_approved_reports_are_frozen_and_revisions_are_new_versions() -> None:
    store = create_seed()
    report = make_report(store, "2026-06-01", "2026-09-04", "FOLLOW_UP", ["e2"], "Gestor")
    report.update(
        {
            "id": "r1",
            "groupId": "r1",
            "status": "APPROVED",
            "approvedBy": "María Calderón",
            "approvedAt": "2026-09-06",
        }
    )
    store["reports"].append(report)
    original = deepcopy(report)
    next_store = apply_command(
        store, {"type": "activity.status", "id": "a3", "status": "DONE"}, "Gestor"
    )

    assert next_store["reports"][0] == original
    with pytest.raises(DomainError):
        apply_command(
            next_store, {"type": "report.save", "value": {**original, "status": "DRAFT"}}, "Gestor"
        )
    revised = apply_command(next_store, {"type": "report.revise", "id": "r1"}, "Gestor")
    assert revised["reports"][-1]["version"] == 2
    assert revised["reports"][-1]["supersedes"] == "r1"


def test_injected_save_failure_leaves_repository_unchanged() -> None:
    repository = InMemoryRepository(create_seed())
    before = repository.load()
    command = {"type": "activity.status", "id": "a3", "status": "DONE"}
    repository.fail_next()

    with pytest.raises(OSError):
        repository.execute(command, "Gestor")
    assert repository.load() == before
    assert (
        next(
            activity
            for activity in repository.execute(command, "Gestor")["activities"]
            if activity["id"] == "a3"
        )["status"]
        == "DONE"
    )
