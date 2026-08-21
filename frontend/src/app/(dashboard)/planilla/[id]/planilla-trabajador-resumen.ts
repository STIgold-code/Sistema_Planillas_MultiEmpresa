import ExcelJS from 'exceljs';
import { BORDER_HEADER, BORDER_TABLE, COLORES } from './planilla-export-constants';
import { ESTILOS } from './planilla-export-estilos';
import {
  FORMATO_MONEDA,
  RELLENO_DIVERGENTE,
  RELLENO_FORMULA,
  RELLENO_INSUMO,
  relleno,
} from './planilla-auditable-hojas';
import type { ReferenciasHojaTrabajador } from './planilla-trabajador-conceptos';

/**
 * Hojas de RESUMEN transversal del libro por trabajador: la renta de 5.ª y el
 * descuento dominical de todos los trabajadores en una sola tabla cada uno.
 *
 * Ninguna celda recalcula nada: cada importe es una referencia a la celda de
 * la hoja del trabajador (`'3. PÉREZ JUAN'!$E$87`). Si alguien cambia el
 * sueldo en la hoja de una persona, el resumen se actualiza solo. Una sola
 * fuente de verdad, y el valor del sistema al lado para el control.
 */

export interface FilaResumen {
  nombreHoja: string;
  nombre: string;
  documento: string;
  domiciliado: boolean;
  referencias: ReferenciasHojaTrabajador;
  sistema: {
    renta5ta: number;
    dominical: number;
    diasTrabajados: number;
  };
}

/** Una columna del resumen. Exactamente una de las tres fuentes aplica. */
type FuenteColumna =
  | { tipo: 'referencia'; ref: (f: FilaResumen) => string | null }
  | { tipo: 'sistema'; valor: (f: FilaResumen) => number }
  | { tipo: 'diferencia'; formula: number; sistema: number };

interface ColumnaResumen {
  titulo: string;
  ancho: number;
  fuente: FuenteColumna;
  formato?: string;
}

const refHoja = (nombreHoja: string): string => `'${nombreHoja.replace(/'/g, "''")}'`;

/** Primera columna de datos (después de N° y Trabajador). */
const PRIMERA_COLUMNA_DATOS = 3;
const PRIMERA_FILA_DATOS = 5;

function agregarHojaResumen(
  workbook: ExcelJS.Workbook,
  nombre: string,
  titulo: string,
  descripcion: string,
  columnas: ColumnaResumen[],
  filas: FilaResumen[],
  tabColor: string,
): void {
  const ws = workbook.addWorksheet(nombre, {
    properties: { tabColor: { argb: tabColor } },
    views: [{ state: 'frozen', xSplit: 2, ySplit: PRIMERA_FILA_DATOS - 1 }],
  });
  const anchos = [5, 40, ...columnas.map((c) => c.ancho)];
  anchos.forEach((ancho, i) => {
    ws.getColumn(i + 1).width = ancho;
  });
  const ultimaColumna = anchos.length;
  const letraDe = (indiceColumna: number): string =>
    ws.getColumn(PRIMERA_COLUMNA_DATOS + indiceColumna).letter;

  ws.mergeCells(1, 1, 1, ultimaColumna);
  const celdaTitulo = ws.getCell(1, 1);
  celdaTitulo.value = titulo;
  Object.assign(celdaTitulo, ESTILOS.titulo);
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, ultimaColumna);
  ws.getCell(2, 1).value = descripcion;
  ws.getCell(2, 1).font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  ws.getCell(2, 1).alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(2).height = 32;

  const encabezados = ['N°', 'Trabajador', ...columnas.map((c) => c.titulo)];
  encabezados.forEach((texto, i) => {
    const cell = ws.getCell(PRIMERA_FILA_DATOS - 1, i + 1);
    cell.value = texto;
    cell.font = { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = relleno(COLORES.HEADER_DARK);
    cell.border = BORDER_HEADER;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  ws.getRow(PRIMERA_FILA_DATOS - 1).height = 36;

  filas.forEach((f, i) => {
    const fila = PRIMERA_FILA_DATOS + i;
    ws.getCell(fila, 1).value = i + 1;
    const enlace = ws.getCell(fila, 2);
    enlace.value = { text: f.nombre, hyperlink: `#${refHoja(f.nombreHoja)}!A1` };
    enlace.font = { size: 10, underline: true, color: { argb: COLORES.DATOS } };

    columnas.forEach((c, k) => {
      const cell = ws.getCell(fila, PRIMERA_COLUMNA_DATOS + k);
      cell.numFmt = c.formato ?? FORMATO_MONEDA;
      switch (c.fuente.tipo) {
        case 'referencia': {
          const referencia = c.fuente.ref(f);
          if (referencia === null) {
            cell.value = '—';
            cell.alignment = { horizontal: 'center' };
          } else {
            cell.value = { formula: `${refHoja(f.nombreHoja)}!${referencia}` };
            cell.fill = relleno(RELLENO_FORMULA);
          }
          break;
        }
        case 'sistema':
          cell.value = c.fuente.valor(f);
          cell.fill = relleno(RELLENO_INSUMO);
          break;
        case 'diferencia':
          cell.value = {
            formula: `ROUND(${letraDe(c.fuente.formula)}${fila}-${letraDe(c.fuente.sistema)}${fila},2)`,
          };
          cell.font = { bold: true };
          break;
      }
    });

    for (let col = 1; col <= ultimaColumna; col++) {
      const cell = ws.getCell(fila, col);
      cell.border = BORDER_TABLE;
      cell.font = { size: 10, ...cell.font };
      if (col >= PRIMERA_COLUMNA_DATOS && cell.value !== '—') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }
  });

  const filaTotal = PRIMERA_FILA_DATOS + filas.length;
  ws.getCell(filaTotal, 2).value = 'TOTAL';
  columnas.forEach((c, k) => {
    const letra = letraDe(k);
    const cell = ws.getCell(filaTotal, PRIMERA_COLUMNA_DATOS + k);
    cell.value = { formula: `SUM(${letra}${PRIMERA_FILA_DATOS}:${letra}${filaTotal - 1})` };
    cell.numFmt = c.formato ?? FORMATO_MONEDA;
  });
  for (let col = 1; col <= ultimaColumna; col++) {
    const cell = ws.getCell(filaTotal, col);
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = relleno(COLORES.PRIMARY);
    cell.border = BORDER_HEADER;
    if (col >= PRIMERA_COLUMNA_DATOS) cell.alignment = { horizontal: 'right' };
  }

  // Las columnas de diferencia se pintan si no dan cero.
  columnas.forEach((c, k) => {
    if (c.fuente.tipo !== 'diferencia') return;
    const letra = letraDe(k);
    ws.addConditionalFormatting({
      ref: `${letra}${PRIMERA_FILA_DATOS}:${letra}${filaTotal}`,
      rules: [
        {
          type: 'expression',
          formulae: [`AND(ISNUMBER($${letra}${PRIMERA_FILA_DATOS}),$${letra}${PRIMERA_FILA_DATOS}<>0)`],
          priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: RELLENO_DIVERGENTE } } },
        },
      ],
    });
  });
}

const referencia = (ref: (f: FilaResumen) => string | null): FuenteColumna => ({ tipo: 'referencia', ref });
const sistema = (valor: (f: FilaResumen) => number): FuenteColumna => ({ tipo: 'sistema', valor });

export function agregarHojasResumen(workbook: ExcelJS.Workbook, filas: FilaResumen[]): void {
  // ── Renta de 5.ª ──
  const colsRenta: ColumnaResumen[] = [
    { titulo: 'Rem. afecta del mes', ancho: 14, fuente: referencia((f) => f.referencias.remAfecta) },
    { titulo: 'Acumulado previo del año', ancho: 14, fuente: referencia((f) => f.referencias.renta?.acumuladoPrevio ?? null) },
    { titulo: 'Retenciones previas', ancho: 13, fuente: referencia((f) => f.referencias.renta?.retencionesPrevias ?? null) },
    { titulo: 'Renta bruta anual proyectada', ancho: 15, fuente: referencia((f) => f.referencias.renta?.rentaBruta ?? null) },
    { titulo: 'Renta neta (− 7 UIT)', ancho: 14, fuente: referencia((f) => f.referencias.renta?.rentaNeta ?? null) },
    { titulo: 'Impuesto anual s/ escala', ancho: 14, fuente: referencia((f) => f.referencias.renta?.impuestoAnual ?? null) },
    { titulo: 'Cuota ordinaria del mes', ancho: 13, fuente: referencia((f) => f.referencias.renta?.cuotaOrdinaria ?? null) },
    { titulo: 'Adicional por extraordinario', ancho: 14, fuente: referencia((f) => f.referencias.renta?.adicionalExtraordinario ?? null) },
    { titulo: 'RETENCIÓN DEL MES (fórmula)', ancho: 15, fuente: referencia((f) => f.referencias.retencionRenta) },
    { titulo: 'Retención según el sistema', ancho: 14, fuente: sistema((f) => f.sistema.renta5ta) },
    { titulo: 'Diferencia', ancho: 11, fuente: { tipo: 'diferencia', formula: 8, sistema: 9 } },
  ];
  agregarHojaResumen(
    workbook,
    'Resumen Renta 5ta',
    'RENTA DE 5.ª CATEGORÍA — todos los trabajadores',
    'Cada celda es una referencia a la hoja del trabajador: el detalle de los 14 pasos está ahí. Los no domiciliados tributan 30 % plano y no tienen proyección (—). La última columna debe ser 0.00.',
    colsRenta,
    filas,
    COLORES.DESCUENTOS,
  );

  // ── Dominical ──
  const colsDominical: ColumnaResumen[] = [
    { titulo: 'Días que devengan', ancho: 12, fuente: referencia((f) => f.referencias.diasDevengan), formato: '0' },
    { titulo: 'Ausencias sin goce', ancho: 12, fuente: referencia((f) => f.referencias.ausenciasSinGoce), formato: '0' },
    { titulo: 'Dominicales perdidos (sextos)', ancho: 14, fuente: referencia((f) => f.referencias.dominicalSextos), formato: '0.0000' },
    { titulo: 'DESCUENTO DOMINICAL (fórmula)', ancho: 15, fuente: referencia((f) => f.referencias.dominicalDescuento) },
    { titulo: 'Descuento según el sistema', ancho: 14, fuente: sistema((f) => f.sistema.dominical) },
    { titulo: 'Diferencia', ancho: 11, fuente: { tipo: 'diferencia', formula: 3, sistema: 4 } },
  ];
  agregarHojaResumen(
    workbook,
    'Resumen Dominical',
    'DESCUENTO DOMINICAL (D.L. 713 art. 4) — todos los trabajadores',
    'Las ausencias sin goce recortan el descanso semanal en sextos, con tope de un dominical por semana. El desglose semana por semana está en la hoja de cada trabajador. La última columna debe ser 0.00.',
    colsDominical,
    filas,
    COLORES.DIAS,
  );
}
