
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

  nombreUsuario = 'Mariana';
  rolUsuario = 'Taquilla';

  reservacionesHoy = 12;
  visitantesEsperados = 438;
  salasDisponibles = 6;
  totalSalas = 8;

  reservaciones = [
    {
      escuela: 'Primaria Benito Juárez',
      hora: '09:00',
      sala: 'Sala de la Tierra',
      personas: 42,
      estado: 'Confirmada'
    },
    {
      escuela: 'Colegio Nuevos Horizontes',
      hora: '11:00',
      sala: 'Sala del Universo',
      personas: 32,
      estado: 'Confirmada'
    },
    {
      escuela: 'Instituto Alameda',
      hora: '12:30',
      sala: 'Sala de Energía',
      personas: 27,
      estado: 'Pendiente'
    },
    {
      escuela: 'Secundaria Técnica 1',
      hora: '14:00',
      sala: 'Domo IMAX',
      personas: 58,
      estado: 'Pendiente'
    }
  ];

}

