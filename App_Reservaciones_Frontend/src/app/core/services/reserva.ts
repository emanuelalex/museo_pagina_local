import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';
import { Cita, NuevaCita } from '../models/reserva';
import { SalaCita } from '../models/horario';

@Injectable({ providedIn: 'root' })
export class Reserva {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private options = () => ({ headers: this.auth.authHeaders() });

  obtenerCitas(): Observable<Cita[]> {
    return this.http.get<Cita[]>('/api/citas', this.options());
  }

  obtenerSalasCita(id: number): Observable<SalaCita[]> {
    return this.http.get<SalaCita[]>(`/api/citas/${id}/salas`, this.options());
  }

  crearCita(datos: NuevaCita): Observable<{ mensaje: string; id_cita: number }> {
    return this.http.post<{ mensaje: string; id_cita: number }>('/api/citas', datos, this.options());
  }

  eliminarCita(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`/api/citas/${id}`, this.options());
  }

  cambiarEstado(id: number, estado: Cita['estado']): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`/api/citas/${id}/estado`, { estado }, this.options());
  }
}
