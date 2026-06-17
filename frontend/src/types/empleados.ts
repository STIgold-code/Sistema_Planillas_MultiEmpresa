// Empleados, documentos, familiares, movimientos

import type { Area, Banco, Cargo, Sede } from './core';
import type { Contrato, EstadoContrato, EstadoVinculo } from './contratos';

// Tipos para datos JSON del empleado
export interface Estudio {
  institucion: string;
  grado: string;
  especialidad?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
}

export interface Capacitacion {
  institucion: string;
  curso: string;
  fecha?: string;
  horas?: number;
  estado?: string;
}

export interface Experiencia {
  empresa: string;
  cargo: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  motivo_salida?: string;
  contacto?: string;
}

export interface EmpleadoFamiliar {
  id: number;
  empleado_id: number;
  parentesco: string;
  nombres_apellidos: string;
  tipo_documento: string;
  numero_documento?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  es_dependiente: boolean;
}

export type TipoVigenciaDocumento = 'SIN_FECHAS' | 'SOLO_EMISION' | 'CON_VENCIMIENTO';

export interface TipoDocumentoEmpleado {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  es_obligatorio: boolean;
  aplica_seleccion: boolean;
  aplica_rrhh: boolean;
  tipo_vigencia: TipoVigenciaDocumento;
  dias_alerta?: number | null;
  empresa_id: number;
  _count?: { documentos: number };
}

export interface PostulanteDocumento {
  id: number;
  postulante_id: number;
  tipo_documento_empleado_id?: number | null;
  tipo_documento_empleado?: { id: number; codigo: string; nombre: string } | null;
  descripcion?: string;
  archivo_url: string;
  archivo_nombre?: string;
  fecha_carga: string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  version: number;
  es_version_vigente: boolean;
  motivo_nueva_version?: string | null;
  total_versiones: number;
  subido_por?: {
    id: number;
    email: string;
    nombre_completo: string;
  } | null;
}

export interface PostulanteDocumentoHistorial extends PostulanteDocumento {
  eliminado: boolean;
  eliminado_en: string | null;
  motivo_eliminacion: string | null;
  eliminado_por?: {
    id: number;
    email: string;
    nombre_completo: string;
  } | null;
}

export type OrigenDocumentoEmpleado = 'SELECCION' | 'RRHH';

export interface EmpleadoDocumento {
  id: number;
  empleado_id: number;
  tipo_documento_empleado_id?: number;
  tipo_documento_empleado?: TipoDocumentoEmpleado;
  descripcion?: string;
  archivo_url: string;
  archivo_nombre?: string;
  fecha_carga: string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  origen?: OrigenDocumentoEmpleado;
}

export interface EmpleadoMovimiento {
  id: number;
  empleado_id: number;
  tipo_movimiento: 'ALTA' | 'BAJA' | 'RENUNCIA' | 'VACACIONES' | 'SUSPENSION' | 'REINCORPORACION';
  fecha_movimiento: string;
  motivo?: string;
  observaciones?: string;
  usuario_id?: number;
  usuario?: { nombre_completo: string };
}

export type EstadoDocumentacion = 'PENDIENTE' | 'INCOMPLETO' | 'COMPLETO' | 'PENDIENTE';

export interface Empleado {
  id: number;
  // Datos personales
  tipo_documento: 'DNI' | 'CE' | 'PASAPORTE';
  numero_documento: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  estado_civil?: string;
  nacionalidad?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  foto_url?: string;
  // Dirección
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
  // Datos laborales
  area_id?: number;
  area?: Area;
  cargo_id?: number;
  cargo?: Cargo;
  sede_id?: number;
  sede?: Sede;
  fecha_ingreso: string;
  fecha_planilla?: string;
  fecha_cese?: string;
  tipo_cese?: { id: number; nombre: string };
  estado: 'ACTIVO' | 'PENDIENTE' | 'CESADO';
  sueldo_base: number;
  tipo_pago: 'PLANILLA' | 'RECIBO';
  turno: 'DIA' | 'NOCHE';
  // Datos pensionarios
  regimen_pensionario_id?: number;
  regimen_pensionario?: { id: number; nombre: string; tipo: string };
  cuspp?: string;
  // Beneficios
  asignacion_familiar: boolean;
  sctr: boolean;
  es_mype: boolean;
  // Datos bancarios - Haberes
  banco_haberes_id?: number;
  banco_haberes?: Banco;
  nro_cuenta_haberes?: string;
  cci_haberes?: string;
  // Datos bancarios - CTS
  banco_cts_id?: number;
  banco_cts?: Banco;
  nro_cuenta_cts?: string;
  cci_cts?: string;
  // Contacto asignado
  celular_asignado?: string;
  email_asignado?: string;
  // Datos físicos
  estatura?: number;
  peso?: number;
  categoria_licencia?: string;
  // Datos JSON (híbrido)
  estudios?: Estudio[];
  capacitaciones?: Capacitacion[];
  experiencias?: Experiencia[];
  // Relaciones
  familiares?: EmpleadoFamiliar[];
  documentos?: EmpleadoDocumento[];
  movimientos?: EmpleadoMovimiento[];
  contratos?: Contrato[];
  // Contrato vigente (para listado)
  contrato_vigente?: {
    id: number;
    fecha_inicio: string;
    fecha_fin?: string;
    estado: EstadoContrato;
  };
  // Reingreso (computado en backend findAll): ACTIVO + tiene vinculos cerrados
  es_reingresante?: boolean;
  fecha_cese_anterior?: string | null;
  motivo_cese_anterior?: string | null;
  total_vinculos?: number;
  // Vinculos laborales crudos para expandir reingresantes en la lista (Req #1)
  vinculos_laborales?: Array<{
    id: number;
    fecha_inicio: string;
    fecha_fin: string | null;
    estado: EstadoVinculo;
    motivo_cierre?: string | null;
  }>;
  // Estado de documentación
  estado_documentacion?: EstadoDocumentacion;
  // Sistema
  empresa_id: number;
  created_at: string;
  updated_at: string;
}

export type EstadoEmpleadoFiltro = 'ACTIVO' | 'CESADO' | 'BAJA' | 'PENDIENTE' | 'TODOS';
