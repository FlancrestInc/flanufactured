"""
main.py — FastAPI application entry point.

Registers all three routers (generate, schemas, settings), configures CORS for
local development, and serves the compiled React SPA for any non-API path.

In production (Docker), the frontend is pre-built and served from ./frontend/dist.
In development, run the Vite dev server separately (it proxies /api to this process).
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import generate, schemas, settings

app = FastAPI(
    title="Flanufactured",
    description="Fake data generation API & UI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router)
app.include_router(schemas.router)
app.include_router(settings.router)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "version": "1.0.0"}


frontend_dist = "/app/frontend/dist"
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=f"{frontend_dist}/assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(f"{frontend_dist}/index.html")
