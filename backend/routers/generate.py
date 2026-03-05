from fastapi import APIRouter, Depends, HTTPException, Response
from auth import require_api_key
from models import GenerateRequest, GenerateFromSchemaRequest, FieldDefinition
from generator import generate_dataset, get_field_types_grouped
import schema_store
import json

router = APIRouter(prefix="/api", tags=["Generate"])


@router.get("/field-types", dependencies=[Depends(require_api_key)])
def field_types():
    """Return all available field types grouped by category."""
    return get_field_types_grouped()


@router.post("/generate")
def generate(req: GenerateRequest, _=Depends(require_api_key)):
    """Generate data from an inline schema definition."""
    if not req.fields:
        raise HTTPException(status_code=400, detail="At least one field is required.")

    data, content_type = generate_dataset(
        fields=req.fields,
        rows=req.rows,
        locale=req.locale or "en_US",
        seed=req.seed,
        output_format=req.format,
    )

    if req.format == "csv":
        return Response(content=data, media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=flanufactured.csv"})
    return data


@router.post("/generate/{schema_id}")
def generate_from_schema(schema_id: str, req: GenerateFromSchemaRequest, _=Depends(require_api_key)):
    """Generate data from a saved schema."""
    schema = schema_store.get_schema(schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Schema '{schema_id}' not found.")

    fields = [FieldDefinition(**f) for f in schema["fields"]]
    locale = req.locale or "en_US"

    data, content_type = generate_dataset(
        fields=fields,
        rows=req.rows,
        locale=locale,
        seed=req.seed,
        output_format=req.format,
    )

    if req.format == "csv":
        return Response(content=data, media_type="text/csv",
                        headers={"Content-Disposition": f"attachment; filename={schema_id}.csv"})
    return data
