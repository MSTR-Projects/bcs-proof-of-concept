import json
from datetime import datetime, timezone

from models.schemas import Controle, ControleCreate
from services.storage_backend import get_storage


def save_controle(controle_id: str, data: ControleCreate) -> Controle:
    now = datetime.now(timezone.utc)
    controle = Controle(
        id=controle_id,
        name=data.name,
        status=data.status,
        files=data.files,
        rules=data.rules,
        computedFields=data.computedFields,
        ruleGraph=data.ruleGraph,
        klantId=data.klantId,
        klantName=data.klantName,
        createdBy=data.createdBy,
        createdAt=now,
        updatedAt=now,
    )
    get_storage().save_controle(controle_id, controle.model_dump_json(indent=2))
    return controle


def get_controle(controle_id: str) -> Controle | None:
    content = get_storage().get_controle(controle_id)
    if content is None:
        return None
    return Controle(**json.loads(content))


def list_controles() -> list[Controle]:
    storage = get_storage()
    controles: list[Controle] = []
    for cid in storage.list_controle_ids():
        content = storage.get_controle(cid)
        if content is not None:
            controles.append(Controle(**json.loads(content)))
    return sorted(controles, key=lambda c: c.createdAt, reverse=True)


def update_controle(controle_id: str, data: ControleCreate) -> Controle | None:
    storage = get_storage()
    existing_content = storage.get_controle(controle_id)
    if existing_content is None:
        return None

    existing = json.loads(existing_content)
    controle = Controle(
        id=controle_id,
        name=data.name,
        status=data.status,
        files=data.files,
        rules=data.rules,
        computedFields=data.computedFields,
        ruleGraph=data.ruleGraph,
        klantId=data.klantId,
        klantName=data.klantName,
        createdBy=data.createdBy or existing.get("createdBy"),
        createdAt=existing.get("createdAt", datetime.now(timezone.utc).isoformat()),
        updatedAt=datetime.now(timezone.utc),
    )
    storage.save_controle(controle_id, controle.model_dump_json(indent=2))
    return controle


def delete_controle(controle_id: str) -> bool:
    return get_storage().delete_controle(controle_id)
