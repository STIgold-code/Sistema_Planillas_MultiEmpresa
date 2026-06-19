import * as ExcelJS from 'exceljs';
import { COLORES, BORDER_THIN, BORDER_MEDIUM } from '../tareo-excel-constants';
import {
  formatDate,
  isDiaEnContrato,
  hexToArgb,
  lightenColor,
} from '../tareo-excel-helpers';

interface PeriodoMin {
  mes: number;
  anio: number;
}

interface TipoMarcacionMin {
  codigo: string;
  color: string | null;
}

interface DetalleMin {
  tipo_marcacion: TipoMarcacionMin | null;
}

interface ContratoMin {
  fecha_inicio: Date;
  fecha_fin: Date | null;
}

interface TareoProcesadoDetalle {
  empleado: { numero_documento: string };
  nombreCompleto: string;
  areaName: string;
  sedeName: string;
  contrato?: ContratoMin;
  totales: { dm: number; lsg: number; f: number; dt: number; ft: number };
  detallesMap: Map<number, DetalleMin>;
}

/**
 * Hoja 2 del Excel: tabla detallada del tareo del periodo.
 * Por cada empleado: una fila con sus marcaciones por dia (1..diasDelMes) +
 * totales por categoria (DM/LSG/F/DT/FT). Al final, fila de TOTALES GENERALES.
 *
 * Las celdas de dias usan los colores del tipo de marcacion (color de la BD).
 * Los dias fuera del rango del contrato salen grises.
 *
 * No retorna nada — agrega la worksheet al workbook recibido.
 */
export function appendDetalleSheet(
  workbook: ExcelJS.Workbook,
  periodo: PeriodoMin,
  diasDelMes: number,
  tareosProcesados: TareoProcesadoDetalle[],
): void {
  const tareoSheet = workbook.addWorksheet('Tareo Detallado', {
    properties: { tabColor: { argb: COLORES.HEADER_DARK } },
  });

  // Configurar columnas
  const tareoColumns: Partial<ExcelJS.Column>[] = [
    { header: '#', key: 'num', width: 5 },
    { header: 'DNI', key: 'dni', width: 12 },
    { header: 'APELLIDOS Y NOMBRES', key: 'nombre', width: 35 },
    { header: 'ÁREA', key: 'area', width: 18 },
    { header: 'SEDE', key: 'sede', width: 18 },
    { header: 'INICIO', key: 'inicio', width: 11 },
    { header: 'FIN', key: 'fin', width: 11 },
  ];

  // Columnas de dias
  for (let dia = 1; dia <= diasDelMes; dia++) {
    tareoColumns.push({ header: dia.toString(), key: `d${dia}`, width: 4 });
  }

  // Columnas de totales
  tareoColumns.push(
    { header: 'DM', key: 'dm', width: 5 },
    { header: 'LSG', key: 'lsg', width: 5 },
    { header: 'F', key: 'f', width: 4 },
    { header: 'DT', key: 'dt', width: 5 },
    { header: 'FT', key: 'ft', width: 5 },
  );

  tareoSheet.columns = tareoColumns;

  // Estilos del header
  const tareoHeaderRow = tareoSheet.getRow(1);
  tareoHeaderRow.font = {
    bold: true,
    size: 9,
    color: { argb: COLORES.TEXT_WHITE },
  };
  tareoHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
  tareoHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORES.HEADER_DARK },
  };
  tareoHeaderRow.height = 22;

  // Colorear headers de totales
  const totalColStart = 7 + diasDelMes + 1; // Columna donde empiezan los totales
  const totalColors = [
    COLORES.CARD_BLUE,
    COLORES.CARD_ORANGE,
    COLORES.CARD_RED,
    COLORES.CARD_PURPLE,
    COLORES.CARD_GREEN,
  ];
  for (let i = 0; i < 5; i++) {
    tareoHeaderRow.getCell(totalColStart + i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: totalColors[i] },
    };
  }

  // Agregar datos
  let totalGeneralDM = 0,
    totalGeneralLSG = 0,
    totalGeneralF = 0,
    totalGeneralDT = 0,
    totalGeneralFT = 0;

  tareosProcesados.forEach((tareo, index) => {
    const rowData: Record<string, unknown> = {
      num: index + 1,
      dni: tareo.empleado.numero_documento,
      nombre: tareo.nombreCompleto,
      area: tareo.areaName,
      sede: tareo.sedeName,
      inicio: tareo.contrato ? formatDate(tareo.contrato.fecha_inicio) : '-',
      fin: tareo.contrato?.fecha_fin
        ? formatDate(tareo.contrato.fecha_fin)
        : 'Indefinido',
      dm: tareo.totales.dm,
      lsg: tareo.totales.lsg,
      f: tareo.totales.f,
      dt: tareo.totales.dt,
      ft: tareo.totales.ft,
    };

    // Sumar totales generales
    totalGeneralDM += tareo.totales.dm;
    totalGeneralLSG += tareo.totales.lsg;
    totalGeneralF += tareo.totales.f;
    totalGeneralDT += tareo.totales.dt;
    totalGeneralFT += tareo.totales.ft;

    // Dias
    for (let dia = 1; dia <= diasDelMes; dia++) {
      const detalle = tareo.detallesMap.get(dia);
      rowData[`d${dia}`] = detalle?.tipo_marcacion?.codigo || '';
    }

    const row = tareoSheet.addRow(rowData);
    row.height = 18;
    row.alignment = { horizontal: 'center', vertical: 'middle' };
    row.font = { size: 9 };

    // Aplicar colores a celdas de dias - USANDO COLORES FIELES DE LA BD
    for (let dia = 1; dia <= diasDelMes; dia++) {
      const detalle = tareo.detallesMap.get(dia);
      const cell = row.getCell(`d${dia}`);
      const enContrato = isDiaEnContrato(
        dia,
        periodo.mes,
        periodo.anio,
        tareo.contrato?.fecha_inicio || null,
        tareo.contrato?.fecha_fin || null,
      );

      if (!enContrato) {
        // Fuera de contrato - gris rayado
        cell.fill = {
          type: 'pattern',
          pattern: 'lightGray',
          fgColor: { argb: 'FFE5E7EB' },
          bgColor: { argb: 'FFF3F4F6' },
        };
        cell.font = { size: 8, color: { argb: 'FF9CA3AF' } };
      } else if (detalle?.tipo_marcacion) {
        const color = detalle.tipo_marcacion.color;
        if (color) {
          // Usar color de la BD: texto en color fuerte, fondo en version clara (20% opacidad)
          const argbColor = hexToArgb(color);
          const argbColorLight = lightenColor(color, 0.2);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: argbColorLight },
          };
          cell.font = { size: 9, bold: true, color: { argb: argbColor } };
        }
      }
      cell.border = BORDER_THIN;
    }

    // Estilos de columnas fijas
    row.getCell('num').alignment = { horizontal: 'center' };
    row.getCell('dni').alignment = { horizontal: 'center' };
    row.getCell('nombre').alignment = { horizontal: 'left' };

    // Colores de totales
    const bgTotalColors = [
      COLORES.BG_LIGHT_BLUE,
      COLORES.BG_LIGHT_ORANGE,
      COLORES.BG_LIGHT_RED,
      COLORES.BG_LIGHT_PURPLE,
      COLORES.BG_LIGHT_GREEN,
    ];
    const fgTotalColors = [
      COLORES.CARD_BLUE,
      COLORES.CARD_ORANGE,
      COLORES.CARD_RED,
      COLORES.CARD_PURPLE,
      COLORES.CARD_GREEN,
    ];
    ['dm', 'lsg', 'f', 'dt', 'ft'].forEach((key, i) => {
      const cell = row.getCell(key);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgTotalColors[i] },
      };
      cell.font = { size: 9, bold: true, color: { argb: fgTotalColors[i] } };
      cell.border = BORDER_THIN;
    });

    // Bordes para todas las celdas
    row.eachCell((cell) => {
      cell.border = BORDER_THIN;
    });
  });

  // Fila de TOTALES GENERALES
  const totalesRow = tareoSheet.addRow({
    num: '',
    dni: '',
    nombre: 'TOTALES GENERALES',
    area: '',
    sede: '',
    inicio: '',
    fin: '',
    dm: totalGeneralDM,
    lsg: totalGeneralLSG,
    f: totalGeneralF,
    dt: totalGeneralDT,
    ft: totalGeneralFT,
  });
  totalesRow.height = 25;
  totalesRow.font = { bold: true, size: 10 };
  totalesRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORES.HEADER_DARK },
  };
  totalesRow.getCell('nombre').font = {
    bold: true,
    size: 10,
    color: { argb: COLORES.TEXT_WHITE },
  };
  totalesRow.getCell('nombre').alignment = { horizontal: 'right' };

  // Colorear totales finales
  ['dm', 'lsg', 'f', 'dt', 'ft'].forEach((key, i) => {
    const cell = totalesRow.getCell(key);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: totalColors[i] },
    };
    cell.font = { bold: true, size: 11, color: { argb: COLORES.TEXT_WHITE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  totalesRow.eachCell((cell) => {
    cell.border = BORDER_MEDIUM;
  });

  // Congelar filas y columnas
  tareoSheet.views = [{ state: 'frozen', xSplit: 7, ySplit: 1 }];
}
