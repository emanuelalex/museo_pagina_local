import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-salas-horarios', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './salas-horarios.html', styleUrl: './salas-horarios.css' })
export class SalasHorarios {
  private auth = inject(AuthService);
  get esAdmin(): boolean { return this.auth.getRol() === 'admin'; }
  get nombreUsuario(): string { return this.auth.getUsuario(); }
  cerrarSesion(): void { this.auth.logout(); }
  experiencias = [
    { nombre: '4DX', color: '#36a9f4', icono: '4DX', semana: ['1:00 p. m.', '4:00 p. m.'], fin: ['2:00 p. m.', '3:45 p. m.'], detalleSemana: 'Martes a viernes', detalleFin: 'Sábados y domingos' },
    { nombre: 'Casa de la Tierra', color: '#f5a900', icono: '🌎', semana: ['2:30 p. m.'], fin: ['3:00 p. m.'], detalleSemana: 'Martes a viernes', detalleFin: 'Sábados y domingos' },
    { nombre: 'Planetario', color: '#9200d5', icono: '🪐', semana: ['1:30 p. m.', '3:15 p. m.'], fin: ['12:15 p. m.', '4:20 p. m.', '6:30 p. m.'], detalleSemana: 'Martes a viernes', detalleFin: 'Sábados y domingos' }
  ];
  salas = [
    { nombre: 'INGENIUS', color: '#79d34e', horarios: ['11:30 a. m.', '1:30 p. m.', '4:00 p. m.'] },
    { nombre: 'DESCUBRE LA LUZ', color: '#3020d0', horarios: ['12:00 p. m.', '2:00 p. m.', '5:00 p. m.'] }
  ];
}
