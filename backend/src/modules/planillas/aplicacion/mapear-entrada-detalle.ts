/**
 * Mapper Prisma → dominio para el motor del DTO COMPLETO
 * (`calcularDetalleCompleto`). Construye `EntradaDetalle` a partir de las filas
 * Prisma del empleado, su contrato y su tareo.
 *
 * Borde de aplicación (DIP): el dominio NUNCA importa Prisma ni luxon. Toda la
 * aritmética de fechas con timezone (días de ingreso/cese a mitad de mes, meses
 * del semestre para grati/CTS) vive AQUÍ, replicando exactamente el motor legacy
 * (`calcular-empleado.ts`, `gratificaciones.ts`, `cts.ts`) para sostener la
 * paridad al céntimo con los golden snapshots.
 */
import { leerFechaPrisma } from '../../../common/utils/datetime.util';
import { AfiliacionPensionaria, SistemaPensionario } from '../dominio/tipos';
import {
  DiaTareoDetalle,
  EntradaDetalle,
  PromediosDetalle,
} from '../dominio/detalle/tipos-detalle';

/** Subset de la nomenclatura (tipo_marcacion) que el detalle lee. */
export interface TipoMarcacionDetalle {
  codigo: string;
  es_laborable: boolean;
  es_feriado_trabajado: boolean;
  horas_diurnas: number | null;
  horas_nocturnas: number | null;
  horas_default: number | null;
}

export interface DetalleTareoDetalle {
  horas: unknown;
  tipo_marcacion: TipoMarcacionDetalle | null;
}

export interface RegimenPensionarioDetalle {
  tipo: string;
  aporte_obligatorio: unknown;
  prima_seguro: unknown;
  comision_flujo: unknown;
}

export interface ContratoDetalle {
  fecha_inicio: Date | string;
  fecha_fin: Date | string | null;
}

/** Subset del empleado Prisma necesario para el detalle completo. */
export interface EmpleadoParaDetalle {
  sueldo_base: unknown;
  fecha_ingreso: Date | string | null;
  fecha_cese: Date | string | null;
  asignacion_familiar: boolean | null;
  sctr: boolean | null;
  regimen_pensionario: RegimenPensionarioDetalle | null;
  contratos: ContratoDetalle[];
  tareos: { detalles: DetalleTareoDetalle[] }[];
}

export interface ParametrosMapeoDetalle {
  empleado: EmpleadoParaDetalle;
  mes: number;
  anio: number;
  acumuladoRenta: number;
  retencionesPreviasRenta: number;
  promedios: PromediosDetalle;
}

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

function mapearDia(detalle: DetalleTareoDetalle): DiaTareoDetalle | null {
  const tm = detalle.tipo_marcacion;
  if (!tm) return null;
  return {
    codigo: tm.codigo,
    esLaborable: tm.es_laborable,
    esFeriadoTrabajado: tm.es_feriado_trabajado,
    horasDiurnas: aNumero(tm.horas_diurnas),
    horasNocturnas: aNumero(tm.horas_nocturnas),
    horasDetalle: aNumero(detalle.horas),
    horasDefault: tm.horas_default,
  };
}

function mapearAfiliacion(
  regimen: RegimenPensionarioDetalle | null,
): AfiliacionPensionaria | null {
  if (!regimen) return null;
  if (regimen.tipo === 'ONP') {
    return {
      sistema: SistemaPensionario.ONP,
      tasas: {
        aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
        primaSeguro: 0,
        comisionFlujo: 0,
      },
    };
  }
  return {
    sistema: SistemaPensionario.AFP,
    tasas: {
      aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
      primaSeguro: aNumero(regimen.prima_seguro) / 100,
      comisionFlujo: aNumero(regimen.comision_flujo) / 100,
    },
  };
}

/** Días previos al ingreso a mitad de mes (replica `calcular-empleado.ts`). */
function calcularDiasNuevoNoLab(
  empleado: EmpleadoParaDetalle,
  fechaInicioPeriodo: Date,
  fechaFinPeriodo: Date,
  diasDelMes: number,
): number {
  const contrato = empleado.contratos?.[0];
  if (contrato) {
    const inicio = leerFechaPrisma(contrato.fecha_inicio);
    if (inicio.toJSDate() > fechaInicioPeriodo) {
      return Math.min(inicio.day - 1, diasDelMes);
    }
    return 0;
  }
  if (empleado.fecha_ingreso) {
    const ingreso = leerFechaPrisma(empleado.fecha_ingreso);
    if (
      ingreso.toJSDate() > fechaInicioPeriodo &&
      ingreso.toJSDate() <= fechaFinPeriodo
    ) {
      return ingreso.day - 1;
    }
  }
  return 0;
}

/** Días posteriores al cese a mitad de mes (replica `calcular-empleado.ts`). */
function calcularDiasCesadoNoLab(
  empleado: EmpleadoParaDetalle,
  fechaInicioPeriodo: Date,
  fechaFinPeriodo: Date,
  diasDelMes: number,
): number {
  const contrato = empleado.contratos?.[0];
  if (contrato) {
    if (!contrato.fecha_fin) return 0;
    const fin = leerFechaPrisma(contrato.fecha_fin);
    if (
      fin.toJSDate() >= fechaInicioPeriodo &&
      fin.toJSDate() < fechaFinPeriodo
    ) {
      return diasDelMes - fin.day;
    }
    return 0;
  }
  if (empleado.fecha_cese) {
    const cese = leerFechaPrisma(empleado.fecha_cese);
    if (
      cese.toJSDate() >= fechaInicioPeriodo &&
      cese.toJSDate() < fechaFinPeriodo
    ) {
      return diasDelMes - cese.day;
    }
  }
  return 0;
}

/** Meses completos del semestre para gratificación (replica `gratificaciones.ts`). */
function resolverMesesGratificacion(
  mes: number,
  anio: number,
  fechaIngreso: Date | string | null,
): number {
  if (mes !== 7 && mes !== 12) return 6;
  const ingreso = fechaIngreso ? leerFechaPrisma(fechaIngreso) : null;
  const inicioSemestre =
    mes === 7 ? new Date(anio, 0, 1) : new Date(anio, 6, 1);
  if (!ingreso || ingreso.toJSDate() <= inicioSemestre) return 6;

  const mesIngreso = ingreso.month;
  const diaIngreso = ingreso.day;
  if (mes === 7) {
    let meses = 7 - mesIngreso;
    if (diaIngreso > 1) meses = Math.max(0, meses - 1);
    return meses;
  }
  const mesesDesdeIngreso = mesIngreso <= 6 ? 6 : 12 - mesIngreso + 1;
  let meses = Math.min(6, mesesDesdeIngreso);
  if (diaIngreso > 1 && mesIngreso >= 7) meses = Math.max(0, meses - 1);
  return meses;
}

/** Meses/días del semestre para CTS (replica `cts.ts`). */
function resolverMesesCts(
  mes: number,
  anio: number,
  fechaIngreso: Date | string | null,
): { mesesCts: number; diasCts: number } {
  if (mes !== 5 && mes !== 11) return { mesesCts: 0, diasCts: 0 };
  const ingreso = fechaIngreso ? leerFechaPrisma(fechaIngreso) : null;
  const inicioSemestre =
    mes === 5 ? new Date(anio - 1, 10, 1) : new Date(anio, 4, 1);
  if (!ingreso || ingreso.toJSDate() <= inicioSemestre) {
    return { mesesCts: 6, diasCts: 0 };
  }

  const mesIngreso = ingreso.month;
  const anioIngreso = ingreso.year;
  const diaIngreso = ingreso.day;
  let mesesCts: number;
  if (mes === 5) {
    if (anioIngreso === anio) mesesCts = 5 - mesIngreso;
    else if (anioIngreso === anio - 1 && mesIngreso >= 11)
      mesesCts = 12 - mesIngreso + 1 + 4;
    else mesesCts = 6;
  } else {
    if (anioIngreso === anio && mesIngreso >= 5) mesesCts = 11 - mesIngreso;
    else mesesCts = 6;
  }

  let diasCts = 0;
  if (diaIngreso > 1 && mesesCts > 0) {
    const diasDelMesIngreso = new Date(anioIngreso, mesIngreso, 0).getDate();
    diasCts = diasDelMesIngreso - diaIngreso + 1;
    mesesCts = Math.max(0, mesesCts - 1);
  }
  return { mesesCts, diasCts };
}

/** True si el empleado cesa dentro del período (replica `calcular-empleado.ts`). */
function calcularEmpleadoCesa(
  empleado: EmpleadoParaDetalle,
  diasCesadoNoLab: number,
  fechaInicioPeriodo: Date,
  fechaFinPeriodo: Date,
): boolean {
  if (diasCesadoNoLab > 0) return true;
  if (!empleado.fecha_cese) return false;
  const cese = leerFechaPrisma(empleado.fecha_cese).toJSDate();
  return cese >= fechaInicioPeriodo && cese <= fechaFinPeriodo;
}

export function mapearEntradaDetalle(
  params: ParametrosMapeoDetalle,
): EntradaDetalle {
  const { empleado, mes, anio } = params;
  const fechaInicioPeriodo = new Date(anio, mes - 1, 1);
  const fechaFinPeriodo = new Date(anio, mes, 0);
  const diasDelMes = fechaFinPeriodo.getDate();

  const detalles = empleado.tareos?.[0]?.detalles ?? [];
  const dias = detalles
    .map(mapearDia)
    .filter((d): d is DiaTareoDetalle => d !== null);

  const diasNuevoNoLab = calcularDiasNuevoNoLab(
    empleado,
    fechaInicioPeriodo,
    fechaFinPeriodo,
    diasDelMes,
  );
  const diasCesadoNoLab = calcularDiasCesadoNoLab(
    empleado,
    fechaInicioPeriodo,
    fechaFinPeriodo,
    diasDelMes,
  );
  const empleadoCesa = calcularEmpleadoCesa(
    empleado,
    diasCesadoNoLab,
    fechaInicioPeriodo,
    fechaFinPeriodo,
  );
  const cts = resolverMesesCts(mes, anio, empleado.fecha_ingreso);

  return {
    sueldoBase: aNumero(empleado.sueldo_base),
    mes,
    anio,
    dias,
    afiliacion: mapearAfiliacion(empleado.regimen_pensionario),
    promedios: params.promedios,
    acumuladoRenta: params.acumuladoRenta,
    retencionesPreviasRenta: params.retencionesPreviasRenta,
    diasNuevoNoLab,
    diasCesadoNoLab,
    empleadoCesa,
    tieneFechaIngreso: !!empleado.fecha_ingreso,
    tieneAsignacionFamiliar: !!empleado.asignacion_familiar,
    tieneSctr: !!empleado.sctr,
    mesesGratificacion: resolverMesesGratificacion(
      mes,
      anio,
      empleado.fecha_ingreso,
    ),
    mesesCts: cts.mesesCts,
    diasCts: cts.diasCts,
  };
}
