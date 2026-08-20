import { COLORES, BORDER_TABLE, BORDER_HEADER } from './planilla-export-constants';

/**
 * Estilos reutilizables del Excel de planilla.
 * Extraidos de planilla-export.ts para mantener cada archivo por debajo del
 * limite de 1.000 lineas del proyecto y poder reusarlos en el export auditable.
 */
const encabezado = (fondo: string) => ({
  font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
  fill: {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: fondo },
  },
  alignment: {
    horizontal: 'center' as const,
    vertical: 'middle' as const,
    wrapText: true,
  },
  border: BORDER_HEADER,
});

export const ESTILOS = {
  titulo: {
    font: { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: COLORES.PRIMARY },
    },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  },
  subtitulo: {
    font: { bold: true, size: 11, color: { argb: COLORES.PRIMARY } },
    alignment: { horizontal: 'left' as const },
  },
  headerDatos: encabezado(COLORES.DATOS),
  headerDias: encabezado(COLORES.DIAS),
  headerEstructura: encabezado(COLORES.ESTRUCTURA),
  headerIngresos: encabezado(COLORES.INGRESOS),
  headerDescuentos: encabezado(COLORES.DESCUENTOS),
  headerTotales: encabezado(COLORES.TOTALES),
  headerAportes: encabezado(COLORES.APORTES),
  celda: {
    font: { size: 9 },
    alignment: { vertical: 'middle' as const },
    border: BORDER_TABLE,
  },
  celdaNumero: {
    font: { size: 9 },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: BORDER_TABLE,
    numFmt: '#,##0.00',
  },
  totalRow: {
    font: { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } },
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: COLORES.PRIMARY },
    },
    alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
    border: BORDER_HEADER,
    numFmt: '#,##0.00',
  },
  zebraLight: {
    fill: {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: COLORES.BG_LIGHT },
    },
  },
};
