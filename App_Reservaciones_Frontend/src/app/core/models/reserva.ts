export interface Cita {
  id_cita: number;
  registrado_por?: string | null;
  id_escuela: number;
  id_responsable: number;
  fecha_visita: string;
  hora_llegada: string | null;
  cantidad_alumnos: number;
  cantidad_maestros: number;
  observaciones: string | null;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Realizada';
}

export interface AsignacionCita {
  id_sala: number;
  id_horario: number;
}

export interface NuevaCita {
  id_escuela: number;
  id_responsable: number;
  fecha_visita: string;
  hora_llegada: string | null;
  cantidad_alumnos: number;
  cantidad_maestros: number;
  observaciones: string;
  asignaciones: AsignacionCita[];
}
