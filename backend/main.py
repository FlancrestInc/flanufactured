"""
main.py — FastAPI application entry point.

Registers all three routers (generate, schemas, settings), configures CORS for
local development, and serves the compiled React SPA for any non-API path.

In production (Docker), the frontend is pre-built and served from ./frontend/dist.
In development, run the Vite dev server separately (it proxies /api to this process).
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import generate, schemas, settings

app = FastAPI(
    title="Flanufactured",
    description="Fake data generation API & UI",
    version="1.0.0",
    redoc_url=None,  # Disable default ReDoc (uses jsdelivr with broken MIME type)
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


@app.get("/redoc", include_in_schema=False)
def redoc():
    return HTMLResponse("""<!DOCTYPE html>
<html>
  <head>
    <title>Flanufactured — API Reference</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://unpkg.com/redoc@2.1.5/bundles/redoc.standalone.js"></script>
  </body>
</html>""")


frontend_dist = "/app/frontend/dist"
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=f"{frontend_dist}/assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(f"{frontend_dist}/index.html")
