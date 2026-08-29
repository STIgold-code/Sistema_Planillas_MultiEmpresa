/**
 * Contrato de la importación de la plantilla de cierre, tal como lo devuelve
 * `PlantillaCierreImportacionService` en el backend.
 */

export type AccionDeuda =
  | 'ACTUALIZAR'
  | 'CERRAR'
  | 'ALTA_PENDIENTE'
  | 'SIN_CAMBIOS';

export interface CambioDeuda {
  fila: number;
  documento: string;
  trabajador: string;
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO';
  accion: AccionDeuda;
  detalle: string;
  prestamo_id: number | null;
  monto: number;
  cuota: number | null;
  cierra_como: 'PAGADO' | 'CANCELADO' | null;
}

export interface CambioEmpleado {
  fila: number;
  documento: string;
  trabajador: string;
  detalle: string;
  empleado_id: number;
}

export interface BloqueInformativo {
  concepto: string;
  filas: number;
  motivo: string;
  detalle: string[];
}

export interface ProblemaLectura {
  hoja: string;
  fila: number;
  motivo: string;
}

export interface PreviewCierre {
  periodo: { anio: number; mes: number };
  deudas: CambioDeuda[];
  empleados: CambioEmpleado[];
  soloInformativo: BloqueInformativo[];
  errores: ProblemaLectura[];
  advertencias: ProblemaLectura[];
  aplicable: boolean;
  resumen: string;
}

export interface ResultadoCierre {
  saldos_confirmados: number;
  deudas_cerradas: number;
  empleados_reactivados: number;
  altas_pendientes: number;
}

/** Etiqueta y color de cada acción, para que la tabla se lea de un vistazo. */
export const ETIQUETA_ACCION: Record<
  AccionDeuda,
  { texto: string; clase: string }
> = {
  ACTUALIZAR: {
    texto: 'Se actualiza',
    clase: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  CERRAR: {
    texto: 'Se cierra',
    clase: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  ALTA_PENDIENTE: {
    texto: 'Falta cargarlo',
    clase: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  SIN_CAMBIOS: {
    texto: 'Sin cambios',
    clase: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};
