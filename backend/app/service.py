"""Servicios de aplicación: persistencia de componentes, seed y consultas."""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select, delete, distinct
from sqlalchemy.orm import Session

from .db.models import Componente, Carga
from .engine.ecp import calcular_ecp
from .engine.validacion import validar_consolidado
from .ingest.resultado import extraer_carpeta_resultado
from .config import settings


def guardar_componentes(db: Session, comps: list[dict], origen: str) -> int:
    """Upsert de componentes (clave periodo+linea+concepto+escenario)."""
    n = 0
    for c in comps:
        existente = db.execute(
            select(Componente).where(
                Componente.periodo == c["periodo"],
                Componente.linea == c["linea"],
                Componente.concepto == c["concepto"],
                Componente.escenario == c["escenario"],
            )
        ).scalar_one_or_none()
        if existente:
            existente.monto = c["monto"]
            existente.origen = origen
        else:
            db.add(Componente(
                periodo=c["periodo"], linea=c["linea"], concepto=c["concepto"],
                escenario=c["escenario"], monto=c["monto"], origen=origen,
            ))
        n += 1
    db.commit()
    return n


def cargar_seed(db: Session) -> dict:
    """Carga datos de referencia desde la carpeta RESULTADO/ (si está configurada)."""
    if not settings.resultado_dir or not Path(settings.resultado_dir).exists():
        return {"ok": False, "motivo": "ECP_RESULTADO_DIR no configurada o inexistente",
                "componentes": 0}
    comps = extraer_carpeta_resultado(settings.resultado_dir)
    n = guardar_componentes(db, comps, origen="seed")
    periodos = sorted({c["periodo"] for c in comps})
    db.add(Carga(periodo=settings.periodo_activo, origen="seed", estado="ok",
                 detalle=f"{n} componentes, periodos {periodos}"))
    db.commit()
    return {"ok": True, "componentes": n, "periodos": periodos}


def periodos_disponibles(db: Session) -> list[str]:
    rows = db.execute(select(distinct(Componente.periodo)).order_by(Componente.periodo)).scalars().all()
    return list(rows)


def componentes_periodo(db: Session, periodo: str) -> list[dict]:
    rows = db.execute(select(Componente).where(Componente.periodo == periodo)).scalars().all()
    return [{"linea": r.linea, "concepto": r.concepto, "escenario": r.escenario,
             "monto": r.monto} for r in rows]


def ecp_periodo(db: Session, periodo: str) -> dict:
    comps = componentes_periodo(db, periodo)
    ecp = calcular_ecp(comps, periodo)
    ecp["validacion"] = validar_consolidado(ecp)
    return ecp


def serie_temporal(db: Session) -> dict:
    """Serie por periodo del consolidado (para tendencias): unitario, volumen, costos."""
    puntos = []
    for p in periodos_disponibles(db):
        ecp = ecp_periodo(db, p)
        tr = ecp["total"]["real"]
        tp = ecp["total"]["ppto"]
        cif_r = tr.get("cif_var", 0) + tr.get("cif_fijo", 0) + tr.get("deprec", 0)
        tiene_ppto = any(tp.get(k, 0) for k in ("mp", "mod", "volumen"))
        puntos.append({
            "periodo": p,
            "real": {
                "unit_final": round(tr.get("unit_final", 0), 3),
                "volumen": round(tr.get("volumen", 0), 1),
                "mp": round(tr.get("mp", 0), 1),
                "mod": round(tr.get("mod", 0), 1),
                "cif": round(cif_r, 1),
                "costo": round(tr.get("costo_prod_deprec", 0), 1),
            },
            "ppto_unit_final": round(tp.get("unit_final", 0), 3) if tiene_ppto else None,
        })
    return {"puntos": puntos}


def flujo_periodo(db: Session, periodo: str) -> dict:
    """Datos para la visualización del flujo (6 etapas) con números reales."""
    ecp = ecp_periodo(db, periodo)
    t = ecp["total"]["real"]
    cif_total = t.get("cif_var", 0.0) + t.get("cif_fijo", 0.0) + t.get("deprec", 0.0)
    etapas = [
        {"n": 1, "carril": "piso", "titulo": "Emisión de materiales",
         "desc": "Entrega de materiales a la orden de trabajo desde bodega; el ERP valoriza el consumo.",
         "salida": "Costo de Materia Prima", "concepto": "mp",
         "valor": round(t.get("mp", 0.0), 1), "unidad": "$ Mil"},
        {"n": 2, "carril": "piso", "titulo": "Reporte de mano de obra",
         "desc": "Tiempos por etapa valorados con tarifas productivas → costos aplicados.",
         "salida": "Aplicados (NO entran al ECP)", "concepto": None,
         "valor": None, "unidad": "", "nota": "El ECP usa el MOD/CIF real contable, no los aplicados."},
        {"n": 3, "carril": "piso", "titulo": "Recibo de producción terminada",
         "desc": "Entregas parciales a bodega de producto terminado.",
         "salida": "Volumen de producción", "concepto": "volumen",
         "valor": round(t.get("volumen", 0.0), 1), "unidad": "kgs-Mil"},
        {"n": 4, "carril": "piso", "titulo": "Revisión y cierre de OT",
         "desc": "Solo las OT cerradas en el mes entran al ECP. 5 criterios de cierre.",
         "salida": "OT cerradas del mes", "concepto": None, "valor": None, "unidad": "",
         "criterios": ["Sin faltante de consumo de MP", "Sin faltante de tiempos",
                        "Producción entregada completa", "Balance de masas razonable",
                        "Costo unitario razonable vs estándar"]},
        {"n": 5, "carril": "contabilidad", "titulo": "Registro contable MOD",
         "desc": "Gasto de personal del mes (sueldos, prestaciones, cargas) — rubro 502.",
         "salida": "Mano de Obra Directa", "concepto": "mod",
         "valor": round(t.get("mod", 0.0), 1), "unidad": "$ Mil"},
        {"n": 6, "carril": "contabilidad", "titulo": "Registro contable CIF",
         "desc": "Costos de planta del mes (energía, mantto, depreciación, servicios) — rubro 505.",
         "salida": "Costos Indirectos de Fabricación", "concepto": "cif",
         "valor": round(cif_total, 1), "unidad": "$ Mil"},
    ]
    return {
        "periodo": periodo,
        "etapas": etapas,
        "consolidado": {
            "volumen": round(t.get("volumen", 0.0), 1),
            "costo_total": round(t.get("costo_prod_deprec", 0.0), 1),
            "unit_final": round(t.get("unit_final", 0.0), 3),
            "mp": round(t.get("mp", 0.0), 1),
            "mod": round(t.get("mod", 0.0), 1),
            "cif": round(cif_total, 1),
        },
        "validacion_ok": ecp["validacion"]["ok"],
    }
