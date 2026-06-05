"""Endpoints de la API ECP."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db.session import get_session
from ..db.models import Carga
from ..config import settings
from .. import service
from ..ingest.crudo import ingerir_archivos
from ..export import ecp_a_excel

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok", "periodo_activo": settings.periodo_activo}


@router.post("/seed")
def seed(db: Session = Depends(get_session)):
    return service.cargar_seed(db)


@router.get("/periodos")
def periodos(db: Session = Depends(get_session)):
    return {"periodos": service.periodos_disponibles(db), "activo": settings.periodo_activo}


@router.get("/ecp/{periodo}")
def ecp(periodo: str, db: Session = Depends(get_session)):
    data = service.ecp_periodo(db, periodo)
    if not data["lineas"]:
        raise HTTPException(404, f"Sin datos para el periodo {periodo}")
    return data


@router.get("/flujo/{periodo}")
def flujo(periodo: str, db: Session = Depends(get_session)):
    return service.flujo_periodo(db, periodo)


@router.get("/validacion/{periodo}")
def validacion(periodo: str, db: Session = Depends(get_session)):
    return service.ecp_periodo(db, periodo)["validacion"]


@router.post("/upload")
async def upload(files: list[UploadFile] = File(...), db: Session = Depends(get_session)):
    """Sube archivos fuente, ejecuta ingesta cruda (volumen + MP) y registra la carga."""
    from ..config import UPLOAD_DIR
    rutas = []
    for f in files:
        ruta = UPLOAD_DIR / f.filename
        ruta.write_bytes(await f.read())
        rutas.append(ruta)

    resultado = ingerir_archivos(rutas, settings.anio_activo)
    n = service.guardar_componentes(db, resultado["componentes"], origen="upload")

    estado = "ok" if not resultado["faltantes"] else "parcial"
    db.add(Carga(periodo=settings.periodo_activo, origen="upload", estado=estado,
                 detalle=f"{n} componentes; faltantes={resultado['faltantes']}"))
    db.commit()

    return {
        "guardados": n,
        "detalle": resultado["detalle"],
        "faltantes": resultado["faltantes"],
        "periodos_afectados": sorted({c["periodo"] for c in resultado["componentes"]}),
    }


@router.get("/export/{periodo}")
def export(periodo: str, db: Session = Depends(get_session)):
    data = service.ecp_periodo(db, periodo)
    if not data["lineas"]:
        raise HTTPException(404, f"Sin datos para el periodo {periodo}")
    contenido = ecp_a_excel(data)
    nombre = f"ECP_{periodo}.xlsx"
    return StreamingResponse(
        iter([contenido]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
