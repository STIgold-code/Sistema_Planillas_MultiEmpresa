/**
 * Fixture del golden master de BENITES MALPICA (planilla real 05.2026).
 *
 * Construye empleados mínimos con la MISMA forma que el fixture general
 * (cast único documentado en el borde), pero con los rasgos de la planilla de
 * BM: mes completo de 30 días diurnos y sistema pensionario ONP 13%.
 */

export type EmpleadoBm = Record<string, unknown>;

interface RegimenPensionarioBm {
  tipo: 'AFP' | 'ONP';
  aporte_obligatorio: number;
  prima_seguro: number;
  comision_flujo: number;
}

/** ONP 13%, como la columna BE (=AU×0.13) del Excel de BM. */
export const REGIMEN_ONP_BM: RegimenPensionarioBm = {
  tipo: 'ONP',
  aporte_obligatorio: 13,
  prima_seguro: 0,
  comision_flujo: 0,
};

interface DetalleTareoBm {
  horas: number;
  tipo_marcacion: {
    codigo: string;
    es_laborable: boolean;
    es_feriado_trabajado: boolean;
    horas_diurnas: number;
    horas_nocturnas: number;
    horas_default: number;
  };
}

function diaDiurno8h(): DetalleTareoBm {
  return {
    horas: 8,
    tipo_marcacion: {
      codigo: 'A',
      es_laborable: true,
      es_feriado_trabajado: false,
      horas_diurnas: 8,
      horas_nocturnas: 0,
      horas_default: 8,
    },
  };
}

/** Mes completo trabajado: 30 días diurnos (base comercial del Excel de BM). */
export function mesCompleto30Dias(): DetalleTareoBm[] {
  return Array.from({ length: 30 }, () => diaDiurno8h());
}

interface OpcionesEmpleadoBm {
  sueldoBase: number;
  regimenPensionario: RegimenPensionarioBm | null;
  detalles: DetalleTareoBm[];
  asignacionFamiliar?: boolean;
  sctr?: boolean;
}

export function construirEmpleadoBm(opciones: OpcionesEmpleadoBm): EmpleadoBm {
  return {
    sueldo_base: opciones.sueldoBase,
    fecha_ingreso: null,
    fecha_cese: null,
    asignacion_familiar: opciones.asignacionFamiliar ?? false,
    sctr: opciones.sctr ?? false,
    regimen_pensionario: opciones.regimenPensionario,
    contratos: [
      {
        fecha_inicio: new Date(Date.UTC(2020, 0, 1)),
        fecha_fin: null,
        regimen_laboral: null,
      },
    ],
    tareos: [{ detalles: opciones.detalles }],
  };
}
