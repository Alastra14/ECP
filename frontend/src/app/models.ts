export interface Escenario {
  volumen: number; mp: number; ee: number; cif_var: number; total_variable: number;
  mod: number; cif_fijo: number; deprec: number; total_fijo: number;
  moi_454: number; cif_454: number; deprec_454: number; total_454: number;
  costo_prod_deprec: number;
  unit_mp: number; unit_ee: number; unit_cif_var: number; unit_variable: number;
  unit_mod: number; unit_cif_fijo: number; unit_deprec: number; unit_fijo: number;
  unit_total: number; unit_454: number; unit_final: number;
  [k: string]: number;
}

export interface LineaEcp {
  linea: string; nombre: string;
  real: Escenario; ppto: Escenario;
  var: Record<string, number>; pct: Record<string, number>;
}

export interface ValidacionCheck {
  escenario: string; concepto: string; total: number; suma_lineas: number;
  diferencia: number; pct: number; severidad: string; ok: boolean;
}

export interface Validacion {
  ok: boolean; advertencias: number; checks: ValidacionCheck[];
}

export interface EcpResponse {
  periodo: string; etiquetas: Record<string, string>;
  lineas: LineaEcp[]; total: LineaEcp; validacion: Validacion;
}

export interface EtapaFlujo {
  n: number; carril: 'piso' | 'contabilidad'; titulo: string; desc: string;
  salida: string; concepto: string | null; valor: number | null; unidad: string;
  nota?: string; criterios?: string[];
}

export interface FlujoResponse {
  periodo: string; etapas: EtapaFlujo[];
  consolidado: { volumen: number; costo_total: number; unit_final: number; mp: number; mod: number; cif: number; };
  validacion_ok: boolean;
}

export interface SeriePunto {
  periodo: string;
  real: { unit_final: number; volumen: number; mp: number; mod: number; cif: number; costo: number };
  ppto_unit_final: number | null;
}

export interface UploadResultado {
  guardados: number;
  detalle: { archivo: string; tipo: string; filas: number; estado: string; nota?: string }[];
  faltantes: string[];
  periodos_afectados: string[];
}
