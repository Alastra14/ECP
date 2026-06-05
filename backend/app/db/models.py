"""Modelo de datos (SQLAlchemy). Diseñado portable SQLite -> Postgres.

Grano del hecho central: periodo × línea × concepto × escenario.
Todos los montos en UNIDAD DE PRESENTACIÓN del reporte (miles), para que el
extractor de referencia y la ingesta crudा hablen el mismo idioma.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Float, Integer, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Carga(Base):
    """Registro de cada ingesta (subida de archivos o seed)."""
    __tablename__ = "carga"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    periodo: Mapped[str] = mapped_column(String(7), index=True)   # 'YYYY-MM'
    origen: Mapped[str] = mapped_column(String(32))               # 'seed' | 'upload'
    estado: Mapped[str] = mapped_column(String(16))               # 'ok' | 'error' | 'parcial'
    detalle: Mapped[str] = mapped_column(String(4000), default="")
    creada: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Componente(Base):
    """Componente base del ECP por periodo × línea × concepto × escenario."""
    __tablename__ = "componente"
    __table_args__ = (
        UniqueConstraint("periodo", "linea", "concepto", "escenario",
                         name="uq_componente"),
        Index("ix_comp_periodo_linea", "periodo", "linea"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    periodo: Mapped[str] = mapped_column(String(7), index=True)   # 'YYYY-MM'
    linea: Mapped[str] = mapped_column(String(8), index=True)     # TRA, GAB, ..., TOTAL
    concepto: Mapped[str] = mapped_column(String(16))             # ver domain.CONCEPTOS_BASE
    escenario: Mapped[str] = mapped_column(String(8))            # REAL | PPTO
    monto: Mapped[float] = mapped_column(Float, default=0.0)      # miles (o kgs-Mil si volumen)
    origen: Mapped[str] = mapped_column(String(32), default="")   # seed | upload:<archivo>
