export interface PlantillaDocumento {
  id: number;
  codigo: string;
  nombre: string;
  categoria: 'INGRESO' | 'LABORAL' | 'SALIDA';
  requiere_firma: boolean;
  es_obligatorio: boolean;
}

export interface TipoDocumentoEmpleado {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_obligatorio: boolean;
  tipo_vigencia: 'SIN_FECHAS' | 'SOLO_EMISION' | 'CON_VENCIMIENTO';
  dias_alerta: number | null;
  activo: boolean;
}

export interface DocumentoSubido {
  id: number;
  empleado_id: number;
  tipo_documento_empleado_id: number | null;
  descripcion: string | null;
  archivo_url: string;
  archivo_nombre: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  fecha_carga: string;
  version: number;
  es_version_vigente: boolean;
  motivo_nueva_version: string | null;
  total_versiones: number;
  tipo_documento_empleado?: {
    id: number;
    nombre: string;
    codigo: string;
  } | null;
  subido_por?: {
    id: number;
    email: string;
    nombre_completo: string;
  } | null;
}

export interface VersionHistorial extends DocumentoSubido {
  eliminado: boolean;
  eliminado_en: string | null;
  motivo_eliminacion: string | null;
  eliminado_por?: {
    id: number;
    email: string;
    nombre_completo: string;
  } | null;
}

export interface DocumentoGenerado {
  id: number;
  empleado_id: number;
  plantilla_documento_id: number;
  contenido_generado: string;
  archivo_firmado_url: string | null;
  estado: 'PENDIENTE' | 'FIRMADO' | 'RECHAZADO';
  fecha_generacion: string;
  fecha_firma: string | null;
  observaciones: string | null;
  plantilla_documento: {
    codigo: string;
    nombre: string;
    categoria: string;
  };
}

export interface UploadData {
  tipo_documento_empleado_id: string;
  descripcion: string;
  fecha_emision: string;
  fecha_vencimiento: string;
}
