import ExcelJS from 'exceljs';
import { BORDER_HEADER, BORDER_TABLE, COLORES } from './planilla-export-constants';
import {
  FORMATO_MONEDA,
  FORMATO_PORCENTAJE,
  RELLENO_DIVERGENTE,
  RELLENO_FORMULA,
  RELLENO_INSUMO,
  relleno,
} from './planilla-auditable-hojas';
import {
  ANCHOS_COLUMNAS,
  type Celda,
  type EstiloCelda,
  type Fila,
  type FormatoCelda,
} from './planilla-trabajador-modelo';

/**
 * Renderiza el modelo puro de una hoja por trabajador con ExcelJS. Es el único
 * lugar donde el modelo toca la librería: estilos, formatos numéricos, merges y
 * anchos. Sin lógica de negocio.
 */

const FORMATOS: Record<FormatoCelda, string> = {
  moneda: FORMATO_MONEDA,
  porcentaje: FORMATO_PORCENTAJE,
  entero: '0',
  fecha: 'ddd dd/mm',
  horas: '0.##',
  fraccion: '0.0000',
  texto: '@',
};

const RELLENO_SECCION = COLORES.PRIMARY;
const RELLENO_TOTAL = 'FFDCE6F1';
const RELLENO_SISTEMA = 'FFF3F4F6';

function aplicarEstilo(cell: ExcelJS.Cell, estilo: EstiloCelda | undefined): void {
  switch (estilo) {
    case 'titulo':
      cell.font = { bold: true, size: 14, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(COLORES.PRIMARY);
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      return;
    case 'subtitulo':
      cell.font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
      return;
    case 'seccion':
      cell.font = { bold: true, size: 11, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(RELLENO_SECCION);
      cell.alignment = { vertical: 'middle', indent: 1 };
      return;
    case 'encabezado':
      cell.font = { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(COLORES.HEADER_DARK);
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDER_HEADER;
      return;
    case 'etiqueta':
      cell.font = { size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = BORDER_TABLE;
      return;
    case 'total':
      cell.font = { bold: true, size: 10 };
      cell.fill = relleno(RELLENO_TOTAL);
      cell.alignment = { vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'dato':
      cell.font = { size: 10 };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'insumo':
      cell.font = { size: 10 };
      cell.fill = relleno(RELLENO_INSUMO);
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'formula':
      cell.font = { size: 10 };
      cell.fill = relleno(RELLENO_FORMULA);
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'divergente':
      cell.font = { size: 10, bold: true, color: { argb: COLORES.DANGER } };
      cell.fill = relleno(RELLENO_DIVERGENTE);
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'sistema':
      cell.font = { size: 10, color: { argb: COLORES.TEXT_GRAY } };
      cell.fill = relleno(RELLENO_SISTEMA);
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'diferencia':
      cell.font = { size: 10, bold: true };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = BORDER_TABLE;
      return;
    case 'nota':
      cell.font = { size: 9, italic: true, color: { argb: COLORES.TEXT_GRAY } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      return;
    default:
      return;
  }
}

function escribirCelda(ws: ExcelJS.Worksheet, numeroFila: number, celda: Celda): void {
  const cell = ws.getCell(numeroFila, celda.columna);
  if (celda.formula !== undefined) {
    cell.value = { formula: celda.formula };
  } else if (celda.valor !== undefined) {
    cell.value = celda.valor;
  }
  if (celda.formato) cell.numFmt = FORMATOS[celda.formato];
  aplicarEstilo(cell, celda.estilo);
  if (celda.nota) cell.note = celda.nota;
  if (celda.mergeHasta && celda.mergeHasta > celda.columna) {
    ws.mergeCells(numeroFila, celda.columna, numeroFila, celda.mergeHasta);
  }
}

/** Nombre de hoja válido para Excel: máximo 31 caracteres y sin `[]:*?/\`. */
export function nombreHoja(indice: number, nombreCompleto: string): string {
  const limpio = nombreCompleto.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  const prefijo = `${indice + 1}. `;
  return (prefijo + limpio).slice(0, 31).trim();
}

export function renderizarHojaTrabajador(
  workbook: ExcelJS.Workbook,
  nombre: string,
  filas: Fila[],
  divergentes: number,
  filasConDiferencia: readonly number[],
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(nombre, {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { tabColor: { argb: divergentes > 0 ? COLORES.DANGER : COLORES.SUCCESS } },
  });
  ANCHOS_COLUMNAS.forEach((ancho, i) => {
    ws.getColumn(i + 1).width = ancho;
  });

  filas.forEach((fila, i) => {
    const numeroFila = i + 1;
    fila.celdas.forEach((celda) => escribirCelda(ws, numeroFila, celda));
    if (fila.alto) ws.getRow(numeroFila).height = fila.alto;
  });

  // Solo las celdas de diferencia de las líneas de concepto se pintan si no dan
  // cero: la misma columna G lleva fechas en la tabla del tareo.
  if (filasConDiferencia.length > 0) {
    const primera = filasConDiferencia[0];
    ws.addConditionalFormatting({
      ref: filasConDiferencia.map((f) => `G${f}`).join(' '),
      rules: [
        {
          type: 'expression',
          formulae: [`AND(ISNUMBER($G${primera}),$G${primera}<>0)`],
          priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: RELLENO_DIVERGENTE } } },
        },
      ],
    });
  }

  return ws;
}
