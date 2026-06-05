import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { FlujoResponse, EtapaFlujo } from './models';

@Component({
  selector: 'app-flujo',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="flujo fade-in" *ngIf="data as d">
    <div class="legend">
      <span class="lg"><i class="dot piso"></i> Piso — Orden de trabajo</span>
      <span class="lg"><i class="dot conta"></i> Contabilidad — Cierre de mes</span>
      <span class="lg"><i class="dot ecp"></i> Consolidación ECP</span>
    </div>

    <div class="lanes">
      <!-- Carril Piso -->
      <div class="lane lane-piso">
        <div class="lane-title">Orden de trabajo · Piso de producción</div>
        <div class="stage-row">
          <ng-container *ngFor="let e of piso; let i = index">
            <div class="stage piso" [class.info]="e.valor === null">
              <div class="stage-n">{{ e.n }}</div>
              <h4>{{ e.titulo }}</h4>
              <p class="desc">{{ e.desc }}</p>
              <div class="out" *ngIf="e.valor !== null">
                <span class="out-label">{{ e.salida }}</span>
                <span class="out-val">{{ e.valor | number:'1.1-1' }}<small>{{ e.unidad }}</small></span>
              </div>
              <div class="out muted-out" *ngIf="e.valor === null">
                <span class="out-label">{{ e.salida }}</span>
                <span class="note" *ngIf="e.nota">{{ e.nota }}</span>
                <ul class="crit" *ngIf="e.criterios">
                  <li *ngFor="let c of e.criterios">{{ c }}</li>
                </ul>
              </div>
            </div>
            <div class="conn" *ngIf="i < piso.length - 1">→</div>
          </ng-container>
        </div>
      </div>

      <!-- Carril Contabilidad -->
      <div class="lane lane-conta">
        <div class="lane-title">Registro contable · Cierre de mes</div>
        <div class="stage-row">
          <ng-container *ngFor="let e of conta; let i = index">
            <div class="stage conta">
              <div class="stage-n">{{ e.n }}</div>
              <h4>{{ e.titulo }}</h4>
              <p class="desc">{{ e.desc }}</p>
              <div class="out">
                <span class="out-label">{{ e.salida }}</span>
                <span class="out-val">{{ e.valor | number:'1.1-1' }}<small>{{ e.unidad }}</small></span>
              </div>
            </div>
            <div class="conn" *ngIf="i < conta.length - 1">→</div>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Confluencia ECP -->
    <div class="confluence">↓</div>
    <div class="ecp-panel">
      <div class="ecp-head">
        <span class="eyebrow">Estado de Costo de Producción · {{ d.periodo }}</span>
        <h2>Costo unitario de la producción terminada</h2>
      </div>
      <div class="ecp-kpis">
        <div class="kpi"><div class="label">Volumen</div>
          <div class="value">{{ d.consolidado.volumen | number:'1.1-1' }}<span class="unit">kgs-Mil</span></div></div>
        <div class="kpi"><div class="label">Costo MP</div>
          <div class="value">{{ d.consolidado.mp | number:'1.0-0' }}<span class="unit">$Mil</span></div></div>
        <div class="kpi"><div class="label">MOD</div>
          <div class="value">{{ d.consolidado.mod | number:'1.0-0' }}<span class="unit">$Mil</span></div></div>
        <div class="kpi"><div class="label">CIF</div>
          <div class="value">{{ d.consolidado.cif | number:'1.0-0' }}<span class="unit">$Mil</span></div></div>
        <div class="kpi accent"><div class="label">Costo unitario final</div>
          <div class="value">{{ d.consolidado.unit_final | number:'1.3-3' }}<span class="unit">$/kg</span></div></div>
      </div>
      <div class="val-row">
        <span class="badge" [class.ok]="d.validacion_ok" [class.warn]="!d.validacion_ok">
          {{ d.validacion_ok ? 'Cuadre TOTAL = Σ líneas ✓' : 'Revisar cuadres (ver Reporte)' }}
        </span>
      </div>
    </div>
  </div>
  <p *ngIf="!data" class="muted">Cargando flujo…</p>
  `,
  styles: [`
    .legend { display:flex; gap:20px; margin-bottom:16px; font-size:13px; color:var(--tn-slate); }
    .lg { display:flex; align-items:center; gap:8px; }
    .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
    .dot.piso { background:var(--tn-indigo-500); }
    .dot.conta { background:var(--tn-orange-500); }
    .dot.ecp { background:var(--tn-indigo-900); }
    .lanes { display:flex; flex-direction:column; gap:20px; }
    .lane { border-radius:var(--r-lg); padding:18px; border:1px solid var(--color-border); }
    .lane-piso { background:linear-gradient(180deg,var(--tn-indigo-50),#fff); }
    .lane-conta { background:linear-gradient(180deg,var(--tn-orange-50),#fff); }
    .lane-title { font-weight:700; color:var(--tn-indigo-900); margin-bottom:14px; font-size:14px;
      text-transform:uppercase; letter-spacing:.08em; }
    .stage-row { display:flex; align-items:stretch; gap:6px; flex-wrap:wrap; }
    .stage { position:relative; flex:1; min-width:200px; background:white; border:1px solid var(--color-border);
      border-radius:var(--r-md); padding:16px 16px 14px; box-shadow:var(--elev-1);
      transition:transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease); }
    .stage:hover { transform:translateY(-3px); box-shadow:var(--elev-2); }
    .stage.piso { border-top:3px solid var(--tn-indigo-500); }
    .stage.conta { border-top:3px solid var(--tn-orange-500); }
    .stage.info { background:var(--tn-paper-2); }
    .stage-n { position:absolute; top:-12px; left:14px; width:24px; height:24px; border-radius:50%;
      background:var(--tn-indigo-900); color:white; font-size:13px; font-weight:700;
      display:flex; align-items:center; justify-content:center; }
    .stage.conta .stage-n { background:var(--tn-orange-500); }
    .stage h4 { margin:6px 0 6px; color:var(--tn-indigo-900); font-size:15px; }
    .desc { font-size:12.5px; color:var(--tn-slate); line-height:1.4; margin:0 0 12px; }
    .out { border-top:1px dashed var(--color-border); padding-top:10px; display:flex; flex-direction:column; gap:2px; }
    .out-label { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--tn-mute); font-weight:600; }
    .out-val { font-family:var(--font-display); font-size:26px; color:var(--tn-indigo-900); }
    .out-val small { font-size:12px; color:var(--tn-slate); margin-left:4px; font-family:var(--font-sans); }
    .muted-out .note { font-size:12px; color:var(--tn-orange-700); font-style:italic; }
    .crit { margin:6px 0 0; padding-left:16px; font-size:11.5px; color:var(--tn-slate); }
    .crit li { margin-bottom:2px; }
    .conn { align-self:center; color:var(--tn-indigo-300); font-size:22px; font-weight:700; }
    .confluence { text-align:center; font-size:30px; color:var(--tn-indigo-300); margin:6px 0; }
    .ecp-panel { background:var(--tn-indigo-900); color:white; border-radius:var(--r-lg); padding:28px; }
    .ecp-head .eyebrow { color:var(--tn-orange-400); }
    .ecp-head h2 { color:white; margin:6px 0 18px; }
    .ecp-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
    .ecp-kpis .kpi { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); }
    .ecp-kpis .kpi .label { color:rgba(255,255,255,.6); }
    .ecp-kpis .kpi .value { color:white; }
    .ecp-kpis .kpi.accent { background:var(--tn-orange-500); border-color:var(--tn-orange-500); }
    .ecp-kpis .kpi.accent .value, .ecp-kpis .kpi.accent .label { color:white; }
    .ecp-kpis .kpi .unit { color:rgba(255,255,255,.75); }
    .val-row { margin-top:18px; }
  `],
})
export class FlujoComponent implements OnChanges {
  @Input() periodo!: string;
  data?: FlujoResponse;
  piso: EtapaFlujo[] = [];
  conta: EtapaFlujo[] = [];

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (!this.periodo) return;
    this.api.flujo(this.periodo).subscribe(d => {
      this.data = d;
      this.piso = d.etapas.filter(e => e.carril === 'piso');
      this.conta = d.etapas.filter(e => e.carril === 'contabilidad');
    });
  }
}
