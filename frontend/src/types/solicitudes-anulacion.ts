export type EstadoSolicitudAnulacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudAnulacionArchivo {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string | null;
  archivo_tamano?: number | null;
}

export interface SolicitudAnulacionPendiente {
  id: number;
  contrato_id: number;
  empleado_id: number;
  motivo: string;
  estado: EstadoSolicitudAnulacion;
  created_at: string;
  archivos?: SolicitudAnulacionArchivo[];
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    cargo: { nombre: string } | null;
  };
  contrato: {
    id: number;
    tipo_contrato: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estado: string;
    numero_renovacion: number | null;
  };
  solicitado_por: {
    id: number;
    nombre_completo: string;
    email: string;
  };
}
