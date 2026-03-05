"""
schema_store.py — File-based schema persistence layer.

Each saved schema is stored as an individual JSON file at:
    {DATA_DIR}/{uuid}.json

The API key and its creation timestamp are stored separately at:
    {DATA_DIR}/.config

No database is required. The data directory is created automatically on first use.
"""
import json
import uuid
import os
from datetime import datetime, timezone
from typing import Optional
from models import SavedSchema, FieldDefinition
from config import settings


def _schema_path(schema_id: str) -> str:
    return os.path.join(settings.data_dir, f"{schema_id}.json")


def _ensure_data_dir():
    os.makedirs(settings.data_dir, exist_ok=True)


def list_schemas() -> list[dict]:
    _ensure_data_dir()
    schemas = []
    for filename in os.listdir(settings.data_dir):
        if filename.endswith(".json"):
            try:
                with open(os.path.join(settings.data_dir, filename)) as f:
                    data = json.load(f)
                    schemas.append(data)
            except Exception:
                continue
    schemas.sort(key=lambda s: s.get("modified", ""), reverse=True)
    return schemas


def get_schema(schema_id: str) -> Optional[dict]:
    path = _schema_path(schema_id)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def create_schema(name: str, fields: list[FieldDefinition]) -> dict:
    _ensure_data_dir()
    now = datetime.now(timezone.utc).isoformat()
    schema = {
        "id": str(uuid.uuid4()),
        "name": name,
        "created": now,
        "modified": now,
        "fields": [f.model_dump() for f in fields],
    }
    with open(_schema_path(schema["id"]), "w") as f:
        json.dump(schema, f, indent=2)
    return schema


def update_schema(schema_id: str, name: Optional[str], fields: Optional[list[FieldDefinition]]) -> Optional[dict]:
    existing = get_schema(schema_id)
    if not existing:
        return None
    if name is not None:
        existing["name"] = name
    if fields is not None:
        existing["fields"] = [f.model_dump() for f in fields]
    existing["modified"] = datetime.now(timezone.utc).isoformat()
    with open(_schema_path(schema_id), "w") as f:
        json.dump(existing, f, indent=2)
    return existing


def delete_schema(schema_id: str) -> bool:
    path = _schema_path(schema_id)
    if not os.path.exists(path):
        return False
    os.remove(path)
    return True
