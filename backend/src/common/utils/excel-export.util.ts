import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { LOGO_ERMIR_PATH } from './assets.util';

/** MIME de archivos .xlsx (OpenXML spreadsheet). */
export const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Paleta corporativa para los reportes en formato ejecutivo. */
export const EXCEL_COLORS = {
  PRIMARY: 'FF1F4E79',
  HEADER_BG: 'FF2E75B6',
  WHITE: 'FFFFFFFF',
  STRIPE: 'FFF2F6FB',
} as const;

/**
 * Agrega el logo de Ermir al workbook si existe en disco. Devuelve el id de la
 * imagen (para `ws.addImage`) o null si no hay logo disponible.
 */
export function agregarLogoErmir(wb: ExcelJS.Workbook): number | null {
  if (!fs.existsSync(LOGO_ERMIR_PATH)) return null;
  return wb.addImage({ filename: LOGO_ERMIR_PATH, extension: 'png' });
}

/**
 * Encabezado ejecutivo estándar: logo en A1 + nombre de empresa (B1) y subtítulo
 * (B2). Deja las filas 1-2 para la cabecera; el contenido arranca desde la 4.
 */
export function ponerEncabezadoExcel(
  ws: ExcelJS.Worksheet,
  logoId: number | null,
  empresa: string,
  subtitulo: string,
): void {
  if (logoId !== null) {
    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 48, height: 48 },
    });
  }
  ws.mergeCells('B1:F1');
  const t = ws.getCell('B1');
  t.value = empresa;
  t.font = { bold: true, size: 14, color: { argb: EXCEL_COLORS.PRIMARY } };
  t.alignment = { vertical: 'middle' };
  ws.mergeCells('B2:F2');
  const s = ws.getCell('B2');
  s.value = subtitulo;
  s.font = { size: 10, color: { argb: 'FF555555' } };
  ws.getRow(1).height = 26;
  ws.getRow(2).height = 16;
}

/** Estiliza una fila de encabezado de tabla (fondo azul, texto blanco). */
export function estilarHeaderExcel(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: EXCEL_COLORS.WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_COLORS.HEADER_BG },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
}

/** Estiliza una fila intermedia con el sombreado de cebra. */
export function estilarStripeExcel(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_COLORS.STRIPE },
    };
  });
}
