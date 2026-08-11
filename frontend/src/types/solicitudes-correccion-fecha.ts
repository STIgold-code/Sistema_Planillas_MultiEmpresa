// Solicitudes de corrección de fechas de contrato.
// El operario propone las fechas con sustento y un aprobador las aplica.

export type EstadoSolicitudCorreccionFecha =
  | 'PENDIENTE'
  | 'APROBADA'
  | 'RECHAZADA';

export interface SolicitudCorreccionFechaArchivo {
  id: number;
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo?: string | null;
  archivo_tamano?: number | null;
}

export interface SolicitudCorreccionFecha {
  id: number;
  empresa_id: number;
  contrato_id: number;
  empleado_id: number;
  /** Snapshot de la vigencia del contrato al momento de solicitar. */
  fecha_inicio_actual: string;
  fecha_fin_actual?: string | null;
  fecha_inicio_propuesta: string;
  fecha_fin_propuesta?: string | null;
  motivo: string;
  estado: EstadoSolicitudCorreccionFecha;
  solicitado_por_id: number;
  resuelto_por_id?: number | null;
  fecha_resolucion?: string | null;
  observaciones_admin?: string | null;
  /**
   * Se completa al aprobar cuando el cambio toca períodos con planilla
   * aprobada o pagada. Informa; no bloquea.
   */
  advertencia_planillas?: string | null;
  created_at: string;
  updated_at: string;
  archivos: SolicitudCorreccionFechaArchivo[];
  empleado: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    numero_documento: string;
    cargo?: { nombre: string } | null;
    area?: { nombre: string } | null;
  };
  contrato: {
    id: number;
    tipo_contrato: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin?: string | null;
    numero_renovacion: number;
  };
  solicitado_por: {
    id: number;
    nombre_completo: string;
    email: string;
  };
  resuelto_por?: {
    id: number;
    nombre_completo: string;
    email: string;
  } | null;
}
