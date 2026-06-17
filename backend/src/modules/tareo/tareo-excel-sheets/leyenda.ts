import * as ExcelJS from 'exceljs';
import { TipoMarcacion } from '@prisma/client';
import {
  COLORES,
  BORDER_HEADER,
  BORDER_TABLE,
  MESES,
} from '../tareo-excel-constants';
import { hexToArgb, lightenColor } from '../tareo-excel-helpers';

interface PeriodoMin {
  mes: number;
  anio: number;
}

/**
 * Hoja 4 del Excel: leyenda con todos los tipos de marcacion activos.
 *
 * No retorna nada — agrega la worksheet al workbook recibido.
 */
export function appendLeyendaSheet(
  workbook: ExcelJS.Workbook,
  periodo: PeriodoMin,
  tiposMarcacion: TipoMarcacion[],
): void {
  const leyendaSheet = workbook.addWorksheet('Leyenda', {
    properties: { tabColor: { argb: COLORES.HEADER_MEDIUM } },
  });

  leyendaSheet.columns = [
    { width: 5 }, // A - vacio
    { width: 12 }, // B - Codigo
    { width: 40 }, // C - Descripcion
    { width: 18 }, // D - Cuenta Como
    { width: 12 }, // E - Laborable
    { width: 10 }, // F - Horas
    { width: 12 }, // G - Pagado
    { width: 14 }, // H - Feriado Trab.
  ];

  // Titulo
  leyendaSheet.mergeCells('B1:H1');
  const leyendaTitulo = leyendaSheet.getCell('B1');
  leyendaTitulo.value = `LEYENDA DE MARCACIONES - ${MESES[periodo.mes - 1]} ${periodo.anio}`;
  leyendaTitulo.font = {
    bold: true,
    size: 14,
    color: { argb: COLORES.TEXT_WHITE },
  };
  leyendaTitulo.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORES.HEADER_DARK },
  };
  leyendaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  leyendaTitulo.border = BORDER_HEADER;
  leyendaSheet.getRow(1).height = 32;

  // Subtitulo
  leyendaSheet.mergeCells('B2:H2');
  const leyendaSubtitulo = leyendaSheet.getCell('B2');
  leyendaSubtitulo.value = `Total: ${tiposMarcacion.length} tipos de marcación activos`;
  leyendaSubtitulo.font = { size: 10, color: { argb: COLORES.TEXT_GRAY } };
  leyendaSubtitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  leyendaSheet.getRow(2).height = 20;

  // Header
  const leyHeaders = [
    'Código',
    'Descripción',
    'Cuenta Como',
    'Laborable',
    'Horas',
    'Pagado',
    'Fer. Trab.',
  ];
  leyHeaders.forEach((h, i) => {
    const col = String.fromCharCode(66 + i);
    const cell = leyendaSheet.getCell(`${col}3`);
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
  leyendaSheet.getRow(3).height = 26;

  // Datos - TODOS los tipos de marcacion
  let leyRow = 4;
  tiposMarcacion.forEach((tipo, index) => {
    const isEvenRow = index % 2 === 0;
    const values = [
      tipo.codigo,
      tipo.descripcion,
      tipo.cuenta_como || '-',
      tipo.es_laborable ? 'SÍ' : 'NO',
      tipo.horas_default || 8,
      tipo.es_laborable ? 'SÍ' : 'NO', // Aproximacion: laborable = pagado
      tipo.es_feriado_trabajado ? 'SÍ' : '-',
    ];

    values.forEach((v, i) => {
      const col = String.fromCharCode(66 + i);
      const cell = leyendaSheet.getCell(`${col}${leyRow}`);
      cell.value = v;
      cell.alignment = {
        horizontal: i === 1 ? 'left' : 'center',
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

      // Color de fondo del codigo - USANDO COLOR FIEL DE LA BD
      if (i === 0 && tipo.color) {
        const argbColor = hexToArgb(tipo.color);
        const argbColorLight = lightenColor(tipo.color, 0.25);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: argbColorLight },
        };
        cell.font = { bold: true, size: 10, color: { argb: argbColor } };
      }

      // Colorear SI/NO
      if ((i === 3 || i === 5) && v === 'SÍ') {
        cell.font = {
          size: 10,
          bold: true,
          color: { argb: COLORES.CARD_GREEN },
        };
      }
      if ((i === 3 || i === 5) && v === 'NO') {
        cell.font = { size: 10, color: { argb: COLORES.CARD_RED } };
      }
      if (i === 6 && v === 'SÍ') {
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
    });
    leyendaSheet.getRow(leyRow).height = 22;
    leyRow++;
  });

  // Congelar header
  leyendaSheet.views = [{ state: 'frozen', ySplit: 3 }];
}
