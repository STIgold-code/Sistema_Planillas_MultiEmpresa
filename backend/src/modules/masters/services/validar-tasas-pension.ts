/**
 * Validación de rango de las tasas pensionarias que llegan del scraper de la SBS.
 *
 * POR QUÉ EXISTE: el job `PensionRatesSchedulerService` raspa la tabla pública de
 * la SBS con expresiones regulares y escribe el resultado directo en
 * `regimenes_pensionarios`. Si la SBS reordena una columna, agrega una fila o
 * cambia el formato, el regex captura el número equivocado y el `upsert` persiste
 * una tasa absurda sin que nada la frene. Esto ya PASÓ en producción: la fila de
 * PRIMA quedó con `comision_flujo = 500.5` (500 % de comisión) y `prima_seguro`
 * con el valor de otra columna. Como `resolver-afiliacion-pensionaria` divide ese
 * campo entre 100 y se lo entrega al motor de cálculo, un solo trabajador
 * enganchado a esa fila habría salido con medio sueldo de comisión.
 *
 * QUÉ HACE: una tasa fuera de rango NO se escribe. La fila queda con su valor
 * anterior —que es un dato bueno conocido— y el job continúa con las demás AFP.
 * Preferir el dato viejo al dato nuevo corrupto es la elección correcta porque
 * las tasas del SPP cambian pocas veces al año y siempre por márgenes chicos: un
 * día de desfase es irrelevante, un 500 % de comisión no.
 *
 * Puro: sin Prisma ni Nest. Se testea solo.
 */

/** Rango cerrado [min, max] admisible para una tasa, expresada en PORCENTAJE. */
export interface RangoTasa {
  readonly min: number;
  readonly max: number;
  /** Motivo legal/estadístico del rango. Se imprime en el log del rechazo. */
  readonly justificacion: string;
}

/** Tasas de una AFP tal como las publica la SBS (en PORCENTAJE, no fracción). */
export interface TasasPensionarias {
  /** Aporte obligatorio al fondo de pensiones. */
  aporteObligatorio?: number;
  /** Comisión sobre flujo PURA (modalidad flujo). */
  comisionFlujo?: number;
  /** Componente sobre flujo de la comisión MIXTA (Ley 29903 art. 8). */
  comisionMixtaFlujo?: number;
  /** Comisión anual sobre el saldo del fondo (informativa). */
  comisionSaldo?: number;
  /** Prima del seguro de invalidez, sobrevivencia y gastos de sepelio. */
  primaSeguro?: number;
}

/**
 * Rangos admisibles. Son deliberadamente ANCHOS respecto de los valores
 * vigentes: el objetivo no es adivinar la tasa correcta —eso lo hace la SBS—
 * sino rechazar lecturas que están en otro orden de magnitud, que es la forma en
 * que falla un parser de columnas corridas.
 */
export const RANGOS_TASAS_PENSION: Readonly<
  Record<keyof TasasPensionarias, RangoTasa>
> = {
  // 10 % en el SPP (D.L. 25897 art. 30) y 13 % en la ONP (D.L. 19990). Ninguno
  // de los dos se movió desde 1993. La banda tolera una reforma moderada y
  // rechaza cualquier lectura de otro orden de magnitud.
  aporteObligatorio: {
    min: 8,
    max: 15,
    justificacion:
      'aporte obligatorio: 10 % en AFP (D.L. 25897) y 13 % en ONP (D.L. 19990)',
  },
  // Vigentes 2026: HABITAT 1.47, INTEGRA 1.55, PRIMA 1.60, PROFUTURO 1.69. En
  // toda la historia del SPP la comisión sobre flujo no pasó de ~2.5 %.
  comisionFlujo: {
    min: 0.1,
    max: 3,
    justificacion:
      'comisión sobre flujo: histórico del SPP entre 0.14 % y 2.5 % (vigentes 1.47–1.69 %)',
  },
  // Por diseño legal es MENOR que la comisión sobre flujo pura (Ley 29903 art.
  // 8). Vigentes 0.18–0.82. Se admite 0: significa "tasa aún no cargada".
  comisionMixtaFlujo: {
    min: 0,
    max: 2,
    justificacion:
      'componente sobre flujo de la comisión mixta: por ley es menor que la comisión sobre flujo pura (vigentes 0.18–0.82 %)',
  },
  // La cobra la AFP contra el fondo y NUNCA entra al descuento de la boleta,
  // pero se guarda en la misma fila: una lectura corrida aquí es la señal de que
  // el resto de columnas también se corrió.
  comisionSaldo: {
    min: 0,
    max: 3,
    justificacion:
      'comisión anual sobre el saldo: informativa, vigentes 0.60–0.82 %',
  },
  // La fija la SBS por licitación y es la MISMA para las cuatro AFP. Histórico
  // 1.20–1.90 % (vigente 1.74 %).
  primaSeguro: {
    min: 0.5,
    max: 3,
    justificacion:
      'prima de seguro: licitada por la SBS, igual para las 4 AFP, histórico 1.20–1.90 %',
  },
};

export interface ResultadoValidacionTasas {
  readonly valido: boolean;
  /** Un motivo por cada tasa rechazada, listo para loguear. Vacío si es válido. */
  readonly motivos: readonly string[];
}

const ETIQUETAS: Readonly<Record<keyof TasasPensionarias, string>> = {
  aporteObligatorio: 'aporte_obligatorio',
  comisionFlujo: 'comision_flujo',
  comisionMixtaFlujo: 'comision_mixta_flujo',
  comisionSaldo: 'comision_saldo',
  primaSeguro: 'prima_seguro',
};

const CAMPOS = Object.keys(RANGOS_TASAS_PENSION) as (keyof TasasPensionarias)[];

/**
 * Valida las tasas scrapeadas de UNA AFP. Los campos ausentes (`undefined`) no
 * se validan: significan "esta corrida no trae ese dato" y el `upsert` tampoco
 * los toca. Un `NaN` o un infinito SÍ se rechazan: son el síntoma típico de un
 * `parseFloat` sobre una captura vacía.
 */
export function validarTasasPension(
  tasas: TasasPensionarias,
): ResultadoValidacionTasas {
  const motivos: string[] = [];

  for (const campo of CAMPOS) {
    const valor = tasas[campo];
    if (valor === undefined) continue;

    const rango = RANGOS_TASAS_PENSION[campo];
    const etiqueta = ETIQUETAS[campo];

    if (!Number.isFinite(valor)) {
      motivos.push(
        `${etiqueta}=${String(valor)} no es un número válido (${rango.justificacion})`,
      );
      continue;
    }

    if (valor < rango.min || valor > rango.max) {
      motivos.push(
        `${etiqueta}=${valor} fuera del rango admisible [${rango.min}, ${rango.max}] — ${rango.justificacion}`,
      );
    }
  }

  return { valido: motivos.length === 0, motivos };
}

/** Una AFP ya parseada, lista para el chequeo de coherencia entre filas. */
export interface AfpParseada {
  readonly nombre: string;
  readonly tasas: TasasPensionarias;
}

/** Mínimo de AFP con prima leída para que la mayoría sea evidencia y no ruido. */
const MINIMO_AFP_PARA_COHERENCIA = 3;

/** Tolerancia de comparación: las tasas se publican con 2 decimales. */
const TOLERANCIA_PRIMA = 0.001;

/**
 * Chequeo de coherencia ENTRE filas: la prima del seguro de invalidez,
 * sobrevivencia y gastos de sepelio se licita de forma CONJUNTA para todo el SPP
 * (Ley 29903), así que es la MISMA para las cuatro AFP. Si una fila trae una
 * prima distinta de la que reportan las demás, el parser leyó la columna
 * equivocada de esa fila.
 *
 * Esto es lo que atrapa la corrupción real de producción que el rango no puede:
 * la fila de PRIMA quedó con `prima_seguro = 1.25` mientras las otras tres
 * reportaban 1.74. 1.25 es un porcentaje perfectamente plausible en sí mismo —
 * solo es detectable comparándolo con sus pares.
 *
 * Devuelve el nombre y el motivo de cada AFP discrepante. Si hay menos de tres
 * AFP con prima leída no se pronuncia: sin mayoría no hay evidencia.
 */
export function detectarPrimasIncoherentes(
  afps: readonly AfpParseada[],
): readonly { nombre: string; motivo: string }[] {
  const conPrima = afps.filter(
    (a) =>
      a.tasas.primaSeguro !== undefined && Number.isFinite(a.tasas.primaSeguro),
  );
  if (conPrima.length < MINIMO_AFP_PARA_COHERENCIA) return [];

  const conteo = new Map<number, number>();
  for (const afp of conPrima) {
    const prima = afp.tasas.primaSeguro;
    conteo.set(prima, (conteo.get(prima) ?? 0) + 1);
  }

  let primaMayoritaria = 0;
  let vecesMayoritaria = 0;
  for (const [prima, veces] of conteo) {
    if (veces > vecesMayoritaria) {
      primaMayoritaria = prima;
      vecesMayoritaria = veces;
    }
  }

  // Sin mayoría ESTRICTA (p. ej. 2 vs 2) no hay un valor de referencia creíble:
  // rechazar a ciegas la mitad del lote sería peor que no pronunciarse.
  if (vecesMayoritaria * 2 <= conPrima.length) return [];

  return conPrima
    .filter(
      (a) =>
        Math.abs(a.tasas.primaSeguro - primaMayoritaria) > TOLERANCIA_PRIMA,
    )
    .map((a) => ({
      nombre: a.nombre,
      motivo:
        `prima_seguro=${a.tasas.primaSeguro} discrepa de la prima que reportan ` +
        `las demás AFP (${primaMayoritaria}). La prima del SPP se licita en conjunto ` +
        `(Ley 29903) y es única para todas: la fila está leyendo otra columna`,
    }));
}
