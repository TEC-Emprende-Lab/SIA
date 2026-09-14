from fastapi import HTTPException

from app.models.user import User

INVITE_ALLOWED: dict[str, set[str]] = {
    "Coordinadora": {"Coordinadora", "Gestor", "Emprendedor"},
    "Gestor": {"Emprendedor"},
    "Emprendedor": set(),
}


def ensure_can_invite(actor: User, target_role: str) -> None:
    if target_role not in {"Coordinadora", "Gestor", "Emprendedor"}:
        raise HTTPException(status_code=400, detail="Rol inválido")
    allowed = INVITE_ALLOWED.get(actor.role, set())
    if target_role not in allowed:
        raise HTTPException(status_code=403, detail="No autorizado para invitar a ese rol")


def ensure_can_list_users(actor: User) -> None:
    if actor.role != "Coordinadora":
        raise HTTPException(status_code=403, detail="Solo Coordinadora puede listar usuarios")


def ensure_can_list_invitations(actor: User) -> None:
    if actor.role not in {"Coordinadora", "Gestor"}:
        raise HTTPException(status_code=403, detail="No autorizado")
