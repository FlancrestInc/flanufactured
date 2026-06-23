from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import require_api_key
from config import settings
import os, secrets, json
from datetime import datetime, timezone

router = APIRouter(prefix="/api/settings", tags=["Settings"])
CONFIG_PATH = os.path.join(settings.data_dir, ".config")


def _load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_config(data: dict):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get_active_api_key() -> str:
    cfg = _load_config()
    return cfg.get("api_key") or settings.api_key


@router.get("/key-status")
def key_status():
    """Public — returns key status, masked preview, and creation date."""
    cfg = _load_config()
    key = cfg.get("api_key") or settings.api_key
    has = bool(key and key != "changeme")
    preview = (key[:4] + "•" * max(0, len(key) - 4)) if has else ""
    created_at = cfg.get("key_created_at")  # ISO string or None
    return {
        "has_key": has,
        "key_preview": preview,
        "key_created_at": created_at,
    }


@router.get("/key-reveal", dependencies=[Depends(require_api_key)])
def reveal_key():
    key = get_active_api_key()
    return {"key": key}


@router.post("/key-roll", dependencies=[Depends(require_api_key)])
def roll_key():
    new_key = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).isoformat()
    cfg = _load_config()
    cfg["api_key"] = new_key
    cfg["key_created_at"] = now
    _save_config(cfg)
    settings.api_key = new_key
    preview = new_key[:4] + "•" * (len(new_key) - 4)
    return {"new_key": new_key, "key_preview": preview, "key_created_at": now}


class SetKeyRequest(BaseModel):
    key: str


@router.post("/key-clear", dependencies=[Depends(require_api_key)])
def clear_key():
    """Remove the stored key from .config, reverting to the API_KEY env var (or 'changeme')."""
    cfg = _load_config()
    cfg.pop("api_key", None)
    cfg.pop("key_created_at", None)
    _save_config(cfg)
    settings.api_key = os.environ.get("API_KEY", "changeme")
    return {"status": "ok", "detail": "Stored key cleared. Falling back to environment API_KEY."}


@router.post("/key-emergency-reset")
def emergency_reset():
    """
    Clear the stored key without authentication.
    Only works when the API_KEY environment variable is still the default 'changeme',
    meaning no real security has been configured. This prevents abuse on secured instances.
    """
    env_key = os.environ.get("API_KEY", "changeme")
    if env_key != "changeme":
        raise HTTPException(
            status_code=403,
            detail="Emergency reset is disabled when API_KEY env var is set. Use /key-roll with your current key instead."
        )
    cfg = _load_config()
    cfg.pop("api_key", None)
    cfg.pop("key_created_at", None)
    _save_config(cfg)
    settings.api_key = "changeme"
    return {"status": "ok", "detail": "Stored key cleared. Server is back to unconfigured state."}


@router.post("/key-set")
def set_key(req: SetKeyRequest):
    # Only block if a key is explicitly stored in .config — not if only the env var is set.
    # This allows users to set a key via the UI even when API_KEY is set in the environment.
    cfg = _load_config()
    if cfg.get("api_key"):
        raise HTTPException(status_code=403, detail="A key is already set. Use /key-roll to change it.")
    if not req.key or len(req.key) < 8:
        raise HTTPException(status_code=400, detail="Key must be at least 8 characters.")
    now = datetime.now(timezone.utc).isoformat()
    cfg = _load_config()
    cfg["api_key"] = req.key
    cfg["key_created_at"] = now
    _save_config(cfg)
    settings.api_key = req.key
    preview = req.key[:4] + "•" * (len(req.key) - 4)
    return {"status": "ok", "key_preview": preview, "key_created_at": now}
