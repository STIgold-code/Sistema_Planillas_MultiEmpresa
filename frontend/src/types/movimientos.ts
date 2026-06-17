// Movimientos de personal: ingresos / ceses / vencimientos

export type TipoMovimientoPersonal = 'INGRESO' | 'CESE' | 'VENCIMIENTO';
export type TipoMovimientoFiltro = 'INGRESOS' | 'CESES' | 'VENCIMIENTOS' | 'TODOS';

export interface MovimientoPersonal {
  id: number;
  tipo: TipoMovimientoPersonal;
  empleado_id: number;
  numero_documento: string;
  nombre_completo: string;
  area?: string;
  sede?: string;
  cargo?: string;
  cliente?: string;
  fecha_movimiento: string;
  motivo?: string;
  dias_restantes?: number;
  estado_empleado: string;
}

export interface MovimientosResumen {
  ingresos: number;
  ceses: number;
  vencimientos: number;
}

export interface PeriodoConDatos {
  mes: number;
  anio: number;
}

export interface UltimosPeriodosConDatos {
  ultimoCese?: PeriodoConDatos;
  ultimoIngreso?: PeriodoConDatos;
  ultimoVencimiento?: PeriodoConDatos;
}

export interface Tendencia {
  ingresos: number;
  ceses: number;
  vencimientos: number;
}

export interface DatoHistorico {
  mes: number;
  anio: number;
  label: string;
  ingresos: number;
  ceses: number;
  vencimientos: number;
}

export interface MovimientosResponse {
  resumen: MovimientosResumen;
  tendencia: Tendencia;
  historico: DatoHistorico[];
  data: MovimientoPersonal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  ultimosPeriodos?: UltimosPeriodosConDatos;
}
