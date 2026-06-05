# PRD — App ECP (Estado de Costo de Producción)

**Producto:** App ECP — Automatización del Estado de Costo de Producción
**Unidad de negocio:** Termoencogibles, S.A. de C.V. — Ternova Packaging (empaque flexible, El Salvador, USD)
**Documento:** Product Requirements Document (PRD) — versión 1.0
**Fecha:** 2026-06-05
**Autor:** Product Management Técnico, Grupo Ternova
**Estado:** Aprobado para MVP
**Patrocinador / SME del proceso:** Raúl Stanley Fuentes Chacón (Costos / Controlling)
**Referencias normativas:** PT-ARQ-004 (Arquitectura Tecnológica), POL-TIC-001/POL-TIC-003 (Requerimientos TI y Seguridad), TE-005 (Gobernanza IA), PL-TIC-001 / MA-TI-002 (Continuidad y Respaldo)

---

## Tabla de contenido

1. [Resumen ejecutivo y visión](#1-resumen-ejecutivo-y-visión)
2. [Problema y oportunidad](#2-problema-y-oportunidad)
3. [Usuarios, personas y casos de uso](#3-usuarios-personas-y-casos-de-uso)
4. [Alcance](#4-alcance)
5. [Requisitos funcionales](#5-requisitos-funcionales-rf)
6. [Contratos de datos por archivo fuente](#6-contratos-de-datos-por-archivo-fuente)
7. [Requisitos no funcionales](#7-requisitos-no-funcionales-rnf)
8. [Arquitectura del MVP y divergencia (Waiver + roadmap)](#8-arquitectura-del-mvp-y-divergencia)
9. [Métricas de éxito / KPIs](#9-métricas-de-éxito--kpis)
10. [Roadmap por fases y riesgos del proyecto](#10-roadmap-por-fases-y-riesgos-del-proyecto)

---

## 1. Resumen ejecutivo y visión

El **Estado de Costo de Producción (ECP)** es el reporte **mensual** que determina el costo **total** y **unitario ($/kg)** de producir cada familia de producto de Termoencogibles, al cierre de mes y considerando **únicamente las órdenes de trabajo (OT) cerradas en el mes**. Es el insumo central para la toma de decisiones de costos, precios y rentabilidad de la planta de empaque flexible.

Hoy el ECP se prepara **manualmente en Excel**: se consolidan **6 archivos fuente** del ERP en una **plantilla de 22 hojas** con fórmulas frágiles (rangos de filas fijos, parseo posicional de cuentas contables, un libro externo roto, el mes activo "hard-codeado"). El proceso es lento, dependiente de una sola persona, difícil de auditar y propenso a errores de cuadre.

**Visión.** Una aplicación que reciba los 6 archivos fuente de un mes, **ingiera y valide** los datos, **calcule** el ECP tipo B (por línea + consolidado) con un motor de cálculo trazable, y entregue dos experiencias de clase mundial: (1) una **visualización del flujo** de negocio (Piso ↔ Contabilidad → ECP) que cualquier ejecutivo entienda, y (2) un **reporte ECP navegable** con variaciones Real vs Presupuesto y costo unitario destacado, exportable a Excel/PDF.

**Decisión de producto (MVP).** Aplicación **local** que corre en las computadoras del equipo (cero infraestructura para el usuario final), con **frontend Angular**, **backend Python/FastAPI** y **SQLite**, empaquetada para levantarse con un comando. Es una **app completa** (flujo visual + motor de cálculo). El MVP **diverge** del estándar corporativo Azure PT-ARQ-004; esa divergencia se gobierna con un **Waiver tipo Legacy/Técnica** (sección 8) y un **roadmap de modernización** explícito.

**Valor esperado.** Reducir el tiempo de preparación del ECP de días-persona a minutos, eliminar errores de cuadre, romper la dependencia de una sola persona y dejar la base de datos lista para conectarse al API del ERP (Kinetic/Epicor) en V2.

---

## 2. Problema y oportunidad

### 2.1 El proceso manual actual

El ECP se compone de **4 elementos**, con dos orígenes distintos:

| # | Elemento | Origen | Nace en |
|---|----------|--------|---------|
| 1 | **Volumen de producción** | Orden de trabajo (recibos de producto terminado) | Piso |
| 2 | **Costo de materia prima (MP)** | Orden de trabajo (emisión de MP valorizada por el ERP) | Piso |
| 3 | **Mano de obra directa (MOD)** | Registro contable real del mes (rubro 502) | Contabilidad |
| 4 | **Costos indirectos de fabricación (CIF)** | Registro contable real del mes (rubro 505) | Contabilidad |

El reporte se desglosa en **8 líneas** (familias / centro de costo CM): **TRA** (Transparente), **GAB** (Gabacha), **BAS** (Basuras), **TEL** (Tela lluvia), **MIS** (Misceláneos), **POL** (Poliducto), **ROLL** (Rollos precortados) y **TOTAL** (consolidado = suma de las 7).

> Volúmenes de referencia ene-2026 (kgs-Mil): TRA 659.3 · GAB 609.8 · BAS 413.2 · TEL 337.0 · MIS 153.9 · POL 80.1 · ROLL 67.8 · **TOTAL 2,311.2**.

Flujo manual actual:
1. Se consolida **Excel de Producción** (Volumen + Costo MP, desde OT cerradas).
2. Se consolida **Excel de Contabilidad** (MOD + CIF reales, desde el mayor).
3. Ambos se llevan a la **plantilla ECP** (22 hojas), que cruza por familia y calcula el costo unitario, con columnas Real (E) vs PPTO (F) y cierre en costo unitario final $/kg.

### 2.2 Dolores

- **Lento y manual:** consolidar 6 archivos (uno de ~42 MB / ~136k filas) en 22 hojas cada cierre.
- **Frágil:** fórmulas con rangos de filas fijos, parseo posicional de cuentas, libro externo roto, mes hard-codeado.
- **No auditable:** difícil saber de dónde sale cada número o por qué no cuadra.
- **Dependencia de una sola persona** (bus factor = 1).
- **Riesgo de error de cuadre** que se propaga silenciosamente.

### 2.3 Los 12 riesgos documentados de la automatización

Estos riesgos (documentados en el análisis del workflow fuente→reporte) son el origen de los requisitos no funcionales de la sección 7.

| # | Riesgo | Impacto si no se mitiga |
|---|--------|--------------------------|
| R1 | Códigos de cuenta inconsistentes (KINETIC='NO', dobles `--`, NATURAL en blanco) | Filas mal clasificadas o cálculos rotos |
| R2 | Parseo de la cuenta segmentada por posición fija (MID ciego) | Errores al cambiar el formato de cuenta |
| R3 | `Conta` (136k filas) y `Data CU` (22k filas) con fórmulas/VLOOKUP por celda | Lectura lenta o valores recalculados erróneos |
| R4 | La hoja `ECP` depende de un libro EXTERNO `[1]NEW MOD Y CIF` (roto) | Valores nulos/incorrectos en producción |
| R5 | Doble conteo hoja-fuente vs hoja-pivot (caché de tablas dinámicas) | Sobreestimación de costos |
| R6 | Catálogos de clasificación divergentes entre Real y PPTO | Las variaciones no cuadran |
| R7 | Período activo hard-codeado (mes = 4 fijo) | Imposible procesar otros meses sin tocar fórmulas |
| R8 | Rangos `SUMIFS`/filas fijos para agregar MOD/EE/CIF | Se rompe al insertar/mover filas |
| R9 | Ruido de punto flotante (1e-13) y saldos negativos (ajustes/reversas) | Falsos descuadres y signos invertidos |
| R10 | MP sin centro de costo contable (solo FAM + TipoMP) | No se puede cruzar MP por CECO |
| R11 | Filas de subtotal mezcladas con detalle | Doble conteo de líneas |
| R12 | Nombres de hoja "sucios" / inconsistentes | El parser no encuentra la hoja |

### 2.4 Oportunidad

Automatizar el ECP convierte un proceso artesanal en un **producto repetible, validado y auditable**, listo para escalar a otras unidades y para conectarse al ERP. El análisis profundo ya está hecho: el **mapa de transformación fuente→reporte**, todas las fórmulas, el modelo de datos y los 8 archivos `RESULTADO/` que sirven como **oráculo de correctitud**.

---

## 3. Usuarios, personas y casos de uso

### 3.1 Personas

| Persona | Perfil | Necesidad principal | Nivel técnico |
|---------|--------|---------------------|---------------|
| **Contralor financiero** | Nuevo en costos; responsable de cierre y reporte | Entender el flujo del ECP y confiar en los números sin ser experto en costos | Medio (Excel avanzado, no programación) |
| **Analista de costos** | Prepara el ECP cada mes (rol de Raúl) | Cargar archivos, obtener el ECP validado en minutos, ver variaciones y bridge de MP | Alto en costos y Excel |
| **Gerencia / Dirección** | COO, Dirección Financiera | Vista ejecutiva de costo unitario por familia y variaciones vs presupuesto | Bajo/medio; consume resultados |

### 3.2 Casos de uso

- **CU-01 — Cierre mensual del ECP (analista).** Al cierre de mes, el analista sube los 6 archivos del período, el sistema valida e ingiere, calcula el ECP y muestra el cuadre `TOTAL = Σ líneas`. Exporta a Excel/PDF para el cierre.
- **CU-02 — Explicar el proceso (contralor).** El contralor recorre la visualización del flujo (Piso → Contabilidad → ECP) con los números reales del período, entendiendo de dónde sale cada elemento.
- **CU-03 — Análisis de variaciones (analista/gerencia).** Revisar Real vs PPTO por línea, identificar variaciones de costo unitario y descomponer la variación de MP en Precio / Mix / Rendimiento.
- **CU-04 — Auditoría y trazabilidad (contralor).** Ante una cifra, navegar desde el ECP hacia el componente y su origen (rubro/cuenta/familia) y verificar los cuadres.
- **CU-05 — Vista ejecutiva (gerencia).** Consultar el costo unitario $/kg por familia y el consolidado del mes.

---

## 4. Alcance

### 4.1 MVP — Lo que SÍ entra

- Carga mensual de los **6 archivos fuente** con validación y feedback de errores.
- **Ingesta** a un modelo de datos dimensional (dims + facts) leyendo **valores cacheados**, no fórmulas.
- **Motor de cálculo** del ECP tipo B por línea (7 familias) + **consolidado (TOTAL)**, escenario Real vs PPTO.
- **Variaciones** Real vs PPTO ($ y %) y **bridge de variación de MP** (Precio / Mix / Rendimiento).
- **Validaciones de cuadre** (`TOTAL = Σ 7 familias` + cuadres cruzados de volumen, MP, transformación y costos).
- **Visualización del flujo** (6 etapas, 2 carriles Piso ↔ Contabilidad → ECP) con los números reales del período.
- **Reporte ECP navegable** (consolidado + por línea, costo unitario destacado, variaciones con color semántico).
- **Exportación** a Excel y PDF.
- **Período parametrizable** (selección de año + mes; nada hard-codeado).
- **App local** empaquetada (single-container, SQLite), levantable con un comando.

### 4.2 Fuera de alcance del MVP

- Integración directa con el API del ERP (Kinetic/Epicor) — es **V2**.
- Despliegue en la nube corporativa Azure (objetivo de la fase de modernización; ver sección 8).
- Autenticación corporativa (Entra ID / SSO) — fase estable.
- Multiusuario concurrente / multi-tenant / multi-planta.
- Edición/captura manual de partidas contables dentro de la app (la fuente es el ERP).
- Forecast / planeación de costos (la app reporta, no planifica).

### 4.3 Fase estable (endurecimiento)

- Migración del esquema SQLite → **PostgreSQL** (esquema ya diseñado portable).
- Contenedorización para registro corporativo (**ACR → Azure Container Apps**).
- **Autenticación OAuth2/JWT vía Entra ID**, gestión de secretos en **Key Vault**, telemetría en **App Insights**.
- **IaC (Terraform)**, respaldos y RTO/RPO conforme a PL-TIC-001 / MA-TI-002.

### 4.4 V2 — Integración ERP

- Reemplazar la carga de Excel por consumo del **API del ERP Kinetic/Epicor** vía **APIM / Service Bus**.
- Cierre del ECP semiautomático disparado por el cierre contable.

---

## 5. Requisitos funcionales (RF)

| ID | Requisito | Prioridad | Criterio de aceptación |
|----|-----------|-----------|------------------------|
| **RF-01** | **Carga mensual de los 6 archivos** con selección de período (año + mes) y validación previa | Must | El usuario selecciona período y sube los 6 archivos; el sistema valida formato/hoja/llaves antes de ingerir y muestra errores accionables |
| **RF-02** | **Validación de estructura por archivo** según contratos de datos (sección 6) | Must | Cada archivo se valida contra su contrato (hoja, columnas, llaves); se rechaza con mensaje claro si no cumple |
| **RF-03** | **Ingesta a modelo dimensional** leyendo valores calculados (no fórmulas), descartando filas inválidas y registrándolas | Must | `Conta`, `Data CU`, MP, PPTOs y headcount cargan a dims/facts; las filas descartadas quedan en un log consultable |
| **RF-04** | **Catálogo único de clasificación** (`dim_cuenta`: rubro × Tipo1 fijo/Variable × concepto) usado por Real y PPTO | Must | Real y PPTO se clasifican con el mismo catálogo; si una cuenta no clasifica, se reporta |
| **RF-05** | **Motor de cálculo de componentes** por línea×período×escenario | Must | Se calculan: Variable = MP + EE + CIF_Var; Fijo = MOD + CIF_Fijo + Deprec; Gasto454 = MOI454 + CIF454 + Dep454; Costo Prod+Deprec = Variable + Fijo + Gasto454 |
| **RF-06** | **Cálculo de unitarios** $/kg | Must | Unitario X = componente / Volumen; Unitario Total = (Fijo + Variable)/Volumen; Unitario Final = Unit454 + Unit Total |
| **RF-07** | **Cálculo de variaciones** Real vs PPTO | Must | VAR $ = E − F; % var = (E/F) − 1 (volumen: 1 − (E/F)) por componente y total |
| **RF-08** | **Bridge de variación de MP** (Precio / Mix / Rendimiento) | Must | Precio = (cu_real − cu_ppto)·kg_real; MIX = (kg_real − kg_total_real·part_ppto)·cu_ppto; Rendimiento = ((kg_total_real·part_ppto) − (base_rend·part_ppto))·cu_ppto; base_rend = prod_real/(1 − tasa_desperdicio); Total MP = Precio + MIX + Rendimiento |
| **RF-09** | **Clasificación semántica, no por rangos de filas** | Must | La agregación de MOD/EE/CIF se basa en rubro × Tipo1 × concepto, nunca en `SUM(G2:G18)` ni filas fijas |
| **RF-10** | **Consolidado TOTAL** = suma de las 7 familias | Must | El TOTAL se calcula agregando las 7 líneas, no por archivo aparte |
| **RF-11** | **Validaciones de cuadre** | Must | `TOTAL = Σ 7 familias`; cuadres (redondeados) de Volumen, Costo MP, Costo de Transformación y Costos entre vistas; resultado OK/falla por chequeo |
| **RF-12** | **Visualización del flujo** (6 etapas, 2 carriles) con números reales | Must | Carril Piso: ① Emisión MP→Costo MP, ② Reporte MO→aplicados (marcados "no entran al ECP"), ③ Recibo PT→Volumen, ④ Cierre de OT (5 criterios, solo OT cerradas en el mes, fecha de cierre); Carril Contabilidad: ⑤ MOD (502), ⑥ CIF (505 fijo/variable); confluencia → ECP por familia |
| **RF-13** | **Reporte ECP navegable** | Must | Consolidado + 7 líneas, columnas Real vs PPTO, variaciones con color semántico, costo unitario destacado, drill-down al componente |
| **RF-14** | **Exportación** a Excel y PDF | Must | El reporte por línea/consolidado se exporta a Excel (estructura tipo B) y PDF |
| **RF-15** | **Selección y comparación de períodos** | Should | El usuario lista períodos cargados y consulta cualquiera; comparación entre meses |
| **RF-16** | **KPI de headcount (MOD)** | Should | Se muestra el headcount por centro de costo del período cruzado con MOD |
| **RF-17** | **Log y reporte de filas descartadas/no clasificadas** | Should | Pantalla que lista filas inválidas, motivo y origen, para corrección en la fuente |
| **RF-18** | **Re-carga idempotente de un período** | Should | Volver a cargar un período reemplaza sus datos sin duplicar |

---

## 6. Contratos de datos por archivo fuente

> Reglas comunes: leer **valores calculados** (no fórmulas); el **período es siempre explícito** (año + mes), nunca posicional; almacenar en **unidad base** y convertir a miles solo en presentación; ingerir hojas **fuente** (`data`/`presupuesto`/`real`), nunca pivots.

### 6.1 `CIF PPTO.xlsx`
| Campo | Detalle |
|-------|---------|
| Hoja relevante | `data` (+ catálogo `de para`) |
| Llaves | NATURAL (11 díg) × Tipo1 (fijo/Variable) × CECO; conceptos DEPREC para depreciación |
| Periodicidad | **Anual** (12 meses en columnas) — 1 carga/año |
| Reglas de validación | NATURAL no vacío y numérico; Tipo1 ∈ {fijo, Variable}; cuenta cruza con catálogo `de para`; ignorar pivots |

### 6.2 `MOD PPTO.xlsx`
| Campo | Detalle |
|-------|---------|
| Hoja relevante | `data` |
| Llaves | CC / NATURAL (rubro 403, par del 502 real) |
| Periodicidad | **Anual** — 1 carga/año (total anual de referencia 14,485,119.72) |
| Reglas de validación | Rubro 403; CC de 7 dígitos cruza con headcount (4030101…); total cuadra con suma de líneas |

### 6.3 `MOD Y CIF REAL.xlsx` (hoja `Conta`)
| Campo | Detalle |
|-------|---------|
| Hoja relevante | `Conta` (~136,250 filas, mayor contable crudo del ERP) |
| Estructura cuenta | `NATURAL-UEN-FAM-CECO-DEPTO-99999-SITE---CtaVm` (ej. `50505170000-110-1130-05008-20-99999-007---04000`) |
| Llaves / extracción | Rubro = primeros 3 díg; NATURAL = 11 díg; FAM (línea); CECO; mes en columna de mes (1–4 = ene–abr, **no semanas**); **Importe (SALDO) = débito − crédito = K − L** |
| Mapeo de rubros | 502 = MOD · 503 = MOI · 505 = CIF · 507 = fletes · 60x = gastos operativos · 403/404 = ppto |
| Periodicidad | **Mensual** — cada cierre |
| Reglas de validación | Parsear cuenta **por delimitador `-` con validación** (no MID ciego); descartar KINETIC='NO', NATURAL vacío, dobles `--`, subtotales; resolver/eliminar dependencia del libro externo `[1]NEW MOD Y CIF`; aislar ruido 1e-13; preservar signos de reversas/ajustes |

### 6.4 `Copia de 2604-analsisis devariacion de MP.xlsx`
| Campo | Detalle |
|-------|---------|
| Hojas relevantes | `real` (Qty/Costo) y `presupuesto` (BUDGET 2026); `data` para el bridge |
| Llaves | FAM × Clasificación × TipoMP (MP **no** tiene CECO contable, solo FAM + TipoMP) |
| Periodicidad | `real` **mensual**; `presupuesto` **anual** |
| Reglas de validación | No mezclar fuente con pivot; clasificación con catálogo común; bridge requiere cu_real, cu_ppto, kg_real, part_ppto, tasa_desperdicio |

### 6.5 `VOL PRODUCCIÓN.xlsx` (hoja `Data CU`)
| Campo | Detalle |
|-------|---------|
| Hoja relevante | `Data CU` (~22,000 filas; jobs cerrados) |
| Llaves | Job → `Seg trabajos` → **FAM**; **mes = MONTH(Cierre)** |
| Periodicidad | **Mensual** — cada cierre |
| Reglas de validación | Solo jobs **cerrados** en el mes; PesoN por job; leer valores cacheados (tiene VLOOKUP); validar fecha de cierre presente |

### 6.6 `NUMERO DE PERSONAS REAL.xlsx`
| Campo | Detalle |
|-------|---------|
| Hoja relevante | `Hoja1` |
| Llaves | Centro de costo de 7 dígitos (4030101…) ↔ rubro 403 (par MOD) |
| Periodicidad | **Mensual** |
| Reglas de validación | CC cruza con MOD; headcount numérico; usado como KPI, no entra al costo |

---

## 7. Requisitos no funcionales (RNF)

### 7.1 Derivados de los 12 riesgos de automatización

| ID | Riesgo (sección 2.3) | Requisito no funcional |
|----|----------------------|------------------------|
| **RNF-01** | R1 — códigos inconsistentes | El parser debe **validar y descartar** filas con KINETIC='NO', NATURAL vacío o dobles `--`, dejando registro auditable |
| **RNF-02** | R2 — parseo posicional ciego | La cuenta segmentada se parsea **por delimitador `-` con validación de longitud/tipo**, nunca por MID posicional fijo |
| **RNF-03** | R3 — fórmulas/VLOOKUP por celda en archivos grandes | Leer siempre **valores calculados** (`data_only`) y **recomputar en SQL/Python**, sin recalcular las fórmulas del Excel |
| **RNF-04** | R4 — dependencia de libro externo roto | **Eliminar** la dependencia de `[1]NEW MOD Y CIF`; toda la lógica se replica en la base de datos/motor |
| **RNF-05** | R5 — doble conteo fuente vs pivot | Ingerir **solo hojas fuente**; nunca mezclar con cachés de tablas dinámicas |
| **RNF-06** | R6 — catálogos divergentes | **Catálogo único** de clasificación (rubro × Tipo1 × concepto) compartido por Real y PPTO; cuentas sin clasificación se reportan |
| **RNF-07** | R7 — período hard-codeado | El **período es parametrizable** (año + mes) en toda la cadena; nada fijo en código |
| **RNF-08** | R8 — rangos SUMIFS/filas fijas | Agregación por **clasificación semántica**, no por rangos de filas; resistente a inserción/movimiento de filas |
| **RNF-09** | R9 — ruido numérico y reversas | **Tolerancia de redondeo** explícita (umbral configurable) para cuadres; preservar signos de ajustes/reversas; neutralizar ruido 1e-13 |
| **RNF-10** | R10 — MP sin CECO contable | El modelo soporta MP cruzada **solo por FAM + TipoMP** sin requerir CECO |
| **RNF-11** | R11 — subtotales mezclados | Detectar y **excluir filas de subtotal** del detalle para evitar doble conteo |
| **RNF-12** | R12 — nombres de hoja sucios | Resolución de hoja **tolerante** (normalización de nombres) con error claro si la hoja esperada no existe |

### 7.2 RNF de plataforma

| ID | Categoría | Requisito |
|----|-----------|-----------|
| **RNF-13** | Rendimiento | Procesar archivos de **~42 MB / ~136k filas** (`Conta`) y ~22k filas (`Data CU`) e ingerir + calcular un período en **≤ 2 minutos** en una laptop estándar del equipo |
| **RNF-14** | Usabilidad | Interfaz comprensible para un **contralor sin experiencia en costos**; lenguaje visual Ternova (indigo dominante, naranja como acento, tipografías Gosha Sans / Space Grotesk); mensajes de error accionables |
| **RNF-15** | Portabilidad local | Arranque con **un comando** (single-container, SQLite, cero configuración); funciona offline en las computadoras del equipo |
| **RNF-16** | Portabilidad de datos | Esquema diseñado **portable a PostgreSQL** desde el día uno (sin features propietarias de SQLite) |
| **RNF-17** | Seguridad de datos | Información **confidencial** (costos): datos solo en local; sin secretos en código; preparado para cifrado en reposo y control de acceso en la fase estable (conforme a POL-TIC-001) |
| **RNF-18** | Trazabilidad / auditoría | Todo número debe poder rastrearse a su componente y fuente; log de ingesta y de filas descartadas |
| **RNF-19** | Correctitud | El motor se valida contra los **8 archivos `RESULTADO/`** (oráculo) en al menos R6 volumen, R13 MP, R20 MOD, R26 unitario total y E51 unitario final, por línea, dentro de tolerancia de redondeo |
| **RNF-20** | Mantenibilidad | Un parser por fuente, motor de cálculo desacoplado de la ingesta, pruebas "golden" automatizadas |

---

## 8. Arquitectura del MVP y divergencia

### 8.1 Stack del MVP (local)

Monorepo `ecp-app/` contenedorizado, levantable con un comando. Para correr en las computadoras del equipo sin fricción: **un solo contenedor** donde **FastAPI** sirve el **Angular** ya compilado y persiste en **SQLite**.

- **Backend:** Python · FastAPI · SQLAlchemy · Pydantic · pandas + openpyxl (lectura `data_only`).
- **Base de datos:** SQLite (esquema portable a PostgreSQL).
- **Frontend:** Angular (standalone components) · charts SVG/D3 a medida alineados a la marca · Gosha Sans + Space Grotesk.
- **Modelo de datos (resumen):**
  - **Dims:** `dim_periodo`, `dim_linea` (FAM/CM-XXX ↔ CECO), `dim_cuenta` (NATURAL, rubro 502/503/505/403/404, concepto, Tipo1), `dim_centro_costo`, `dim_commodity_mp`, `dim_concepto_ecp`.
  - **Hechos (grano línea × período × cuenta/commodity × escenario):** `fact_mayor_real` (Conta, saldo = K − L), `fact_cif_ppto`, `fact_mod_ppto`, `fact_mp_real`, `fact_mp_ppto`, `fact_produccion` (Data CU), `fact_headcount`.
  - **Derivadas:** `fact_ecp_componente`, `vista_ecp_mes`, `fact_variacion_mp`, `vista_validacion`.
- **Empaque:** Dockerfile single-container + `start.sh` / `start.bat`; `docker-compose.yml` para desarrollo (Angular dev + API + Postgres opcional).
- **Pruebas:** `test_golden.py` compara el motor contra los `RESULTADO/*.xlsx`.

### 8.2 Divergencia respecto a PT-ARQ-004

El estándar de arquitectura de Grupo Ternova (**PT-ARQ-004**) define un stack **Azure**: AKS / Azure Container Apps, **APIM** como API Gateway, **Service Bus** como Event Bus, **Entra ID** para identidad (Zero Trust), **PostgreSQL** gestionado, **Key Vault** para secretos, **App Insights** para observabilidad e **IaC con Terraform**.

El MVP (Python/FastAPI/**SQLite**/local, sin APIM/Service Bus/Entra ID/Key Vault/App Insights/IaC) **diverge** de este estándar. La divergencia es **deliberada y temporal**, justificada por la necesidad de un MVP local de bajo costo y rápida validación, sin infraestructura para el usuario final.

### 8.3 Waiver de arquitectura (EXC — Legacy/Técnica)

| Campo | Valor |
|-------|-------|
| **ID de excepción** | EXC-ECP-2026-01 |
| **Tipo** | Técnica / Legacy temporal |
| **Estándar afectado** | PT-ARQ-004 (stack Azure, identidad Entra ID, APIM/Service Bus, Key Vault, App Insights, IaC) |
| **Divergencias** | SQLite en lugar de PostgreSQL gestionado; ejecución local en lugar de Container Apps/AKS; sin APIM/Service Bus; sin Entra ID (sin autenticación en MVP); sin Key Vault/App Insights/IaC |
| **Justificación** | MVP local para validar el motor de cálculo y la visualización con datos reales antes de invertir en infraestructura cloud; datos confidenciales se mantienen offline; cero fricción de despliegue para el equipo |
| **Mitigaciones en el MVP** | Esquema portable a PostgreSQL; motor desacoplado y probado contra oráculo; sin secretos en código; datos solo en local; sin exposición a red pública |
| **Fecha de emisión** | 2026-06-05 |
| **Fecha de expiración** | **2026-12-31** (la app debe estar modernizada al estándar PT-ARQ-004 o renovarse el waiver con justificación) |
| **Plan de mitigación / salida** | Roadmap de modernización (8.4); revisión por el Architecture Board antes de la expiración |
| **Aprobación requerida** | Architecture Board de Grupo Ternova |

### 8.4 Roadmap de modernización a PT-ARQ-004

1. **Contenedor → ACR.** Publicar la imagen del MVP en **Azure Container Registry**.
2. **Cómputo gestionado.** Desplegar en **Azure Container Apps** (escalado y operación gestionados).
3. **Base de datos.** Migrar SQLite → **PostgreSQL gestionado** (esquema ya portable).
4. **Identidad.** Autenticación **OAuth2/JWT vía Entra ID** (Zero Trust); roles por persona (analista, contralor, gerencia).
5. **Secretos.** Migrar configuración sensible a **Azure Key Vault**.
6. **Observabilidad.** Telemetría y logs en **Application Insights**.
7. **IaC.** Toda la infraestructura como código con **Terraform**, etiquetado conforme al estándar.
8. **Continuidad.** Respaldos, RTO/RPO y DRP conforme a **PL-TIC-001 / MA-TI-002**.
9. **Integración (V2).** Sustituir la carga de Excel por consumo del **API del ERP Kinetic/Epicor** vía **APIM** (gateway) y **Service Bus** (eventos de cierre).

---

## 9. Métricas de éxito / KPIs

| KPI | Línea base (manual) | Meta MVP | Cómo se mide |
|-----|---------------------|----------|--------------|
| **Tiempo de preparación del ECP** | Horas/días-persona por cierre | **≤ 15 min** desde la carga hasta el reporte validado | Cronometraje del cierre antes vs después |
| **Exactitud vs reporte manual** | Referencia (oráculo `RESULTADO/`) | **100 %** de coincidencia (dentro de tolerancia de redondeo) en R6, R13, R20, R26, E51 por línea | Pruebas golden + revisión del analista |
| **Errores de cuadre** | Detectados tarde / propagados | **0** descuadres `TOTAL = Σ líneas` no señalados | Tabla de validación de la app |
| **Bus factor** | 1 (una persona) | El cierre lo puede ejecutar cualquier miembro capacitado | Ejecución por una persona distinta al SME |
| **Tasa de filas descartadas detectadas** | No visible | 100 % de filas inválidas registradas y reportadas | Log de ingesta |
| **Adopción** | — | El ECP del cierre se genera con la app, no en la plantilla manual | Uso por período |

---

## 10. Roadmap por fases y riesgos del proyecto

### 10.1 Roadmap por fases

| Fase | Descripción | Entregable |
|------|-------------|-----------|
| **Fase 0 — PRD** | Documento de producto (este PRD) con visión, alcance, RF/RNF, contratos, Waiver y roadmap | `PRD.md` |
| **Fase 1 — Scaffold** | Monorepo, FastAPI + SQLAlchemy + SQLite, Angular con tokens del Design System, docker-compose + start script; "hello flujo" con datos mock | App levantable con un comando |
| **Fase 2 — Ingesta** | Parsers de los 6 fuente con validación; carga a dims/facts; endpoint `/upload` con feedback de errores | Ingesta validada |
| **Fase 3 — Motor** | Engine ECP + bridge MP + validaciones; `test_golden` verde contra `RESULTADO/` | Motor correcto y probado |
| **Fase 4 — Frontend** | Visualización del flujo (6 etapas) con números reales; reporte ECP por línea/consolidado; export Excel/PDF | App completa |
| **Fase 5 — Empaque local** | Dockerfile single-container; `start.sh`/`start.bat`; README de instalación | MVP distribuible |
| **Fase estable** | Endurecimiento: PostgreSQL, ACR/Container Apps, Entra ID, Key Vault, App Insights, IaC | Cumplimiento PT-ARQ-004 (antes de 2026-12-31) |
| **V2** | Integración API ERP Kinetic/Epicor vía APIM/Service Bus | Cierre semiautomático |

### 10.2 Riesgos del proyecto

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|----|--------|--------------|---------|------------|
| RP-1 | Cambios de formato en los archivos fuente del ERP | Media | Alto | Validación por contrato (sección 6); parser tolerante; alertas de descarte |
| RP-2 | El motor no reproduce exactamente la plantilla manual | Media | Alto | Pruebas golden contra `RESULTADO/` como criterio de aceptación |
| RP-3 | El waiver expira sin modernización (deuda técnica) | Media | Medio | Fecha de expiración 2026-12-31 + revisión del Architecture Board; esquema ya portable |
| RP-4 | Dependencia del libro externo roto `[1]NEW MOD Y CIF` | Alta | Alto | Eliminar dependencia replicando la lógica en BD (RNF-04) |
| RP-5 | Rendimiento con archivos de 42 MB / 136k filas | Media | Medio | Lectura `data_only`, cálculo en SQL/pandas, meta ≤ 2 min (RNF-13) |
| RP-6 | Bus factor del proyecto (conocimiento concentrado) | Media | Medio | Documentación (este PRD + notas) y pruebas automatizadas |
| RP-7 | Confidencialidad de los datos de costos | Baja | Alto | Datos solo en local, sin exposición a red, sin secretos en código (RNF-17) |
| RP-8 | Errores de clasificación entre Real y PPTO | Media | Alto | Catálogo único compartido (RNF-06); reporte de cuentas no clasificadas |

---

*Fin del documento — PRD App ECP v1.0 (2026-06-05).*
