// Carnets SUCAMEC

export type EstadoCarnetSucamec = 'VIGENTE' | 'VENCIDO' | 'SUSPENDIDO' | 'ANULADO';

export type CategoriaSucamec =
  | 'BASICO'
  | 'ESPECIALIZADO'
  | 'RESGUARDO'
  | 'PROTECCION'
  | 'TRANSPORTE'
  | 'TECNOLOGIA'
  | 'CAPACITADOR';

export interface CarnetSucamec {
  id: number;
  empleado_id: number;
  documento_id?: number;
  empleado?: {
    id: number;
    numero_documento: string;
    tipo_documento?: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    foto_url?: string;
    area?: { id: number; nombre: string };
    cargo?: { id: number; nombre: string };
  };
  documento?: {
    id: number;
    archivo_url: string;
    archivo_nombre: string;
    fecha_emision?: string;
    fecha_vencimiento?: string;
  };
  numero_carnet: string;
  categoria: CategoriaSucamec;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: EstadoCarnetSucamec;
  observaciones?: string;
  usuario_id?: number;
  usuario?: {
    id: number;
    nombre_completo: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SucamecResumen {
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  suspendidos: number;
  anulados: number;
  total: number;
}

export interface CategoriaSucamecOption {
  value: CategoriaSucamec;
  label: string;
}
