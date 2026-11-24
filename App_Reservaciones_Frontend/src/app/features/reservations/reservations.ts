import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, timeout, finalize } from 'rxjs/operators';
import { Cita } from '../../core/models/reserva';
import { Escuela, Responsable } from '../../core/models/exhibicion';
import { SalaCita } from '../../core/models/horario';
import { Museo } from '../../core/services/museo';
import { Reserva } from '../../core/services/reserva';
import { AuthService } from '../../core/services/auth';

export interface ReservacionVista extends Cita {
  folio: string;
  institucion: string;
  clave_escuela: string;
  responsable: string;
  telefono: string;
  sala: string;
  horarioCompleto: string;
  salasAsignadas: SalaCita[];
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class Reservations implements OnInit {
  private museo = inject(Museo);
  private reservaService = inject(Reserva);
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private router = inject(Router);

  get esAdmin(): boolean { return this.auth.getRol() === 'admin'; }
  cargando = true;
  errorMensaje = '';
  busqueda = '';
  filtroFecha = '';
  filtroAnio = '';
  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  get anios(): string[] { return [...new Set(this.reservaciones.map(r => r.fecha_visita.slice(0,4)))].sort().reverse(); }
  filtroSala = '';
  filtroEstado = '';
  paginaActual = 1;
  registrosPorPagina = 5;
  salas: string[] = [];
  reservaciones: ReservacionVista[] = [];
  reservacionSeleccionada: ReservacionVista | null = null;
  actualizandoEstado = false;
  private cdr = inject(ChangeDetectorRef);
  reservacionEditada: ReservacionVista | null = null;
  estadosEditables = ['Pendiente', 'Confirmada', 'Cancelada'] as const;
  nuevoEstado: Cita['estado'] = 'Pendiente';
  errorEdicion = '';
  mensajeEstado = '';

  reservacionAEliminar: ReservacionVista | null = null;
  eliminando = false;
  errorEliminacion = '';

  solicitarEliminacion(cita: ReservacionVista): void {
    if (!this.esAdmin) return;
    if (this.eliminando || this.actualizandoEstado || this.cargando) return;
    this.reservacionAEliminar = cita;
    this.errorEliminacion = '';
    this.mensajeEstado = '';
  }

  cerrarEliminacion(): void {
    if (!this.eliminando) this.reservacionAEliminar = null;
  }

  confirmarEliminacion(): void {
    if (!this.esAdmin) return;
    const cita = this.reservacionAEliminar;
    if (!cita || this.eliminando || this.actualizandoEstado) return;
    this.eliminando = true;
    this.errorEliminacion = '';
    this.reservaService.eliminarCita(cita.id_cita).pipe(
      timeout(15000),
      finalize(() => { this.eliminando = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: () => {
        this.reservaciones = this.reservaciones.filter(r => r.id_cita !== cita.id_cita);
        this.salas = [...new Set(this.reservaciones.flatMap(r => r.sala === 'Recorrido completo' ? [r.sala] : r.salasAsignadas.map(s => s.sala)))];
        if (!this.salas.includes(this.filtroSala)) this.filtroSala = '';
        if (!this.anios.includes(this.filtroAnio)) this.filtroAnio = '';
        this.paginaActual = Math.min(this.paginaActual, this.totalPaginas);
        if (this.reservacionSeleccionada?.id_cita === cita.id_cita) this.reservacionSeleccionada = null;
        this.reservacionAEliminar = null;
        this.mensajeEstado = `Reservación ${cita.folio} eliminada correctamente.`;
      },
      error: error => {
        this.errorEliminacion = error.error?.mensaje || 'No se pudo confirmar la eliminación. Recarga el listado antes de reintentar.';
      }
    });
  }

  editarReservacion(reservacion: ReservacionVista): void {
    if (!this.esAdmin) return;
    if (this.eliminando || this.actualizandoEstado || reservacion.estado === 'Realizada') return;
    this.reservacionEditada = reservacion;
    this.nuevoEstado = reservacion.estado;
    this.errorEdicion = '';
    this.mensajeEstado = '';
  }

  cerrarEdicion(): void {
    if (!this.actualizandoEstado) this.reservacionEditada = null;
  }

  guardarEstado(): void {
    if (!this.esAdmin) return;
    const cita = this.reservacionEditada;
    const estado = this.nuevoEstado;
    if (!cita || this.actualizandoEstado || cita.estado === estado ||
        cita.estado === 'Realizada' || estado === 'Realizada' ||
        !this.estadosEditables.includes(estado)) return;
    this.actualizandoEstado = true;
    this.errorEdicion = '';
    this.reservaService.cambiarEstado(cita.id_cita, estado).pipe(
      timeout(12000),
      finalize(() => {
        this.actualizandoEstado = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        cita.estado = estado;
        if (this.reservacionSeleccionada?.id_cita === cita.id_cita) {
          this.reservacionSeleccionada = { ...cita };
        }
        this.paginaActual = Math.min(this.paginaActual, this.totalPaginas);
        this.mensajeEstado = `Reservación ${cita.folio}: estado actualizado a ${estado}.`;
        this.reservacionEditada = null;
      },
      error: error => {
        this.errorEdicion = error.error?.mensaje || (error.name === 'TimeoutError'
          ? 'El servidor tardó demasiado. Consulta el estado actual antes de reintentar.'
          : 'No fue posible actualizar el estado.');
      }
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.cargarReservaciones();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  cargarReservaciones(): void {
    this.cargando = true;
    this.errorMensaje = '';

    forkJoin({
      citas: this.reservaService.obtenerCitas(),
      escuelas: this.museo.obtenerEscuelas(),
      responsables: this.museo.obtenerResponsables()
    }).pipe(
      switchMap(({ citas, escuelas, responsables }) => {
        const consultas = citas.map(cita =>
          this.reservaService.obtenerSalasCita(cita.id_cita).pipe(
            catchError(() => of([] as SalaCita[])),
            map(asignaciones => {
              const escuela = escuelas.find(e => e.id_escuela === cita.id_escuela);
              const responsable = responsables.find(r => r.id_responsable === cita.id_responsable);
              const completo = /^Tipo de recorrido: Recorrido completo(?:\r?\n|$)/.test(cita.observaciones || '');
              return {
                ...cita,
                folio: `C-${cita.id_cita}`,
                institucion: escuela?.nombre || 'Escuela no disponible',
                clave_escuela: escuela?.clave_escuela || '—',
                responsable: responsable ? `${responsable.nombre} ${responsable.apellido}` : 'Responsable no disponible',
                telefono: responsable?.telefono || '—',
                sala: completo ? 'Recorrido completo' : asignaciones.map(a => a.sala).join(', ') || 'Sin sala asignada',
                horarioCompleto: completo ? 'Sin horario individual' : asignaciones.map(a => `${a.hora_inicio.slice(0, 5)} - ${a.hora_fin.slice(0, 5)}`).join(', '),
                salasAsignadas: asignaciones
              } as ReservacionVista;
            })
          )
        );
        return consultas.length ? forkJoin(consultas) : of([] as ReservacionVista[]);
      })
    ).subscribe({
      next: reservaciones => {
        this.reservaciones = reservaciones;
        this.salas = [...new Set(reservaciones.flatMap(r => r.sala === 'Recorrido completo' ? [r.sala] : r.salasAsignadas.map(s => s.sala)))];
        this.cargando = false;
      },
      error: error => {
        this.cargando = false;
        this.errorMensaje = error.error?.mensaje || 'No fue posible consultar las reservaciones.';
      }
    });
  }

  get reservacionesFiltradas(): ReservacionVista[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.reservaciones.filter(r =>
      (!texto || [r.folio, r.institucion, r.clave_escuela, r.responsable, r.registrado_por || ''].some(v => v.toLowerCase().includes(texto))) &&
      (!this.filtroFecha || r.fecha_visita.slice(5, 7) === this.filtroFecha) &&
      (!this.filtroAnio || r.fecha_visita.slice(0,4) === this.filtroAnio) &&
      (!this.filtroSala || (r.sala === this.filtroSala || (r.sala !== 'Recorrido completo' && r.salasAsignadas.some(s => s.sala === this.filtroSala)))) &&
      (!this.filtroEstado || r.estado === this.filtroEstado)
    );
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.reservacionesFiltradas.length / this.registrosPorPagina));
  }

  get reservacionesPaginadas(): ReservacionVista[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.reservacionesFiltradas.slice(inicio, inicio + this.registrosPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  aplicarFiltros(): void { this.paginaActual = 1; }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroAnio = '';
    this.filtroSala = '';
    this.filtroEstado = '';
    this.paginaActual = 1;
  }

  obtenerTotalAsistentes(cita: Cita): number {
    return Number(cita.cantidad_alumnos) + Number(cita.cantidad_maestros);
  }

  verReservacion(reservacion: ReservacionVista): void {
    this.reservacionSeleccionada = reservacion;
  }

  cerrarDetalle(): void { this.reservacionSeleccionada = null; }

  cancelarReservacion(reservacion: ReservacionVista): void {
    if (!this.esAdmin) return;
    if (this.eliminando || this.actualizandoEstado || reservacion.estado === 'Cancelada' || reservacion.estado === 'Realizada') return;
    if (!confirm(`¿Deseas cancelar la reservación ${reservacion.folio}?`)) return;

    this.actualizandoEstado = true;
    this.reservaService.cambiarEstado(reservacion.id_cita, 'Cancelada').subscribe({
      next: () => {
        reservacion.estado = 'Cancelada';
        this.actualizandoEstado = false;
        if (this.reservacionSeleccionada?.id_cita === reservacion.id_cita) {
          this.reservacionSeleccionada = { ...reservacion };
        }
      },
      error: error => {
        this.actualizandoEstado = false;
        this.errorMensaje = error.error?.mensaje || 'No fue posible cancelar la reservación.';
      }
    });
  }
}
