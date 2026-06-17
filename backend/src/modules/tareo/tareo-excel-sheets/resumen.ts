import * as ExcelJS from 'exceljs';
import {
  COLORES,
  BORDER_THIN,
  BORDER_MEDIUM,
  BORDER_TABLE,
  BORDER_HEADER,
  MESES,
} from '../tareo-excel-constants';
import { formatDate, getEstadoColor } from '../tareo-excel-helpers';

interface PeriodoMin {
  mes: number;
  anio: number;
  estado: string;
}

interface EmpresaMin {
  razon_social: string | null;
  ruc: string | null;
}

interface StatsAggregable {
  empleados: number;
  dm: number;
  lsg: number;
  f: number;
  dt: number;
  ft: number;
}

interface TotalesGlobales {
  totalDM: number;
  totalLSG: number;
  totalF: number;
  totalDT: number;
  totalFT: number;
}

/**
 * Hoja 1 del Excel: Resumen Ejecutivo del periodo de tareo.
 *
 * Compone:
 *   - Header con logo + razon social + RUC + titulo del reporte
 *   - Linea de info: fecha de generacion, estado del periodo, total empleados
 *   - 5 cards de indicadores (DM, LSG, F, DT, FT) con sus colores
 *   - Tabla "RESUMEN POR AREA"
 *   - Tabla "RESUMEN POR SEDE"
 *
 * No retorna nada — agrega la worksheet al workbook recibido.
 */
export function appendResumenSheet(
  workbook: ExcelJS.Workbook,
  logoImageId: number | null,
  empresa: EmpresaMin | null,
  periodo: PeriodoMin,
  totalEmpleados: number,
  totales: TotalesGlobales,
  statsPorArea: Map<string, StatsAggregable>,
  statsPorSede: Map<string, StatsAggregable>,
): void {
  const resumenSheet = workbook.addWorksheet('Resumen Ejecutivo', {
    properties: { tabColor: { argb: COLORES.CARD_BLUE } },
  });

  // Configurar ancho de columnas
  resumenSheet.columns = [
    { width: 12 }, // A - Logo
    { width: 25 }, // B
    { width: 15 }, // C
    { width: 15 }, // D
    { width: 15 }, // E
    { width: 15 }, // F
    { width: 15 }, // G
    { width: 15 }, // H
  ];

  let currentRow = 1;

  // --- LOGO ---
  if (logoImageId !== null) {
    resumenSheet.addImage(logoImageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 70, height: 70 },
    });
    resumenSheet.getRow(1).height = 35;
    resumenSheet.getRow(2).height = 35;
  }

  // --- ENCABEZADO ---
  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const tituloEmpresa = resumenSheet.getCell(`B${currentRow}`);
  tituloEmpresa.value = empresa?.razon_social || 'EMPRESA';
  tituloEmpresa.font = {
    bold: true,
    size: 18,
    color: { argb: COLORES.HEADER_DARK },
  };
  tituloEmpresa.alignment = { horizontal: 'center', vertical: 'middle' };
  resumenSheet.getRow(currentRow).height = 30;
  currentRow++;

  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const subtitulo = resumenSheet.getCell(`B${currentRow}`);
  subtitulo.value = `RUC: ${empresa?.ruc || '-'}`;
  subtitulo.font = { size: 12, color: { argb: COLORES.TEXT_GRAY } };
  subtitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow += 2;

  // --- TITULO DEL REPORTE ---
  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const tituloReporte = resumenSheet.getCell(`B${currentRow}`);
  tituloReporte.value = `REPORTE DE TAREO - ${MESES[periodo.mes - 1]} ${periodo.anio}`;
  tituloReporte.font = {
    bold: true,
    size: 16,
    color: { argb: COLORES.TEXT_WHITE },
  };
  tituloReporte.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORES.HEADER_DARK },
  };
  tituloReporte.alignment = { horizontal: 'center', vertical: 'middle' };
  tituloReporte.border = BORDER_MEDIUM;
  resumenSheet.getRow(currentRow).height = 35;
  currentRow++;

  // Info del reporte
  resumenSheet.mergeCells(`B${currentRow}:D${currentRow}`);
  resumenSheet.getCell(`B${currentRow}`).value =
    `Generado: ${formatDate(new Date())}`;
  resumenSheet.getCell(`B${currentRow}`).font = {
    size: 10,
    color: { argb: COLORES.TEXT_GRAY },
  };

  resumenSheet.mergeCells(`E${currentRow}:F${currentRow}`);
  const estadoCell = resumenSheet.getCell(`E${currentRow}`);
  estadoCell.value = `Estado: ${periodo.estado}`;
  estadoCell.font = {
    bold: true,
    size: 10,
    color: { argb: COLORES.TEXT_WHITE },
  };
  estadoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: getEstadoColor(periodo.estado) },
  };
  estadoCell.alignment = { horizontal: 'center' };

  resumenSheet.mergeCells(`G${currentRow}:H${currentRow}`);
  resumenSheet.getCell(`G${currentRow}`).value =
    `Total Empleados: ${totalEmpleados}`;
  resumenSheet.getCell(`G${currentRow}`).font = { bold: true, size: 10 };
  resumenSheet.getCell(`G${currentRow}`).alignment = { horizontal: 'right' };
  currentRow += 3;

  // --- CARDS DE INDICADORES ---
  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const tituloCards = resumenSheet.getCell(`B${currentRow}`);
  tituloCards.value = 'INDICADORES DEL PERÍODO';
  tituloCards.font = {
    bold: true,
    size: 14,
    color: { argb: COLORES.HEADER_DARK },
  };
  resumenSheet.getRow(currentRow).height = 25;
  currentRow++;

  // Fila de cards (encabezados)
  const cardHeaders = [
    '',
    'Descanso Médico',
    'Licencia S/Goce',
    'Faltas',
    'Descansos Trab.',
    'Feriados Trab.',
  ];
  const cardColors = [
    '',
    COLORES.CARD_BLUE,
    COLORES.CARD_ORANGE,
    COLORES.CARD_RED,
    COLORES.CARD_PURPLE,
    COLORES.CARD_GREEN,
  ];
  const cardBgColors = [
    '',
    COLORES.BG_LIGHT_BLUE,
    COLORES.BG_LIGHT_ORANGE,
    COLORES.BG_LIGHT_RED,
    COLORES.BG_LIGHT_PURPLE,
    COLORES.BG_LIGHT_GREEN,
  ];
  const cardValues = [
    0,
    totales.totalDM,
    totales.totalLSG,
    totales.totalF,
    totales.totalDT,
    totales.totalFT,
  ];
  const cardDescriptions = [
    '',
    'Días subsidiados',
    'Sin remuneración',
    'Injustificadas',
    'Dom/Sáb trabajados',
    'Días feriados',
  ];

  // Header de cards
  for (let i = 1; i <= 5; i++) {
    const col = String.fromCharCode(65 + i + 1); // C, D, E, F, G
    const cell = resumenSheet.getCell(`${col}${currentRow}`);
    cell.value = cardHeaders[i];
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cardColors[i] },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  }
  resumenSheet.getRow(currentRow).height = 25;
  currentRow++;

  // Valores de cards
  for (let i = 1; i <= 5; i++) {
    const col = String.fromCharCode(65 + i + 1);
    const cell = resumenSheet.getCell(`${col}${currentRow}`);
    cell.value = cardValues[i];
    cell.font = { bold: true, size: 24, color: { argb: cardColors[i] } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cardBgColors[i] },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  }
  resumenSheet.getRow(currentRow).height = 45;
  currentRow++;

  // Descripcion de cards
  for (let i = 1; i <= 5; i++) {
    const col = String.fromCharCode(65 + i + 1);
    const cell = resumenSheet.getCell(`${col}${currentRow}`);
    cell.value = cardDescriptions[i];
    cell.font = { size: 9, color: { argb: COLORES.TEXT_GRAY } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: cardBgColors[i] },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  }
  resumenSheet.getRow(currentRow).height = 20;
  currentRow += 3;

  // --- RESUMEN POR AREA ---
  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const tituloArea = resumenSheet.getCell(`B${currentRow}`);
  tituloArea.value = 'RESUMEN POR ÁREA';
  tituloArea.font = {
    bold: true,
    size: 14,
    color: { argb: COLORES.HEADER_DARK },
  };
  resumenSheet.getRow(currentRow).height = 25;
  currentRow++;

  // Header tabla areas
  const areaHeaders = ['Área', 'Empleados', 'DM', 'LSG', 'Faltas', 'DT', 'FT'];
  areaHeaders.forEach((h, i) => {
    const col = String.fromCharCode(66 + i); // B, C, D, E, F, G, H
    const cell = resumenSheet.getCell(`${col}${currentRow}`);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORES.HEADER_DARK },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_HEADER;
  });
  resumenSheet.getRow(currentRow).height = 24;
  currentRow++;

  // Datos de areas
  const areasOrdenadas = Array.from(statsPorArea.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  let areaRowIndex = 0;
  areasOrdenadas.forEach(([area, stats]) => {
    const values = [
      area,
      stats.empleados,
      stats.dm,
      stats.lsg,
      stats.f,
      stats.dt,
      stats.ft,
    ];
    const isEvenRow = areaRowIndex % 2 === 0;
    values.forEach((v, i) => {
      const col = String.fromCharCode(66 + i);
      const cell = resumenSheet.getCell(`${col}${currentRow}`);
      cell.value = v;
      cell.font = { size: 10 };
      cell.alignment = {
        horizontal: i === 0 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.border = BORDER_TABLE;
      // Fondo alternado para filas
      if (isEvenRow) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_GRAY },
        };
      }
      // Resaltar faltas > 0
      if (i === 4 && stats.f > 0) {
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_RED },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_RED },
        };
      }
    });
    resumenSheet.getRow(currentRow).height = 22;
    currentRow++;
    areaRowIndex++;
  });

  currentRow += 2;

  // --- RESUMEN POR SEDE ---
  resumenSheet.mergeCells(`B${currentRow}:H${currentRow}`);
  const tituloSede = resumenSheet.getCell(`B${currentRow}`);
  tituloSede.value = 'RESUMEN POR SEDE';
  tituloSede.font = {
    bold: true,
    size: 14,
    color: { argb: COLORES.HEADER_DARK },
  };
  resumenSheet.getRow(currentRow).height = 25;
  currentRow++;

  // Header tabla sedes
  const sedeHeaders = ['Sede', 'Empleados', 'DM', 'LSG', 'Faltas', 'DT', 'FT'];
  sedeHeaders.forEach((h, i) => {
    const col = String.fromCharCode(66 + i);
    const cell = resumenSheet.getCell(`${col}${currentRow}`);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORES.HEADER_DARK },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_HEADER;
  });
  resumenSheet.getRow(currentRow).height = 24;
  currentRow++;

  // Datos de sedes
  const sedesOrdenadas = Array.from(statsPorSede.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  let sedeRowIndex = 0;
  sedesOrdenadas.forEach(([sede, stats]) => {
    const values = [
      sede,
      stats.empleados,
      stats.dm,
      stats.lsg,
      stats.f,
      stats.dt,
      stats.ft,
    ];
    const isEvenRow = sedeRowIndex % 2 === 0;
    values.forEach((v, i) => {
      const col = String.fromCharCode(66 + i);
      const cell = resumenSheet.getCell(`${col}${currentRow}`);
      cell.value = v;
      cell.font = { size: 10 };
      cell.alignment = {
        horizontal: i === 0 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.border = BORDER_TABLE;
      // Fondo alternado para filas
      if (isEvenRow) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_GRAY },
        };
      }
      if (i === 4 && stats.f > 0) {
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_RED },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORES.BG_LIGHT_RED },
        };
      }
    });
    resumenSheet.getRow(currentRow).height = 22;
    currentRow++;
    sedeRowIndex++;
  });

  // Congelar primera fila
  resumenSheet.views = [{ state: 'frozen', ySplit: 0 }];
}
