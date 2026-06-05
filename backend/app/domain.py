"""Dominio del ECP: líneas de producto, conceptos y mapeos.

Fuente: notas ECP (proceso de negocio + mapa de transformación).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Linea:
    codigo: str          # TRA, GAB, ...
    nombre: str          # Transparente, Gabacha, ...
    grupo_productos: str  # texto en VOL!'Seg trabajos'.'Grupo de productos'


# 7 líneas/familias del centro de costo CM + TOTAL consolidado.
LINEAS: list[Linea] = [
    Linea("TRA", "Transparente", "PT CM TRANSPARENTE"),
    Linea("GAB", "Gabacha", "PT CM GABACHA"),
    Linea("BAS", "Basuras", "PT CM BASURA"),
    Linea("TEL", "Tela lluvia", "PT CM TELA"),
    Linea("MIS", "Misceláneos", "PT CM MISCELANEOS"),
    Linea("POL", "Poliducto", "PT CM POLIDUCTO"),
    Linea("ROLL", "Rollos precortados", "PT CM ROLLO"),
]
LINEA_TOTAL = "TOTAL"
CODIGOS_LINEA = [l.codigo for l in LINEAS]
TODAS_LINEAS = CODIGOS_LINEA + [LINEA_TOTAL]

LINEA_POR_CODIGO = {l.codigo: l for l in LINEAS}


def linea_desde_grupo(grupo: str | None) -> str | None:
    """Mapea 'PT CM GABACHA' -> 'GAB' por palabra clave (robusto a variaciones)."""
    if not grupo:
        return None
    g = str(grupo).upper()
    for l in LINEAS:
        clave = l.grupo_productos.replace("PT CM ", "").strip()
        if clave in g:
            return l.codigo
    return None


def linea_desde_codigo_ecp(a3: str | None) -> str | None:
    """Mapea el A3 del reporte ('PT-CM-TRA' / 'CM-TOTAL') -> código de línea."""
    if not a3:
        return None
    s = str(a3).upper().replace(" ", "")
    if "TOTAL" in s:
        return LINEA_TOTAL
    for cod in CODIGOS_LINEA:
        if s.endswith("-" + cod) or s.endswith("CM" + cod) or s.endswith(cod):
            return cod
    return None


# ---- Conceptos del ECP (renglones base de la hoja 1-ECP MES) ----
# Conceptos monetarios base (en miles de USD) + volumen (kgs-Mil).
CONCEPTOS_BASE = [
    "volumen",     # R6   kgs-Mil
    "mp",          # R13  Costo MP
    "ee",          # R14  Energía Eléctrica
    "cif_var",     # R15  CIF Variable
    "mod",         # R20  MOD
    "cif_fijo",    # R21  Costo CIF Fijo
    "deprec",      # R22  Depreciación
    "moi_454",     # R40  MOI 454
    "cif_454",     # R41  CIF 454
    "deprec_454",  # R42  Depreciación 454
    "unit_454",    # R46  Costo Unitario Gasto 454 (prorrateo distinto -> se guarda)
]

# Mapeo fila de '1-ECP MES' -> concepto base, para el extractor de referencia.
FILA_A_CONCEPTO = {
    6: "volumen",
    13: "mp",
    14: "ee",
    15: "cif_var",
    20: "mod",
    21: "cif_fijo",
    22: "deprec",
    40: "moi_454",
    41: "cif_454",
    42: "deprec_454",
    46: "unit_454",
}

ESCENARIO_REAL = "REAL"
ESCENARIO_PPTO = "PPTO"

# Rubros contables (mayor) -> elemento de costo (para ingesta de Conta).
RUBRO_MOD = "502"   # Mano de obra directa
RUBRO_MOI = "503"   # Mano de obra indirecta (entra al Gasto 454)
RUBRO_CIF = "505"   # Costos indirectos de fabricación

# Etiquetas legibles para UI / export.
ETIQUETA_CONCEPTO = {
    "volumen": "Volumen Mes Producción (kgs-Mil)",
    "mp": "Costo MP",
    "ee": "Energía Eléctrica",
    "cif_var": "CIF Variable",
    "mod": "MOD",
    "cif_fijo": "Costo CIF Fijo",
    "deprec": "Depreciación",
    "moi_454": "MOI 454",
    "cif_454": "CIF 454",
    "deprec_454": "Depreciación 454",
    "unit_454": "Costo Unitario Gasto 454",
}
