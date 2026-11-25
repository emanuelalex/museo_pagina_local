
import { Component, inject, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import {
  forkJoin,
  Observable,
  catchError,
  of,
  timeout,
  finalize
} from 'rxjs';

import { Museo } from '../../core/services/museo';
import { Reserva } from '../../core/services/reserva';
import { AuthService } from '../../core/services/auth';
import { Escuela, Responsable } from '../../core/models/exhibicion';
import { Sala, Horario } from '../../core/models/horario';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout {

  private museo = inject(Museo);
  private reservaService = inject(Reserva);
  private router = inject(Router);
  private auth = inject(AuthService);

  cargandoCatalogos = false;
  guardando = false;
  errorMensaje = '';
  catalogosConError: string[] = [];

  escuelas: Escuela[] = [];
  responsables: Responsable[] = [];
  salas: Sala[] = [];
  horarios: Horario[] = [];

  fechaMinima = this.obtenerFechaActual();
  fecha = this.fechaMinima;

  idEscuela = 0;
  idResponsable = 0;
  tipoRecorrido = 'Recorrido completo';
  asignaciones: { id_sala: number; id_horario: number }[] = [{ id_sala: 0, id_horario: 0 }];

  get recorridoCompleto(): boolean { return this.tipoRecorrido === 'Recorrido completo'; }
  get salasDisponibles(): Sala[] {
    const nombres = this.tipoRecorrido === 'Solo proyecciones'
      ? ['4d', '4dx', 'imax']
      : ['casa de la tierra', 'planetario', 'ingenius', 'descubre la luz'];
    return this.salas.filter(s => (this.recorridoCompleto ? ['recorrido completo'] : nombres).includes(s.nombre.trim().toLowerCase()));
  }
  cambiarRecorrido(): void {
    this.asignaciones = [{ id_sala: 0, id_horario: 0 }];
  }
  opcionesSala(indice: number): Sala[] {
    return this.salasDisponibles.filter(s => !this.asignaciones.some((a, i) => i !== indice && a.id_sala === s.id_sala));
  }
  agregarSala(): void {
    if (!this.recorridoCompleto && this.asignaciones.length < this.salasDisponibles.length) this.asignaciones.push({ id_sala: 0, id_horario: 0 });
  }
  quitarSala(indice: number): void {
    if (this.asignaciones.length > 1) this.asignaciones.splice(indice, 1);
  }
  get salasSeleccionadas(): Sala[] {
    return this.salasDisponibles.filter(s => this.asignaciones.some(a => a.id_sala === s.id_sala));
  }
  get capacidadMinima(): number {
    return this.salasSeleccionadas.length ? Math.min(...this.salasSeleccionadas.map(s => Number(s.capacidad))) : 0;
  }
  get resumenSalas(): string { return this.recorridoCompleto ? 'Recorrido completo' : this.salasSeleccionadas.map(s => s.nombre).join(', '); }
  get resumenHorarios(): string {
    return this.asignaciones.map(a => {
      const s = this.salas.find(s => s.id_sala === a.id_sala);
      const h = this.horarios.find(h => h.id_horario === a.id_horario);
      return s && h ? `${s.nombre}: ${h.hora_inicio.slice(0,5)} - ${h.hora_fin.slice(0,5)}` : '';
    }).filter(Boolean).join('; ');
  }
  get asignacionesValidas(): boolean {
    if (this.recorridoCompleto && this.asignaciones.length !== 1) return false;
    if (!this.asignaciones.length || this.salasSeleccionadas.length !== this.asignaciones.length ||
        !this.asignaciones.every(a => this.horarios.some(h => h.id_horario === a.id_horario))) return false;
    const horarios = this.asignaciones.map(a => this.horarios.find(h => h.id_horario === a.id_horario)!);
    return horarios.every((h, i) => horarios.every((otro, j) => i === j || h.hora_fin <= otro.hora_inicio || otro.hora_fin <= h.hora_inicio));
  }

  horaLlegada = '';
  estudiantes = 30;
  maestros = 2;
  observaciones = '';

  mostrarModalEscuela = false;
  guardandoEscuela = false;
  errorEscuela = '';
  nuevaEscuela = { nombre: '', clave_escuela: '', tipo_escuela: '', direccion: '', telefono: '', correo: '' };
  nuevoResponsable = { nombre: '', apellido: '', telefono: '', correo: '', cargo: '' };
  escuelaCreadaPendienteId: number | null = null;
  escuelaCreadaPendiente: Escuela | null = null;
  faseGuardadoEscuela = 'Guardando escuela...';

  // Validaciones en tiempo real de correo y teléfono (campos opcionales).
  private readonly patronCorreo = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  private readonly patronTelefono = /^\d{10}$/;

  correoValido(valor: string): boolean {
    const limpio = (valor || '').trim();
    return !limpio || this.patronCorreo.test(limpio);
  }

  telefonoValido(valor: string): boolean {
    const limpio = (valor || '').replace(/\D/g, '');
    return !limpio || this.patronTelefono.test(limpio);
  }

  filtrarTelefonoEscuela(valor: string): void {
    this.nuevaEscuela.telefono = (valor || '').replace(/\D/g, '').slice(0, 10);
  }

  filtrarTelefonoResponsable(valor: string): void {
    this.nuevoResponsable.telefono = (valor || '').replace(/\D/g, '').slice(0, 10);
  }

  get contactosValidos(): boolean {
    return this.correoValido(this.nuevaEscuela.correo) &&
      this.telefonoValido(this.nuevaEscuela.telefono) &&
      this.correoValido(this.nuevoResponsable.correo) &&
      this.telefonoValido(this.nuevoResponsable.telefono);
  }

  abrirModalEscuela(): void {
    this.errorEscuela = '';
    this.mostrarModalEscuela = true;
  }

  cerrarModalEscuela(): void {
    if (!this.guardandoEscuela) this.mostrarModalEscuela = false;
  }

  guardarNuevaEscuela(): void {
    const datosEscuela = {
      nombre: this.nuevaEscuela.nombre.trim(),
      clave_escuela: this.nuevaEscuela.clave_escuela.trim(),
      tipo_escuela: this.nuevaEscuela.tipo_escuela.trim(),
      direccion: this.nuevaEscuela.direccion.trim(),
      telefono: this.nuevaEscuela.telefono.trim(),
      correo: this.nuevaEscuela.correo.trim()
    };
    const datosResponsable = {
      nombre: this.nuevoResponsable.nombre.trim(),
      apellido: this.nuevoResponsable.apellido.trim(),
      telefono: this.nuevoResponsable.telefono.trim(),
      correo: this.nuevoResponsable.correo.trim(),
      cargo: this.nuevoResponsable.cargo.trim()
    };

    if (!datosEscuela.nombre) {
      this.errorEscuela = 'El nombre de la escuela es obligatorio.';
      return;
    }
    if (!datosResponsable.nombre || !datosResponsable.apellido) {
      this.errorEscuela = 'Escribe el nombre y apellido del responsable.';
      return;
    }
    if (!this.contactosValidos) {
      this.errorEscuela = 'Corrige los correos o teléfonos. Los correos deben tener formato válido y los teléfonos deben contener 10 dígitos.';
      return;
    }

    this.guardandoEscuela = true;
    this.errorEscuela = '';

    const guardarResponsable = (idEscuela: number, escuela: Escuela) => {
      this.faseGuardadoEscuela = 'Guardando responsable...';
      this.museo.registrarResponsable({ id_escuela: idEscuela, ...datosResponsable }).subscribe({
        next: respuesta => {
          const responsable: Responsable = { id_responsable: respuesta.id_responsable, id_escuela: idEscuela, ...datosResponsable };
          this.escuelas = [escuela, ...this.escuelas.filter(e => e.id_escuela !== escuela.id_escuela)];
          this.responsables = [responsable, ...this.responsables.filter(r => r.id_responsable !== responsable.id_responsable)];
          this.idEscuela = idEscuela;
          this.idResponsable = responsable.id_responsable;
          this.nuevaEscuela = { nombre: '', clave_escuela: '', tipo_escuela: '', direccion: '', telefono: '', correo: '' };
          this.nuevoResponsable = { nombre: '', apellido: '', telefono: '', correo: '', cargo: '' };
          this.escuelaCreadaPendienteId = null;
          this.escuelaCreadaPendiente = null;
          this.guardandoEscuela = false;
          this.mostrarModalEscuela = false;
        },
        error: (error: HttpErrorResponse) => {
          this.guardandoEscuela = false;
          this.errorEscuela = `La escuela se registró, pero no se pudo guardar el responsable. Puedes reintentar sin duplicar la escuela. ${this.mensajeError(error, 'Error al guardar responsable.')}`;
          this.escuelaCreadaPendienteId = idEscuela;
          this.escuelaCreadaPendiente = escuela;
        }
      });
    };

    if (this.escuelaCreadaPendienteId && this.escuelaCreadaPendiente) {
      guardarResponsable(this.escuelaCreadaPendienteId, this.escuelaCreadaPendiente);
      return;
    }

    this.faseGuardadoEscuela = 'Guardando escuela...';
    this.museo.registrarEscuela(datosEscuela).subscribe({
      next: respuesta => {
        const escuela: Escuela = {
          id_escuela: respuesta.id_escuela, nombre: datosEscuela.nombre,
          clave_escuela: datosEscuela.clave_escuela || null, tipo_escuela: datosEscuela.tipo_escuela || null,
          direccion: datosEscuela.direccion || null, telefono: datosEscuela.telefono || null, correo: datosEscuela.correo || null
        };
        this.escuelaCreadaPendienteId = escuela.id_escuela;
        this.escuelaCreadaPendiente = escuela;
        guardarResponsable(escuela.id_escuela, escuela);
      },
      error: (error: HttpErrorResponse) => {
        this.guardandoEscuela = false;
        this.errorEscuela = this.mensajeError(error, 'No fue posible registrar la escuela.');
      }
    });
  }

  constructor() {
    // Ejecuta las peticiones solamente después de renderizar en el navegador (compatible con SSR).
    afterNextRender(() => this.cargarCatalogos());
  }


  // Cargar catálogos: cada petición puede fallar sin bloquear las demás.
  cargarCatalogos(): void {
    if (this.cargandoCatalogos) return;

    this.cargandoCatalogos = false;
    this.errorMensaje = '';
    this.catalogosConError = [];

    const catalogo = <T>(consulta: Observable<T>, nombre: string, vacio: T) =>
      consulta.pipe(
        timeout({ first: 8000 }),
        catchError(error => {
          this.catalogosConError.push(nombre);
          console.error(`Checkout: fallo al cargar ${nombre}`, error);
          return of(vacio);
        })
      );

    forkJoin({
      escuelas: catalogo(this.museo.obtenerEscuelas(), 'escuelas', [] as Escuela[]),
      responsables: catalogo(this.museo.obtenerResponsables(), 'responsables', [] as Responsable[]),
      salas: catalogo(this.museo.obtenerSalas(), 'salas', [] as Sala[]),
      horarios: catalogo(this.museo.obtenerHorarios(), 'horarios', [] as Horario[])
    })
    .pipe(finalize(() => this.cargandoCatalogos = false))
    .subscribe({
      next: data => {
        this.escuelas = Array.isArray(data.escuelas) ? data.escuelas : [];
        this.responsables = Array.isArray(data.responsables) ? data.responsables : [];
        this.salas = Array.isArray(data.salas) ? data.salas.filter(s => Number(s.activa) === 1) : [];
        this.horarios = Array.isArray(data.horarios) ? data.horarios.filter(h => Number(h.activo) === 1) : [];
        if (this.catalogosConError.length) {
          this.errorMensaje = `No se pudieron cargar: ${this.catalogosConError.join(', ')}. Puedes reintentar sin perder los datos cargados.`;
        }
      },
      error: error => {
        this.errorMensaje = this.mensajeError(error, 'No fue posible cargar los catálogos.');
        console.error('Checkout: error inesperado al cargar catálogos', error);
      }
    });
  }


  cerrarSesion(): void {

    this.auth.logout();
    this.router.navigate(['/login']);

  }

  private obtenerFechaActual(): string {

    const hoy = new Date();

    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  }

  get responsablesEscuela(): Responsable[] {

    return this.responsables.filter(
      r => Number(r.id_escuela) === Number(this.idEscuela)
    );

  }

  get escuelaActual(): Escuela | undefined {

    return this.escuelas.find(
      e => Number(e.id_escuela) === Number(this.idEscuela)
    );

  }

  get totalAsistentes(): number {

    return Number(this.estudiantes || 0) +
      Number(this.maestros || 0);

  }

  get formularioValido(): boolean {

    return Number.isInteger(Number(this.idEscuela)) &&
      this.idEscuela > 0 &&

      Number.isInteger(Number(this.idResponsable)) &&
      this.idResponsable > 0 &&

      !!this.fecha &&
      this.fecha >= this.fechaMinima &&

      this.asignacionesValidas &&

      Number.isInteger(Number(this.estudiantes)) &&
      this.estudiantes > 0 &&

      Number.isInteger(Number(this.maestros)) &&
      this.maestros >= 0 &&

      this.totalAsistentes <= this.capacidadMinima;

  }

  cambiarEscuela(): void {

    this.idResponsable = 0;

  }

  confirmarReservacion(): void {

    if (!this.formularioValido || this.guardando) {

      this.errorMensaje =
        'Revisa las salas, horarios sin traslapes y capacidad de cada espacio. ';

      return;

    }

    this.guardando = true;
    this.errorMensaje = '';

    this.reservaService.crearCita({

      id_escuela: Number(this.idEscuela),

      id_responsable: Number(this.idResponsable),

      fecha_visita: this.fecha,

      hora_llegada: this.horaLlegada || null,

      cantidad_alumnos: Number(this.estudiantes),

      cantidad_maestros: Number(this.maestros),

      observaciones: `Tipo de recorrido: ${this.tipoRecorrido}${this.observaciones.trim() ? '\n' + this.observaciones.trim() : ''}`,

      asignaciones: this.asignaciones.map(a => ({ ...a }))

    }).subscribe({

      next: respuesta => {

        this.guardando = false;

        const escuela = this.escuelas.find(
          e => e.id_escuela === Number(this.idEscuela)
        );

        const responsable = this.responsables.find(
          r => r.id_responsable === Number(this.idResponsable)
        );



        this.router.navigate(
          ['/reservaciones/confirmacion'],
          {
            state: {
              reservacion: {

                id_cita: respuesta.id_cita,

                institucion: escuela?.nombre || '',

                clave_escuela: escuela?.clave_escuela || '',

                responsable: responsable
                  ? `${responsable.nombre} ${responsable.apellido}`
                  : '',

                sala: this.resumenSalas,

                fecha: this.fecha,

                horario: this.resumenHorarios,

                estudiantes: Number(this.estudiantes),

                maestros: Number(this.maestros),

                estado: 'Pendiente'

              }
            }
          }
        );

      },

      error: (error: HttpErrorResponse) => {

        this.guardando = false;

        this.errorMensaje = this.mensajeError(
          error,
          'No fue posible registrar la cita.'
        );

        console.error(
          'Error al registrar la reservación:',
          error
        );

      }

    });

  }

  private mensajeError(
    error: any,
    fallback: string
  ): string {

    if (
      typeof error?.message === 'string' &&
      error.message.trim()
    ) {
      return error.message;
    }

    if (typeof error?.error?.mensaje === 'string') {
      return error.error.mensaje;
    }

    return fallback;

  }

}
