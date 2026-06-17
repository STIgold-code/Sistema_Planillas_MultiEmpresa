import ExcelJS from 'exceljs';

/**
 * Constantes (paleta + bordes) compartidas para la generacion del Excel
 * de planilla. Extraidas para mantener planilla-export.ts < 1.000 LOC.
 */
export const COLORES = {
  HEADER_DARK: 'FF1F2937',
  HEADER_MEDIUM: 'FF374151',
  PRIMARY: 'FF1F4E79',
  DATOS: 'FF2E75B6',
  DIAS: 'FFBF8F00',
  ESTRUCTURA: 'FF0070C0',
  INGRESOS: 'FF00B050',
  DESCUENTOS: 'FFC00000',
  TOTALES: 'FF7030A0',
  APORTES: 'FF00B0F0',
  SUCCESS: 'FF22C55E',
  WARNING: 'FFF97316',
  DANGER: 'FFEF4444',
  BG_LIGHT: 'FFF3F4F6',
  BG_SUCCESS: 'FFDCFCE7',
  BG_WARNING: 'FFFEF3C7',
  BG_DANGER: 'FFFECACA',
  TEXT_WHITE: 'FFFFFFFF',
  TEXT_DARK: 'FF111827',
  TEXT_GRAY: 'FF6B7280',
};

export const BORDER_TABLE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
  right: { style: 'thin', color: { argb: 'FF9CA3AF' } },
};

export const BORDER_HEADER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF374151' } },
  left: { style: 'medium', color: { argb: 'FF374151' } },
  bottom: { style: 'medium', color: { argb: 'FF374151' } },
  right: { style: 'medium', color: { argb: 'FF374151' } },
};
