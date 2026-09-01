/**
 * Proyección del cronograma de descuento de un préstamo.
 *
 * Es el calendario que se le muestra —y se le imprime— al trabajador antes de
 * firmar el convenio, así que tiene que decir exactamente lo que el motor va a
 * hacer. Por eso vive ACÁ, junto a `descuentos-prestamos.ts`, y no replicado en
 * el cliente: una copia mantenida a mano se despega, y cuando se despega el
 * trabajador firma un papel que no coincide con su boleta.
 *
 * La regla que se solía perder en la copia: un préstamo descuenta en el primer
 * período cuya VENTANA lo alcanza, y con día de corte la ventana no es el mes
 * calendario. Con corte 25, un préstamo otorgado el 28 de julio cae en el
 * período de agosto (26-jul → 25-ago), no en el de julio.
 *
 * Dependency Rule: sin Prisma ni NestJS.
 */
import {
  TipoPrestamoCalculo,
  MESES_GRATIFICACION,
} from './descuentos-prestamos';

/**
 * Tope de filas proyectadas. Un cronograma más largo que esto es casi siempre
 * un error de captura (cuota de 1 sobre un monto de 5000).
 */
export const MAX_FILAS_PROYECTADAS = 120;

export interface FilaCronograma {
  numero: number;
  /** Período de planilla en formato AAAA-MM. */
  periodo: string;
  anio: number;
  mes: number;
  saldoInicial: number;
  cuota: number;
  saldoFinal: number;
}

export interface ProyeccionCronograma {
  filas: FilaCronograma[];
  /** True si se alcanzó `MAX_FILAS_PROYECTADAS` antes de cancelar el saldo. */
  truncado: boolean;
  totalProgramado: number;
  /** Último período con cuota, en formato AAAA-MM. Null si no hay filas. */
  periodoFinal: string | null;
}

export interface ParametrosCronograma {
  /** Null = descuento recurrente sin monto definido: no es proyectable. */
  montoTotal: number | null;
  cuotaMensual: number;
  tipo: TipoPrestamoCalculo;
  /** Fecha de otorgamiento en formato AAAA-MM-DD. */
  fechaOtorgado: string;
  /** Día de corte del período de la empresa. Null = mes calendario. */
  diaCorte: number | null;
}

const redondear2 = (valor: number): number => {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isFinite(redondeado) ? redondeado : 0;
};

interface Periodo {
  anio: number;
  mes: number;
}

/**
 * Lee AAAA-MM-DD sin pasar por `new Date`, que interpreta el literal como UTC
 * y corre el día —y con él el mes— en husos negativos como el de Perú.
 */
export function leerFecha(
  fechaISO: string,
): { anio: number; mes: number; dia: number } | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO.trim());
  if (!partes) return null;

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  return { anio, mes, dia };
}

/** Formatea un período como AAAA-MM. */
export function formatearPeriodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

function avanzarMes({ anio, mes }: Periodo): Periodo {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/**
 * Período de planilla cuya ventana contiene la fecha dada.
 *
 * Sin día de corte el período es el mes calendario. Con día de corte C, la
 * ventana del período (año, mes) va del día C+1 del mes anterior al día C de
 * ese mes: una fecha posterior al corte pertenece al período SIGUIENTE.
 */
export function periodoDeFecha(
  anio: number,
  mes: number,
  dia: number,
  diaCorte: number | null,
): Periodo {
  if (diaCorte === null || dia <= diaCorte) return { anio, mes };
  return avanzarMes({ anio, mes });
}

/**
 * Primer período en que el tipo de préstamo puede descontar, a partir del
 * período dado inclusive. El adelanto de gratificación salta al siguiente julio
 * o diciembre (Ley 27735).
 */
export function primerPeriodoDescuento(
  tipo: TipoPrestamoCalculo,
  { anio, mes }: Periodo,
): Periodo {
  if (tipo !== 'ADELANTO_GRATIFICACION') return { anio, mes };
  if (MESES_GRATIFICACION.includes(mes)) return { anio, mes };
  if (mes < 7) return { anio, mes: 7 };
  return mes < 12 ? { anio, mes: 12 } : { anio: anio + 1, mes: 7 };
}

/** Período siguiente en que corresponde descontar, según el tipo. */
function siguientePeriodo(
  tipo: TipoPrestamoCalculo,
  periodo: Periodo,
): Periodo {
  if (tipo !== 'ADELANTO_GRATIFICACION') return avanzarMes(periodo);
  return periodo.mes === 7
    ? { anio: periodo.anio, mes: 12 }
    : { anio: periodo.anio + 1, mes: 7 };
}

/** Cuota que corresponde este mes: nunca más que el saldo pendiente. */
export function cuotaContraSaldo(cuotaMensual: number, saldo: number): number {
  const cuota = Math.max(0, redondear2(cuotaMensual));
  return Math.min(cuota, Math.max(0, redondear2(saldo)));
}

/**
 * Cuota mensual que resulta de repartir un monto en N cuotas.
 *
 * Redondea hacia ARRIBA a propósito. Con redondeo normal, 1000 en 3 cuotas da
 * 333.33, y como la cuota nunca excede el saldo, el motor descontaría una
 * cuarta cuota de 0.01: el trabajador ve un descuento fantasma un mes después
 * de haber terminado de pagar. Hacia arriba, 333.34 cierra la deuda en las 3
 * cuotas pactadas y la última se ajusta sola al saldo (333.32).
 */
export function cuotaDesdeNumeroCuotas(
  montoTotal: number,
  numeroCuotas: number,
): number {
  if (!(montoTotal > 0) || !(numeroCuotas > 0)) return 0;
  return Math.ceil((montoTotal / numeroCuotas) * 100) / 100;
}

/** Cuántas cuotas hacen falta para cancelar el monto con la cuota indicada. */
export function numeroCuotasDesdeCuota(
  montoTotal: number,
  cuotaMensual: number,
): number {
  if (!(montoTotal > 0) || !(cuotaMensual > 0)) return 0;
  return Math.ceil(redondear2(montoTotal) / redondear2(cuotaMensual));
}

/**
 * Proyecta el calendario de descuentos. Devuelve `null` cuando no hay nada que
 * proyectar: sin monto total (descuento recurrente), sin cuota, o con una fecha
 * de otorgamiento que todavía no es una fecha válida.
 */
export function proyectarCronograma(
  parametros: ParametrosCronograma,
): ProyeccionCronograma | null {
  const { montoTotal, cuotaMensual, tipo, fechaOtorgado, diaCorte } =
    parametros;

  if (montoTotal === null || !(montoTotal > 0)) return null;
  if (!(cuotaMensual > 0)) return null;

  const otorgado = leerFecha(fechaOtorgado);
  if (!otorgado) return null;

  let periodo = primerPeriodoDescuento(
    tipo,
    periodoDeFecha(otorgado.anio, otorgado.mes, otorgado.dia, diaCorte),
  );
  let saldo = redondear2(montoTotal);
  let total = 0;
  const filas: FilaCronograma[] = [];

  while (saldo > 0 && filas.length < MAX_FILAS_PROYECTADAS) {
    const cuota = cuotaContraSaldo(cuotaMensual, saldo);
    if (cuota <= 0) break;

    const saldoInicial = saldo;
    saldo = redondear2(saldo - cuota);
    total = redondear2(total + cuota);

    filas.push({
      numero: filas.length + 1,
      periodo: formatearPeriodo(periodo.anio, periodo.mes),
      anio: periodo.anio,
      mes: periodo.mes,
      saldoInicial,
      cuota,
      saldoFinal: saldo,
    });

    periodo = siguientePeriodo(tipo, periodo);
  }

  const ultima = filas[filas.length - 1];

  return {
    filas,
    truncado: saldo > 0,
    totalProgramado: total,
    periodoFinal: ultima ? ultima.periodo : null,
  };
}
