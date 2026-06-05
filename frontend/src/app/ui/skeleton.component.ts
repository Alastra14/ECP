import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Skeleton de carga con shimmer. <app-skeleton variant="dashboard"|"kpis"|"chart"|"table"> */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="sk-wrap" [ngSwitch]="variant">
    <ng-container *ngSwitchCase="'dashboard'">
      <div class="sk-row">
        <div class="sk sk-kpi" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>
      <div class="sk-grid">
        <div class="sk sk-panel"></div>
        <div class="sk sk-panel"></div>
      </div>
      <div class="sk sk-panel tall"></div>
    </ng-container>

    <div class="sk-row" *ngSwitchCase="'kpis'">
      <div class="sk sk-kpi" *ngFor="let i of [1,2,3,4,5]"></div>
    </div>

    <div class="sk sk-panel" *ngSwitchCase="'chart'"></div>

    <div *ngSwitchCase="'table'">
      <div class="sk sk-line" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
    </div>
  </div>
  `,
  styles: [`
    .sk-wrap { display:flex; flex-direction:column; gap:20px; }
    .sk-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:16px; }
    .sk-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    .sk { position:relative; overflow:hidden; border-radius:12px;
      background:#ece8f1; border:1px solid #E4E1EC; }
    .sk::after { content:''; position:absolute; inset:0;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent);
      transform:translateX(-100%); animation:sk-shimmer 1.4s infinite; }
    @keyframes sk-shimmer { 100% { transform:translateX(100%); } }
    .sk-kpi { height:104px; }
    .sk-panel { height:280px; }
    .sk-panel.tall { height:340px; }
    .sk-line { height:34px; margin-bottom:8px; border-radius:8px; }
    @media (max-width:760px){ .sk-grid{ grid-template-columns:1fr; } }
  `],
})
export class SkeletonComponent {
  @Input() variant: 'dashboard' | 'kpis' | 'chart' | 'table' = 'dashboard';
}
