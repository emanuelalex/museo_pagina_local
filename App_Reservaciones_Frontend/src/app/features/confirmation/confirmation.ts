import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

interface DatosReservacion {
  id_cita: number;
  institucion: string;
  clave_escuela: string;
  responsable: string;
  sala: string;
  fecha: string;
  horario: string;
  estudiantes: number;
  maestros: number;
  estado: string;
}

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css'
})
export class Confirmation implements OnInit {
  folio = '';
  institucion = '';
  cct = '';
  responsable = '';
  sala = '';
  fecha = '';
  horario = '';
  estudiantes = 0;
  maestros = 0;
  estado = 'Pendiente';
  nombreUsuario = '';
  datosDisponibles = false;

  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const reservacion = history.state?.reservacion as DatosReservacion | undefined;
    if (!reservacion?.id_cita) {
      this.router.navigate(['/reservaciones/nueva']);
      return;
    }
    this.nombreUsuario = this.auth.getUsuario() || 'Administrador';
    this.folio = `C-${reservacion.id_cita}`;
    this.institucion = reservacion.institucion;
    this.cct = reservacion.clave_escuela || '';
    this.responsable = reservacion.responsable;
    this.sala = reservacion.sala;
    this.fecha = reservacion.fecha;
    this.horario = reservacion.horario;
    this.estudiantes = reservacion.estudiantes;
    this.maestros = reservacion.maestros;
    this.estado = reservacion.estado;
    this.datosDisponibles = true;
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  get totalAsistentes(): number {
    return this.estudiantes + this.maestros;
  }
}
