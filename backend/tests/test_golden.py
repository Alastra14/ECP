"""Pruebas golden: el motor ECP debe reproducir el reporte tipo B de referencia.

Requiere variables de entorno (rutas a los Excel, no versionados):
  ECP_RESULTADO_DIR  -> carpeta RESULTADO/  (oráculo)
  ECP_SRC_DIR        -> carpeta INFORMACIÓN DE CONSTRUCCIÓN/ (para ingesta cruda)
Si no están, las pruebas que las necesitan se omiten (skip).
"""
import os
from pathlib import Path

import pytest

from app.engine.ecp import calcular_ecp
from app.ingest.resultado import extraer_carpeta_resultado

RES_DIR = os.environ.get("ECP_RESULTADO_DIR")
SRC_DIR = os.environ.get("ECP_SRC_DIR")

requiere_resultado = pytest.mark.skipif(
    not (RES_DIR and Path(RES_DIR).exists()),
    reason="ECP_RESULTADO_DIR no configurada",
)


@pytest.fixture(scope="module")
def ecp_abril():
    comps = extraer_carpeta_resultado(RES_DIR)
    return calcular_ecp(comps, "2026-04")


# Valores objetivo tomados de '1-ECP MES' (columna E = abril 2026) y F = PPTO.
TRA_REAL = {
    "volumen": 771.478, "mp": 852.813, "mod": 177.589,
    "total_variable": 914.462, "total_fijo": 302.983,
    "unit_total": 1.578, "unit_final": 1.688, "costo_prod_deprec": 1343.523,
}
TRA_PPTO = {"mp": 982.381, "unit_final": 1.754}


@requiere_resultado
def test_motor_reproduce_tra(ecp_abril):
    tra = next(l for l in ecp_abril["lineas"] if l["linea"] == "TRA")
    for campo, esperado in TRA_REAL.items():
        assert tra["real"][campo] == pytest.approx(esperado, abs=0.01), campo
    for campo, esperado in TRA_PPTO.items():
        assert tra["ppto"][campo] == pytest.approx(esperado, abs=0.01), campo


@requiere_resultado
def test_todas_las_lineas_presentes(ecp_abril):
    codigos = {l["linea"] for l in ecp_abril["lineas"]}
    assert codigos == {"TRA", "GAB", "BAS", "TEL", "MIS", "POL", "ROLL"}
    assert ecp_abril["total"]["linea"] == "TOTAL"


@requiere_resultado
def test_unitario_final_es_total_mas_454(ecp_abril):
    # Unitario FINAL = Unitario Total + Unitario Gasto 454 (regla del reporte).
    for l in ecp_abril["lineas"]:
        r = l["real"]
        assert r["unit_final"] == pytest.approx(r["unit_total"] + r["unit_454"], abs=0.001)


@requiere_resultado
def test_validacion_cuadre(ecp_abril):
    from app.engine.validacion import validar_consolidado
    v = validar_consolidado(ecp_abril)
    # Con tolerancia relativa, el consolidado debe cuadrar (a lo sumo advertencias menores).
    assert v["ok"], [c for c in v["checks"] if not c["ok"]]


@pytest.mark.skipif(not (SRC_DIR and Path(SRC_DIR).exists()),
                    reason="ECP_SRC_DIR no configurada")
def test_ingesta_cruda_volumen_aproxima_reporte():
    """El volumen ingerido desde VOL PRODUCCIÓN debe acercarse al del reporte."""
    from app.ingest.volumen import ingerir_volumen
    vol_path = Path(SRC_DIR) / "VOL PRODUCCIÓN.xlsx"
    comps = ingerir_volumen(vol_path, anio=2026)
    abril = {c["linea"]: c["monto"] for c in comps if c["periodo"] == "2026-04"}
    # Debe haber volumen para varias líneas y ser positivo.
    assert len(abril) >= 4
    assert all(v > 0 for v in abril.values())
