import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class Checkout {
  constructor(private router: Router) {}

  // Información de la visita
  fechaMinima = this.obtenerFechaActual();
  fecha = this.obtenerFechaActual();
  salaSeleccionada = 'Sala de la Tierra';
  horario = '09:00';
  tipoVisita = 'Visita escolar';

  // Información de la institución
  institucion = '';
  cct = '';
  responsable = '';
  telefono = '';

  // Asistentes y precios de demostración
  estudiantes = 30;
  adultos = 3;
  precioEstudiante = 80;
  precioAdulto = 100;

  salas = ['Sala de la Tierra', 'Sala del Universo', 'Sala de Energía', 'Domo IMAX'];
  horarios = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
  tiposVisita = ['Visita escolar', 'Visita general'];

  private obtenerFechaActual(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  actualizarCct(valor: string): void {
    this.cct = (valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  }

  get cctValido(): boolean {
    return /^[0-9]{2}[A-Z]{3}[0-9]{4}[A-Z]$/.test(this.cct);
  }

  get telefonoValido(): boolean {
    return /^[0-9]{10}$/.test(this.telefono.trim());
  }

  cantidadValida(cantidad: number): boolean {
    return Number.isFinite(cantidad) && Number.isInteger(cantidad) && cantidad >= 0;
  }

  get subtotalEstudiantes(): number {
    return this.cantidadValida(this.estudiantes) ? this.estudiantes * this.precioEstudiante : 0;
  }

  get subtotalAdultos(): number {
    return this.cantidadValida(this.adultos) ? this.adultos * this.precioAdulto : 0;
  }

  get total(): number {
    return this.subtotalEstudiantes + this.subtotalAdultos;
  }

  get totalAsistentes(): number {
    return (this.cantidadValida(this.estudiantes) ? this.estudiantes : 0) +
           (this.cantidadValida(this.adultos) ? this.adultos : 0);
  }

  get formularioValido(): boolean {
    return this.salaSeleccionada.trim() !== '' &&
      this.fecha !== '' &&
      this.fecha >= this.obtenerFechaActual() &&
      this.horario !== '' &&
      this.institucion.trim() !== '' &&
      this.cctValido &&
      this.responsable.trim() !== '' &&
      this.telefonoValido &&
      this.cantidadValida(this.estudiantes) &&
      this.cantidadValida(this.adultos) &&
      this.totalAsistentes > 0;
  }

  confirmarReservacion(): void {
    if (!this.formularioValido) {
      alert('Completa correctamente los campos obligatorios.');
      return;
    }

    const reservacion = {
      folio: 'RES-DEMO-001',
      institucion: this.institucion.trim(),
      cct: this.cct,
      responsable: this.responsable.trim(),
      telefono: this.telefono.trim(),
      sala: this.salaSeleccionada,
      fecha: this.fecha,
      horario: this.horario,
      tipoVisita: this.tipoVisita,
      estudiantes: this.estudiantes,
      adultos: this.adultos,
      total: this.total
    };

    // Navegación de demostración; no guarda datos en MySQL.
    this.router.navigate(['/reservaciones/confirmacion'], { state: { reservacion } });
  }
}
