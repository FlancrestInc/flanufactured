"""
auth.py — API key authentication dependency for FastAPI.

The active key is read dynamically on every request via get_active_api_key()
(imported from routers.settings), so a key rolled through the Settings UI takes
effect immediately without a container restart.

Usage:
    @router.get("/protected", dependencies=[Depends(require_api_key)])
    def my_endpoint(): ...
"""
from fastapi import Header, HTTPException, status


async def require_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    # Import here to get the live value (may be updated at runtime by key-roll)
    from routers.settings import get_active_api_key
    active = get_active_api_key()
    if x_api_key != active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key"
        )
