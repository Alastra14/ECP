import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const C = {
  indigo: '#1D0447', indigo200: '#C9BFE0', indigo500: '#5A37B0',
  orange: '#FF6A00', green: '#3E8F5A', red: '#C4413A', amber: '#E2A235',
  line: '#E4E1EC', slate: '#8A8599', white: '#FFFFFF',
};

function fmt(v: number, dec = 0): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/* ---------- Waterfall / Bridge de variaciones ---------- */
export interface PasoWaterfall { label: string; valor: number; tipo: 'base' | 'delta' | 'total'; }

@Component({
  selector: 'app-waterfall',
  standalone: true,
  imports: [CommonModule],
  template: `
  <svg [attr.viewBox]="'0 0 '+w+' '+h" style="width:100%;height:auto;display:block">
    <g *ngFor="let t of ticks">
      <line [attr.x1]="padL" [attr.x2]="w-padR" [attr.y1]="t.y" [attr.y2]="t.y"
            [attr.stroke]="C.line" stroke-width="1" [attr.stroke-dasharray]="t.zero ? '' : '2 4'"/>
      <text [attr.x]="padL-8" [attr.y]="t.y+4" text-anchor="end" font-size="10" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ t.label }}</text>
    </g>
    <g *ngFor="let b of bars">
      <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="bw" [attr.height]="b.hgt" rx="3" [attr.fill]="b.color"/>
      <text [attr.x]="b.x+bw/2" [attr.y]="b.y-5" text-anchor="middle" font-size="10" font-weight="600"
            [attr.fill]="b.color" font-family="Space Grotesk">{{ b.tag }}</text>
      <text [attr.x]="b.x+bw/2" [attr.y]="h-padB+14" text-anchor="middle" font-size="9.5" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ b.label }}</text>
    </g>
  </svg>
  `,
})
export class WaterfallComponent {
  C = C; w = 760; h = 260; padL = 50; padR = 16; padT = 28; padB = 40;
  @Input() decimales = 3;
  bars: any[] = []; ticks: any[] = []; bw = 36;

  @Input() set pasos(ps: PasoWaterfall[]) {
    if (!ps?.length) return;
    const innerW = this.w - this.padL - this.padR;
    const innerH = this.h - this.padT - this.padB;
    this.bw = Math.min(46, innerW / ps.length - 14);

    // Acumulados para ubicar cada barra flotante
    let acc = 0; const tops: number[] = []; const bots: number[] = [];
    ps.forEach(p => {
      if (p.tipo === 'base' || p.tipo === 'total') { bots.push(0); tops.push(p.valor); acc = p.valor; }
      else { const start = acc; acc += p.valor; bots.push(Math.min(start, acc)); tops.push(Math.max(start, acc)); }
    });
    const maxV = Math.max(...tops, 0.0001); const minV = Math.min(...bots, 0);
    const span = (maxV - minV) || 1;
    const y = (v: number) => this.padT + innerH - ((v - minV) / span) * innerH;

    this.ticks = [0, .25, .5, .75, 1].map(f => {
      const v = minV + f * span;
      return { y: y(v), label: this.decimales >= 3 ? v.toFixed(2) : fmt(v), zero: Math.abs(v) < 1e-9 };
    });

    this.bars = ps.map((p, i) => {
      const x = this.padL + (innerW / ps.length) * i + (innerW / ps.length - this.bw) / 2;
      const yTop = y(tops[i]); const yBot = y(bots[i]);
      let color = C.indigo;
      if (p.tipo === 'delta') color = p.valor > 0 ? C.red : C.green; // costo sube = rojo
      const signed = (p.tipo === 'delta' && p.valor > 0 ? '+' : '') +
        (this.decimales >= 3 ? p.valor.toFixed(3) : fmt(p.valor));
      return { x, y: yTop, hgt: Math.max(2, yBot - yTop), color, label: p.label, tag: signed };
    });
  }
}

/* ---------- Tendencia (línea + área, con banda PPTO) ---------- */
@Component({
  selector: 'app-trend',
  standalone: true,
  imports: [CommonModule],
  template: `
  <svg [attr.viewBox]="'0 0 '+w+' '+h" style="width:100%;height:auto;display:block">
    <g *ngFor="let t of ticks">
      <line [attr.x1]="padL" [attr.x2]="w-padR" [attr.y1]="t.y" [attr.y2]="t.y" [attr.stroke]="C.line"
            stroke-width="1" [attr.stroke-dasharray]="t.zero?'':'2 4'"/>
      <text [attr.x]="padL-8" [attr.y]="t.y+4" text-anchor="end" font-size="10" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ t.label }}</text>
    </g>
    <polygon *ngIf="area" [attr.points]="area" [attr.fill]="C.indigo" fill-opacity="0.08"/>
    <polyline *ngIf="pptoLine" [attr.points]="pptoLine" fill="none" [attr.stroke]="C.orange"
              stroke-width="2" stroke-dasharray="4 4"/>
    <polyline *ngIf="realLine" [attr.points]="realLine" fill="none" [attr.stroke]="C.indigo" stroke-width="2.5"/>
    <g *ngFor="let p of pts">
      <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" [attr.fill]="C.indigo"/>
      <text [attr.x]="p.x" [attr.y]="p.y-9" text-anchor="middle" font-size="10" font-weight="600"
            [attr.fill]="C.indigo" font-family="Space Grotesk">{{ p.tag }}</text>
      <text [attr.x]="p.x" [attr.y]="h-padB+15" text-anchor="middle" font-size="10" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ p.label }}</text>
    </g>
  </svg>
  `,
})
export class TrendComponent {
  C = C; w = 760; h = 240; padL = 50; padR = 16; padT = 24; padB = 38;
  pts: any[] = []; ticks: any[] = []; realLine = ''; pptoLine = ''; area = '';
  @Input() unidad = ''; @Input() decimales = 3;

  @Input() set datos(d: { label: string; real: number; ppto?: number | null }[]) {
    if (!d?.length) return;
    const innerW = this.w - this.padL - this.padR;
    const innerH = this.h - this.padT - this.padB;
    const vals = d.flatMap(x => [x.real, x.ppto ?? x.real]);
    const maxV = Math.max(...vals) * 1.1; const minV = Math.min(...vals, 0) * 0.95;
    const span = (maxV - minV) || 1;
    const x = (i: number) => this.padL + (d.length === 1 ? innerW / 2 : (innerW / (d.length - 1)) * i);
    const y = (v: number) => this.padT + innerH - ((v - minV) / span) * innerH;

    this.ticks = [0, .25, .5, .75, 1].map(f => {
      const v = minV + f * span;
      return { y: y(v), label: this.decimales >= 3 ? v.toFixed(2) : fmt(v), zero: false };
    });
    this.pts = d.map((p, i) => ({
      x: x(i), y: y(p.real), label: p.label,
      tag: this.decimales >= 3 ? p.real.toFixed(2) : fmt(p.real),
    }));
    this.realLine = this.pts.map(p => `${p.x},${p.y}`).join(' ');
    const hasPpto = d.some(p => p.ppto != null);
    this.pptoLine = hasPpto ? d.map((p, i) => `${x(i)},${y(p.ppto ?? p.real)}`).join(' ') : '';
    if (this.pts.length > 1) {
      this.area = `${this.pts[0].x},${y(minV)} ` + this.realLine + ` ${this.pts[this.pts.length - 1].x},${y(minV)}`;
    }
  }
}

/* ---------- Mix de costo (barra apilada 100%) ---------- */
export interface ParteMix { label: string; valor: number; color: string; }

@Component({
  selector: 'app-mix',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="mix-wrap">
    <div class="mix-bar">
      <div *ngFor="let s of segs" class="seg" [style.width.%]="s.pct" [style.background]="s.color"
           [title]="s.label + ': ' + s.pctTxt + '%'"></div>
    </div>
    <div class="mix-legend">
      <div *ngFor="let s of segs" class="lg">
        <span class="sw" [style.background]="s.color"></span>{{ s.label }}
        <b>{{ s.pctTxt }}%</b>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .mix-bar { display:flex; height:26px; border-radius:8px; overflow:hidden; border:1px solid var(--tn-line,#E4E1EC); }
    .seg { height:100%; }
    .mix-legend { display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:12.5px; color:#5A5468; }
    .lg { display:flex; align-items:center; gap:6px; }
    .lg b { color:#1D0447; }
    .sw { width:12px; height:12px; border-radius:3px; display:inline-block; }
  `],
})
export class MixComponent {
  segs: any[] = [];
  @Input() set partes(ps: ParteMix[]) {
    const tot = ps.reduce((a, p) => a + Math.max(0, p.valor), 0) || 1;
    this.segs = ps.map(p => {
      const pct = (Math.max(0, p.valor) / tot) * 100;
      return { ...p, pct, pctTxt: pct.toFixed(1) };
    });
  }
}

/* ---------- Comparativo de barras por línea (Real vs PPTO) ---------- */
@Component({
  selector: 'app-bars',
  standalone: true,
  imports: [CommonModule],
  template: `
  <svg [attr.viewBox]="'0 0 '+w+' '+h" style="width:100%;height:auto;display:block">
    <g *ngFor="let t of ticks">
      <line [attr.x1]="padL" [attr.x2]="w-padR" [attr.y1]="t.y" [attr.y2]="t.y" [attr.stroke]="C.line"
            stroke-width="1" [attr.stroke-dasharray]="t.zero?'':'2 4'"/>
      <text [attr.x]="padL-6" [attr.y]="t.y+4" text-anchor="end" font-size="10" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ t.label }}</text>
    </g>
    <g *ngFor="let g of groups">
      <rect [attr.x]="g.xp" [attr.y]="g.yp" [attr.width]="bw" [attr.height]="g.hp" rx="3" [attr.fill]="C.indigo200"/>
      <rect [attr.x]="g.xr" [attr.y]="g.yr" [attr.width]="bw" [attr.height]="g.hr" rx="3" [attr.fill]="C.indigo"/>
      <text [attr.x]="g.cx" [attr.y]="h-padB+14" text-anchor="middle" font-size="10" [attr.fill]="C.slate"
            font-family="Space Grotesk">{{ g.label }}</text>
    </g>
    <g>
      <rect [attr.x]="padL" y="6" width="11" height="11" rx="2" [attr.fill]="C.indigo"/>
      <text [attr.x]="padL+16" y="15" font-size="10" [attr.fill]="C.slate" font-family="Space Grotesk">Real</text>
      <rect [attr.x]="padL+58" y="6" width="11" height="11" rx="2" [attr.fill]="C.indigo200"/>
      <text [attr.x]="padL+74" y="15" font-size="10" [attr.fill]="C.slate" font-family="Space Grotesk">PPTO</text>
    </g>
  </svg>
  `,
})
export class BarsComponent {
  C = C; w = 760; h = 240; padL = 46; padR = 16; padT = 24; padB = 38; bw = 14;
  groups: any[] = []; ticks: any[] = [];
  @Input() set datos(d: { label: string; real: number; ppto: number }[]) {
    if (!d?.length) return;
    const innerW = this.w - this.padL - this.padR;
    const innerH = this.h - this.padT - this.padB;
    const maxV = Math.max(1, ...d.flatMap(x => [x.real, x.ppto]));
    const groupW = innerW / d.length;
    this.bw = Math.min(16, (groupW - 10) / 2);
    const y = (v: number) => this.padT + innerH - (v / maxV) * innerH;
    this.ticks = [0, .25, .5, .75, 1].map(f => ({ y: y(maxV * f), label: fmt(maxV * f), zero: f === 0 }));
    this.groups = d.map((x, i) => {
      const cx = this.padL + groupW * i + groupW / 2;
      return {
        label: x.label, cx,
        xp: cx - this.bw - 2, yp: y(x.ppto), hp: this.padT + innerH - y(x.ppto),
        xr: cx + 2, yr: y(x.real), hr: this.padT + innerH - y(x.real),
      };
    });
  }
}
