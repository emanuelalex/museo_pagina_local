import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { Escuela, Responsable } from '../models/exhibicion';
import { Horario, Sala } from '../models/horario';

@Injectable({ providedIn: 'root' })
export class Museo {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private options = () => ({ headers: this.auth.authHeaders() });

  obtenerEscuelas(): Observable<Escuela[]> {
    return this.http.get<Escuela[]>('/api/escuelas', this.options());
  }

  registrarEscuela(datos: {
    nombre: string;
    clave_escuela: string;
    tipo_escuela: string;
    direccion: string;
    telefono: string;
    correo: string;
  }): Observable<{ mensaje: string; id_escuela: number }> {
    return this.http.post<{ mensaje: string; id_escuela: number }>(
      '/api/escuelas', datos, this.options()
    );
  }

  registrarResponsable(datos: {
    id_escuela: number; nombre: string; apellido: string; telefono: string; correo: string; cargo: string;
  }): Observable<{ mensaje: string; id_responsable: number }> {
    return this.http.post<{ mensaje: string; id_responsable: number }>(
      '/api/responsables', datos, this.options()
    );
  }

  obtenerResponsables(): Observable<Responsable[]> {
    return this.http.get<Responsable[]>('/api/responsables', this.options());
  }

  obtenerSalas(): Observable<Sala[]> {
    return this.http.get<Sala[]>('/api/salas', this.options());
  }

  obtenerHorarios(): Observable<Horario[]> {
    return this.http.get<Horario[]>('/api/horarios', this.options());
  }
}
