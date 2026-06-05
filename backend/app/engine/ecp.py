"""Motor de cálculo del ECP.

Entrada: componentes base por periodo × línea × concepto × escenario.
Salida: la estructura del reporte 1-ECP MES (totales, costos unitarios y
variaciones Real vs PPTO), idéntica para cualquier origen de los componentes
(ingesta cruda o extractor de referencia).

Fórmulas (del mapa de transformación):
    Costo Variable = MP + Energía Eléctrica + CIF Variable
    Costo Fijo     = MOD + CIF Fijo + Depreciación
    Gasto 454      = MOI 454 + CIF 454 + Depreciación 454
    Costo Prod.+Dep= Variable + Fijo + Gasto 454
    Unitario X     = X / Volumen
    Unitario Total = (Fijo + Variable) / Volumen
    Unitario FINAL = Unitario Total + Unitario Gasto 454
    VAR = Real - PPTO ;  % = (Real/PPTO) - 1   (volumen: 1 - (Real/PPTO))
"""
from __future__ import annotations

from typing import Iterable

from ..domain import (
    CODIGOS_LINEA, LINEA_TOTAL, ETIQUETA_CONCEPTO,
    ESCENARIO_REAL, ESCENARIO_PPTO, LINEA_POR_CODIGO,
)


def _u(monto: float, volumen: float) -> float:
    """Costo unitario seguro ante volumen 0."""
    return monto / volumen if volumen else 0.0


def _derivar(base: dict[str, float]) -> dict[str, float]:
    """Calcula totales y unitarios de un escenario a partir de los conceptos base."""
    vol = base.get("volumen", 0.0)
    mp = base.get("mp", 0.0)
    ee = base.get("ee", 0.0)
    cif_var = base.get("cif_var", 0.0)
    mod = base.get("mod", 0.0)
    cif_fijo = base.get("cif_fijo", 0.0)
    deprec = base.get("deprec", 0.0)
    moi454 = base.get("moi_454", 0.0)
    cif454 = base.get("cif_454", 0.0)
    dep454 = base.get("deprec_454", 0.0)

    total_variable = mp + ee + cif_var
    total_fijo = mod + cif_fijo + deprec
    total_454 = moi454 + cif454 + dep454
    costo_prod_deprec = total_variable + total_fijo + total_454

    unit_total = _u(total_variable + total_fijo, vol)
    # El unitario del Gasto 454 se prorratea sobre una base distinta a la línea;
    # si viene del extractor se respeta, si no, se aproxima con el volumen propio.
    unit_454 = base.get("unit_454") if base.get("unit_454") is not None else _u(total_454, vol)
    unit_final = unit_total + unit_454

    return {
        "volumen": vol,
        "mp": mp, "ee": ee, "cif_var": cif_var,
        "total_variable": total_variable,
        "mod": mod, "cif_fijo": cif_fijo, "deprec": deprec,
        "total_fijo": total_fijo,
        "moi_454": moi454, "cif_454": cif454, "deprec_454": dep454,
        "total_454": total_454,
        "costo_prod_deprec": costo_prod_deprec,
        # unitarios
        "unit_mp": _u(mp, vol), "unit_ee": _u(ee, vol), "unit_cif_var": _u(cif_var, vol),
        "unit_variable": _u(total_variable, vol),
        "unit_mod": _u(mod, vol), "unit_cif_fijo": _u(cif_fijo, vol), "unit_deprec": _u(deprec, vol),
        "unit_fijo": _u(total_fijo, vol),
        "unit_total": unit_total,
        "unit_454": unit_454,
        "unit_final": unit_final,
    }


def _var_pct(real: dict, ppto: dict, campos: Iterable[str]) -> tuple[dict, dict]:
    var, pct = {}, {}
    for c in campos:
        r, p = real.get(c, 0.0), ppto.get(c, 0.0)
        var[c] = r - p
        if c == "volumen":
            pct[c] = (1 - (r / p)) if p else 0.0
        else:
            pct[c] = ((r / p) - 1) if p else 0.0
    return var, pct


# Campos sobre los que se reporta VAR y %.
_CAMPOS_VAR = [
    "volumen", "costo_prod_deprec", "unit_final",
    "total_variable", "mp", "ee", "cif_var",
    "total_fijo", "mod", "cif_fijo", "deprec",
    "total_454", "moi_454", "cif_454", "deprec_454",
    "unit_total", "unit_variable", "unit_fijo", "unit_454",
]


def calcular_linea(linea: str, base_real: dict, base_ppto: dict) -> dict:
    real = _derivar(base_real)
    ppto = _derivar(base_ppto)
    var, pct = _var_pct(real, ppto, _CAMPOS_VAR)
    nombre = LINEA_POR_CODIGO[linea].nombre if linea in LINEA_POR_CODIGO else "Consolidado"
    return {"linea": linea, "nombre": nombre, "real": real, "ppto": ppto, "var": var, "pct": pct}


def _bases_por_linea(componentes: list[dict]) -> dict[str, dict[str, dict[str, float]]]:
    """Indexa componentes -> {linea: {escenario: {concepto: monto}}}."""
    out: dict[str, dict[str, dict[str, float]]] = {}
    for c in componentes:
        out.setdefault(c["linea"], {ESCENARIO_REAL: {}, ESCENARIO_PPTO: {}})
        out[c["linea"]].setdefault(c["escenario"], {})[c["concepto"]] = c["monto"]
    return out


def calcular_ecp(componentes: list[dict], periodo: str) -> dict:
    """Calcula el ECP completo (todas las líneas + consolidado) para un periodo.

    `componentes`: lista de dicts {linea, concepto, escenario, monto} del periodo.
    """
    idx = _bases_por_linea(componentes)
    lineas_out = []
    for cod in CODIGOS_LINEA:
        if cod in idx:
            lineas_out.append(calcular_linea(
                cod, idx[cod].get(ESCENARIO_REAL, {}), idx[cod].get(ESCENARIO_PPTO, {})))

    # Consolidado: usar TOTAL si vino explícito; si no, sumar las 7 líneas.
    if LINEA_TOTAL in idx:
        total = calcular_linea(LINEA_TOTAL, idx[LINEA_TOTAL].get(ESCENARIO_REAL, {}),
                               idx[LINEA_TOTAL].get(ESCENARIO_PPTO, {}))
    else:
        total = _consolidar(lineas_out)

    return {
        "periodo": periodo,
        "etiquetas": ETIQUETA_CONCEPTO,
        "lineas": lineas_out,
        "total": total,
    }


def _consolidar(lineas_out: list[dict]) -> dict:
    """Suma de líneas para el consolidado (cuando no hay TOTAL explícito)."""
    suma_real: dict[str, float] = {}
    suma_ppto: dict[str, float] = {}
    sumables = ["volumen", "mp", "ee", "cif_var", "mod", "cif_fijo", "deprec",
                "moi_454", "cif_454", "deprec_454"]
    for l in lineas_out:
        for c in sumables:
            suma_real[c] = suma_real.get(c, 0.0) + l["real"].get(c, 0.0)
            suma_ppto[c] = suma_ppto.get(c, 0.0) + l["ppto"].get(c, 0.0)
    return calcular_linea(LINEA_TOTAL, suma_real, suma_ppto)
