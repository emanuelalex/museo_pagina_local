import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  mensaje: string;
  token: string;
  usuario: string;
  rol: 'usuario' | 'admin';
}

export interface SesionResponse {
  id: number;
  usuario: string;
  rol: 'usuario' | 'admin';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = '/api';

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { usuario, password }).pipe(
      tap(response => {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('token', response.token);
          sessionStorage.setItem('rol', response.rol);
          sessionStorage.setItem('usuario', response.usuario);
        }
      })
    );
  }

  comprobarSesion(): Observable<SesionResponse> {
    return this.http.get<SesionResponse>(`${this.apiUrl}/sesion`, { headers: this.authHeaders() }).pipe(tap(sesion => {
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem('rol', sesion.rol);
        sessionStorage.setItem('usuario', sesion.usuario);
      }
    }));
  }

  authHeaders(): HttpHeaders {
    const token = isPlatformBrowser(this.platformId) ? sessionStorage.getItem('token') : null;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('rol');
      sessionStorage.removeItem('usuario');
    }
  }

  getToken(): string | null {
    return isPlatformBrowser(this.platformId) ? sessionStorage.getItem('token') : null;
  }

  getRol(): string | null {
    return isPlatformBrowser(this.platformId) ? sessionStorage.getItem('rol') : null;
  }

  getUsuario(): string {
    return isPlatformBrowser(this.platformId) ? sessionStorage.getItem('usuario') || '' : '';
  }
}
