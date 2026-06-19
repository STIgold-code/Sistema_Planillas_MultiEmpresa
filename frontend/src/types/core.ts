// Tipos base del sistema RRHH (entidades transversales)

export interface Usuario {
  id: string;
  email: string;
  nombre_completo: string;
  activo: boolean;
  empresa_id: string;
  rol_id: string;
  rol?: Rol;
  empresa?: Empresa;
  ultimo_acceso?: string;
  created_at: string;
  updated_at: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string;
  permisos: string[];
  empresa_id: string;
}

export interface Empresa {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion?: string;
  telefono?: string;
  centro_control?: string;
  email?: string;
  representante_legal?: string;
  dni_representante?: string;
  cargo_representante?: string;
  partida_electronica?: string;
  logo_url?: string;
  firma_representante_url?: string;
  /** Régimen laboral por defecto para los contratos de la empresa. */
  regimen_laboral_default?: string;
  activo: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  empresa_id: string;
  activo: boolean;
}

export interface Cargo {
  id: string;
  nombre: string;
  descripcion?: string;
  empresa_id: string;
  activo: boolean;
}

export interface Banco {
  id: string;
  nombre: string;
  abreviatura: string;
  activo: boolean;
}

export interface Sede {
  id: number;
  nombre: string;
  direccion?: string;
  cliente_id: number;
  cliente?: { id: number; razon_social: string };
  empresa_id: number;
  activo: boolean;
  _count?: { tareos: number; vacantes: number };
  created_at?: string;
  updated_at?: string;
}
