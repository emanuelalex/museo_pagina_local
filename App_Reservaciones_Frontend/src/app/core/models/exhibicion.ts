export interface Escuela {
  id_escuela: number;
  nombre: string;
  clave_escuela: string | null;
  tipo_escuela: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
}

export interface Responsable {
  id_responsable: number;
  id_escuela: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  correo: string | null;
  cargo: string | null;
}
