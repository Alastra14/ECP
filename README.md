# App ECP — Estado de Costo de Producción

Automatiza el **ECP** de Termoencogibles (Ternova Packaging): a partir de los Excel
del ERP calcula el costo total y **unitario ($/kg)** por familia de producto, y lo
muestra junto a una **visualización de clase mundial del flujo** del proceso.

> MVP local. Backend Python/FastAPI + frontend Angular + SQLite. Diseño visual:
> **Ternova Design System**. Ver `PRD.md` para visión, alcance y roadmap de
> endurecimiento a Azure (PT-ARQ-004).

## Qué hace

- **Sube** los Excel fuente del mes (volumen, materia prima, mayor MOD/CIF, presupuestos).
- **Calcula** el ECP tipo B: Costo Variable (MP + EE + CIF var), Costo Fijo (MOD + CIF fijo +
  depreciación), Gasto 454, costos **unitarios** y **variaciones** Real vs Presupuesto.
- **Valida** el cuadre `TOTAL = Σ líneas`.
- **Visualiza** el flujo en 6 etapas (Piso ↔ Contabilidad → ECP) con los números reales.
- **Exporta** el reporte a Excel.

## Cómo correr (local)

### Opción A — Docker (recomendada, un comando)
```bash
docker compose up --build
# abrir http://localhost:8000
```

### Opción B — Script de arranque
```bash
./start.sh          # macOS/Linux  (usa Docker si está; si no, modo nativo)
start.bat           # Windows
```

### Opción C — Nativo (desarrollo)
```bash
# Backend
python3.12 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend && npm install && npm start   # http://localhost:4200 (proxy a la API)
```

### Datos de referencia (opcional)
Para sembrar automáticamente los datos exactos de abril 2026 (demo y oráculo de
pruebas), apunta a la carpeta `RESULTADO/`:
```bash
export ECP_RESULTADO_DIR="/ruta/a/contruccion ecp/RESULTADO"
```
Si no se configura, la app arranca vacía y se llena al subir archivos.

## Uso

1. Abre la app → pestaña **Cargar**: arrastra los 6 Excel del mes y súbelos.
2. **Flujo**: recorre las 6 etapas del proceso con los números reales del periodo.
3. **Reporte ECP**: consolidado + 7 líneas, Real vs Presupuesto, costo unitario y
   variaciones; revisa los **cuadres** de validación; **exporta** a Excel.

## Arquitectura

```
backend/   FastAPI + SQLAlchemy (SQLite)
  app/ingest/    parsers de los Excel fuente (valores, no fórmulas)
  app/engine/    motor de cálculo ECP + validaciones (las fórmulas)
  app/api/       endpoints REST (/api/...)
frontend/  Angular (standalone) con el Ternova Design System
design-system/  tokens, fuentes (Gosha Sans, Space Grotesk) y assets de marca
PRD.md     documento de producto (alcance, contratos de datos, roadmap)
```

### Motor de cálculo
Opera sobre una capa de *componentes por línea × mes × escenario* que se puebla por:
- **Ingesta cruda** de los elementos de piso: **Volumen** (VOL PRODUCCIÓN) y
  **Costo MP** (análisis de variación de MP).
- **Cierre contable** de MOD y CIF. En el MVP estos provienen de los datos de
  referencia; su ingesta directa desde el mayor (`MOD Y CIF REAL → Conta`, con
  clasificación 454/fijo-variable y filtrado por CECO) se aborda en la fase de
  endurecimiento (ver PRD, RNF y Waiver `EXC-ECP-2026-01`).

El motor (totales, unitarios, variaciones) es idéntico sin importar el origen.

## Pruebas

```bash
cd backend
ECP_RESULTADO_DIR="/ruta/RESULTADO" ECP_SRC_DIR="/ruta/INFORMACIÓN DE CONSTRUCCIÓN" \
  .venv/bin/pytest -q
```
Las pruebas *golden* verifican que el motor reproduce el reporte tipo B de
referencia (volumen, MP, MOD, costo unitario total y final por línea) y que el
consolidado cuadra.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET  | `/api/health` | Estado y periodo activo |
| POST | `/api/seed` | Sembrar datos de referencia (si `ECP_RESULTADO_DIR`) |
| GET  | `/api/periodos` | Periodos disponibles |
| GET  | `/api/ecp/{periodo}` | Reporte ECP completo del periodo |
| GET  | `/api/flujo/{periodo}` | Datos de la visualización del flujo |
| GET  | `/api/validacion/{periodo}` | Cuadres de consistencia |
| POST | `/api/upload` | Subir Excel fuente e ingerir |
| GET  | `/api/export/{periodo}` | Descargar el ECP en Excel |

---
Grupo Ternova · Termoencogibles, S.A. de C.V.
