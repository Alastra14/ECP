import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { UploadResultado } from './models';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="fade-in">
    <div class="card" style="max-width:760px">
      <span class="eyebrow">Carga mensual</span>
      <h2 style="margin:6px 0 8px">Sube los Excel del mes</h2>
      <p class="muted" style="margin-top:0">
        Volumen de producción, análisis de variación de MP, mayor MOD/CIF y presupuestos.
        El sistema reconoce cada archivo por su nombre.
      </p>

      <div class="drop" [class.over]="over"
           (dragover)="$event.preventDefault(); over=true"
           (dragleave)="over=false"
           (drop)="onDrop($event)">
        <input #fi type="file" multiple accept=".xlsx,.csv" (change)="onPick($event)" hidden />
        <div class="drop-inner">
          <div class="drop-ico">⬆</div>
          <p><b>Arrastra los archivos aquí</b> o <button class="link" (click)="fi.click()">selecciónalos</button></p>
          <p class="muted small">.xlsx / .csv</p>
        </div>
      </div>

      <ul class="files" *ngIf="files.length">
        <li *ngFor="let f of files; let i = index">
          <span>{{ f.name }}</span>
          <button class="link" (click)="quitar(i)">quitar</button>
        </li>
      </ul>

      <div style="margin-top:16px; display:flex; gap:10px">
        <button class="btn btn-primary" [disabled]="!files.length || cargando" (click)="subir()">
          {{ cargando ? 'Procesando…' : 'Subir y procesar' }}
        </button>
        <button class="btn btn-ghost" [disabled]="cargando" (click)="sembrar()">Cargar datos de referencia</button>
      </div>
    </div>

    <div class="card" style="max-width:760px; margin-top:18px" *ngIf="resultado as r">
      <h3>Resultado de la ingesta</h3>
      <p class="muted">Componentes guardados: <b>{{ r.guardados }}</b>
        <span *ngIf="r.periodos_afectados.length"> · periodos: {{ r.periodos_afectados.join(', ') }}</span></p>
      <table class="ecp" style="margin-top:8px">
        <thead><tr><th>Archivo</th><th>Tipo</th><th>Filas</th><th>Estado</th></tr></thead>
        <tbody>
          <tr *ngFor="let d of r.detalle">
            <td>{{ d.archivo }}</td><td>{{ d.tipo }}</td><td>{{ d.filas }}</td>
            <td><span class="badge" [class.ok]="d.estado==='ok'" [class.warn]="d.estado!=='ok' && d.estado!=='error'" [class.err]="d.estado==='error'">{{ d.estado }}</span></td>
          </tr>
        </tbody>
      </table>
      <p class="muted small" *ngIf="r.faltantes.length" style="margin-top:10px">
        Pendientes de consolidar (cierre contable, fase de endurecimiento): {{ r.faltantes.join(', ') }}
      </p>
    </div>
  </div>
  `,
  styles: [`
    .drop { margin-top:16px; border:2px dashed var(--tn-indigo-300); border-radius:var(--r-lg);
      background:var(--tn-indigo-50); padding:34px; text-align:center; transition:all var(--dur) var(--ease); }
    .drop.over { border-color:var(--tn-orange-500); background:var(--tn-orange-50); }
    .drop-ico { font-size:34px; color:var(--tn-indigo-500); }
    .link { border:none; background:none; color:var(--tn-orange-700); font-weight:600; cursor:pointer; padding:0; font-size:inherit; }
    .small { font-size:12px; }
    .files { list-style:none; padding:0; margin:14px 0 0; }
    .files li { display:flex; justify-content:space-between; padding:8px 12px; border:1px solid var(--color-border);
      border-radius:var(--r-sm); margin-bottom:6px; font-size:14px; background:white; }
  `],
})
export class UploadComponent {
  @Output() cargado = new EventEmitter<void>();
  files: File[] = [];
  over = false;
  cargando = false;
  resultado?: UploadResultado;

  constructor(private api: ApiService) {}

  onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.files.push(...Array.from(input.files));
  }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.over = false;
    if (e.dataTransfer?.files) this.files.push(...Array.from(e.dataTransfer.files));
  }
  quitar(i: number) { this.files.splice(i, 1); }

  subir() {
    if (!this.files.length) return;
    this.cargando = true;
    this.api.upload(this.files).subscribe({
      next: r => { this.resultado = r; this.cargando = false; this.files = []; this.cargado.emit(); },
      error: () => { this.cargando = false; },
    });
  }

  sembrar() {
    this.cargando = true;
    this.api.seed().subscribe({
      next: () => { this.cargando = false; this.cargado.emit(); },
      error: () => { this.cargando = false; },
    });
  }
}
