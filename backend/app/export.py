"""Exportación del ECP a Excel (formato tabular por línea)."""
from __future__ import annotations

import io

import xlsxwriter

from .domain import TODAS_LINEAS, ETIQUETA_CONCEPTO

_FILAS = [
    ("volumen", "Volumen (kgs-Mil)"),
    ("mp", "Costo MP"),
    ("ee", "Energía Eléctrica"),
    ("cif_var", "CIF Variable"),
    ("total_variable", "TOTAL COSTO VARIABLE"),
    ("mod", "MOD"),
    ("cif_fijo", "CIF Fijo"),
    ("deprec", "Depreciación"),
    ("total_fijo", "TOTAL COSTO FIJO"),
    ("total_454", "TOTAL GASTO 454"),
    ("costo_prod_deprec", "Costo Producción + Depreciación"),
    ("unit_total", "Costo Unitario Total"),
    ("unit_final", "Costo Unitario FINAL"),
]


def ecp_a_excel(ecp: dict) -> bytes:
    buf = io.BytesIO()
    wb = xlsxwriter.Workbook(buf, {"in_memory": True})
    indigo = "#1D0447"
    h = wb.add_format({"bold": True, "font_color": "white", "bg_color": indigo, "border": 1})
    lbl = wb.add_format({"bold": True, "border": 1})
    num = wb.add_format({"num_format": "#,##0.000", "border": 1})

    todas = ecp["lineas"] + [ecp["total"]]
    for col_block, esc in enumerate(["real", "ppto"]):
        ws = wb.add_worksheet(("Real" if esc == "real" else "Presupuesto"))
        ws.write(0, 0, f"ECP {ecp['periodo']} — {'Real' if esc=='real' else 'PPTO'}", lbl)
        ws.write(1, 0, "Concepto", h)
        for j, l in enumerate(todas):
            ws.write(1, j + 1, l["linea"], h)
        for i, (campo, etiqueta) in enumerate(_FILAS):
            ws.write(i + 2, 0, etiqueta, lbl)
            for j, l in enumerate(todas):
                ws.write(i + 2, j + 1, round(l[esc].get(campo, 0.0), 3), num)
        ws.set_column(0, 0, 32)
        ws.set_column(1, len(todas), 12)
    wb.close()
    return buf.getvalue()
