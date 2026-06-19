// Contratos, vínculos laborales y plantillas

export type EstadoContrato = 'ACTIVO' | 'PENDIENTE' | 'RENOVADO' | 'CESADO' | 'ANULADO';
export type EstadoVinculo = 'ACTIVO' | 'CERRADO';

export interface VinculoLaboral {
  id: number;
  empleado_id: number;
  empresa_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: EstadoVinculo;
  motivo_cierre?: string;
  created_at: string;
  updated_at: string;
  contratos?: Contrato[];
}

export interface Contrato {
  id: number;
  empleado_id: number;
  empleado?: {
    id: number;
    numero_documento: string;
    tipo_documento?: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_ingreso?: string;
    area?: { id: number; nombre: string };
    cargo?: { id: number; nombre: string };
    movimientos?: Array<{ fecha_movimiento?: string; motivo?: string; observaciones?: string }>;
  };
  tipo_contrato: string;
  modalidad?: string;
  /** Régimen laboral del contrato. Si es null/undefined, hereda el de la empresa. */
  regimen_laboral?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  fecha_firma?: string;
  estado: EstadoContrato;
  fecha_cese?: string;
  motivo_cese?: string;
  renovar: boolean;
  numero_renovacion: number; // Contador de renovaciones (1 = original, 2 = primera renovación, etc.)
  remuneracion?: number;
  observaciones?: string;
  archivo_url?: string;
  empresa_cliente?: string;
  cliente_id?: number;
  cliente?: {
    id: number;
    ruc: string;
    razon_social: string;
    nombre_comercial?: string;
  };
  lugar_trabajo?: string;
  plantilla_id?: number;
  plantilla?: PlantillaContrato;
  usuario_id?: number;
  usuario?: { id: number; nombre_completo: string; email?: string };
  vinculo_laboral_id?: number;
  vinculo_laboral?: VinculoLaboral;
  created_at: string;
  updated_at: string;
}

export interface ContratoResumen {
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  terminados: number;
  empleados_baja: number;
  total: number;
}

export interface PlantillaContrato {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo_contrato: string;
  contenido: string;
  variables?: string[];
  archivo_base_url?: string;
  activo: boolean;
  es_predeterminada: boolean;
  empresa_id: number;
  created_at: string;
  updated_at: string;
  _count?: {
    contratos: number;
  };
}

export interface VariableContrato {
  key: string;
  descripcion: string;
}

export interface VariablesDisponibles {
  empleado: VariableContrato[];
  contrato: VariableContrato[];
  empresa: VariableContrato[];
  sistema: VariableContrato[];
}
