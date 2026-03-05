"""
models.py — Pydantic request/response models.

FieldDefinition      A single column in a schema (name, type, options).
SchemaDefinition     An ordered list of fields (used for inline generation).
SavedSchema          A persisted schema with id, name, and timestamps.
CreateSchemaRequest  POST /api/schemas body.
UpdateSchemaRequest  PUT /api/schemas/{id} body (all fields optional).
GenerateRequest      POST /api/generate body (inline schema + generation params).
GenerateFromSchemaRequest  POST /api/generate/{id} body (generation params only).
SchemaListItem       Summary row returned by GET /api/schemas.
"""
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime


class FieldDefinition(BaseModel):
    name: str
    type: str
    options: Optional[dict[str, Any]] = None


class SchemaDefinition(BaseModel):
    fields: list[FieldDefinition]


class SavedSchema(BaseModel):
    id: str
    name: str
    created: datetime
    modified: datetime
    fields: list[FieldDefinition]


class CreateSchemaRequest(BaseModel):
    name: str
    fields: list[FieldDefinition]


class UpdateSchemaRequest(BaseModel):
    name: Optional[str] = None
    fields: Optional[list[FieldDefinition]] = None


class GenerateRequest(BaseModel):
    fields: list[FieldDefinition]
    rows: int = Field(default=10, ge=1)
    format: str = Field(default="json", pattern="^(json|csv)$")
    seed: Optional[int] = None
    locale: Optional[str] = "en_US"


class GenerateFromSchemaRequest(BaseModel):
    rows: int = Field(default=10, ge=1)
    format: str = Field(default="json", pattern="^(json|csv)$")
    seed: Optional[int] = None
    locale: Optional[str] = None  # None = use schema default or en_US


class SchemaListItem(BaseModel):
    id: str
    name: str
    field_count: int
    created: datetime
    modified: datetime
