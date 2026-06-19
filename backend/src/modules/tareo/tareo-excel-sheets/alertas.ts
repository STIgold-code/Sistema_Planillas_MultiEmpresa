import * as ExcelJS from 'exceljs';
import {
  COLORES,
  BORDER_HEADER,
  BORDER_TABLE,
  MESES,
} from '../tareo-excel-constants';
import { formatDate } from '../tareo-excel-helpers';

interface PeriodoMin {
  mes: number;
  anio: number;
}

interface TareoProcesadoMin {
  empleado: { numero_documento: string };
  nombreCompleto: string;
  areaName: string;
  sedeName: string;
  totales: { dm: number; lsg: number; f: number; dt: number; ft: number };
}

interface AlertaFaltaMin {
  nombre: string;
  dni: string;
  area: string;
  faltas: number;
}

interface TotalesGlobales {
  totalDM: number;
  totalLSG: number;
  totalF: number;
  totalDT: number;
  totalFT: number;
}

/**
 * Hoja 3 del Excel: tabla con TODOS los empleados y su control mensual de
 * marcaciones criticas (DM, LSG, F, DT, FT) + columna de alerta cuando aplica
 * Art.25 LPCL (3+ faltas).
 *
 * No retorna nada — agrega la worksheet al workbook recibido.
 */
export function appendAlertasSheet(
  workbook: ExcelJS.Workbook,
  periodo: PeriodoMin,
  tareosProcesados: TareoProcesadoMin[],
  totales: TotalesGlobales,
  alertasFaltas: AlertaFaltaMin[],
): void {
  const alertasSheet = workbook.addWorksheet('Alertas', {
    properties: { tabColor: { argb: COLORES.CARD_RED } },
  });

  alertasSheet.columns = [
    { width: 5 }, // A - vacio
    { width: 6 }, // B - #
    { width: 14 }, // C - DNI
    { width: 38 }, // D - Nombre
    { width: 18 }, // E - Area
    { width: 18 }, // F - Sede
    { width: 6 }, // G - DM
    { width: 6 }, // H - LSG
    { width: 6 }, // I - F
    { width: 6 }, // J - DT
    { width: 6 }, // K - FT
    { width: 30 }, // L - Alerta
  ];

  let alertaRow = 1;

  // Titulo principal
  alertasSheet.mergeCells(`B${alertaRow}:L${alertaRow}`);
  const alertaTitulo = alertasSheet.getCell(`B${alertaRow}`);
  alertaTitulo.value = `CONTROL DE EMPLEADOS - ${MESES[periodo.mes - 1]} ${periodo.anio}`;
  alertaTitulo.font = {
    bold: true,
    size: 16,
    color: { argb: COLORES.TEXT_WHITE },
  };
  alertaTitulo.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORES.HEADER_DARK },
  };
  alertaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  alertaTitulo.border = BORDER_HEADER;
  alertasSheet.getRow(alertaRow).height = 35;
  alertaRow++;

  // Subtitulo
  alertasSheet.mergeCells(`B${alertaRow}:L${alertaRow}`);
  const alertaSubtitulo = alertasSheet.getCell(`B${alertaRow}`);
  alertaSubtitulo.value = `Total: ${tareosProcesados.length} empleados | Generado: ${formatDate(new Date())}`;
  alertaSubtitulo.font = { size: 10, color: { argb: COLORES.TEXT_GRAY } };
  alertaSubtitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  alertasSheet.getRow(alertaRow).height = 22;
  alertaRow += 2;

  // Header de la tabla
  const alertaHeaders = [
    '#',
    'DNI',
    'Apellidos y Nombres',
    'Área',
    'Sede',
    'DM',
    'LSG',
    'F',
    'DT',
    'FT',
    'Alerta',
  ];
  const alertaHeaderColors = [
    COLORES.HEADER_DARK, // #
    COLORES.HEADER_DARK, // DNI
    COLORES.HEADER_DARK, // Nombre
    COLORES.HEADER_DARK, // Area
    COLORES.HEADER_DARK, // Sede
    COLORES.CARD_BLUE, // DM
    COLORES.CARD_ORANGE, // LSG
    COLORES.CARD_RED, // F
    COLORES.CARD_PURPLE, // DT
    COLORES.CARD_GREEN, // FT
    COLORES.HEADER_DARK, // Alerta
  ];

  alertaHeaders.forEach((h, i) => {
    const col = String.fromCharCode(66 + i); // B, C, D, E, F, G, H, I, J, K, L
    const cell = alertasSheet.getCell(`${col}${alertaRow}`);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: alertaHeaderColors[i] },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_HEADER;
  });
  alertasSheet.getRow(alertaRow).height = 26;
  alertaRow++;

  // Datos de TODOS los empleados
  tareosProcesados.forEach((tareo, index) => {
    const tieneAlertaFaltas = tareo.totales.f >= 3;
    const alertaTexto = tieneAlertaFaltas ? '⚠ Art.25 LPCL (3+ faltas)' : '';
    const isEvenRow = index % 2 === 0;

    const rowValues = [
      index + 1,
      tareo.empleado.numero_documento,
      tareo.nombreCompleto,
      tareo.areaName,
      tareo.sedeName,
      tareo.totales.dm,
      tareo.totales.lsg,
      tareo.totales.f,
      tareo.totales.dt,
      tareo.totales.ft,
      alertaTexto,
    ];

    rowValues.forEach((v, i) => {
      const col = String.fromCharCode(66 + i);
      const cell = alertasSheet.getCell(`${col}${alertaRow}`);
      cell.value = v;
      cell.alignment = {
        horizontal: i <= 1 ? 'center' : i === 2 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.border = BORDER_TABLE;
      cell.font = { size: 10 };

      // Fondo alternado
      if (isEvenRow) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_GRAY },
        };
      }

      // Colores para indicadores
      if (i === 5 && tareo.totales.dm > 0) {
        // DM
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_BLUE },
        };
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_BLUE },
        };
      }
      if (i === 6 && tareo.totales.lsg > 0) {
        // LSG
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_ORANGE },
        };
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_ORANGE },
        };
      }
      if (i === 7 && tareo.totales.f > 0) {
        // F
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_RED },
        };
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_RED },
        };
      }
      if (i === 8 && tareo.totales.dt > 0) {
        // DT
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_PURPLE },
        };
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_PURPLE },
        };
      }
      if (i === 9 && tareo.totales.ft > 0) {
        // FT
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_GREEN },
        };
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_GREEN },
        };
      }

      // Columna de alerta
      if (i === 10 && tieneAlertaFaltas) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_RED },
        };
        cell.font = {
          size: 9,
          bold: true,
          color: { argb: COLORES.CARD_RED },
        };
      }
    });

    alertasSheet.getRow(alertaRow).height = 20;
    alertaRow++;
  });

  // Fila de totales
  alertaRow++;
  const totalRowValues = [
    '',
    '',
    'TOTALES',
    '',
    '',
    totales.totalDM,
    totales.totalLSG,
    totales.totalF,
    totales.totalDT,
    totales.totalFT,
    `${alertasFaltas.length} con alerta`,
  ];

  totalRowValues.forEach((v, i) => {
    const col = String.fromCharCode(66 + i);
    const cell = alertasSheet.getCell(`${col}${alertaRow}`);
    cell.value = v;
    cell.font = { bold: true, size: 11, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORES.HEADER_DARK },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_HEADER;

    // Colores de totales de indicadores
    if (i === 5)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORES.CARD_BLUE },
      };
    if (i === 6)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORES.CARD_ORANGE },
      };
    if (i === 7)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORES.CARD_RED },
      };
    if (i === 8)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORES.CARD_PURPLE },
      };
    if (i === 9)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORES.CARD_GREEN },
      };
  });
  alertasSheet.getRow(alertaRow).height = 28;

  alertaRow += 3;

  // Nota legal
  alertasSheet.mergeCells(`B${alertaRow}:L${alertaRow}`);
  const notaLegal = alertasSheet.getCell(`B${alertaRow}`);
  notaLegal.value =
    'NOTA LEGAL: Según Art. 25 del D.S. 003-97-TR (LPCL), constituye falta grave la inasistencia injustificada por más de 3 días consecutivos o más de 5 días en un período de 30 días calendario, habilitando al empleador para el despido por causa justa.';
  notaLegal.font = {
    size: 9,
    italic: true,
    color: { argb: COLORES.TEXT_GRAY },
  };
  notaLegal.alignment = { wrapText: true };
  alertasSheet.getRow(alertaRow).height = 40;

  // Congelar primera fila de datos
  alertasSheet.views = [{ state: 'frozen', ySplit: 4 }];
}
