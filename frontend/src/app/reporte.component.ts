import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { EcpResponse, LineaEcp, SeriePunto } from './models';
import { WaterfallComponent, TrendComponent, MixComponent, BarsComponent, PasoWaterfall, ParteMix } from './ui/charts.component';
import { SkeletonComponent } from './ui/skeleton.component';

interface Fila { campo: string; etiqueta: string; tipo?: 'section' | 'total'; unit?: boolean; }

@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [CommonModule, WaterfallComponent, TrendComponent, MixComponent, BarsComponent, SkeletonComponent],
  template: `
  <app-skeleton *ngIf="cargando" variant="dashboard"></app-skeleton>

  <div class="fade-in" *ngIf="!cargando && data as d">
    <!-- Banda de KPIs de cabecera -->
    <div class="kpi-row" style="margin-bottom:20px">
      <div class="kpi-card accent">
        <div class="k-label">Costo unitario final</div>
        <div class="k-value">{{ d.total.real.unit_final | number:'1.3-3' }}<small>$/kg</small></div>
        <div class="k-delta" [ngClass]="deltaClass('costo', d.total.pct['unit_final'])">
          {{ arrow(d.total.pct['unit_final']) }} {{ (d.total.pct['unit_final']*100) | number:'1.1-1' }}% vs PPTO
        </div>
      </div>
      <div class="kpi-card">
        <div class="k-label">Volumen</div>
        <div class="k-value">{{ d.total.real.volumen | number:'1.0-0' }}<small>kgs-Mil</small></div>
        <div class="k-delta" [ngClass]="deltaClass('volumen', d.total.pct['volumen'])">
          {{ arrow(d.total.pct['volumen']) }} {{ (d.total.pct['volumen']*100) | number:'1.1-1' }}% vs PPTO
        </div>
      </div>
      <div class="kpi-card">
        <div class="k-label">Costo de producción</div>
        <div class="k-value">{{ d.total.real.costo_prod_deprec | number:'1.0-0' }}<small>$Mil</small></div>
        <div class="k-delta" [ngClass]="deltaClass('costo', d.total.pct['costo_prod_deprec'])">
          {{ arrow(d.total.pct['costo_prod_deprec']) }} {{ (d.total.pct['costo_prod_deprec']*100) | number:'1.1-1' }}% vs PPTO
        </div>
      </div>
      <div class="kpi-card">
        <div class="k-label">Costo MP</div>
        <div class="k-value">{{ d.total.real.mp | number:'1.0-0' }}<small>$Mil</small></div>
        <div class="k-delta" [ngClass]="deltaClass('costo', d.total.pct['mp'])">
          {{ arrow(d.total.pct['mp']) }} {{ (d.total.pct['mp']*100) | number:'1.1-1' }}% vs PPTO
        </div>
      </div>
      <div class="kpi-card" [class.green]="d.validacion.ok" [class.red]="!d.validacion.ok">
        <div class="k-label">Cuadre TOTAL = Σ líneas</div>
        <div class="k-value" style="font-size:22px; margin-top:12px">{{ d.validacion.ok ? 'OK' : 'Revisar' }}</div>
        <div class="k-delta flat">{{ d.validacion.advertencias }} advertencia(s)</div>
      </div>
    </div>

    <div class="bar" style="margin-bottom:16px">
      <span class="muted" style="font-size:13px">Semáforo de costos: <b style="color:var(--tn-red)">↑ rojo</b> encarece · <b style="color:var(--tn-green)">↓ verde</b> abarata</span>
      <span class="spacer"></span>
      <a class="btn btn-accent" [href]="exportUrl" target="_blank">Exportar Excel</a>
    </div>

    <!-- Bento: gráficos -->
    <div class="bento">
      <div class="col">
        <section class="panel">
          <div class="panel-head"><div><h3 class="panel-title">Puente de variación del costo unitario</h3>
            <div class="panel-sub">PPTO → componentes → Real ($/kg)</div></div></div>
          <div class="panel-body"><app-waterfall [pasos]="waterfall" [decimales]="3"></app-waterfall></div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h3 class="panel-title">Tendencia del costo unitario</h3>
            <div class="panel-sub">$/kg por mes · línea naranja = PPTO</div></div></div>
          <div class="panel-body"><app-trend [datos]="tendencia" [decimales]="3"></app-trend></div>
        </section>
      </div>
      <div class="col">
        <section class="panel">
          <div class="panel-head"><div><h3 class="panel-title">Mix de costo</h3>
            <div class="panel-sub">Composición Real del costo</div></div></div>
          <div class="panel-body"><app-mix [partes]="mix"></app-mix></div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><h3 class="panel-title">Validación</h3>
            <div class="panel-sub">Cuadres de consistencia</div></div></div>
          <div class="panel-body">
            <div *ngFor="let c of d.validacion.checks" style="display:flex; justify-content:space-between; padding:5px 0; font-size:12.5px; border-bottom:1px solid var(--tn-line)">
              <span>{{ c.escenario }} · {{ c.concepto }}</span>
              <span class="badge" [class.ok]="c.severidad==='ok'" [class.warn]="c.severidad==='advertencia'" [class.err]="c.severidad==='error'">{{ c.severidad }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Comparativo por línea -->
    <section class="panel" style="margin-top:20px">
      <div class="panel-head"><div><h3 class="panel-title">Costo unitario por línea</h3>
        <div class="panel-sub">$/kg · Real vs PPTO por familia</div></div></div>
      <div class="panel-body"><app-bars [datos]="barrasLinea"></app-bars></div>
    </section>

    <!-- Tabla detallada -->
    <section class="panel" style="margin-top:20px">
      <div class="panel-head">
        <div><h3 class="panel-title">Detalle del ECP por línea</h3><div class="panel-sub">{{ esc==='real'?'Real':'Presupuesto' }}</div></div>
        <div class="toggle">
          <button class="seg" [class.on]="esc==='real'" (click)="esc='real'">Real</button>
          <button class="seg" [class.on]="esc==='ppto'" (click)="esc='ppto'">PPTO</button>
        </div>
      </div>
      <div class="panel-body" style="padding-top:0">
        <div class="table-wrap" style="border:none">
          <table class="ecp">
            <thead><tr><th>Concepto</th><th *ngFor="let l of d.lineas">{{ l.linea }}</th><th>TOTAL</th></tr></thead>
            <tbody>
              <ng-container *ngFor="let f of filas">
                <tr *ngIf="f.tipo==='section'" class="section"><td [attr.colspan]="d.lineas.length + 2">{{ f.etiqueta }}</td></tr>
                <tr *ngIf="f.tipo!=='section'" [class.total]="f.tipo==='total'">
                  <td>{{ f.etiqueta }}</td>
                  <td *ngFor="let l of d.lineas">{{ val(l, f) }}</td>
                  <td>{{ val(d.total, f) }}</td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
  `,
  styles: [`
    .bar { display:flex; align-items:center; gap:12px; }
    .spacer { flex:1; }
    .toggle { display:inline-flex; border:1px solid var(--color-border); border-radius:var(--r-pill); overflow:hidden; }
    .seg { border:none; background:white; padding:7px 16px; cursor:pointer; font-weight:600; font-size:13px; color:var(--tn-slate); }
    .seg.on { background:var(--tn-indigo-900); color:white; }
    a.btn { text-decoration:none; }
  `],
})
export class ReporteComponent implements OnChanges {
  @Input() periodo!: string;
  data?: EcpResponse;
  cargando = true;
  esc: 'real' | 'ppto' = 'real';
  exportUrl = '';
  waterfall: PasoWaterfall[] = [];
  tendencia: { label: string; real: number; ppto?: number | null }[] = [];
  mix: ParteMix[] = [];
  barrasLinea: { label: string; real: number; ppto: number }[] = [];

  filas: Fila[] = [
    { campo: 'volumen', etiqueta: 'Volumen (kgs-Mil)' },
    { campo: '', etiqueta: 'Costo Variable', tipo: 'section' },
    { campo: 'mp', etiqueta: 'Costo MP' },
    { campo: 'ee', etiqueta: 'Energía Eléctrica' },
    { campo: 'cif_var', etiqueta: 'CIF Variable' },
    { campo: 'total_variable', etiqueta: 'TOTAL COSTO VARIABLE', tipo: 'total' },
    { campo: '', etiqueta: 'Costo Fijo', tipo: 'section' },
    { campo: 'mod', etiqueta: 'MOD' },
    { campo: 'cif_fijo', etiqueta: 'CIF Fijo' },
    { campo: 'deprec', etiqueta: 'Depreciación' },
    { campo: 'total_fijo', etiqueta: 'TOTAL COSTO FIJO', tipo: 'total' },
    { campo: '', etiqueta: 'Gasto 454 y total', tipo: 'section' },
    { campo: 'total_454', etiqueta: 'TOTAL GASTO 454', tipo: 'total' },
    { campo: 'costo_prod_deprec', etiqueta: 'Costo Producción + Depreciación', tipo: 'total' },
    { campo: '', etiqueta: 'Costo Unitario ($/kg)', tipo: 'section' },
    { campo: 'unit_total', etiqueta: 'Unitario Total', unit: true },
    { campo: 'unit_final', etiqueta: 'Unitario FINAL', tipo: 'total', unit: true },
  ];

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (!this.periodo) return;
    this.cargando = true;
    this.exportUrl = this.api.exportUrl(this.periodo);
    this.api.ecp(this.periodo).subscribe({
      next: d => { this.data = d; this.armarGraficos(d); this.cargando = false; },
      error: () => { this.cargando = false; },
    });
    this.api.serie().subscribe(s => this.armarTendencia(s.puntos));
  }

  private armarGraficos(d: EcpResponse) {
    const r = d.total.real, p = d.total.ppto;
    // Waterfall del costo unitario: PPTO -> deltas por componente -> Real
    const comp: [string, string][] = [
      ['MP', 'unit_mp'], ['EE', 'unit_ee'], ['CIF Var', 'unit_cif_var'],
      ['MOD', 'unit_mod'], ['CIF Fijo', 'unit_cif_fijo'], ['Deprec', 'unit_deprec'], ['Gasto 454', 'unit_454'],
    ];
    this.waterfall = [
      { label: 'PPTO', valor: p.unit_final, tipo: 'base' },
      ...comp.map(([lab, c]) => ({ label: lab, valor: (r[c] || 0) - (p[c] || 0), tipo: 'delta' as const })),
      { label: 'Real', valor: r.unit_final, tipo: 'total' },
    ];
    // Mix de costo (Real)
    const cif = (r.cif_var || 0) + (r.cif_fijo || 0) + (r.deprec || 0);
    this.mix = [
      { label: 'Materia Prima', valor: r.mp || 0, color: '#1D0447' },
      { label: 'MOD', valor: r.mod || 0, color: '#FF6A00' },
      { label: 'CIF', valor: cif, color: '#5A37B0' },
      { label: 'Gasto 454', valor: r.total_454 || 0, color: '#9A83D6' },
    ];
    // Barras por línea: unitario final Real vs PPTO
    this.barrasLinea = d.lineas.map(l => ({ label: l.linea, real: l.real.unit_final, ppto: l.ppto.unit_final }));
  }

  private armarTendencia(puntos: SeriePunto[]) {
    const meses = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    this.tendencia = puntos.map(pt => ({
      label: meses[+pt.periodo.split('-')[1]],
      real: pt.real.unit_final,
      ppto: pt.ppto_unit_final,
    }));
  }

  // Semáforo correcto: en costos, subir es malo (rojo); en volumen, subir es bueno (verde).
  deltaClass(tipo: 'costo' | 'volumen', pct: number): string {
    if (Math.abs(pct) < 0.0005) return 'flat';
    const sube = pct > 0;
    if (tipo === 'volumen') return sube ? 'up-good' : 'down-bad';
    return sube ? 'up-bad' : 'down-good';
  }
  arrow(pct: number): string { return Math.abs(pct) < 0.0005 ? '→' : (pct > 0 ? '↑' : '↓'); }

  val(l: LineaEcp, f: Fila): string {
    const v = (this.esc === 'real' ? l.real : l.ppto)[f.campo];
    if (v === undefined || v === null) return '';
    return f.unit ? v.toFixed(3) : v.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  }
}
