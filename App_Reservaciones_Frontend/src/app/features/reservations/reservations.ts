
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// =====================================
// ESTRUCTURA DE UNA RESERVACIÓN
// =====================================

export interface Reservacion {
  id_cita: number;
  folio: string;
  institucion: string;
  cct: string;
  responsable: string;
  telefono: string;
  sala: string;
  fecha_visita: string;
  hora_llegada: string;
  cantidad_alumnos: number;
  cantidad_maestros: number;
  total: number;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Realizada';
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class Reservations {

  // =====================================
  // FILTROS
  // =====================================

  busqueda = '';
  filtroFecha = '';
  filtroSala = '';
  filtroEstado = '';

  // =====================================
  // PAGINACIÓN
  // =====================================

  paginaActual = 1;
  registrosPorPagina = 5;

  // =====================================
  // CATÁLOGO TEMPORAL DE SALAS
  // =====================================

  salas = [
    'Sala de la Tierra',
    'Sala del Universo',
    'Sala de Energía',
    'Domo IMAX',
    'Sala de la Vida'
  ];

  // =====================================
  // RESERVACIONES DE DEMOSTRACIÓN
  // =====================================

  reservaciones: Reservacion[] = [
    {
      id_cita: 2841,
      folio: 'R-2841',
      institucion: 'Primaria Benito Juárez',
      cct: '01DPR0001A',
      responsable: 'María González',
      telefono: '4491234567',
      sala: 'Sala de la Tierra',
      fecha_visita: '2026-11-25',
      hora_llegada: '09:00',
      cantidad_alumnos: 40,
      cantidad_maestros: 2,
      total: 3400,
      estado: 'Confirmada'
    },
    {
      id_cita: 2840,
      folio: 'R-2840',
      institucion: 'Colegio Nuevos Horizontes',
      cct: '01PPR0002B',
      responsable: 'Carlos Hernández',
      telefono: '4492345678',
      sala: 'Sala del Universo',
      fecha_visita: '2026-11-25',
      hora_llegada: '11:00',
      cantidad_alumnos: 33,
      cantidad_maestros: 3,
      total: 2940,
      estado: 'Confirmada'
    },
    {
      id_cita: 2839,
      folio: 'R-2839',
      institucion: 'Secundaria Técnica 1',
      cct: '01DST0003C',
      responsable: 'Ana Martínez',
      telefono: '4493456789',
      sala: 'Domo IMAX',
      fecha_visita: '2026-11-26',
      hora_llegada: '10:00',
      cantidad_alumnos: 55,
      cantidad_maestros: 3,
      total: 4700,
      estado: 'Pendiente'
    },
    {
      id_cita: 2838,
      folio: 'R-2838',
      institucion: 'Instituto Alameda',
      cct: '01PPR0004D',
      responsable: 'Jorge Ramírez',
      telefono: '4494567890',
      sala: 'Sala de Energía',
      fecha_visita: '2026-11-27',
      hora_llegada: '12:30',
      cantidad_alumnos: 25,
      cantidad_maestros: 2,
      total: 2200,
      estado: 'Confirmada'
    },
    {
      id_cita: 2837,
      folio: 'R-2837',
      institucion: 'Primaria Francisco Villa',
      cct: '01DPR0005E',
      responsable: 'Laura Sánchez',
      telefono: '4495678901',
      sala: 'Sala de la Vida',
      fecha_visita: '2026-11-27',
      hora_llegada: '09:30',
      cantidad_alumnos: 42,
      cantidad_maestros: 3,
      total: 3660,
      estado: 'Cancelada'
    },
    {
      id_cita: 2836,
      folio: 'R-2836',
      institucion: 'Primaria Independencia',
      cct: '01DPR0006F',
      responsable: 'Pedro López',
      telefono: '4496789012',
      sala: 'Sala de la Tierra',
      fecha_visita: '2026-11-28',
      hora_llegada: '10:00',
      cantidad_alumnos: 28,
      cantidad_maestros: 2,
      total: 2440,
      estado: 'Pendiente'
    }
  ];

  // =====================================
  // FILTRAR RESERVACIONES
  // =====================================

  get reservacionesFiltradas(): Reservacion[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.reservaciones.filter(reservacion => {

      const coincideBusqueda =
        reservacion.folio.toLowerCase().includes(texto) ||
        reservacion.institucion.toLowerCase().includes(texto) ||
        reservacion.cct.toLowerCase().includes(texto);

      const coincideFecha =
        !this.filtroFecha ||
        reservacion.fecha_visita === this.filtroFecha;

      const coincideSala =
        !this.filtroSala ||
        reservacion.sala === this.filtroSala;

      const coincideEstado =
        !this.filtroEstado ||
        reservacion.estado === this.filtroEstado;

      return (
        coincideBusqueda &&
        coincideFecha &&
        coincideSala &&
        coincideEstado
      );
    });
  }

  // =====================================
  // PAGINACIÓN
  // =====================================

  get totalPaginas(): number {
    return Math.max(
      1,
      Math.ceil(
        this.reservacionesFiltradas.length /
        this.registrosPorPagina
      )
    );
  }

  get reservacionesPaginadas(): Reservacion[] {

    const inicio =
      (this.paginaActual - 1) * this.registrosPorPagina;

    return this.reservacionesFiltradas.slice(
      inicio,
      inicio + this.registrosPorPagina
    );
  }

  cambiarPagina(pagina: number): void {

    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  aplicarFiltros(): void {
    this.paginaActual = 1;
  }

  // =====================================
  // LIMPIAR FILTROS
  // =====================================

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroFecha = '';
    this.filtroSala = '';
    this.filtroEstado = '';
    this.paginaActual = 1;
  }

  // =====================================
  // CALCULAR TOTAL DE ASISTENTES
  // =====================================

  obtenerTotalAsistentes(reservacion: Reservacion): number {
    return (
      reservacion.cantidad_alumnos +
      reservacion.cantidad_maestros
    );
  }



  reservacionSeleccionada: Reservacion | null = null;

  verReservacion(reservacion: Reservacion): void {
    console.log('Botón Ver presionado:', reservacion);
    this.reservacionSeleccionada = reservacion;
  }

  cerrarDetalle(): void {
    this.reservacionSeleccionada = null;
  }

  // =====================================
  // EDITAR RESERVACIÓN
  // =====================================

  reservacionEnEdicion: Reservacion | null = null;
  errorEdicion = '';

  abrirEdicion(reservacion: Reservacion): void {
  alert('¡El botón Editar funciona!');

  this.reservacionEnEdicion = { ...reservacion };
  this.errorEdicion = '';
}


  cerrarEdicion(): void {
    this.reservacionEnEdicion = null;
    this.errorEdicion = '';
  }

  guardarEdicion(): void {
    const editada = this.reservacionEnEdicion;

    if (!editada) {
      return;
    }

    if (!editada.institucion.trim()) {
      this.errorEdicion = 'La institución es obligatoria.';
      return;
    }

    if (!/^[0-9]{2}[A-Z]{3}[0-9]{4}[A-Z]$/.test(
      editada.cct.trim().toUpperCase()
    )) {
      this.errorEdicion = 'El CCT debe tener un formato válido de 10 caracteres.';
      return;
    }

    if (!editada.responsable.trim()) {
      this.errorEdicion = 'El responsable es obligatorio.';
      return;
    }

    if (!/^[0-9]{10}$/.test(editada.telefono)) {
      this.errorEdicion = 'El teléfono debe tener 10 dígitos.';
      return;
    }

    if (!editada.sala || !this.salas.includes(editada.sala)) {
      this.errorEdicion = 'Selecciona una sala válida.';
      return;
    }

    if (!editada.fecha_visita || !editada.hora_llegada) {
      this.errorEdicion = 'La fecha y el horario son obligatorios.';
      return;
    }

    if (
      !Number.isInteger(Number(editada.cantidad_alumnos)) ||
      Number(editada.cantidad_alumnos) < 1 ||
      !Number.isInteger(Number(editada.cantidad_maestros)) ||
      Number(editada.cantidad_maestros) < 0
    ) {
      this.errorEdicion = 'Ingresa cantidades válidas de alumnos y maestros.';
      return;
    }

    const indice = this.reservaciones.findIndex(
      r => r.id_cita === editada.id_cita
    );

    if (indice === -1) {
      this.errorEdicion = 'No se encontró la reservación.';
      return;
    }

    editada.cct = editada.cct.trim().toUpperCase();

    this.reservaciones[indice] = { ...editada };
    this.reservaciones = [...this.reservaciones];

    this.cerrarEdicion();
  }

}
