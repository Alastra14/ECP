"""Orquestador de ingesta cruda desde los archivos fuente subidos.

MVP: ingiere los 2 elementos que nacen en el piso (órdenes de trabajo):
  - VOLUMEN  (VOL PRODUCCIÓN.xlsx)
  - COSTO MP (Copia ... MP.xlsx, hoja 'real')

Los 2 elementos contables (MOD, CIF) provienen del cierre contable; su ingesta
directa desde el mayor (MOD Y CIF REAL.xlsx → Conta) se aborda en la fase de
endurecimiento (ver PRD: requiere replicar clasificación 454/fijo-variable y
filtrado por CECO con catálogos). Aquí se reconoce el archivo y se registra.
"""
from __future__ import annotations

import re
from pathlib import Path

from .volumen import ingerir_volumen
from .materia_prima import ingerir_mp

# Reconocimiento de cada archivo fuente por patrón de nombre.
PATRONES = {
    "volumen": re.compile(r"vol.*produc", re.I),
    "mp": re.compile(r"analsis|analisis|varia.*mp|mp\.xlsx", re.I),
    "conta": re.compile(r"mod.*y.*cif.*real", re.I),
    "cif_ppto": re.compile(r"cif.*ppto", re.I),
    "mod_ppto": re.compile(r"mod.*ppto", re.I),
    "personas": re.compile(r"personas", re.I),
}


def clasificar_archivo(nombre: str) -> str | None:
    for clave, rx in PATRONES.items():
        if rx.search(nombre):
            return clave
    return None


def ingerir_archivos(rutas: list[str | Path], anio: int | None = None) -> dict:
    """Procesa una lista de archivos subidos. Devuelve componentes + reporte de ingesta."""
    componentes: list[dict] = []
    detalle: list[dict] = []
    reconocidos: set[str] = set()

    for ruta in rutas:
        ruta = Path(ruta)
        clave = clasificar_archivo(ruta.name)
        item = {"archivo": ruta.name, "tipo": clave or "desconocido", "filas": 0, "estado": "ok"}
        try:
            if clave == "volumen":
                comps = ingerir_volumen(ruta, anio)
                componentes += comps
                item["filas"] = len(comps)
            elif clave == "mp":
                comps = ingerir_mp(ruta, anio)
                componentes += comps
                item["filas"] = len(comps)
            elif clave in ("conta", "cif_ppto", "mod_ppto", "personas"):
                item["estado"] = "reconocido"
                item["nota"] = "Cierre contable / presupuesto — consolidado en fase de endurecimiento (ver PRD)."
            else:
                item["estado"] = "ignorado"
            if clave:
                reconocidos.add(clave)
        except Exception as e:  # noqa: BLE001
            item["estado"] = "error"
            item["nota"] = str(e)[:300]
        detalle.append(item)

    faltantes = [k for k in PATRONES if k not in reconocidos]
    return {"componentes": componentes, "detalle": detalle, "faltantes": faltantes}
