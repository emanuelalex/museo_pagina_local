
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// Estructura de los datos de la reservación
interface DatosReservacion {
  folio: string;
  institucion: string;
  cct: string;
  responsable: string;
  telefono: string;
  sala: string;
  fecha: string;
  horario: string;
  tipoVisita: string;
  estudiantes: number;
  adultos: number;
  total: number;
}

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css'
})
export class Confirmation implements OnInit {

  // ==================================
  // INFORMACIÓN DE LA RESERVACIÓN
  // ==================================

  folio = '';

  // Datos de la institución
  institucion = '';
  cct = '';
  responsable = '';
  telefono = '';

  // Datos de la visita
  sala = '';
  fecha = '';
  horario = '';
  tipoVisita = '';

  // Asistentes
  estudiantes = 0;
  adultos = 0;

  // Costo total
  total = 0;

  // Indica si se recibieron los datos
  datosDisponibles = false;

  constructor(private router: Router) {}

  // ==================================
  // CARGAR DATOS DE LA RESERVACIÓN
  // ==================================

  ngOnInit(): void {

    // Recuperar los datos enviados desde checkout.ts
    const reservacion = history.state
      ?.reservacion as DatosReservacion | undefined;

    if (reservacion) {

      // Folio
      this.folio = reservacion.folio;

      // Institución
      this.institucion = reservacion.institucion;
      this.cct = reservacion.cct ?? '';
      this.responsable = reservacion.responsable;
      this.telefono = reservacion.telefono ?? '';

      // Visita
      this.sala = reservacion.sala;
      this.fecha = reservacion.fecha;
      this.horario = reservacion.horario;
      this.tipoVisita = reservacion.tipoVisita ?? '';

      // Asistentes
      this.estudiantes = reservacion.estudiantes;
      this.adultos = reservacion.adultos;

      // Total
      this.total = reservacion.total;

      this.datosDisponibles = true;

    } else {

      // Si no existen datos, regresar al formulario
      this.router.navigate(['/reservaciones/nueva']);

    }
  }

  // ==================================
  // CALCULAR TOTAL DE ASISTENTES
  // ==================================

  get totalAsistentes(): number {
    return this.estudiantes + this.adultos;
  }

}

