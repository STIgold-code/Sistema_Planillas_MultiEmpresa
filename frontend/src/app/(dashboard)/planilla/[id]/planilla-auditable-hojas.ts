import ExcelJS from 'exceljs';
import { formatDateSafe } from '@/lib/utils';
import { COLORES, BORDER_TABLE, BORDER_HEADER } from './planilla-export-constants';
import { ESTILOS } from './planilla-export-estilos';
import type { ReferenciasParametros } from './planilla-auditable-formulas';
import { CONCEPTOS_DOCUMENTADOS } from './planilla-auditable-documentacion';
import type { ParametrosExportacion } from './planilla-export-tipos';

/**
 * Hojas y estilos COMPARTIDOS por los libros auditables (planilla con fórmulas
 * y planilla por trabajador): la hoja "Parámetros" con las tasas y la escala del
 * impuesto a la renta, la hoja "Cómo se calcula" y la leyenda de colores.
 *
 * Sin `api` ni `toast` a propósito: este módulo se puede ejecutar fuera del
 * navegador para validar un libro contra la base de datos.
 */

const HOJA_PARAMETROS = 'Parámetros';
/** Excel requiere comillas simples al referenciar una hoja con acentos. */
const REF_HOJA = `'${HOJA_PARAMETROS}'`;

export const RELLENO_FORMULA = 'FFE8F5E9';
export const RELLENO_INSUMO = 'FFFFF3CD';
export const RELLENO_DIVERGENTE = 'FFFDD5D5';

export const FORMATO_PORCENTAJE = '0.0000%';
export const FORMATO_MONEDA = '#,##0.00';

export const relleno = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

const ETIQUETAS_ORIGEN: Record<string, string> = {
  PARAMETRO_LEGAL: 'Parámetro legal (nacional)',
  PARAMETRO_EMPRESA: 'Parámetro propio de la empresa',
  REGIMEN_PENSIONARIO: 'Régimen pensionario',
  NO_DISPONIBLE: 'No disponible',
};

export interface ReferenciasEscalaIr {
  /** Rango absoluto con el limite inferior de cada tramo, en soles. */
  limiteInferior: string;
  /** Rango absoluto con la tasa DIFERENCIAL de cada tramo (tasa − tasa anterior). */
  tasaDiferencial: string;
  /** Celda con la deduccion fija en soles (UIT × 7). */
  deduccionSoles: string;
}

export interface HojaParametros {
  referencias: ReferenciasParametros;
  valores: Record<string, number>;
  /** Ausente si la escala no vino en la exportacion. */
  escalaIr: ReferenciasEscalaIr | null;
}

export function agregarHojaParametros(
  workbook: ExcelJS.Workbook,
  parametros: ParametrosExportacion,
): HojaParametros {
  const ws = workbook.addWorksheet(HOJA_PARAMETROS, {
    properties: { tabColor: { argb: COLORES.APORTES } },
  });

  ws.columns = [
    { width: 4 }, { width: 46 }, { width: 16 },
    { width: 40 }, { width: 30 }, { width: 16 },
  ];

  let fila = 1;

  ws.mergeCells(`B${fila}:F${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = 'PARÁMETROS USADOS EN EL CÁLCULO';
  Object.assign(titulo, ESTILOS.titulo);
  ws.getRow(fila).height = 30;
  fila++;

  ws.mergeCells(`B${fila}:F${fila}`);
  // Las fechas de vigencia son campos DATE (medianoche UTC): formatearlas con
  // `new Date(...).toLocaleDateString` las corre un dia hacia atras en UTC-5 y
  // el Excel diria que los parametros se resolvieron el 24 cuando la ventana
  // cierra el 25. `formatDateSafe` lee la fecha del ISO sin convertir zona.
  ws.getCell(`B${fila}`).value = `Vigencia con la que se resolvieron: ${formatDateSafe(
    parametros.vigencia,
  )}`;
  ws.getCell(`B${fila}`).font = { size: 11, color: { argb: COLORES.TEXT_GRAY } };
  fila++;

  ws.mergeCells(`B${fila}:F${fila}`);
  ws.getCell(`B${fila}`).value =
    'Las celdas en ámbar son editables: al cambiarlas se recalculan las fórmulas de la hoja "Planilla con fórmulas".';
  ws.getCell(`B${fila}`).font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  fila += 2;

  const escribirEncabezados = (titulos: string[]): void => {
    titulos.forEach((texto, i) => {
      const cell = ws.getCell(fila, 2 + i);
      cell.value = texto;
      cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(COLORES.HEADER_DARK);
      cell.border = BORDER_HEADER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    fila++;
  };

  escribirEncabezados(['Parámetro', 'Valor', 'Base legal', 'Origen', 'Vigente desde']);

  const referenciasTasa: Record<string, string> = {};
  const valores: Record<string, number> = {};

  parametros.tasas.forEach((tasa) => {
    const disponible = tasa.origen !== 'NO_DISPONIBLE';
    ws.getCell(fila, 2).value = tasa.etiqueta;

    const celdaValor = ws.getCell(fila, 3);
    celdaValor.value = tasa.valor;
    celdaValor.numFmt =
      tasa.formato === 'PORCENTAJE' ? FORMATO_PORCENTAJE : FORMATO_MONEDA;
    celdaValor.fill = relleno(disponible ? RELLENO_INSUMO : RELLENO_DIVERGENTE);
    celdaValor.alignment = { horizontal: 'right' };

    ws.getCell(fila, 4).value = tasa.base_legal;
    ws.getCell(fila, 5).value = ETIQUETAS_ORIGEN[tasa.origen] ?? tasa.origen;
    ws.getCell(fila, 6).value = tasa.vigente_desde
      ? formatDateSafe(tasa.vigente_desde)
      : '—';

    for (let c = 2; c <= 6; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }

    // Solo las tasas realmente resueltas se ofrecen como referencia: sin fila
    // vigente no hay valor que citar y la fórmula debe degradar.
    if (disponible) {
      referenciasTasa[tasa.codigo] = `${REF_HOJA}!$C$${fila}`;
      valores[tasa.codigo] = tasa.valor;
    }
    fila++;
  });

  fila += 2;

  ws.mergeCells(`B${fila}:F${fila}`);
  const tituloAfp = ws.getCell(`B${fila}`);
  tituloAfp.value = 'COMISIONES AFP — D.L. 25897 art. 30 · Ley 29903';
  tituloAfp.font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
  fila++;

  escribirEncabezados([
    'Administradora', 'Aporte obligatorio', 'Prima de seguro',
    'Comisión sobre flujo', 'Comisión mixta (flujo)',
  ]);

  // Siempre se escribe al menos una fila: el rango del VLOOKUP tiene que ser
  // sintácticamente válido aunque no haya AFP cargadas.
  const filas = parametros.comisiones_afp.length > 0
    ? parametros.comisiones_afp
    : [{ administradora: '—', aporte: 0, prima: 0, comision_flujo: 0, comision_mixta: 0 }];

  const primeraFilaAfp = fila;
  filas.forEach((afp) => {
    ws.getCell(fila, 2).value = afp.administradora;
    [afp.aporte, afp.prima, afp.comision_flujo, afp.comision_mixta].forEach((valor, i) => {
      const cell = ws.getCell(fila, 3 + i);
      cell.value = valor;
      cell.numFmt = FORMATO_PORCENTAJE;
      cell.fill = relleno(RELLENO_INSUMO);
      cell.alignment = { horizontal: 'right' };
    });
    for (let c = 2; c <= 6; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }
    fila++;
  });

  const escalaIr = agregarEscalaIr(ws, fila + 2, parametros, referenciasTasa['uit']);

  return {
    referencias: {
      tasa: referenciasTasa,
      rangoAfp: `${REF_HOJA}!$B$${primeraFilaAfp}:$F$${fila - 1}`,
    },
    valores,
    escalaIr,
  };
}

/**
 * Escala progresiva del Art. 53 LIR. Ademas de la tasa de cada tramo se escribe
 * su tasa DIFERENCIAL (tasa − tasa del tramo anterior): con ella el impuesto
 * anual se expresa en una sola formula vectorial,
 * `SUMPRODUCT((renta>limInf)*(renta−limInf)*tasaDif)`, que equivale exactamente
 * a gravar cada tramo solo por la porcion de renta que cae dentro de el.
 */
function agregarEscalaIr(
  ws: ExcelJS.Worksheet,
  filaInicio: number,
  parametros: ParametrosExportacion,
  refUit: string | undefined,
): ReferenciasEscalaIr | null {
  const tramos = parametros.tramos_ir ?? [];
  if (tramos.length === 0 || !refUit) return null;

  let fila = filaInicio;
  ws.mergeCells(`B${fila}:F${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = 'ESCALA DEL IMPUESTO A LA RENTA — LIR art. 53 · deduccion art. 46';
  titulo.font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
  fila++;

  ws.getCell(fila, 2).value = 'Deduccion fija (UIT)';
  const celdaDeduccionUit = ws.getCell(fila, 3);
  celdaDeduccionUit.value = parametros.deduccion_uit;
  celdaDeduccionUit.fill = relleno(RELLENO_INSUMO);
  ws.getCell(fila, 4).value = 'Art. 46 LIR — trabajadores dependientes';
  const filaDeduccionUit = fila;
  fila++;

  ws.getCell(fila, 2).value = 'Deduccion fija (S/)';
  const celdaDeduccionSoles = ws.getCell(fila, 3);
  celdaDeduccionSoles.value = { formula: `${refUit}*$C$${filaDeduccionUit}` };
  celdaDeduccionSoles.numFmt = FORMATO_MONEDA;
  celdaDeduccionSoles.fill = relleno(RELLENO_FORMULA);
  ws.getCell(fila, 4).value = 'UIT × deduccion en UIT';
  const deduccionSoles = `${REF_HOJA}!$C$${fila}`;
  fila++;

  ['Tramo', 'Desde (UIT)', 'Hasta (UIT)', 'Limite inferior S/', 'Tasa', 'Tasa diferencial'].forEach(
    (texto, i) => {
      const cell = ws.getCell(fila, 2 + i);
      cell.value = texto;
      cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(COLORES.HEADER_DARK);
      cell.border = BORDER_HEADER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    },
  );
  fila++;

  const primeraFila = fila;
  tramos.forEach((tramo, i) => {
    ws.getCell(fila, 2).value = `Tramo ${i + 1}`;
    ws.getCell(fila, 3).value = tramo.desde_uit;
    ws.getCell(fila, 4).value = tramo.hasta_uit ?? 'sin tope';
    const limite = ws.getCell(fila, 5);
    limite.value = { formula: `$C$${fila}*${refUit}` };
    limite.numFmt = FORMATO_MONEDA;
    limite.fill = relleno(RELLENO_FORMULA);
    const tasa = ws.getCell(fila, 6);
    tasa.value = tramo.tasa;
    tasa.numFmt = FORMATO_PORCENTAJE;
    tasa.fill = relleno(RELLENO_INSUMO);
    const diferencial = ws.getCell(fila, 7);
    diferencial.value = { formula: i === 0 ? `$F$${fila}` : `$F$${fila}-$F$${fila - 1}` };
    diferencial.numFmt = FORMATO_PORCENTAJE;
    diferencial.fill = relleno(RELLENO_FORMULA);
    for (let c = 2; c <= 7; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }
    fila++;
  });

  return {
    limiteInferior: `${REF_HOJA}!$E$${primeraFila}:$E$${fila - 1}`,
    tasaDiferencial: `${REF_HOJA}!$G$${primeraFila}:$G$${fila - 1}`,
    deduccionSoles,
  };
}

export function agregarHojaComoSeCalcula(workbook: ExcelJS.Workbook): void {
  const ws = workbook.addWorksheet('Cómo se calcula', {
    properties: { tabColor: { argb: COLORES.DATOS } },
  });

  ws.columns = [{ width: 4 }, { width: 34 }, { width: 110 }];

  let fila = 1;

  ws.mergeCells(`B${fila}:C${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = 'CÓMO SE CALCULA CADA CONCEPTO';
  Object.assign(titulo, ESTILOS.titulo);
  ws.getRow(fila).height = 30;
  fila++;

  ws.mergeCells(`B${fila}:C${fila}`);
  ws.getCell(`B${fila}`).value =
    'Conceptos que no se reducen a una sola fórmula de celda, con la norma que los sustenta.';
  ws.getCell(`B${fila}`).font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  fila += 2;

  CONCEPTOS_DOCUMENTADOS.forEach((concepto) => {
    ws.mergeCells(`B${fila}:C${fila}`);
    const encabezado = ws.getCell(`B${fila}`);
    encabezado.value = concepto.concepto.toUpperCase();
    encabezado.font = { bold: true, size: 12, color: { argb: COLORES.TEXT_WHITE } };
    encabezado.fill = relleno(COLORES.PRIMARY);
    encabezado.border = BORDER_HEADER;
    ws.getRow(fila).height = 22;
    fila++;

    ws.getCell(`B${fila}`).value = 'Base legal';
    ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
    ws.getCell(`C${fila}`).value = concepto.base_legal;
    ws.getCell(`C${fila}`).font = { size: 10, color: { argb: COLORES.PRIMARY } };
    fila++;

    ws.getCell(`B${fila}`).value = 'En una línea';
    ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
    ws.getCell(`C${fila}`).value = concepto.resumen;
    ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(`C${fila}`).font = { size: 10 };
    fila++;

    concepto.pasos.forEach((paso) => {
      ws.getCell(`B${fila}`).value = paso.titulo;
      ws.getCell(`B${fila}`).font = { size: 10 };
      ws.getCell(`B${fila}`).alignment = { wrapText: true, vertical: 'top' };
      ws.getCell(`C${fila}`).value = paso.detalle;
      ws.getCell(`C${fila}`).font = { size: 10 };
      ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(fila).height = 32;
      fila++;
    });

    if (concepto.nota) {
      ws.getCell(`B${fila}`).value = 'Nota';
      ws.getCell(`B${fila}`).font = { bold: true, size: 10, color: { argb: COLORES.WARNING } };
      ws.getCell(`C${fila}`).value = concepto.nota;
      ws.getCell(`C${fila}`).font = { size: 10, italic: true };
      ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
      fila++;
    }

    fila++;
  });
}
