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
import {
  calcularVentanaPeriodo,
  diaDeFecha,
  diasDelPeriodo,
  fechaCalendarioLocal,
  VentanaPeriodo,
} from '../../tareo/ventana-periodo';
import { AfiliacionPensionaria, SistemaPensionario } from '../dominio/tipos';
import {
  DescuentosPrestamosDetalle,
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
  /** Condición fiscal IR 5ta. null/undefined → domiciliado. */
  domiciliado?: boolean | null;
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
  /**
   * Ventana real del período de tareo (con día de corte puede no ser el mes
   * calendario). Si se omite, se usa el mes calendario de `mes`/`anio`.
   */
  ventanaPeriodo?: VentanaPeriodo;
  /** True si la empresa del período aporta SENATI (config por empresa). */
  empresaAportaSenati?: boolean;
  /**
   * Descuentos por préstamos/adelantos ACTIVOS del trabajador, resueltos por el
   * módulo `prestamos` antes de calcular. Ausente = sin préstamos vigentes.
   */
  descuentosPrestamos?: DescuentosPrestamosDetalle;
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

/**
 * Días de la ventana ANTERIORES a `fecha` (la fecha misma no cuenta).
 * Si `fecha` cae después de la ventana, ningún día se devengó → N.
 */
function diasDeVentanaAntesDe(ventana: VentanaPeriodo, fecha: Date): number {
  const ordinal = diaDeFecha(ventana.fechaInicio, ventana.fechaFin, fecha);
  if (ordinal === null) {
    return diasDelPeriodo(ventana.fechaInicio, ventana.fechaFin);
  }
  return ordinal - 1;
}

/** Días de la ventana POSTERIORES a `fecha` (la fecha misma no cuenta). */
function diasDeVentanaDespuesDe(ventana: VentanaPeriodo, fecha: Date): number {
  const ordinal = diaDeFecha(ventana.fechaInicio, ventana.fechaFin, fecha);
  if (ordinal === null) return 0;
  return diasDelPeriodo(ventana.fechaInicio, ventana.fechaFin) - ordinal;
}

/**
 * Días de la ventana anteriores al ingreso (el trabajador entró a mitad del
 * período). Con período calendario equivale a `día del mes - 1`; con ventana de
 * corte se cuentan los días REALES entre el inicio del período y el ingreso.
 */
function calcularDiasNuevoNoLab(
  empleado: EmpleadoParaDetalle,
  ventana: VentanaPeriodo,
): number {
  const contrato = empleado.contratos?.[0];
  if (contrato) {
    const inicio = fechaCalendarioLocal(contrato.fecha_inicio);
    if (inicio > ventana.fechaInicio) {
      return diasDeVentanaAntesDe(ventana, inicio);
    }
    return 0;
  }
  if (empleado.fecha_ingreso) {
    const ingreso = fechaCalendarioLocal(empleado.fecha_ingreso);
    if (ingreso > ventana.fechaInicio && ingreso <= ventana.fechaFin) {
      return diasDeVentanaAntesDe(ventana, ingreso);
    }
  }
  return 0;
}

/**
 * Días de la ventana posteriores al cese (el trabajador salió a mitad del
 * período). Con período calendario equivale a `días del mes - día del cese`.
 */
function calcularDiasCesadoNoLab(
  empleado: EmpleadoParaDetalle,
  ventana: VentanaPeriodo,
): number {
  const contrato = empleado.contratos?.[0];
  if (contrato) {
    if (!contrato.fecha_fin) return 0;
    const fin = fechaCalendarioLocal(contrato.fecha_fin);
    if (fin >= ventana.fechaInicio && fin < ventana.fechaFin) {
      return diasDeVentanaDespuesDe(ventana, fin);
    }
    return 0;
  }
  if (empleado.fecha_cese) {
    const cese = fechaCalendarioLocal(empleado.fecha_cese);
    if (cese >= ventana.fechaInicio && cese < ventana.fechaFin) {
      return diasDeVentanaDespuesDe(ventana, cese);
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

/** True si el empleado cesa dentro de la ventana del período. */
function calcularEmpleadoCesa(
  empleado: EmpleadoParaDetalle,
  diasCesadoNoLab: number,
  ventana: VentanaPeriodo,
): boolean {
  if (diasCesadoNoLab > 0) return true;
  if (!empleado.fecha_cese) return false;
  const cese = fechaCalendarioLocal(empleado.fecha_cese);
  return cese >= ventana.fechaInicio && cese <= ventana.fechaFin;
}

export function mapearEntradaDetalle(
  params: ParametrosMapeoDetalle,
): EntradaDetalle {
  const { empleado, mes, anio } = params;
  // La ventana manda; sin período de tareo asociado se cae al mes calendario.
  const ventana =
    params.ventanaPeriodo ?? calcularVentanaPeriodo(anio, mes, null);

  const detalles = empleado.tareos?.[0]?.detalles ?? [];
  const dias = detalles
    .map(mapearDia)
    .filter((d): d is DiaTareoDetalle => d !== null);

  const diasNuevoNoLab = calcularDiasNuevoNoLab(empleado, ventana);
  const diasCesadoNoLab = calcularDiasCesadoNoLab(empleado, ventana);
  const empleadoCesa = calcularEmpleadoCesa(empleado, diasCesadoNoLab, ventana);
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
    fechaReferenciaParametros: ventana.fechaFin,
    diasNuevoNoLab,
    diasCesadoNoLab,
    empleadoCesa,
    tieneFechaIngreso: !!empleado.fecha_ingreso,
    tieneAsignacionFamiliar: !!empleado.asignacion_familiar,
    tieneSctr: !!empleado.sctr,
    empresaAportaSenati: !!params.empresaAportaSenati,
    trabajadorDomiciliado: empleado.domiciliado ?? true,
    mesesGratificacion: resolverMesesGratificacion(
      mes,
      anio,
      empleado.fecha_ingreso,
    ),
    mesesCts: cts.mesesCts,
    diasCts: cts.diasCts,
    descuentosPrestamos: params.descuentosPrestamos,
  };
}
