import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EcpResponse, FlujoResponse, UploadResultado, SeriePunto } from './models';

// En dev (ng serve :4200) apunta al backend en :8000; en prod usa rutas relativas.
const BASE = (typeof window !== 'undefined' && window.location.port === '4200')
  ? 'http://localhost:8000' : '';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  health(): Observable<any> { return this.http.get(`${BASE}/api/health`); }

  periodos(): Observable<{ periodos: string[]; activo: string }> {
    return this.http.get<{ periodos: string[]; activo: string }>(`${BASE}/api/periodos`);
  }

  ecp(periodo: string): Observable<EcpResponse> {
    return this.http.get<EcpResponse>(`${BASE}/api/ecp/${periodo}`);
  }

  flujo(periodo: string): Observable<FlujoResponse> {
    return this.http.get<FlujoResponse>(`${BASE}/api/flujo/${periodo}`);
  }

  serie(): Observable<{ puntos: SeriePunto[] }> {
    return this.http.get<{ puntos: SeriePunto[] }>(`${BASE}/api/serie`);
  }

  seed(): Observable<any> { return this.http.post(`${BASE}/api/seed`, {}); }

  upload(files: File[]): Observable<UploadResultado> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f, f.name));
    return this.http.post<UploadResultado>(`${BASE}/api/upload`, fd);
  }

  exportUrl(periodo: string): string { return `${BASE}/api/export/${periodo}`; }
}
