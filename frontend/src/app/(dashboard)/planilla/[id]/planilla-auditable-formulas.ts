import { COL, armarFila, letraColumna } from './planilla-export-layout';
import type {
  ComisionAfpExportacion,
  DetalleExportacion,
} from './planilla-export-tipos';

/**
 * Fórmulas de la hoja auditable y su verificación.
 *
 * REGLA DE ORO: una fórmula solo se escribe si REPRODUCE el valor que calculó el
 * sistema. Antes de escribirla se calcula el resultado esperado en JavaScript y
 * se compara con el importe del DTO; si difieren en más de un céntimo la celda
 * queda con el valor del sistema y marcada como divergente. Nunca se entrega un
 * Excel que contradiga la planilla.
 *
 * Módulo PURO a propósito: sin ExcelJS, sin DOM, sin red. Solo strings de
 * fórmula y aritmética.
 */

/** Un céntimo: el ruido de punto flotante no cuenta como divergencia. */
export const TOLERANCIA_CENTIMO = 0.01;

/** Columna extra (solo en la hoja auditable) con la modalidad de comisión AFP. */
export const COLUMNA_MODALIDAD = COL.cci + 1;

export type EstadoCelda = 'FORMULA' | 'DIVERGENTE';

export interface CeldaDerivada {
  columna: number;
  estado: EstadoCelda;
  /** Fórmula de Excel SIN el `=` inicial. Solo cuando el estado es FORMULA. */
  formula?: string;
  /** Importe que calculó el sistema. Es lo que se escribe si hay divergencia. */
  valor: number;
}

/** Referencias absolutas a la hoja "Parámetros", resueltas al armar el libro. */
export interface ReferenciasParametros {
  /** Código de tasa → referencia absoluta, p. ej. `'Parámetros'!$D$7`. */
  tasa: Readonly<Record<string, string>>;
  /** Rango absoluto de la tabla de comisiones AFP para el VLOOKUP. */
  rangoAfp: string;
}

export interface ContextoFormulas {
  referencias: ReferenciasParametros;
  /** Código de tasa → valor numérico (el mismo que resolvió el motor). */
  valores: Readonly<Record<string, number>>;
  comisiones: readonly ComisionAfpExportacion[];
  /** Empresa afecta al aporte SENATI (Ley 26272). */
  aportaSenati: boolean;
}

/** Columnas del VLOOKUP sobre la tabla de comisiones AFP (1 = administradora). */
const VLOOKUP_APORTE = 2;
const VLOOKUP_PRIMA = 3;
const VLOOKUP_FLUJO = 4;
const VLOOKUP_MIXTA = 5;

export const redondear2 = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

/** ¿La fórmula reproduce el importe del sistema dentro de un céntimo? */
export function reproduce(esperado: number, sistema: number): boolean {
  return Math.abs(redondear2(esperado) - sistema) <= TOLERANCIA_CENTIMO + 1e-9;
}

const ref = (columna: number, fila: number): string =>
  `$${letraColumna(columna)}${fila}`;

const rango = (desde: number, hasta: number, fila: number): string =>
  `${ref(desde, fila)}:${ref(hasta, fila)}`;

/**
 * Decide si la celda lleva la fórmula o el valor del sistema.
 * `formula` o `esperado` en `null` significa "no se pudo construir" (p. ej. la
 * AFP del trabajador no está en la tabla de comisiones): también degrada.
 */
export function celdaDerivada(
  columna: number,
  formula: string | null,
  esperado: number | null,
  sistema: number,
): CeldaDerivada {
  if (formula === null || esperado === null || !reproduce(esperado, sistema)) {
    return { columna, estado: 'DIVERGENTE', valor: sistema };
  }
  return { columna, estado: 'FORMULA', formula, valor: sistema };
}

/**
 * Celdas derivadas de una fila de detalle.
 *
 * `fila` es el número de fila real de Excel. Los importes esperados se calculan
 * sobre los MISMOS valores que `armarFila` escribe en la hoja, así que una suma
 * de rango en Excel y su equivalente en JavaScript no pueden divergir por
 * construcción.
 */
export function construirCeldasDerivadas(
  d: DetalleExportacion,
  indice: number,
  fila: number,
  ctx: ContextoFormulas,
): CeldaDerivada[] {
  const valoresFila = armarFila(d, indice);
  const valorCol = (columna: number): number =>
    Number(valoresFila[columna - 1]) || 0;
  const sumaCols = (desde: number, hasta: number): number => {
    let total = 0;
    for (let c = desde; c <= hasta; c++) total += valorCol(c);
    return total;
  };

  const { referencias: r, valores, comisiones, aportaSenati } = ctx;
  const tasa = (codigo: string): string | undefined => r.tasa[codigo];
  const valor = (codigo: string): number | undefined => valores[codigo];

  const esAfp = d.sistema_pensionario === 'AFP';
  const esOnp = d.sistema_pensionario === 'ONP';
  const comision = comisiones.find(
    (c) => c.administradora === d.nombre_sistema_pensionario,
  );
  const esMixta = d.tipo_comision_afp === 'MIXTA';
  // SCTR se gatea por puesto de riesgo. Si el sistema no aportó nada, la celda
  // no lleva fórmula: escribirla mostraría un aporte que no existió.
  const aplicaSctr = d.sctr_salud_empleador > 0 || d.sctr_pension_empleador > 0;

  const remAfecta = ref(COL.remAfecta, fila);
  const celdas: CeldaDerivada[] = [];

  const agregar = (
    columna: number,
    formula: string | null,
    esperado: number | null,
    sistema: number,
  ): void => {
    celdas.push(celdaDerivada(columna, formula, esperado, sistema));
  };

  // HAB. MENS. = remuneración básica / 30 × días trabajados.
  agregar(
    COL.haberMensual,
    `ROUND(${ref(COL.remBasica, fila)}/30*${ref(COL.diasTrabajados, fila)},2)`,
    (d.rem_basica / 30) * d.dias_trabajados,
    d.haber_mensual,
  );

  // TOT. AFEC. = suma del bloque de ingresos afectos.
  agregar(
    COL.totalAfectos,
    `ROUND(SUM(${rango(COL.afectosInicio, COL.afectosFin, fila)}),2)`,
    sumaCols(COL.afectosInicio, COL.afectosFin),
    d.total_ingresos_afectos,
  );

  // BON. EXT. = gratificación × tasa de bonificación (Ley 30334).
  const refBonificacion = tasa('bonificacionExtraordinaria');
  const valorBonificacion = valor('bonificacionExtraordinaria');
  agregar(
    COL.bonifExtraordinaria,
    refBonificacion
      ? `ROUND(${ref(COL.gratificacion, fila)}*${refBonificacion},2)`
      : null,
    valorBonificacion === undefined
      ? null
      : d.gratificacion_monto * valorBonificacion,
    d.bonif_extraordinaria,
  );

  // TOT. NO AF. = suma del bloque de ingresos no afectos.
  agregar(
    COL.totalNoAfectos,
    `ROUND(SUM(${rango(COL.noAfectosInicio, COL.noAfectosFin, fila)}),2)`,
    sumaCols(COL.noAfectosInicio, COL.noAfectosFin),
    d.total_ingresos_no_afectos,
  );

  // TOT. ING. = afectos + no afectos.
  agregar(
    COL.totalIngresos,
    `ROUND(${ref(COL.totalAfectos, fila)}+${ref(COL.totalNoAfectos, fila)},2)`,
    d.total_ingresos_afectos + d.total_ingresos_no_afectos,
    d.total_ingresos,
  );

  const buscarComision = (columnaTabla: number): string =>
    `VLOOKUP(${ref(COL.administradora, fila)},${r.rangoAfp},${columnaTabla},FALSE)`;
  const formulaAfp = (columnaTabla: number): string =>
    `IF(${ref(COL.pension, fila)}="AFP",ROUND(${remAfecta}*${buscarComision(columnaTabla)},2),0)`;

  // AFP APORTE y PRIMA = remuneración afecta × la tasa de su administradora.
  agregar(
    COL.afpAporte,
    esAfp && !comision ? null : formulaAfp(VLOOKUP_APORTE),
    esAfp ? (comision ? d.rem_afecta * comision.aporte : null) : 0,
    d.afp_aporte,
  );
  agregar(
    COL.afpPrima,
    esAfp && !comision ? null : formulaAfp(VLOOKUP_PRIMA),
    esAfp ? (comision ? d.rem_afecta * comision.prima : null) : 0,
    d.afp_prima,
  );

  // AFP COMISIÓN = la modalidad del trabajador elige la columna de la tabla.
  agregar(
    COL.afpComision,
    esAfp && !comision
      ? null
      : `IF(${ref(COL.pension, fila)}="AFP",ROUND(${remAfecta}*IF(${ref(COLUMNA_MODALIDAD, fila)}="MIXTA",${buscarComision(VLOOKUP_MIXTA)},${buscarComision(VLOOKUP_FLUJO)}),2),0)`,
    esAfp
      ? comision
        ? d.rem_afecta * (esMixta ? comision.comision_mixta : comision.comision_flujo)
        : null
      : 0,
    d.afp_comision,
  );

  // ONP = remuneración afecta × tasa del SNP.
  const refOnp = tasa('onp');
  const valorOnp = valor('onp');
  agregar(
    COL.onp,
    refOnp
      ? `IF(${ref(COL.pension, fila)}="ONP",ROUND(${remAfecta}*${refOnp},2),0)`
      : null,
    esOnp ? (valorOnp === undefined ? null : d.rem_afecta * valorOnp) : 0,
    d.snp_onp,
  );

  // TOT. LEY = SUMA de las columnas de descuento de ley, nunca un recálculo con
  // tasas sobre alguna base (ese fue el bug que corrigió el PR #72).
  agregar(
    COL.totalLey,
    `ROUND(SUM(${rango(COL.leyInicio, COL.leyFin, fila)}),2)`,
    sumaCols(COL.leyInicio, COL.leyFin),
    d.total_descuentos_ley,
  );

  // TOT. OTR. = adelantos, descuentos del tareo y el dominical.
  agregar(
    COL.totalOtros,
    `ROUND(SUM(${rango(COL.otrosInicio, COL.otrosFin, fila)}),2)`,
    sumaCols(COL.otrosInicio, COL.otrosFin),
    d.total_descuentos_otros,
  );

  agregar(
    COL.totalDescuentos,
    `ROUND(${ref(COL.totalLey, fila)}+${ref(COL.totalOtros, fila)},2)`,
    d.total_descuentos_ley + d.total_descuentos_otros,
    d.total_descuentos,
  );

  agregar(
    COL.neto,
    `ROUND(${ref(COL.totalIngresos, fila)}-${ref(COL.totalDescuentos, fila)},2)`,
    d.total_ingresos - d.total_descuentos,
    d.neto_pagar,
  );

  // ESSALUD: 9% de la remuneración afecta, con piso sobre la RMV (Ley 26790).
  const refRmv = tasa('rmv');
  const refEssaludMinimo = tasa('essaludMinimo');
  const refEssaludTasa = tasa('essaludTasa');
  const valorRmv = valor('rmv');
  const valorEssaludMinimo = valor('essaludMinimo');
  const valorEssaludTasa = valor('essaludTasa');
  const puedeEssalud =
    refRmv !== undefined &&
    refEssaludMinimo !== undefined &&
    refEssaludTasa !== undefined &&
    valorRmv !== undefined &&
    valorEssaludMinimo !== undefined &&
    valorEssaludTasa !== undefined;
  agregar(
    COL.essalud,
    puedeEssalud
      ? `IF(${remAfecta}<${refRmv},${refEssaludMinimo},ROUND(${remAfecta}*${refEssaludTasa},2))`
      : null,
    puedeEssalud
      ? d.rem_afecta < valorRmv
        ? valorEssaludMinimo
        : d.rem_afecta * valorEssaludTasa
      : null,
    d.essalud,
  );

  // SCTR salud y pensión: solo para puestos de riesgo.
  const aporteSobreAfecta = (
    columna: number,
    codigo: string,
    sistema: number,
    aplica: boolean,
  ): void => {
    if (!aplica) return;
    const referencia = tasa(codigo);
    const numero = valor(codigo);
    agregar(
      columna,
      referencia ? `ROUND(${remAfecta}*${referencia},2)` : null,
      numero === undefined ? null : d.rem_afecta * numero,
      sistema,
    );
  };

  aporteSobreAfecta(COL.sctrSalud, 'sctrSalud', d.sctr_salud_empleador, aplicaSctr);
  aporteSobreAfecta(COL.sctrPension, 'sctrPension', d.sctr_pension_empleador, aplicaSctr);
  aporteSobreAfecta(COL.vidaLey, 'vidaLeyTasa', d.vida_ley_empleador, true);
  aporteSobreAfecta(COL.senati, 'senatiTasa', d.senati_empleador, aportaSenati);

  agregar(
    COL.totalAportes,
    `ROUND(SUM(${rango(COL.aportesInicio, COL.aportesFin, fila)}),2)`,
    sumaCols(COL.aportesInicio, COL.aportesFin),
    d.total_aportes_empleador,
  );

  return celdas;
}

/** Fórmula de la fila de totales: suma de la columna en el rango de filas. */
export function formulaTotalColumna(
  columna: number,
  primeraFila: number,
  ultimaFila: number,
): string {
  const letra = letraColumna(columna);
  return `SUM(${letra}${primeraFila}:${letra}${ultimaFila})`;
}
