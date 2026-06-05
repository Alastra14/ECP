"""Punto de entrada FastAPI del backend ECP.

Sirve la API en /api y, si existe el build de Angular (frontend/dist), lo sirve
como estáticos en / (modo single-container para correr local).
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .db.session import init_db, SessionLocal
from .config import settings, PROJECT_ROOT
from .api.routes import router
from . import service

app = FastAPI(title="App ECP — Estado de Costo de Producción", version="0.1.0")

# CORS abierto en local (Angular dev server en :4200).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup():
    init_db()
    # Auto-seed de datos de referencia si la carpeta RESULTADO/ está configurada
    # y aún no hay datos cargados.
    if settings.resultado_dir:
        db = SessionLocal()
        try:
            if not service.periodos_disponibles(db):
                service.cargar_seed(db)
        finally:
            db.close()


# ---- Estáticos del frontend (si está compilado) ----
_DIST = PROJECT_ROOT / "frontend" / "dist" / "ecp-frontend" / "browser"
if not _DIST.exists():
    _DIST = PROJECT_ROOT / "frontend" / "dist"

if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(_DIST / "index.html")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # Fallback SPA: cualquier ruta no-API devuelve index.html
        candidato = _DIST / full_path
        if candidato.is_file():
            return FileResponse(candidato)
        return FileResponse(_DIST / "index.html")
