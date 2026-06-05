"""Configuración del backend ECP.

Todo lo que en los Excel está hard-codeado (mes activo, rutas) aquí es
parametrizable — uno de los riesgos documentados del proceso manual.
"""
from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Carpeta de datos del proyecto (uploads y base sqlite viven aquí).
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ECP_", env_file=".env", extra="ignore")

    # Base de datos: SQLite local por defecto (cero configuración).
    # Portable a Postgres cambiando esta URL (fase de endurecimiento).
    database_url: str = f"sqlite:///{DATA_DIR / 'ecp.db'}"

    # Periodo "activo" (mes de cierre vigente). Parametrizable, NO hard-coded.
    anio_activo: int = 2026
    mes_activo: int = 4  # abril 2026

    # Ruta opcional a la carpeta de RESULTADO/ para sembrar datos de referencia
    # (oráculo). Si existe, /seed la usa. En despliegue real no se necesita.
    resultado_dir: str | None = os.environ.get("ECP_RESULTADO_DIR")

    @property
    def periodo_activo(self) -> str:
        return f"{self.anio_activo:04d}-{self.mes_activo:02d}"


settings = Settings()

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
