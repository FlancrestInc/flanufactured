from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from auth import require_api_key
from models import CreateSchemaRequest, UpdateSchemaRequest, SchemaListItem, FieldDefinition
import schema_store
import json

router = APIRouter(prefix="/api/schemas", tags=["Schemas"])


@router.get("", dependencies=[Depends(require_api_key)])
def list_schemas():
    """List all saved schemas."""
    schemas = schema_store.list_schemas()
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "field_count": len(s.get("fields", [])),
            "created": s["created"],
            "modified": s["modified"],
        }
        for s in schemas
    ]


@router.post("", dependencies=[Depends(require_api_key)], status_code=201)
def create_schema(req: CreateSchemaRequest):
    """Save a new schema."""
    return schema_store.create_schema(name=req.name, fields=req.fields)


@router.get("/{schema_id}", dependencies=[Depends(require_api_key)])
def get_schema(schema_id: str):
    """Retrieve a single schema by ID."""
    schema = schema_store.get_schema(schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found.")
    return schema


@router.put("/{schema_id}", dependencies=[Depends(require_api_key)])
def update_schema(schema_id: str, req: UpdateSchemaRequest):
    """Update an existing schema's name and/or fields."""
    updated = schema_store.update_schema(
        schema_id=schema_id,
        name=req.name,
        fields=req.fields,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Schema not found.")
    return updated


@router.delete("/{schema_id}", dependencies=[Depends(require_api_key)], status_code=204)
def delete_schema(schema_id: str):
    """Delete a schema."""
    deleted = schema_store.delete_schema(schema_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Schema not found.")


@router.get("/{schema_id}/export", dependencies=[Depends(require_api_key)])
def export_schema(schema_id: str):
    """Download a schema as a JSON file."""
    schema = schema_store.get_schema(schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found.")
    filename = f"{schema['name'].lower().replace(' ', '_')}.schema.json"
    return Response(
        content=json.dumps(schema, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/import", dependencies=[Depends(require_api_key)], status_code=201)
async def import_schema(file: UploadFile = File(...)):
    """Import a schema from an uploaded JSON file."""
    try:
        content = await file.read()
        data = json.loads(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON file.")

    try:
        fields = [FieldDefinition(**f) for f in data.get("fields", [])]
        name = data.get("name", "Imported Schema")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid schema format: {e}")

    if not fields:
        raise HTTPException(status_code=400, detail="Schema must have at least one field.")

    return schema_store.create_schema(name=name, fields=fields)
