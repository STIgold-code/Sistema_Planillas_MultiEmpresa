/**
 * Beneficios periódicos del detalle (gratificación, CTS, beneficios truncos)
 * como funciones PURAS del dominio.
 *
 * Reproducen al céntimo la matemática del motor legacy (`gratificaciones.ts`,
 * `cts.ts`, `beneficios-truncos.ts`) SALVO en tres puntos donde el legacy
 * contradecía la ley y se corrigió deliberadamente:
 *
 *  1. Gratificación TRUNCA: se paga por meses calendario COMPLETOS del semestre
 *     (Ley 27735 art. 7 / D.S. 005-2002-TR art. 5). El legacy contaba el mes del
 *     cese aunque no se hubiera completado (cese el 09-jun pagaba 6/6).
 *  2. Vacaciones TRUNCAS: dozavos y treintavos desde el ÚLTIMO ANIVERSARIO de
 *     ingreso (D.L. 713 arts. 22-23). El legacy usaba el mes calendario del año,
 *     asumiendo que todos ingresaron el 1 de enero e ignorando los días.
 *  3. Gratificación ORDINARIA y TRUNCA: los días NO considerados tiempo
 *     efectivamente laborado se deducen a razón de un treintavo del sexto
 *     (D.S. 005-2002-TR art. 3.4, texto según D.S. 017-2002-TR). El legacy
 *     pagaba el semestre completo aunque el trabajador hubiera faltado.
 *
 * La CTS trunca no cambió. La resolución de MESES/DÍAS del semestre para las
 * gratificaciones y la CTS del período se sigue haciendo en el borde de
 * aplicación y se inyecta ya calculada; las fechas de ingreso/cese llegan como
 * fechas de CALENDARIO puras (sin timezone) desde el mismo borde. Los factores
 * legales (asignación familiar, tasa EsSalud de la bonificación 30334)
 * provienen del puerto `ParametrosLegales`.
 */
import { redondear2 } from './redondeo';
import {
  DIAS_SEMESTRE,
  DiasNoLaboradosPorMes,
  diasNoLaboradosComputables,
  sumarDiasNoLaborados,
} from '../conceptos/gratificacion';

export type { DiasNoLaboradosPorMes };

export interface GratificacionDetalle {
  gratificacionMonto: number;
  bonifExtraordinariaMonto: number;
}

/**
 * Gratificación (Ley 27735) + bonificación extraordinaria (Ley 30334).
 * Solo paga en julio (7) y diciembre (12).
 *
 * DEDUCCIÓN DE DÍAS NO LABORADOS — D.S. 005-2002-TR art. 3.4 (texto vigente
 * según D.S. 017-2002-TR): "El tiempo de servicios para efectos del cálculo se
 * determina por cada mes calendario completo laborado en el período
 * correspondiente. Los días que no se consideren tiempo efectivamente laborado
 * se deducirán a razón de un treintavo de la fracción correspondiente."
 * La fracción es el sexto del semestre → cada día descuenta `computable / 180`.
 * NO deducen los días asimilados a tiempo laborado por el art. 2 del mismo
 * reglamento (descanso vacacional, licencia CON goce, descansos con subsidio de
 * seguridad social y los que la ley declare expresamente como laborados).
 *
 * La bonificación extraordinaria (Ley 30334) se calcula sobre la gratificación
 * YA deducida, porque su base legal es "el monto de la gratificación".
 *
 * @param mesesGratificacion Meses completos del semestre (resueltos en el borde).
 * @param essaludTasa Tasa EsSalud vigente (base de la bonificación 30334).
 * @param diasNoLaboradosPorMes Días no laborados por mes calendario del año.
 *   Ausente = sin ausencias registradas (no se presume ausencia sin dato).
 */
export function calcularGratificacionDetalle(
  mes: number,
  remuneracionComputable: number,
  mesesGratificacion: number,
  essaludTasa: number,
  diasNoLaboradosPorMes: DiasNoLaboradosPorMes = {},
): GratificacionDetalle {
  if (mes !== 7 && mes !== 12) {
    return { gratificacionMonto: 0, bonifExtraordinariaMonto: 0 };
  }
  // Solo deducen los días de los meses que el trabajador realmente devenga: con
  // ingreso a mitad de semestre, los meses previos ya no aportan sexto.
  const diasNoLaborados = diasNoLaboradosComputables(
    mes,
    mesesGratificacion,
    diasNoLaboradosPorMes,
  );
  const devengado = remuneracionComputable * (mesesGratificacion / 6);
  const deduccion =
    (remuneracionComputable / DIAS_SEMESTRE) * Math.max(0, diasNoLaborados);
  const gratificacionMonto = redondear2(Math.max(0, devengado - deduccion));
  return {
    gratificacionMonto,
    bonifExtraordinariaMonto: redondear2(gratificacionMonto * essaludTasa),
  };
}

/**
 * CTS (D.S. 001-97-TR). Solo deposita en mayo (5) y noviembre (11).
 * Fórmula: (computable/12)×meses + (computable/360)×días.
 */
export function calcularCtsDetalle(
  mes: number,
  remuneracionComputable: number,
  mesesCts: number,
  diasCts: number,
): number {
  if (mes !== 5 && mes !== 11) return 0;
  return redondear2(
    (remuneracionComputable / 12) * mesesCts +
      (remuneracionComputable / 360) * diasCts,
  );
}

export interface BeneficiosTruncos {
  ctsTrunca: number;
  gratTrunca: number;
  vacTruncas: number;
  totalBeneficiosSociales: number;
}

/** Entrada de los beneficios truncos de un empleado que cesa en el período. */
export interface ParametrosBeneficiosTruncos {
  empleadoCesa: boolean;
  /** Mes de la planilla. Solo se usa como respaldo si no hay fecha de cese. */
  mes: number;
  diasTrabajados: number;
  remComputableCts: number;
  remComputableGratificacion: number;
  sueldoBase: number;
  tieneAsignacionFamiliar: boolean;
  tieneFechaIngreso: boolean;
  /** Monto de asignación familiar (0 si no aplica). */
  asignacionFamiliarMonto: number;
  /** Fecha real de ingreso: origen del récord trunco vacacional. */
  fechaIngreso?: Date;
  /** Fecha real de cese dentro del período. */
  fechaCese?: Date;
  /**
   * Días NO considerados tiempo efectivamente laborado por mes calendario del
   * año. Solo deducen los que caen DENTRO de los meses completos que la trunca
   * reconoce. Ausente = sin ausencias registradas.
   */
  diasNoLaboradosPorMes?: DiasNoLaboradosPorMes;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** True si `fecha` es el último día de su mes calendario. */
function esUltimoDiaDelMes(fecha: Date): boolean {
  const ultimoDia = new Date(
    fecha.getFullYear(),
    fecha.getMonth() + 1,
    0,
  ).getDate();
  return fecha.getDate() === ultimoDia;
}

/** Suma meses conservando el día, recortándolo si el mes destino es más corto. */
function sumarMeses(fecha: Date, meses: number): Date {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth() + meses;
  const ultimoDiaDestino = new Date(anio, mes + 1, 0).getDate();
  return new Date(anio, mes, Math.min(fecha.getDate(), ultimoDiaDestino));
}

function diferenciaEnDias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA);
}

/** Récord trunco vacacional expresado en dozavos y treintavos. */
interface RecordTruncoVacacional {
  meses: number;
  dias: number;
}

/**
 * Último aniversario de la fecha de ingreso ocurrido en o antes del cese.
 * Es el inicio del año de récord vacacional que quedó trunco.
 */
function ultimoAniversario(fechaIngreso: Date, fechaCese: Date): Date {
  const candidato = new Date(
    fechaCese.getFullYear(),
    fechaIngreso.getMonth(),
    fechaIngreso.getDate(),
  );
  if (candidato <= fechaCese && candidato >= fechaIngreso) return candidato;
  const anterior = new Date(
    fechaCese.getFullYear() - 1,
    fechaIngreso.getMonth(),
    fechaIngreso.getDate(),
  );
  return anterior >= fechaIngreso ? anterior : fechaIngreso;
}

/**
 * Récord trunco vacacional: meses completos desde el último aniversario de
 * ingreso más los días sueltos del mes incompleto (D.L. 713 arts. 22-23,
 * reglamentado por el D.S. 012-92-TR art. 21: dozavos y treintavos).
 *
 * CRITERIO DE LOS TREINTAVOS (documentado, es una decisión):
 * el récord se cuenta como intervalo CERRADO [aniversario, fecha de cese] —
 * ambos días inclusive. El día del cese es un día de vínculo laboral vigente y
 * remunerado, así que suma treintavo. Es la misma convención inclusiva que ya
 * usa el récord de CTS del motor (`resolverMesesCts`: `díasDelMes - díaIngreso
 * + 1`), de modo que ambos beneficios cuentan igual y no hay un día que se
 * pague en CTS y se pierda en vacaciones.
 */
function calcularRecordTruncoVacacional(
  fechaIngreso: Date,
  fechaCese: Date,
): RecordTruncoVacacional {
  if (fechaCese < fechaIngreso) return { meses: 0, dias: 0 };

  const aniversario = ultimoAniversario(fechaIngreso, fechaCese);
  // Fin EXCLUSIVO del intervalo cerrado [aniversario, cese].
  const fin = new Date(
    fechaCese.getFullYear(),
    fechaCese.getMonth(),
    fechaCese.getDate() + 1,
  );

  let meses = 0;
  while (meses < 12 && sumarMeses(aniversario, meses + 1) <= fin) {
    meses += 1;
  }
  return { meses, dias: diferenciaEnDias(sumarMeses(aniversario, meses), fin) };
}

/**
 * Meses completos del semestre que dan derecho a gratificación trunca.
 *
 * Ley 27735 art. 7 y D.S. 005-2002-TR art. 5: la gratificación trunca se paga a
 * razón de un sexto por MES CALENDARIO COMPLETO laborado en el semestre; los
 * días sueltos del mes de cese NO generan sexto (a diferencia de la CTS, que sí
 * los reconoce en treintavos).
 *
 * El semestre se determina por el mes del CESE, no por el mes de la planilla:
 * con ventana de día de corte (26 → 25) la planilla de julio puede contener un
 * cese ocurrido el 30 de junio, que trunca el semestre enero-junio.
 */
function resolverMesesGratificacionTrunca(
  mesPlanilla: number,
  fechaCese?: Date,
): number {
  const mesCese = fechaCese ? fechaCese.getMonth() + 1 : mesPlanilla;
  const mesesDelSemestre = mesCese <= 6 ? mesCese : mesCese - 6;
  // Sin fecha de cese (dato histórico incompleto) se conserva el
  // comportamiento anterior: no hay evidencia para descontar el mes en curso.
  if (!fechaCese || esUltimoDiaDelMes(fechaCese)) return mesesDelSemestre;
  return Math.max(0, mesesDelSemestre - 1);
}

/**
 * Días no laborados que deduce la gratificación TRUNCA.
 *
 * CRITERIO (documentado, es una decisión): la trunca solo reconoce MESES
 * CALENDARIO COMPLETOS del semestre (Ley 27735 art. 7), así que los treintavos
 * del art. 3.4 se deducen ÚNICAMENTE dentro de esos meses. Los días no
 * laborados del mes de cese incompleto ya están excluidos por partida doble —
 * ese mes no aporta sexto alguno —, y volver a descontarlos sería castigar dos
 * veces la misma ausencia.
 *
 * Los meses completos son los `mesesCompletos` PRIMEROS del semestre del cese
 * (enero-junio o julio-diciembre): la trunca se devenga desde el inicio del
 * semestre hacia adelante.
 */
function diasNoLaboradosDeMesesCompletos(
  mesPlanilla: number,
  mesesCompletos: number,
  fechaCese?: Date,
  porMes: DiasNoLaboradosPorMes = {},
): number {
  if (mesesCompletos <= 0) return 0;
  const mesCese = fechaCese ? fechaCese.getMonth() + 1 : mesPlanilla;
  const primerMesDelSemestre = mesCese <= 6 ? 1 : 7;
  return sumarDiasNoLaborados(
    porMes,
    primerMesDelSemestre,
    primerMesDelSemestre + mesesCompletos - 1,
  );
}

/**
 * Beneficios truncos para empleados que cesan en el período.
 *
 * La CTS trunca conserva la fórmula histórica (D.S. 001-97-TR art. 21:
 * dozavos por mes completo y treintavos por los días). La gratificación y las
 * vacaciones truncas SÍ cambiaron respecto del legacy para ajustarse a la ley
 * (ver `resolverMesesGratificacionTrunca` y `calcularRecordTruncoVacacional`).
 */
export function calcularBeneficiosTruncosDetalle(
  params: ParametrosBeneficiosTruncos,
): BeneficiosTruncos {
  const vacio: BeneficiosTruncos = {
    ctsTrunca: 0,
    gratTrunca: 0,
    vacTruncas: 0,
    totalBeneficiosSociales: 0,
  };
  if (!params.empleadoCesa) return vacio;

  const {
    mes,
    diasTrabajados,
    remComputableCts,
    remComputableGratificacion,
    sueldoBase,
    tieneAsignacionFamiliar,
    tieneFechaIngreso,
    asignacionFamiliarMonto,
    fechaIngreso,
    fechaCese,
    diasNoLaboradosPorMes,
  } = params;

  let mesesDesdeUltimoCts = 0;
  if (mes <= 5) mesesDesdeUltimoCts = mes - 1 + 2;
  else if (mes <= 11) mesesDesdeUltimoCts = mes - 5;
  else mesesDesdeUltimoCts = mes - 11;

  const ctsTrunca = redondear2(
    (remComputableCts / 12) * mesesDesdeUltimoCts +
      (remComputableCts / 360) * diasTrabajados,
  );

  const mesesGratTrunca = resolverMesesGratificacionTrunca(mes, fechaCese);
  const diasNoLaboradosTrunca = diasNoLaboradosDeMesesCompletos(
    mes,
    mesesGratTrunca,
    fechaCese,
    diasNoLaboradosPorMes,
  );
  const gratTrunca = redondear2(
    Math.max(
      0,
      (remComputableGratificacion / 6) * mesesGratTrunca -
        (remComputableGratificacion / DIAS_SEMESTRE) * diasNoLaboradosTrunca,
    ),
  );

  let vacTruncas = 0;
  if (tieneFechaIngreso) {
    const baseVac =
      sueldoBase + (tieneAsignacionFamiliar ? asignacionFamiliarMonto : 0);
    if (fechaIngreso && fechaCese) {
      const record = calcularRecordTruncoVacacional(fechaIngreso, fechaCese);
      vacTruncas = redondear2(
        (baseVac / 12) * record.meses + (baseVac / 360) * record.dias,
      );
    } else {
      // Fallback histórico: sin las fechas reales no se puede ubicar el
      // aniversario, así que se conserva la fórmula anterior (dozavos por mes
      // calendario del año). No debería ocurrir en producción: un cese siempre
      // trae fecha de cese, y el ingreso es obligatorio en el alta.
      vacTruncas = redondear2((baseVac / 12) * Math.min(12, mes));
    }
  }

  return {
    ctsTrunca,
    gratTrunca,
    vacTruncas,
    totalBeneficiosSociales: redondear2(ctsTrunca + gratTrunca + vacTruncas),
  };
}
