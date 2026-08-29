/**
 * Proyección del cronograma de descuento de un préstamo.
 *
 * Estas reglas son un ESPEJO de las del backend. El archivo canónico es
 * `backend/src/modules/prestamos/dominio/descuentos-prestamos.ts`; acá se
 * replican porque la previsualización tiene que responder mientras el usuario
 * escribe, sin ida y vuelta al servidor. Si cambia una regla allá, cambia acá.
 *
 * Reglas replicadas:
 *  - la cuota nunca excede el saldo (`cuotaEfectiva`)
 *  - el adelanto de gratificación solo descuenta en julio y diciembre (Ley 27735)
 *  - un préstamo descuenta desde el período en que fue otorgado: el motor
 *    filtra por `fecha_otorgado <= fin del período` y nunca retro-descuenta
 *
 * Nada de esto sustituye al cálculo real: es una proyección para que quien
 * otorga el préstamo vea el acuerdo antes de firmarlo.
 */

export type TipoPrestamoCronograma =
  | 'PRESTAMO'
  | 'ADELANTO_SUELDO'
  | 'ADELANTO_GRATIFICACION';

/** Meses que pagan gratificación (Ley 27735): julio y diciembre. */
export const MESES_GRATIFICACION: readonly number[] = [7, 12];

/**
 * Tope de filas proyectadas. Un cronograma más largo que esto es casi siempre
 * un error de captura (cuota de 1 sobre un monto de 5000), y renderizarlo
 * entero solo sirve para colgar el navegador.
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
  tipo: TipoPrestamoCronograma;
  /** Fecha de otorgamiento en formato AAAA-MM-DD. */
  fechaOtorgado: string;
}

const redondear2 = (valor: number): number => {
  const redondeado = Math.round(valor * 100) / 100;
  return Number.isFinite(redondeado) ? redondeado : 0;
};

/**
 * Lee AAAA-MM-DD sin pasar por `new Date`, que interpreta el literal como UTC
 * y corre el día — y con él el mes — en husos negativos como el de Perú.
 */
export function leerPeriodo(
  fechaISO: string,
): { anio: number; mes: number } | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaISO.trim());
  if (!partes) return null;

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return null;

  return { anio, mes };
}

/** Formatea un período como AAAA-MM. */
export function formatearPeriodo(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

const NOMBRE_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Nombre legible de un período, para mostrarlo al usuario. */
export function nombrarPeriodo(anio: number, mes: number): string {
  return `${NOMBRE_MES[mes - 1]} ${anio}`;
}

function avanzarMes(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/**
 * Primer período en que el tipo de préstamo puede descontar, a partir del
 * período de otorgamiento inclusive. Para el adelanto de gratificación, salta
 * al siguiente julio o diciembre.
 */
export function primerPeriodoDescuento(
  tipo: TipoPrestamoCronograma,
  anio: number,
  mes: number,
): { anio: number; mes: number } {
  if (tipo !== 'ADELANTO_GRATIFICACION') return { anio, mes };
  if (MESES_GRATIFICACION.includes(mes)) return { anio, mes };
  if (mes < 7) return { anio, mes: 7 };
  return mes < 12 ? { anio, mes: 12 } : { anio: anio + 1, mes: 7 };
}

/** Período siguiente en que corresponde descontar, según el tipo. */
function siguientePeriodo(
  tipo: TipoPrestamoCronograma,
  anio: number,
  mes: number,
): { anio: number; mes: number } {
  if (tipo !== 'ADELANTO_GRATIFICACION') return avanzarMes(anio, mes);
  return mes === 7 ? { anio, mes: 12 } : { anio: anio + 1, mes: 7 };
}

/** Cuota que corresponde este mes: nunca más que el saldo pendiente. */
export function cuotaEfectiva(cuotaMensual: number, saldo: number): number {
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
  const { montoTotal, cuotaMensual, tipo, fechaOtorgado } = parametros;

  if (montoTotal === null || !(montoTotal > 0)) return null;
  if (!(cuotaMensual > 0)) return null;

  const otorgado = leerPeriodo(fechaOtorgado);
  if (!otorgado) return null;

  let periodo = primerPeriodoDescuento(tipo, otorgado.anio, otorgado.mes);
  let saldo = redondear2(montoTotal);
  let total = 0;
  const filas: FilaCronograma[] = [];

  while (saldo > 0 && filas.length < MAX_FILAS_PROYECTADAS) {
    const cuota = cuotaEfectiva(cuotaMensual, saldo);
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

    periodo = siguientePeriodo(tipo, periodo.anio, periodo.mes);
  }

  const ultima = filas[filas.length - 1];

  return {
    filas,
    truncado: saldo > 0,
    totalProgramado: total,
    periodoFinal: ultima ? ultima.periodo : null,
  };
}
