// Solicitudes de cese

export type EstadoSolicitudCese = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudCeseArchivo {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string | null;
  archivo_tamano?: number | null;
}

export interface SolicitudCese {
  id: number;
  empleado_id: number;
  contrato_id: number;
  empresa_id: number;
  tipo_cese_id: number;
  tipo_cese?: { id: number; nombre: string } | null;
  motivo?: string | null;
  archivo_url?: string | null;
  archivo_nombre?: string | null;
  archivos?: SolicitudCeseArchivo[];
  fecha_efectiva: string;
  estado: EstadoSolicitudCese;
  solicitado_por_id: number;
  resuelto_por_id?: number;
  fecha_resolucion?: string;
  observaciones_admin?: string;
  created_at: string;
  updated_at: string;
  empleado?: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    cargo?: { nombre: string } | null;
    area?: { nombre: string } | null;
  };
  contrato?: {
    id: number;
    tipo_contrato: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
  };
  solicitado_por?: {
    id: number;
    nombre_completo: string;
    email: string;
  };
  resuelto_por?: {
    id: number;
    nombre_completo: string;
    email: string;
  };
}
