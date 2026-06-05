import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { FlujoComponent } from './flujo.component';
import { ReporteComponent } from './reporte.component';
import { UploadComponent } from './upload.component';

type Tab = 'flujo' | 'reporte' | 'cargar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FlujoComponent, ReporteComponent, UploadComponent],
  template: `
  <div class="app-shell">
    <header class="topbar">
      <img class="logo" src="/brand/logo-ternova-positivo.png" alt="Ternova"
           onerror="this.style.display='none'" />
      <span class="brandword">ECP<small>·</small></span>
      <span class="muted" style="font-size:13px">Estado de Costo de Producción</span>
      <span class="spacer"></span>
      <nav class="tabs">
        <button class="tab" [class.active]="tab==='flujo'" (click)="tab='flujo'">Flujo</button>
        <button class="tab" [class.active]="tab==='reporte'" (click)="tab='reporte'">Reporte ECP</button>
        <button class="tab" [class.active]="tab==='cargar'" (click)="tab='cargar'">Cargar</button>
      </nav>
    </header>

    <main class="content">
      <div class="page-head">
        <span class="eyebrow">Termoencogibles · Ternova Packaging</span>
        <h1 *ngIf="tab==='flujo'">Flujo del proceso ECP</h1>
        <h1 *ngIf="tab==='reporte'">Reporte de Costo de Producción</h1>
        <h1 *ngIf="tab==='cargar'">Carga de información</h1>
      </div>

      <div class="period-row" *ngIf="tab!=='cargar' && periodos.length">
        <span class="muted" style="font-size:13px; margin-right:4px">Periodo:</span>
        <button class="period" *ngFor="let p of periodos" [class.active]="p===periodoSel"
                (click)="periodoSel=p">{{ etiquetaPeriodo(p) }}</button>
      </div>

      <ng-container *ngIf="periodos.length === 0 && tab!=='cargar'">
        <div class="card" style="max-width:560px">
          <h3>Sin datos cargados</h3>
          <p class="muted">Ve a <b>Cargar</b> para subir los Excel del mes, o pulsa el botón para cargar los datos de referencia.</p>
          <button class="btn btn-accent" (click)="sembrar()">Cargar datos de referencia</button>
        </div>
      </ng-container>

      <app-flujo *ngIf="tab==='flujo' && periodoSel" [periodo]="periodoSel"></app-flujo>
      <app-reporte *ngIf="tab==='reporte' && periodoSel" [periodo]="periodoSel"></app-reporte>
      <app-upload *ngIf="tab==='cargar'" (cargado)="recargarPeriodos()"></app-upload>
    </main>
  </div>
  `,
})
export class AppComponent implements OnInit {
  tab: Tab = 'flujo';
  periodos: string[] = [];
  periodoSel = '';
  activo = '';

  private meses = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  constructor(private api: ApiService) {}

  ngOnInit() { this.recargarPeriodos(true); }

  recargarPeriodos(intentarSeed = false) {
    this.api.periodos().subscribe(r => {
      this.activo = r.activo;
      this.periodos = r.periodos;
      if (r.periodos.length) {
        this.periodoSel = r.periodos.includes(r.activo) ? r.activo : r.periodos[r.periodos.length - 1];
      } else if (intentarSeed === true) {
        this.sembrar();
      }
    });
  }

  sembrar() { this.api.seed().subscribe(() => this.recargarPeriodos()); }

  etiquetaPeriodo(p: string): string {
    const [a, m] = p.split('-');
    return `${this.meses[+m]} ${a}`;
  }
}
