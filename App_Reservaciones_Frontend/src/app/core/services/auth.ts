import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  mensaje: string;
  token: string;
  usuario: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = '/api';

  login(
    usuario: string,
    password: string
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { usuario, password }
    ).pipe(
      tap(response => {
        sessionStorage.setItem(
          'token',
          response.token
        );
        sessionStorage.setItem(
          'rol',
          response.rol
        );
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('rol');
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }
}

