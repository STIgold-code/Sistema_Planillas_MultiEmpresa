// Tareo: tipos de marcacion, periodos, grilla y registros

export interface TipoMarcacion {
  id: number;
  codigo: string;
  descripcion: string;
  color?: string;
  cuenta_como?: string;
  horas_default?: number;
  horas_diurnas?: number;
  horas_nocturnas?: number;
  requiere_calculo?: boolean;
  es_feriado_trabajado?: boolean;
  es_laborable: boolean;
  activo: boolean;
}

export type EstadoPeriodoTareo = 'BORRADOR' | 'EN_PROCESO' | 'CERRADO' | 'ANULADO';
export type EstadoTareo = 'PENDIENTE' | 'COMPLETO' | 'VALIDADO';

export interface PeriodoTareo {
  id: number;
  empresa_id: number;
  anio: number;
  mes: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoPeriodoTareo;
  fecha_cierre?: string;
  cerrado_por?: number;
  usuario_cierre?: { id: number; nombre_completo: string };
  observaciones?: string;
  _count?: { tareos: number };
  created_at: string;
  updated_at: string;
}

export interface Tareo {
  id: number;
  periodo_id: number;
  empleado_id: number;
  empleado?: {
    id: number;
    numero_documento: string;
    apellido_paterno: string;
    apellido_materno: string;
    nombres: string;
  };
  area_id?: number;
  area?: { id: number; nombre: string };
  sede_id?: number;
  sede?: { id: number; nombre: string };
  cargo_id?: number;
  cargo?: { id: number; nombre: string };
  estado: EstadoTareo;
  observaciones?: string;
  detalles?: TareoDetalle[];
}

export interface TareoDetalle {
  id: number;
  tareo_id: number;
  dia: number;
  tipo_marcacion_id?: number;
  tipo_marcacion?: TipoMarcacion;
  horas?: number;
  observacion?: string;
}

export interface TareoDetalleAudit {
  id: number;
  tareo_detalle_id: number;
  valor_anterior?: string;
  valor_nuevo?: string;
  usuario_id?: number;
  usuario?: { id: number; nombre_completo: string; email: string };
  ip_address?: string;
  created_at: string;
}

// Tipos para la grilla de tareo
export interface TareoGrillaDia {
  dia: number;
  detalle_id: number | null;
  codigo: string | null;
  color: string | null;
  tipo_marcacion_id: number | null;
  en_contrato: boolean;
}

export interface TareoGrillaEmpleado {
  tareo_id: number;
  empleado_id: number;
  numero_documento: string;
  nombre_completo: string;
  area: string | null;
  sede: string | null;
  cargo: string | null;
  fecha_inicio_contrato: string | null;
  fecha_fin_contrato: string | null;
  estado: EstadoTareo;
  dias: TareoGrillaDia[];
  totales: Record<string, number>;
}

export interface TareoGrillaResponse {
  periodo: {
    id: number;
    anio: number;
    mes: number;
    estado: EstadoPeriodoTareo;
    dias_mes: number;
  };
  tipos_marcacion: TipoMarcacion[];
  empleados: TareoGrillaEmpleado[];
  areas: { id: number; nombre: string }[];
  sedes: { id: number; nombre: string }[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  resumen_periodo?: {
    total_empleados: number;
    descansos_medicos: number;
    licencias_sin_goce: number;
    faltas: number;
    descansos_trabajados: number;
    feriados_trabajados: number;
  };
}
