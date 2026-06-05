"""Validaciones de cuadre del ECP (contrato de consistencia).

Regla principal: TOTAL = Σ de las 7 líneas (volumen, costo, componentes).
Replica la hoja VALIDACION de los reportes de referencia.

Severidad por diferencia:
  - ok          : dentro de tolerancia absoluta o relativa.
  - advertencia : diferencia pequeña (ruido de prorrateo, p.ej. Gasto 454).
  - error       : descuadre material que requiere revisión.
"""
from __future__ import annotations

TOL_ABS = 0.5     # miles
TOL_REL = 0.001   # 0.1%  -> dentro de esto se considera cuadrado
TOL_WARN = 0.01   # 1%    -> entre REL y WARN es advertencia; arriba es error

_CAMPOS_CUADRE = ["volumen", "costo_prod_deprec", "mp", "mod",
                  "total_variable", "total_fijo", "total_454"]


def _severidad(dif: float, total: float) -> tuple[str, bool]:
    a = abs(dif)
    rel = a / abs(total) if total else 0.0
    if a <= TOL_ABS or rel <= TOL_REL:
        return "ok", True
    if rel <= TOL_WARN:
        return "advertencia", True
    return "error", False


def validar_consolidado(ecp: dict) -> dict:
    lineas = ecp["lineas"]
    total = ecp["total"]
    checks = []
    todo_ok = True
    advertencias = 0
    for esc in ("real", "ppto"):
        for campo in _CAMPOS_CUADRE:
            suma = sum(l[esc].get(campo, 0.0) for l in lineas)
            tot = total[esc].get(campo, 0.0)
            dif = tot - suma
            sev, ok = _severidad(dif, tot)
            todo_ok = todo_ok and ok
            if sev == "advertencia":
                advertencias += 1
            checks.append({
                "escenario": esc.upper(),
                "concepto": campo,
                "total": round(tot, 3),
                "suma_lineas": round(suma, 3),
                "diferencia": round(dif, 3),
                "pct": round((dif / tot) if tot else 0.0, 5),
                "severidad": sev,
                "ok": ok,
            })
    return {"ok": todo_ok, "advertencias": advertencias,
            "tolerancia_abs": TOL_ABS, "tolerancia_rel": TOL_REL, "checks": checks}
