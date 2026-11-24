export interface Horario {
  id_horario: number;
  hora_inicio: string;
  hora_fin: string;
  activo: number;
}

export interface Sala {
  id_sala: number;
  nombre: string;
  descripcion: string | null;
  capacidad: number;
  duracion_minutos: number;
  activa: number;
}

export interface SalaCita {
  id_cita_sala: number;
  id_cita: number;
  id_sala: number;
  sala: string;
  id_horario: number;
  hora_inicio: string;
  hora_fin: string;
}
