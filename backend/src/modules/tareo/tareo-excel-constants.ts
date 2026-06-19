import * as ExcelJS from 'exceljs';

export const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export const CODIGO_SIN_CONTRATO = 'SC';

// Colores corporativos para contadores
export const COLORES = {
  // Headers y títulos
  HEADER_DARK: 'FF1F2937', // Gris oscuro
  HEADER_MEDIUM: 'FF374151', // Gris medio
  HEADER_LIGHT: 'FF6B7280', // Gris claro

  // Cards de resumen
  CARD_BLUE: 'FF3B82F6', // Azul - Descanso médico
  CARD_ORANGE: 'FFF97316', // Naranja - Licencia sin goce
  CARD_RED: 'FFEF4444', // Rojo - Faltas
  CARD_PURPLE: 'FF8B5CF6', // Morado - Descansos trabajados
  CARD_GREEN: 'FF22C55E', // Verde - Feriados trabajados

  // Fondos
  BG_LIGHT_BLUE: 'FFDBEAFE', // Azul claro
  BG_LIGHT_ORANGE: 'FFFED7AA', // Naranja claro
  BG_LIGHT_RED: 'FFFECACA', // Rojo claro
  BG_LIGHT_PURPLE: 'FFEDE9FE', // Morado claro
  BG_LIGHT_GREEN: 'FFDCFCE7', // Verde claro
  BG_LIGHT_GRAY: 'FFF3F4F6', // Gris muy claro
  BG_YELLOW: 'FFFEF3C7', // Amarillo claro (alertas)

  // Texto
  TEXT_WHITE: 'FFFFFFFF',
  TEXT_DARK: 'FF111827',
  TEXT_GRAY: 'FF6B7280',

  // Estados
  ESTADO_BORRADOR: 'FFFBBF24', // Amarillo
  ESTADO_PROCESO: 'FF3B82F6', // Azul
  ESTADO_CERRADO: 'FF22C55E', // Verde
  ESTADO_ANULADO: 'FFEF4444', // Rojo
};

// Estilos reutilizables
// Bordes robustos para tablas profesionales
export const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

export const BORDER_MEDIUM: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF6B7280' } },
  left: { style: 'medium', color: { argb: 'FF6B7280' } },
  bottom: { style: 'medium', color: { argb: 'FF6B7280' } },
  right: { style: 'medium', color: { argb: 'FF6B7280' } },
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
