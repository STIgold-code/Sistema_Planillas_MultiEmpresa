/**
 * Catálogo de Reportes Disponibles
 * Cada reporte define su configuración y cómo se genera
 */

import { ahoraPeru } from '../../common/utils/datetime.util';

export type FormatoReporte = 'excel' | 'pdf';
export type CategoriaReporte =
  | 'Empleados'
  | 'Planilla'
  | 'Tareo'
  | 'Contratos'
  | 'Vacaciones';

export interface ReporteConfig {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaReporte;
  formatos: FormatoReporte[];
  popular?: boolean;
  filtros: FiltroConfig[];
}

export interface FiltroConfig {
  id: string;
  tipo: 'select' | 'date' | 'text' | 'number';
  label: string;
  placeholder: string;
  requerido?: boolean;
  opciones?: { value: string; label: string }[];
}

// Filtros comunes reutilizables
const FILTRO_AREA: FiltroConfig = {
  id: 'area_id',
  tipo: 'select',
  label: 'Área',
  placeholder: 'Todas las áreas',
};

const FILTRO_SEDE: FiltroConfig = {
  id: 'sede_id',
  tipo: 'select',
  label: 'Sede',
  placeholder: 'Todas las sedes',
};

const FILTRO_ESTADO_EMPLEADO: FiltroConfig = {
  id: 'estado',
  tipo: 'select',
  label: 'Estado',
  placeholder: 'Todos los estados',
  opciones: [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'CESADO', label: 'Cesado' },
  ],
};

const FILTRO_FECHA_DESDE: FiltroConfig = {
  id: 'fecha_desde',
  tipo: 'date',
  label: 'Fecha Desde',
  placeholder: 'dd/mm/aaaa',
};

const FILTRO_FECHA_HASTA: FiltroConfig = {
  id: 'fecha_hasta',
  tipo: 'date',
  label: 'Fecha Hasta',
  placeholder: 'dd/mm/aaaa',
};

const FILTRO_MES: FiltroConfig = {
  id: 'mes',
  tipo: 'select',
  label: 'Mes',
  placeholder: 'Seleccionar mes',
  requerido: true,
  opciones: [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ],
};

const FILTRO_ANIO: FiltroConfig = {
  id: 'anio',
  tipo: 'select',
  label: 'Año',
  placeholder: 'Seleccionar año',
  requerido: true,
  opciones: generateYearOptions(),
};

function generateYearOptions(): { value: string; label: string }[] {
  const currentYear = ahoraPeru().year;
  const years: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ value: y.toString(), label: y.toString() });
  }
  return years;
}

const FILTRO_DIAS_VENCER: FiltroConfig = {
  id: 'dias_vencer',
  tipo: 'select',
  label: 'Días para Vencer',
  placeholder: 'Seleccionar período',
  opciones: [
    { value: '30', label: '30 días' },
    { value: '60', label: '60 días' },
    { value: '90', label: '90 días' },
  ],
};

/**
 * CATÁLOGO COMPLETO DE REPORTES
 */
export const CATALOGO_REPORTES: ReporteConfig[] = [
  // ==================== EMPLEADOS ====================
  {
    id: 'emp-general',
    nombre: 'Maestro de Empleados',
    descripcion: 'Lista completa con datos personales y laborales',
    categoria: 'Empleados',
    formatos: ['excel', 'pdf'],
    popular: true,
    filtros: [
      FILTRO_AREA,
      FILTRO_SEDE,
      FILTRO_ESTADO_EMPLEADO,
      FILTRO_FECHA_DESDE,
      FILTRO_FECHA_HASTA,
    ],
  },
  {
    id: 'emp-cumple',
    nombre: 'Cumpleaños del Mes',
    descripcion: 'Empleados que cumplen años en el mes seleccionado',
    categoria: 'Empleados',
    formatos: ['excel', 'pdf'],
    filtros: [FILTRO_MES, FILTRO_AREA],
  },
  {
    id: 'emp-altas-bajas',
    nombre: 'Altas y Bajas',
    descripcion: 'Movimientos de personal en el período',
    categoria: 'Empleados',
    formatos: ['excel', 'pdf'],
    filtros: [FILTRO_FECHA_DESDE, FILTRO_FECHA_HASTA, FILTRO_AREA],
  },

  // ==================== PLANILLA ====================
  {
    id: 'pla-mensual',
    nombre: 'Nómina Mensual',
    descripcion: 'Detalle de haberes y descuentos',
    categoria: 'Planilla',
    formatos: ['excel', 'pdf'],
    popular: true,
    filtros: [FILTRO_MES, FILTRO_ANIO, FILTRO_AREA],
  },
  {
    id: 'pla-aportes',
    nombre: 'Aportes Empleador',
    descripcion: 'EsSalud, SCTR, Vida Ley por empleado',
    categoria: 'Planilla',
    formatos: ['excel'],
    filtros: [FILTRO_MES, FILTRO_ANIO],
  },
  {
    id: 'pla-banco',
    nombre: 'Archivo Bancario',
    descripcion: 'TXT para abono de haberes',
    categoria: 'Planilla',
    formatos: ['excel'],
    filtros: [FILTRO_MES, FILTRO_ANIO],
  },

  // ==================== TAREO ====================
  {
    id: 'tar-resumen',
    nombre: 'Resumen Asistencia',
    descripcion: 'Días trabajados, faltas, permisos por empleado',
    categoria: 'Tareo',
    formatos: ['excel', 'pdf'],
    popular: true,
    filtros: [FILTRO_MES, FILTRO_ANIO, FILTRO_AREA, FILTRO_SEDE],
  },
  {
    id: 'tar-alertas',
    nombre: 'Alertas de Tareo',
    descripcion: 'Empleados con 3+ faltas injustificadas',
    categoria: 'Tareo',
    formatos: ['excel'],
    filtros: [FILTRO_MES, FILTRO_ANIO],
  },
  {
    id: 'tar-descansos-medicos',
    nombre: 'Descansos Médicos',
    descripcion: 'Detalle de descansos médicos y certificados por empleado',
    categoria: 'Tareo',
    formatos: ['excel'],
    popular: true,
    filtros: [FILTRO_FECHA_DESDE, FILTRO_FECHA_HASTA, FILTRO_AREA, FILTRO_SEDE],
  },

  // ==================== CONTRATOS ====================
  {
    id: 'con-vencer',
    nombre: 'Contratos por Vencer',
    descripcion: 'Contratos próximos a expirar',
    categoria: 'Contratos',
    formatos: ['excel', 'pdf'],
    filtros: [FILTRO_DIAS_VENCER, FILTRO_AREA],
  },
  {
    id: 'con-vigentes',
    nombre: 'Contratos Vigentes',
    descripcion: 'Todos los contratos activos',
    categoria: 'Contratos',
    formatos: ['excel'],
    filtros: [FILTRO_AREA, FILTRO_SEDE],
  },

  // ==================== VACACIONES ====================
  {
    id: 'vac-saldos',
    nombre: 'Saldos de Vacaciones',
    descripcion: 'Días pendientes por empleado',
    categoria: 'Vacaciones',
    formatos: ['excel', 'pdf'],
    filtros: [FILTRO_AREA, FILTRO_SEDE],
  },
];

/**
 * Obtiene un reporte por su ID
 */
export function getReporteById(id: string): ReporteConfig | undefined {
  return CATALOGO_REPORTES.find((r) => r.id === id);
}

/**
 * Obtiene reportes por categoría
 */
export function getReportesByCategoria(
  categoria: CategoriaReporte,
): ReporteConfig[] {
  return CATALOGO_REPORTES.filter((r) => r.categoria === categoria);
}

/**
 * IDs válidos de reportes
 */
export const REPORTES_IDS = CATALOGO_REPORTES.map((r) => r.id);

/**
 * Categorías disponibles
 */
export const CATEGORIAS: CategoriaReporte[] = [
  'Empleados',
  'Planilla',
  'Tareo',
  'Contratos',
  'Vacaciones',
];
