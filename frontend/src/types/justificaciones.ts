// Justificaciones de tareo (descansos medicos, permisos, licencias)

export type TipoJustificacion =
  | 'CERTIFICADO_MEDICO'
  | 'DESCANSO_MEDICO'
  | 'PERMISO_PERSONAL'
  | 'PERMISO_LABORAL'
  | 'LICENCIA_MATERNIDAD'
  | 'LICENCIA_PATERNIDAD'
  | 'LICENCIA_FALLECIMIENTO'
  | 'VACACIONES'
  | 'OTRO';

export type VisibilidadJustificacion = 'PUBLICA' | 'PRIVADA';

export type TipoDocumentoJustificacion = 'CCI' | 'PRIVADO' | 'OTROS';

export interface TareoJustificacionArchivo {
  id: number;
  justificacion_id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_size: number;
  created_at: string;
}

export interface TareoJustificacion {
  id: number;
  tareo_id: number;
  empresa_id: number;
  dia_inicio: number;
  dia_fin: number;
  tipo: TipoJustificacion;
  tipo_documento: TipoDocumentoJustificacion;
  codigo_certificado?: string;
  descripcion?: string;
  created_by: number;
  usuario?: { id: number; nombre_completo: string; email?: string };
  archivos: TareoJustificacionArchivo[];
  tareo?: {
    id: number;
    periodo: { id: number; anio: number; mes: number };
    empleado: {
      id: number;
      numero_documento: string;
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
      foto_url?: string;
    };
    sede?: { id: number; nombre: string };
    area?: { id: number; nombre: string };
  };
  created_at: string;
  updated_at: string;
}

export interface CreateJustificacionDto {
  tareo_id: number;
  dia_inicio: number;
  dia_fin: number;
  tipo: TipoJustificacion;
  tipo_documento?: TipoDocumentoJustificacion;
  codigo_certificado?: string;
  descripcion?: string;
  archivos?: {
    archivo_url: string;
    archivo_nombre: string;
    archivo_tipo: string;
    archivo_size: number;
  }[];
}

export interface UpdateJustificacionDto {
  dia_inicio?: number;
  dia_fin?: number;
  tipo?: TipoJustificacion;
  tipo_documento?: TipoDocumentoJustificacion;
  codigo_certificado?: string;
  descripcion?: string;
}

// Mapa de dias con justificacion por tareo_id
export type DiasConJustificacion = Record<number, number[]>;
