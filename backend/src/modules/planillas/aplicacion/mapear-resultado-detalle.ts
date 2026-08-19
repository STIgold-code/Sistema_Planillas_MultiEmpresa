/**
 * Mapper inverso: dominio `ResultadoBoleta` → subset de `PlanillaDetalle`.
 *
 * Extrae del resultado del motor nuevo los MONTOS load-bearing que el camino real
 * enruta por el motor (haber mensual, horas extras, jornada nocturna,
 * gratificación, bonificación 30334, CTS, EsSalud empleador, pensión AFP/ONP y
 * renta 5ta), keyados por el nombre de campo del DTO Prisma `PlanillaDetalle`.
 *
 * Estos montos son la FUENTE DE VERDAD del motor. El resto de campos del DTO
 * (~110: estructura salarial, días detallados, vida ley, SCTR empleador,
 * remuneraciones computables, beneficios truncos) NO los modela el motor todavía
 * y se completan en el borde de aplicación a partir del paso auxiliar legacy.
 *
 * Borde de aplicación: traduce claves de dominio (español, ConceptoBoleta) a
 * nombres de campo Prisma. El dominio no conoce el DTO.
 *
 * NO PUEDE FALLAR EN SILENCIO (ver `CLAVE_HABER_MENSUAL` y las dos listas de
 * abajo). Hasta esta versión el mapper conocía 13 de las 24 claves que el
 * dominio sabe emitir y descartaba el resto sin dejar rastro: si una estrategia
 * emitía un concepto que el mapper no traducía, el aporte simplemente no se
 * persistía y la columna quedaba en cero como si el concepto no existiera. El
 * caso concreto era `sis_microempresa`: MICROEMPRESA emite el SIS en lugar del
 * aporte de EsSalud, así que la planilla habría guardado `essalud_empleador = 0`
 * sin ninguna huella del aporte real del empleador. Ahora toda clave que llegue
 * al mapper tiene que estar declarada en una de las dos listas o el mapeo falla
 * ruidosamente.
 */
import { ResultadoBoleta } from '../dominio/tipos';
import { CLAVE_HE_25, CLAVE_HE_35 } from '../dominio/conceptos/horas-extras';
import { CLAVE_BONIF_NOCTURNA } from '../dominio/conceptos/jornada-nocturna';
import { CLAVE_GRATIFICACION } from '../dominio/conceptos/gratificacion';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../dominio/conceptos/bonificacion-extraordinaria';
import { CLAVE_CTS } from '../dominio/conceptos/cts';
import { CLAVE_ESSALUD } from '../dominio/conceptos/salud-empleador';
import {
  CLAVE_ONP,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
} from '../dominio/conceptos/sistema-pensionario';
import { CLAVE_RENTA_5TA } from '../dominio/conceptos/renta-quinta';
import { CLAVE_VACACIONES } from '../dominio/conceptos/vacaciones';
import { CLAVE_ASIGNACION_FAMILIAR } from '../dominio/conceptos/asignacion-familiar';

/** El orquestador emite el haber con esta clave literal (no hay constante). */
export const CLAVE_HABER_MENSUAL = 'haber_mensual';

/**
 * Claves que este mapper TRADUCE a una columna del DTO. Son los montos
 * load-bearing: el motor de régimen es su fuente de verdad y PISA lo que haya
 * calculado el motor de detalle.
 */
export const CLAVES_MAPEADAS: ReadonlySet<string> = new Set<string>([
  CLAVE_HABER_MENSUAL,
  CLAVE_HE_25,
  CLAVE_HE_35,
  CLAVE_BONIF_NOCTURNA,
  CLAVE_GRATIFICACION,
  CLAVE_BONIF_EXTRAORDINARIA,
  CLAVE_CTS,
  CLAVE_ESSALUD,
  CLAVE_AFP_APORTE,
  CLAVE_AFP_PRIMA,
  CLAVE_AFP_COMISION,
  CLAVE_ONP,
  CLAVE_RENTA_5TA,
]);

/**
 * Claves que el motor emite y este mapper NO traduce A PROPÓSITO, porque su
 * columna del DTO la calcula el motor de detalle (`calcular-detalle-completo`)
 * con más contexto del que tiene el motor de régimen:
 *
 *   - `vacaciones` → `vacaciones_ingreso`: el detalle distingue vacaciones
 *     gozadas, truncas y venta de vacaciones; el motor de régimen solo valoriza
 *     los días gozados.
 *   - `asignacion_familiar` → `asignacion_familiar`: el detalle la resuelve
 *     desde el flag del empleado y la prorratea por días; además alimenta las
 *     bases computables.
 *
 * Están declaradas EXPLÍCITAMENTE (y no simplemente ignoradas) para que la
 * diferencia entre "decidimos no pisar esta columna" y "no sabemos qué es esto"
 * quede escrita en el código y no en la memoria de quien lo escribió.
 */
export const CLAVES_NO_LOAD_BEARING: ReadonlySet<string> = new Set<string>([
  CLAVE_VACACIONES,
  CLAVE_ASIGNACION_FAMILIAR,
]);

/**
 * Se lanza cuando la boleta trae una clave que el mapper no sabe traducir ni
 * tiene declarada como deliberadamente no load-bearing.
 *
 * POR QUÉ UNA EXCEPCIÓN Y NO UN LOG. Un concepto desconocido significa que el
 * motor calculó plata que no tiene dónde guardarse: persistir el resto de la
 * boleta produciría un documento legal incompleto —el trabajador o la SUNAT
 * verían un aporte/descuento en cero que en realidad existe— y nadie se
 * enteraría. Entre bloquear el cálculo y emitir una boleta silenciosamente
 * equivocada, se bloquea.
 *
 * POR QUÉ ES SEGURO HACERLO EN UN SISTEMA EN PRODUCCIÓN. Dos redes lo preceden:
 *   1. `asegurarRegimenCertificado` corre ANTES del mapper en el camino real, y
 *      los régimenes con conceptos propios sin columna (AGRARIO, CONSTRUCCION
 *      CIVIL, MICROEMPRESA) están todos sin certificar. Sus claves no alcanzan
 *      al mapper.
 *   2. `conceptos-vs-mapper.spec` recorre las SEIS estrategias y falla en CI si
 *      un régimen certificado emite una clave que el mapper no conoce. Para que
 *      esta excepción llegue a producción alguien tendría que agregar un
 *      concepto Y ignorar el CI en rojo.
 */
export class ConceptoNoMapeadoError extends Error {
  constructor(public readonly claves: readonly string[]) {
    super(
      `El motor emitió conceptos que el mapper no sabe persistir: ` +
        `${claves.join(', ')}. Agregar la columna correspondiente a ` +
        `MontosLoadBearing, o declarar la clave en CLAVES_NO_LOAD_BEARING si el ` +
        `motor de detalle ya es dueño de esa columna. No se persiste una boleta ` +
        `con conceptos que se perderían en silencio.`,
    );
    this.name = 'ConceptoNoMapeadoError';
  }
}

/**
 * Claves presentes en la boleta que el mapper no sabe manejar. Se expone aparte
 * de `extraerMontosLoadBearing` para que los tests y las herramientas de
 * diagnóstico puedan preguntarlo sin provocar la excepción.
 */
export function detectarConceptosNoMapeados(
  boleta: ResultadoBoleta,
): readonly string[] {
  const desconocidas = new Set<string>();
  for (const concepto of boleta.conceptos) {
    if (
      !CLAVES_MAPEADAS.has(concepto.clave) &&
      !CLAVES_NO_LOAD_BEARING.has(concepto.clave)
    ) {
      desconocidas.add(concepto.clave);
    }
  }
  return [...desconocidas];
}

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

/** Subset load-bearing del DTO `PlanillaDetalle` que el motor produce. */
export interface MontosLoadBearing {
  haber_mensual: number;
  horas_extras_25: number;
  horas_extras_35: number;
  horas_extras: number;
  bonificacion_nocturna: number;
  sueldo_nocturno: number;
  gratificacion_monto: number;
  bonif_extraordinaria: number;
  cts_monto: number;
  essalud_empleador: number;
  afp_aporte: number;
  afp_prima: number;
  afp_seguro: number;
  afp_comision: number;
  onp: number;
  renta_5ta: number;
}

/** Suma los montos de todos los conceptos con la `clave` dada. */
function monto(boleta: ResultadoBoleta, clave: string): number {
  return redondear2(
    boleta.conceptos
      .filter((c) => c.clave === clave)
      .reduce((acc, c) => acc + c.monto, 0),
  );
}

/**
 * Traduce la boleta del motor al subset load-bearing del DTO.
 *
 * Lanza `ConceptoNoMapeadoError` si la boleta trae un concepto que el mapper no
 * sabe persistir: es preferible bloquear el cálculo a guardar una boleta con un
 * aporte o descuento perdido en silencio.
 */
export function extraerMontosLoadBearing(
  boleta: ResultadoBoleta,
): MontosLoadBearing {
  const noMapeadas = detectarConceptosNoMapeados(boleta);
  if (noMapeadas.length > 0) {
    throw new ConceptoNoMapeadoError(noMapeadas);
  }

  const he25 = monto(boleta, CLAVE_HE_25);
  const he35 = monto(boleta, CLAVE_HE_35);
  const nocturna = monto(boleta, CLAVE_BONIF_NOCTURNA);
  const afpPrima = monto(boleta, CLAVE_AFP_PRIMA);

  return {
    haber_mensual: monto(boleta, CLAVE_HABER_MENSUAL),
    horas_extras_25: he25,
    horas_extras_35: he35,
    horas_extras: redondear2(he25 + he35),
    bonificacion_nocturna: nocturna,
    sueldo_nocturno: nocturna,
    gratificacion_monto: monto(boleta, CLAVE_GRATIFICACION),
    bonif_extraordinaria: monto(boleta, CLAVE_BONIF_EXTRAORDINARIA),
    cts_monto: monto(boleta, CLAVE_CTS),
    essalud_empleador: monto(boleta, CLAVE_ESSALUD),
    afp_aporte: monto(boleta, CLAVE_AFP_APORTE),
    afp_prima: afpPrima,
    // El legacy expone afp_seguro como espejo de afp_prima (misma prima).
    afp_seguro: afpPrima,
    afp_comision: monto(boleta, CLAVE_AFP_COMISION),
    onp: monto(boleta, CLAVE_ONP),
    renta_5ta: monto(boleta, CLAVE_RENTA_5TA),
  };
}
