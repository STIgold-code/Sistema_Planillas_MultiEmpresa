'use client';

import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import ExcelJS from 'exceljs';
import { meses } from './types';
import { COLORES, BORDER_TABLE, BORDER_HEADER } from './planilla-export-constants';
import { ESTILOS } from './planilla-export-estilos';
import {
  ANCHOS,
  CATEGORIAS,
  ENCABEZADOS,
  armarFila,
  esColumnaDias,
  esColumnaMonetaria,
  estiloEncabezado,
} from './planilla-export-layout';
import type {
  CabeceraExportacion,
  DetalleExportacion,
  PlanillaExportacion,
} from './planilla-export-tipos';
import {
  agregarHojaAbonoBancos,
  agregarHojaAfpOnp,
  agregarHojaAlertas,
  agregarHojaCuadreContable,
  descargarLibro,
} from './planilla-export-hojas';

/** Suma redondeada a 2 decimales: evita arrastrar ruido de punto flotante. */
const redondear2 = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

const sumar = (
  detalles: DetalleExportacion[],
  selector: (d: DetalleExportacion) => number,
): number =>
  redondear2(detalles.reduce((acc, d) => acc + (Number(selector(d)) || 0), 0));

function agregarHojaResumenEjecutivo(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
): void {
  const porCliente = new Map<string, { empleados: number; neto: number }>();
  const porPension = new Map<string, { empleados: number; aporte: number }>();

  detalles.forEach((d) => {
    const neto = Number(d.neto_pagar) || 0;
    const cliente = d.cliente || 'Sin Cliente';
    const pension = d.sistema_pensionario || 'Sin Pensión';

    if (!porCliente.has(cliente)) porCliente.set(cliente, { empleados: 0, neto: 0 });
    const filaCliente = porCliente.get(cliente)!;
    filaCliente.empleados++;
    filaCliente.neto += neto;

    const aporteTotal =
      (Number(d.afp_aporte) || 0) + (Number(d.afp_prima) || 0) +
      (Number(d.afp_comision) || 0) + (Number(d.snp_onp) || 0);
    if (!porPension.has(pension)) porPension.set(pension, { empleados: 0, aporte: 0 });
    const filaPension = porPension.get(pension)!;
    filaPension.empleados++;
    filaPension.aporte += aporteTotal;
  });

  const ws = workbook.addWorksheet('Resumen Ejecutivo', {
    properties: { tabColor: { argb: COLORES.PRIMARY } },
  });

  ws.columns = [
    { width: 12 }, { width: 28 }, { width: 18 }, { width: 18 },
    { width: 18 }, { width: 18 }, { width: 18 },
  ];

  let fila = 1;

  ws.mergeCells(`B${fila}:G${fila}`);
  const empresaTitulo = ws.getCell(`B${fila}`);
  empresaTitulo.value = cab.empresa?.razon_social ?? '';
  empresaTitulo.font = { bold: true, size: 18, color: { argb: COLORES.HEADER_DARK } };
  empresaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  fila++;

  ws.mergeCells(`B${fila}:G${fila}`);
  ws.getCell(`B${fila}`).value = cab.empresa ? `RUC: ${cab.empresa.ruc}` : '';
  ws.getCell(`B${fila}`).font = { size: 11, color: { argb: COLORES.TEXT_GRAY } };
  ws.getCell(`B${fila}`).alignment = { horizontal: 'center' };
  fila += 2;

  ws.mergeCells(`B${fila}:G${fila}`);
  const tituloReporte = ws.getCell(`B${fila}`);
  tituloReporte.value = `REPORTE DE PLANILLA - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
  tituloReporte.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
  tituloReporte.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.PRIMARY } };
  tituloReporte.alignment = { horizontal: 'center', vertical: 'middle' };
  tituloReporte.border = BORDER_HEADER;
  ws.getRow(fila).height = 35;
  fila++;

  ws.mergeCells(`B${fila}:D${fila}`);
  ws.getCell(`B${fila}`).value = `Generado: ${new Date().toLocaleDateString('es-PE')}`;
  ws.getCell(`B${fila}`).font = { size: 10, color: { argb: COLORES.TEXT_GRAY } };

  ws.mergeCells(`E${fila}:F${fila}`);
  const estadoCell = ws.getCell(`E${fila}`);
  estadoCell.value = `Estado: ${cab.estado}`;
  estadoCell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
  estadoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: cab.estado === 'PAGADA' ? COLORES.SUCCESS : COLORES.WARNING },
  };
  estadoCell.alignment = { horizontal: 'center' };

  ws.getCell(`G${fila}`).value = `${detalles.length} empleados`;
  ws.getCell(`G${fila}`).font = { bold: true, size: 10 };
  ws.getCell(`G${fila}`).alignment = { horizontal: 'right' };
  fila += 3;

  ws.mergeCells(`B${fila}:G${fila}`);
  ws.getCell(`B${fila}`).value = 'INDICADORES FINANCIEROS';
  ws.getCell(`B${fila}`).font = { bold: true, size: 14, color: { argb: COLORES.HEADER_DARK } };
  fila++;

  const kpis = [
    { label: 'Total Ingresos', value: Number(cab.total_bruto) || 0, color: COLORES.INGRESOS, bgColor: COLORES.BG_SUCCESS },
    { label: 'Total Descuentos', value: Number(cab.total_descuentos) || 0, color: COLORES.DESCUENTOS, bgColor: COLORES.BG_DANGER },
    { label: 'Neto a Pagar', value: Number(cab.total_neto) || 0, color: COLORES.TOTALES, bgColor: 'FFEDE9FE' },
  ];

  kpis.forEach((kpi, i) => {
    const col = String.fromCharCode(67 + i * 2);
    const cell = ws.getCell(`${col}${fila}`);
    cell.value = kpi.label;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color } };
    cell.alignment = { horizontal: 'center' };
    cell.border = BORDER_TABLE;
    ws.mergeCells(`${col}${fila}:${String.fromCharCode(col.charCodeAt(0) + 1)}${fila}`);
  });
  fila++;

  kpis.forEach((kpi, i) => {
    const col = String.fromCharCode(67 + i * 2);
    const cell = ws.getCell(`${col}${fila}`);
    cell.value = kpi.value;
    cell.numFmt = '"S/ "#,##0.00';
    cell.font = { bold: true, size: 16, color: { argb: kpi.color } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bgColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_TABLE;
    ws.mergeCells(`${col}${fila}:${String.fromCharCode(col.charCodeAt(0) + 1)}${fila}`);
  });
  ws.getRow(fila).height = 40;
  fila += 3;

  const tablas: { titulo: string; encabezados: string[]; filas: (string | number)[][] }[] = [
    {
      titulo: 'RESUMEN POR CLIENTE',
      encabezados: ['Cliente', 'Empleados', 'Neto a Pagar'],
      filas: Array.from(porCliente.entries())
        .sort((a, b) => b[1].neto - a[1].neto)
        .map(([cliente, stats]) => [cliente, stats.empleados, stats.neto]),
    },
    {
      titulo: 'RESUMEN AFP vs ONP',
      encabezados: ['Sistema', 'Empleados', 'Total Aportes'],
      filas: Array.from(porPension.entries()).map(([pension, stats]) => [
        pension, stats.empleados, stats.aporte,
      ]),
    },
  ];

  tablas.forEach((tabla, indice) => {
    ws.mergeCells(`B${fila}:G${fila}`);
    ws.getCell(`B${fila}`).value = tabla.titulo;
    ws.getCell(`B${fila}`).font = { bold: true, size: 14, color: { argb: COLORES.HEADER_DARK } };
    fila++;

    tabla.encabezados.forEach((h, i) => {
      const cell = ws.getCell(`${String.fromCharCode(66 + i)}${fila}`);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
      cell.border = BORDER_HEADER;
      cell.alignment = { horizontal: 'center' };
    });
    fila++;

    tabla.filas.forEach((valores, i) => {
      valores.forEach((valor, j) => {
        const cell = ws.getCell(`${String.fromCharCode(66 + j)}${fila}`);
        cell.value = valor;
        cell.border = BORDER_TABLE;
        cell.alignment = { horizontal: j === 0 ? 'left' : j === 1 ? 'center' : 'right' };
        if (j === 2) cell.numFmt = '"S/ "#,##0.00';
        if (i % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
        }
      });
      fila++;
    });

    if (indice < tablas.length - 1) fila += 2;
  });
}

function agregarHojaDetalle(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
): void {
  const ws = workbook.addWorksheet('Planilla Detalle', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 7 }],
    properties: { tabColor: { argb: COLORES.DATOS } },
  });

  ws.mergeCells('B1:K1');
  const titleCell = ws.getCell('B1');
  titleCell.value = cab.empresa
    ? `PLANILLA DE REMUNERACIONES — ${cab.empresa.razon_social}`
    : 'PLANILLA DE REMUNERACIONES';
  Object.assign(titleCell, ESTILOS.titulo);
  ws.getRow(1).height = 30;

  ws.getCell('B2').value = `Período: ${meses[cab.mes - 1]} ${cab.anio}`;
  ws.getCell('B2').font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
  ws.getCell('B3').value = `Fecha de Proceso: ${new Date(cab.fecha_proceso).toLocaleDateString('es-PE')}`;
  ws.getCell('B4').value = `Total Empleados: ${detalles.length}`;
  ws.getCell('F2').value = `Estado: ${cab.estado}`;
  ws.getCell('F2').font = { bold: true };

  CATEGORIAS.forEach((cat) => {
    ws.mergeCells(6, cat.start, 6, cat.end);
    const cell = ws.getCell(6, cat.start);
    cell.value = cat.label;
    Object.assign(cell, cat.style);
  });
  ws.getRow(6).height = 22;

  const headerRow = ws.getRow(7);
  ENCABEZADOS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    Object.assign(cell, estiloEncabezado(i + 1));
  });
  headerRow.height = 35;

  ANCHOS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const totales: number[] = new Array(ENCABEZADOS.length).fill(0);

  detalles.forEach((d, idx) => {
    const row = ws.getRow(idx + 8);
    armarFila(d, idx).forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const numVal = Number(val) || 0;

      if (esColumnaMonetaria(colIdx + 1)) {
        cell.value = numVal;
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        totales[colIdx] += numVal;
      } else if (typeof val === 'number') {
        cell.value = val;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (esColumnaDias(colIdx + 1)) totales[colIdx] += val;
      } else {
        cell.value = val ?? '';
        cell.alignment = { vertical: 'middle' };
      }
      cell.font = { size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
      });
    }
    row.height = 18;
  });

  const totalRow = ws.getRow(detalles.length + 8);
  totalRow.getCell(1).value = 'TOTALES';
  totalRow.getCell(4).value = `${detalles.length} empleados`;

  totales.forEach((total, colIdx) => {
    if (total !== 0) {
      const cell = totalRow.getCell(colIdx + 1);
      const esMonetaria = esColumnaMonetaria(colIdx + 1);
      cell.value = esMonetaria ? redondear2(total) : total;
      if (esMonetaria) cell.numFmt = '#,##0.00';
    }
  });

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1F4E79' } },
      bottom: { style: 'medium', color: { argb: 'FF1F4E79' } },
    };
  });
  totalRow.height = 22;
}

function agregarHojaResumen(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
): void {
  const ws = workbook.addWorksheet('Resumen');

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = 'RESUMEN DE PLANILLA';
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.getRow(1).height = 28;

  ws.getCell('A2').value = `${meses[cab.mes - 1]} ${cab.anio}`;
  ws.getCell('A2').font = { bold: true, size: 14 };

  // Los totales se derivan de los propios detalles: antes se leían por índice
  // de la fila de totales de la otra hoja, un acoplamiento que se desalineaba
  // cada vez que cambiaba el orden de las columnas.
  const datos = [
    { label: 'Total Empleados', value: detalles.length, isMoney: false },
    { label: 'Fecha de Proceso', value: new Date(cab.fecha_proceso).toLocaleDateString('es-PE'), isMoney: false },
    { label: '', value: '', isMoney: false },
    { label: 'RESUMEN FINANCIERO', value: 'MONTO S/', isMoney: false, isHeader: true },
    { label: 'Total Ingresos Brutos', value: sumar(detalles, (d) => d.total_ingresos), isMoney: true },
    { label: 'Total Descuentos', value: sumar(detalles, (d) => d.total_descuentos), isMoney: true },
    { label: 'NETO A PAGAR', value: sumar(detalles, (d) => d.neto_pagar), isMoney: true, isTotal: true },
    { label: '', value: '', isMoney: false },
    { label: 'APORTES DEL EMPLEADOR', value: '', isMoney: false, isHeader: true },
    { label: 'ESSALUD', value: sumar(detalles, (d) => d.essalud), isMoney: true },
    { label: 'SCTR Salud', value: sumar(detalles, (d) => d.sctr_salud_empleador), isMoney: true },
    { label: 'SCTR Pensión', value: sumar(detalles, (d) => d.sctr_pension_empleador), isMoney: true },
    { label: 'Vida Ley', value: sumar(detalles, (d) => d.vida_ley_empleador), isMoney: true },
    { label: 'SENATI', value: sumar(detalles, (d) => d.senati_empleador), isMoney: true },
    { label: 'Total Aportes', value: sumar(detalles, (d) => d.total_aportes_empleador), isMoney: true, isTotal: true },
  ];

  datos.forEach((item, i) => {
    const rowNum = i + 4;
    ws.getCell(`A${rowNum}`).value = item.label;
    if (item.isMoney && typeof item.value === 'number') {
      ws.getCell(`B${rowNum}`).value = item.value;
      ws.getCell(`B${rowNum}`).numFmt = '"S/ "#,##0.00';
    } else {
      ws.getCell(`B${rowNum}`).value = item.value;
    }
    if (item.isHeader) {
      ws.getCell(`A${rowNum}`).font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } };
      ws.getCell(`B${rowNum}`).font = { bold: true, size: 11 };
    }
    if (item.isTotal) {
      ws.getCell(`A${rowNum}`).font = { bold: true };
      ws.getCell(`B${rowNum}`).font = { bold: true };
      ws.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    }
  });

  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 18;
}

/**
 * Exporta la planilla en Excel multi-hoja (Resumen Ejecutivo, Detalle, Resumen,
 * Abono Bancos, AFP-ONP, Alertas y Cuadre Contable). Dispara el download del
 * browser vía blob URL + toast de éxito o error.
 */
export async function exportarPlanillaExcel(id: number): Promise<void> {
  try {
    const data = await api.get<PlanillaExportacion>(`/planillas/${id}/exportar`);
    const cab = data.cabecera;
    const detalles = data.detalles;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Planillas';
    workbook.created = new Date();

    agregarHojaResumenEjecutivo(workbook, cab, detalles);
    agregarHojaDetalle(workbook, cab, detalles);
    agregarHojaResumen(workbook, cab, detalles);
    agregarHojaAbonoBancos(workbook, detalles);
    agregarHojaAfpOnp(workbook, detalles);
    agregarHojaAlertas(workbook, cab, detalles);
    agregarHojaCuadreContable(workbook, cab, detalles);

    await descargarLibro(
      workbook,
      `Planilla_${meses[cab.mes - 1]}_${cab.anio}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );

    toast.success('Excel exportado correctamente');
  } catch (error: unknown) {
    console.error('Error al exportar:', error);
    toast.error(getApiErrorMessage(error, 'Error al exportar'));
  }
}
