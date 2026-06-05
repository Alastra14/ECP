import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { EcpResponse, LineaEcp } from './models';

interface Fila { campo: string; etiqueta: string; tipo?: 'section' | 'total'; unit?: boolean; }

@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fade-in" *ngIf="data as d">
    <div class="bar">
      <div class="toggle">
        <button class="seg" [class.on]="esc==='real'" (click)="esc='real'">Real</button>
        <button class="seg" [class.on]="esc==='ppto'" (click)="esc='ppto'">Presupuesto</button>
      </div>
      <span class="spacer"></span>
      <span class="badge" [class.ok]="d.validacion.ok" [class.warn]="!d.validacion.ok && d.validacion.advertencias">
        {{ d.validacion.ok ? 'Cuadres OK' : 'Revisar cuadres' }}
        <span *ngIf="d.validacion.advertencias"> · {{ d.validacion.advertencias }} advertencia(s)</span>
      </span>
      <a class="btn btn-accent" [href]="exportUrl" target="_blank">Exportar Excel</a>
    </div>

    <div class="table-wrap">
      <table class="ecp">
        <thead>
          <tr>
            <th>Concepto ({{ esc==='real' ? 'Real' : 'PPTO' }})</th>
            <th *ngFor="let l of d.lineas">{{ l.linea }}</th>
            <th>TOTAL</th>
          </tr>
        </thead>
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

    <!-- Variaciones del consolidado -->
    <h3 style="margin:28px 0 12px">Consolidado — Real vs Presupuesto</h3>
    <div class="table-wrap">
      <table class="ecp">
        <thead><tr><th>Concepto</th><th>Real</th><th>PPTO</th><th>VAR</th><th>%</th></tr></thead>
        <tbody>
          <tr *ngFor="let f of filasVar">
            <td>{{ f.etiqueta }}</td>
            <td>{{ num(d.total.real[f.campo], f.unit) }}</td>
            <td>{{ num(d.total.ppto[f.campo], f.unit) }}</td>
            <td [class.pos]="d.total.var[f.campo] >= 0" [class.neg]="d.total.var[f.campo] < 0">
              {{ num(d.total.var[f.campo], f.unit) }}</td>
            <td [class.pos]="d.total.pct[f.campo] >= 0" [class.neg]="d.total.pct[f.campo] < 0">
              {{ (d.total.pct[f.campo] * 100) | number:'1.1-1' }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Validación -->
    <h3 style="margin:28px 0 12px">Validación de cuadre (TOTAL = Σ líneas)</h3>
    <div class="table-wrap">
      <table class="ecp">
        <thead><tr><th>Escenario</th><th>Concepto</th><th>TOTAL</th><th>Σ líneas</th><th>Diferencia</th><th>Estado</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of d.validacion.checks">
            <td>{{ c.escenario }}</td><td>{{ c.concepto }}</td>
            <td>{{ c.total | number:'1.2-2' }}</td><td>{{ c.suma_lineas | number:'1.2-2' }}</td>
            <td>{{ c.diferencia | number:'1.3-3' }}</td>
            <td><span class="badge" [class.ok]="c.severidad==='ok'" [class.warn]="c.severidad==='advertencia'" [class.err]="c.severidad==='error'">{{ c.severidad }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <p *ngIf="!data" class="muted">Cargando reporte…</p>
  `,
  styles: [`
    .bar { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .spacer { flex:1; }
    .toggle { display:inline-flex; border:1px solid var(--color-border); border-radius:var(--r-pill); overflow:hidden; }
    .seg { border:none; background:white; padding:8px 18px; cursor:pointer; font-weight:600; font-size:13px; color:var(--tn-slate); }
    .seg.on { background:var(--tn-indigo-900); color:white; }
    a.btn { text-decoration:none; }
  `],
})
export class ReporteComponent implements OnChanges {
  @Input() periodo!: string;
  data?: EcpResponse;
  esc: 'real' | 'ppto' = 'real';
  exportUrl = '';

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

  filasVar: Fila[] = [
    { campo: 'volumen', etiqueta: 'Volumen (kgs-Mil)' },
    { campo: 'mp', etiqueta: 'Costo MP' },
    { campo: 'mod', etiqueta: 'MOD' },
    { campo: 'total_variable', etiqueta: 'Costo Variable' },
    { campo: 'total_fijo', etiqueta: 'Costo Fijo' },
    { campo: 'costo_prod_deprec', etiqueta: 'Costo Total' },
    { campo: 'unit_final', etiqueta: 'Unitario FINAL', unit: true },
  ];

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (!this.periodo) return;
    this.exportUrl = this.api.exportUrl(this.periodo);
    this.api.ecp(this.periodo).subscribe(d => this.data = d);
  }

  val(l: LineaEcp, f: Fila): string {
    const v = (this.esc === 'real' ? l.real : l.ppto)[f.campo];
    return this.num(v, f.unit);
  }

  num(v: number, unit?: boolean): string {
    if (v === undefined || v === null) return '';
    return unit ? v.toFixed(3) : v.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  }
}
