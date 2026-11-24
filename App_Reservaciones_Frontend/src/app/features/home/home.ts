import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, timeout, finalize } from 'rxjs/operators';
import { Reserva } from '../../core/services/reserva';
import { Museo } from '../../core/services/museo';
import { Cita } from '../../core/models/reserva';
import { SalaCita, Sala } from '../../core/models/horario';
import { AuthService } from '../../core/services/auth';

interface VisitaHoy {
  escuela: string;
  hora: string;
  sala: string;
  personas: number;
  estado: Cita['estado'];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private reservaService = inject(Reserva);
  private museo = inject(Museo);
  private auth = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  nombreUsuario = this.auth.getUsuario() || 'Administrador';
  get esAdmin(): boolean { return this.auth.getRol() === 'admin'; }
  get rolUsuario(): string { return this.esAdmin ? 'Administración' : 'Supervisor'; }
  cargando = true;
  errorMensaje = '';
  reservacionesHoy = 0;
  visitantesEsperados = 0;
  salasDisponibles = 0;
  totalSalas = 0;
  salasInactivas = 0;
  reservaciones: VisitaHoy[] = [];
  private readonly limiteVisitas = 5;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.cargando = true;
    this.errorMensaje = '';
    this.reservaciones = [];

    forkJoin({
      citas: this.reservaService.obtenerCitas().pipe(timeout({ first: 8000 })),
      escuelas: this.museo.obtenerEscuelas().pipe(timeout({ first: 8000 })),
      salas: this.museo.obtenerSalas().pipe(timeout({ first: 8000 }))
    }).pipe(
      switchMap(({ citas, escuelas, salas }) => {
        const hoy = this.fechaActual();
        const citasHoy = citas.filter(c => (c.fecha_visita || '').slice(0, 10) === hoy);
        const consultas = citasHoy.map(cita =>
          this.reservaService.obtenerSalasCita(cita.id_cita).pipe(
            timeout({ first: 8000 }),
            catchError(() => of([] as SalaCita[])),
            map(asignaciones => {
              const escuela = escuelas.find(e => e.id_escuela === cita.id_escuela);
              return {
                escuela: escuela?.nombre || 'Escuela no disponible',
                hora: cita.hora_llegada ? cita.hora_llegada.slice(0, 5) : '--:--',
                sala: asignaciones.map(a => a.sala).filter(Boolean).join(', ') || 'Sin sala asignada',
                personas: Number(cita.cantidad_alumnos || 0) + Number(cita.cantidad_maestros || 0),
                estado: cita.estado
              } as VisitaHoy;
            })
          )
        );
        return (consultas.length ? forkJoin(consultas) : of([] as VisitaHoy[])).pipe(
          map(visitas => ({ citasHoy, visitas, salas }))
        );
      }),
      timeout({ first: 15000 }),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: ({ citasHoy, visitas, salas }) => {
        this.reservacionesHoy = citasHoy.length;
        this.visitantesEsperados = citasHoy.reduce((total, c) => total + Number(c.cantidad_alumnos || 0) + Number(c.cantidad_maestros || 0), 0);
        this.salasDisponibles = salas.filter((s: Sala) => Number(s.activa) === 1).length;
        this.totalSalas = salas.length;
        this.salasInactivas = salas.filter((s: Sala) => Number(s.activa) !== 1).length;
        this.reservaciones = visitas.sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, this.limiteVisitas);
      },
      error: error => {
        this.errorMensaje = error.name === 'TimeoutError'
          ? 'La consulta tardó demasiado. Intenta nuevamente.'
          : error.error?.mensaje || 'No fue posible cargar el resumen del museo.';
      }
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private fechaActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }
}
