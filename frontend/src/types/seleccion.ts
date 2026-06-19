// Seleccion de personal: vacantes, postulantes, evaluaciones

import type { Capacitacion, Estudio, Experiencia } from './empleados';

export type EstadoVacante = 'BORRADOR' | 'PUBLICADA' | 'EN_PROCESO' | 'CERRADA' | 'CANCELADA';
export type EstadoPostulante = 'EN_PROCESO' | 'APROBADO' | 'RECHAZADO';
// Tipo deprecado, usar Procedencia table
export type ProcedenciaPostulante = 'COMPUTRABAJO' | 'RECOMENDADO' | 'REDES';

export interface Procedencia {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  empresa_id: number;
  _count?: { postulantes: number };
}

export interface Requisito {
  tipo: string;
  descripcion: string;
  obligatorio?: boolean;
}

export interface Vacante {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  cargo_id?: number;
  cargo?: { id: number; nombre: string };
  area_id?: number;
  area?: { id: number; nombre: string };
  sede_id?: number;
  sede?: { id: number; nombre: string };
  cantidad_puestos: number;
  sueldo_ofrecido?: number;
  tipo_contrato?: string;
  modalidad?: string;
  requisitos?: (Requisito | string)[];
  fecha_publicacion?: string;
  fecha_cierre?: string;
  estado: EstadoVacante;
  _count?: { postulantes: number; aprobados: number };
  empresa_id: number;
  created_at: string;
  updated_at: string;
}

// Tipo deprecado, usar TipoEvaluacionMaestro
export type TipoEvaluacion = 'CURRICULAR' | 'ENTREVISTA' | 'PSICOLOGICA' | 'TECNICA' | 'REFERENCIAS' | 'MEDICA' | 'OTRO';

export interface TipoEvaluacionMaestro {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  puntaje_maximo?: number;
  es_obligatorio: boolean;
  orden: number;
  activo: boolean;
  empresa_id: number;
  _count?: { evaluaciones: number };
}

export interface Evaluacion {
  tipo: string;
  fecha: string;
  puntaje?: number;
  evaluador_id: number;
  comentario?: string;
}

export interface PostulanteEvaluacion {
  id: number;
  postulante_id: number;
  tipo?: TipoEvaluacion; // Deprecado
  tipo_evaluacion_id?: number;
  tipo_evaluacion?: { id: number; codigo: string; nombre: string };
  puntaje?: number;
  comentario?: string;
  evaluador_id?: number;
  evaluador?: { id: number; nombre_completo: string };
  archivo_url?: string;
  archivo_nombre?: string;
  created_at: string;
  updated_at: string;
}

export interface Postulante {
  id: number;
  tipo_documento: 'DNI' | 'CE' | 'PASAPORTE';
  numero_documento: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F';
  estado_civil?: string;
  nacionalidad?: string;
  celular?: string;
  telefono?: string;
  email?: string;
  foto_url?: string;
  direccion?: string;
  referencia?: string;
  distrito_id?: number;
  distrito?: {
    id: number;
    nombre: string;
    provincia?: {
      id: number;
      nombre: string;
      departamento?: { id: number; nombre: string };
    };
  };
  estatura?: number;
  peso?: number;
  categoria_licencia?: string;
  estudios?: Estudio[];
  experiencias?: Experiencia[];
  capacitaciones?: Capacitacion[];
  vacante_id: number;
  vacante?: { id: number; codigo: string; titulo: string; area_id?: number; cargo_id?: number; sede_id?: number; requisitos?: (Requisito | string)[]; cargo?: { id: number; nombre: string } };
  estado: EstadoPostulante;
  fecha_postulacion: string;
  evaluaciones?: Evaluacion[];
  evaluaciones_detalle?: PostulanteEvaluacion[];
  pretension_salarial?: number;
  procedencia?: ProcedenciaPostulante; // Deprecado, usar procedencia_id
  procedencia_id?: number;
  procedencia_rel?: Procedencia;
  motivo_rechazo?: string;
  empleado_id?: number;
  empresa_id: number;
  created_at: string;
  updated_at: string;
}
