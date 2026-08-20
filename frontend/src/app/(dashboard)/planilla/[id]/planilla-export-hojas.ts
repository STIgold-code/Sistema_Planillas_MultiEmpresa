import ExcelJS from 'exceljs';
import { formatDateSafe } from '@/lib/utils';
import { meses } from './types';
import { COLORES, BORDER_TABLE, BORDER_HEADER } from './planilla-export-constants';
import type { CabeceraExportacion, DetalleExportacion } from './planilla-export-tipos';

/**
 * Hojas complementarias del Excel de planilla (bancos, AFP/ONP, alertas y
 * cuadre contable). Extraidas de planilla-export.ts para que ese archivo
 * quede por debajo del limite de 1.000 lineas del proyecto.
 */

function escribirEncabezados(
  ws: ExcelJS.Worksheet,
  fila: number,
  titulos: string[],
  columnaInicial = 'B',
): void {
  const base = columnaInicial.charCodeAt(0);
  titulos.forEach((titulo, i) => {
    const cell = ws.getCell(`${String.fromCharCode(base + i)}${fila}`);
    cell.value = titulo;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
    cell.border = BORDER_HEADER;
    cell.alignment = { horizontal: 'center' };
  });
}

/** Hoja para el archivo de abono masivo del banco. */
export function agregarHojaAbonoBancos(
  workbook: ExcelJS.Workbook,
  detalles: DetalleExportacion[],
): void {
  const ws = workbook.addWorksheet('Abono Bancos');

  const headers = ['N°', 'DNI', 'APELLIDOS Y NOMBRES', 'BANCO', 'N° CUENTA', 'CCI', 'MONTO'];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'medium' } };
  });
  headerRow.height = 22;

  let totalAbono = 0;
  detalles.forEach((d, i) => {
    const row = ws.getRow(i + 2);
    const neto = Number(d.neto_pagar) || 0;
    totalAbono += neto;

    row.getCell(1).value = i + 1;
    row.getCell(2).value = d.documento;
    row.getCell(3).value = d.nombres_apellidos;
    row.getCell(4).value = d.banco || '';
    row.getCell(5).value = d.cuenta || '';
    row.getCell(6).value = d.cci || '';
    row.getCell(7).value = neto;
    row.getCell(7).numFmt = '#,##0.00';

    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
    }
  });

  const totalRow = ws.getRow(detalles.length + 2);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(7).value = totalAbono;
  totalRow.getCell(7).numFmt = '#,##0.00';
  totalRow.getCell(7).font = { bold: true };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

  [5, 12, 35, 15, 18, 22, 14].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

/** Hoja de aportes al sistema pensionario, para la declaracion AFPnet / PLAME. */
export function agregarHojaAfpOnp(
  workbook: ExcelJS.Workbook,
  detalles: DetalleExportacion[],
): void {
  const ws = workbook.addWorksheet('AFP-ONP');

  const headers = [
    'N°', 'DNI', 'APELLIDOS Y NOMBRES', 'CUSPP', 'TIPO', 'NOMBRE', 'MODALIDAD',
    'REM. ASEG.', 'APORTE', 'PRIMA', 'COM.', 'TOTAL',
  ];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    cell.alignment = { horizontal: 'center' };
  });
  headerRow.height = 22;

  let totalAFP = 0;
  detalles.forEach((d, i) => {
    const row = ws.getRow(i + 2);
    const aporte = Number(d.afp_aporte) || 0;
    const prima = Number(d.afp_prima) || 0;
    const comision = Number(d.afp_comision) || 0;
    const onp = Number(d.snp_onp) || 0;
    const total = aporte + prima + comision + onp;
    totalAFP += total;

    row.getCell(1).value = i + 1;
    row.getCell(2).value = d.documento;
    row.getCell(3).value = d.nombres_apellidos;
    row.getCell(4).value = d.cuspp || '';
    row.getCell(5).value = d.sistema_pensionario || '';
    row.getCell(6).value = d.nombre_sistema_pensionario || '';
    // Modalidad con la que se retuvo la comision; vacia = no declarada, en
    // cuyo caso el motor aplico la comision sobre flujo.
    row.getCell(7).value =
      d.sistema_pensionario === 'AFP' ? d.tipo_comision_afp || 'FLUJO (por defecto)' : '';
    row.getCell(8).value = Number(d.rem_computable_afp) || 0;
    row.getCell(9).value = aporte || onp;
    row.getCell(10).value = prima;
    row.getCell(11).value = comision;
    row.getCell(12).value = total;

    [8, 9, 10, 11, 12].forEach((c) => {
      row.getCell(c).numFmt = '#,##0.00';
    });

    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
    }
  });

  const totalRow = ws.getRow(detalles.length + 2);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(12).value = totalAFP;
  totalRow.getCell(12).numFmt = '#,##0.00';
  totalRow.getCell(12).font = { bold: true };
  totalRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

  [5, 10, 30, 14, 6, 16, 20, 11, 11, 10, 10, 11].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

interface SeccionAlerta {
  titulo: string;
  color: string;
  fondo: string;
  filas: DetalleExportacion[];
  vacio: string;
  encabezados: string[];
  celdas: (d: DetalleExportacion, i: number) => (string | number)[];
  /** Indice (0-based) de la columna con formato moneda, si la hay. */
  columnaMoneda?: number;
}

/** Hoja con los casos que el contador debe revisar antes de aprobar. */
export function agregarHojaAlertas(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
): void {
  const primerDiaMes = new Date(cab.anio, cab.mes - 1, 1);
  const ultimoDiaMes = new Date(cab.anio, cab.mes, 0);

  const enElMes = (fecha: string): boolean => {
    if (!fecha) return false;
    const valor = new Date(fecha);
    return valor >= primerDiaMes && valor <= ultimoDiaMes;
  };

  const cesadosMes = detalles.filter((d) => enElMes(d.fecha_cese));
  const nuevosMes = detalles.filter((d) => enElMes(d.fecha_ingreso));
  const conRetencionJudicial = detalles.filter((d) => (Number(d.retencion_judicial) || 0) > 0);
  const conFaltas = detalles.filter((d) => (Number(d.faltas) || 0) > 0);

  const ws = workbook.addWorksheet('Alertas', {
    properties: { tabColor: { argb: COLORES.DANGER } },
  });

  ws.columns = [
    { width: 5 }, { width: 6 }, { width: 12 }, { width: 35 },
    { width: 18 }, { width: 15 }, { width: 18 },
  ];

  let fila = 1;

  ws.mergeCells(`B${fila}:G${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = `ALERTAS Y CONTROL - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
  titulo.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.DANGER } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  titulo.border = BORDER_HEADER;
  ws.getRow(fila).height = 35;
  fila += 2;

  const secciones: SeccionAlerta[] = [
    {
      titulo: `EMPLEADOS CESADOS EN EL MES (${cesadosMes.length})`,
      color: COLORES.DANGER,
      fondo: COLORES.BG_DANGER,
      filas: cesadosMes,
      vacio: '✓ No hay empleados cesados en este período',
      encabezados: ['#', 'DNI', 'Nombre', 'Sede', 'F. Cese'],
      celdas: (d, i) => [i + 1, d.documento, d.nombres_apellidos, d.sede, formatDateSafe(d.fecha_cese)],
    },
    {
      titulo: `EMPLEADOS NUEVOS EN EL MES (${nuevosMes.length})`,
      color: COLORES.SUCCESS,
      fondo: COLORES.BG_SUCCESS,
      filas: nuevosMes,
      vacio: 'No hay empleados nuevos en este período',
      encabezados: ['#', 'DNI', 'Nombre', 'Sede', 'F. Ingreso'],
      celdas: (d, i) => [i + 1, d.documento, d.nombres_apellidos, d.sede, formatDateSafe(d.fecha_ingreso)],
    },
    {
      titulo: `CON RETENCIÓN JUDICIAL (${conRetencionJudicial.length})`,
      color: COLORES.WARNING,
      fondo: COLORES.BG_WARNING,
      filas: conRetencionJudicial,
      vacio: '✓ No hay empleados con retención judicial',
      encabezados: ['#', 'DNI', 'Nombre', 'Monto'],
      celdas: (d, i) => [i + 1, d.documento, d.nombres_apellidos, Number(d.retencion_judicial) || 0],
      columnaMoneda: 3,
    },
    {
      titulo: `CON FALTAS (${conFaltas.length})`,
      color: COLORES.DANGER,
      fondo: COLORES.BG_DANGER,
      filas: conFaltas,
      vacio: '✓ No hay empleados con faltas',
      encabezados: ['#', 'DNI', 'Nombre', 'Días Falta', 'Descuento'],
      celdas: (d, i) => [i + 1, d.documento, d.nombres_apellidos, d.faltas, Number(d.faltas_monto) || 0],
      columnaMoneda: 4,
    },
  ];

  secciones.forEach((seccion, indice) => {
    ws.mergeCells(`B${fila}:G${fila}`);
    const cabecera = ws.getCell(`B${fila}`);
    cabecera.value = seccion.titulo;
    cabecera.font = { bold: true, size: 12, color: { argb: seccion.color } };
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: seccion.fondo } };
    fila++;

    if (seccion.filas.length === 0) {
      const vacio = ws.getCell(`B${fila}`);
      vacio.value = seccion.vacio;
      vacio.font = { color: { argb: seccion.vacio.startsWith('✓') ? COLORES.SUCCESS : COLORES.TEXT_GRAY } };
      fila++;
    } else {
      escribirEncabezados(ws, fila, seccion.encabezados);
      fila++;
      seccion.filas.forEach((d, i) => {
        seccion.celdas(d, i).forEach((valor, j) => {
          const cell = ws.getCell(`${String.fromCharCode(66 + j)}${fila}`);
          cell.value = valor;
          cell.border = BORDER_TABLE;
          if (seccion.columnaMoneda === j) cell.numFmt = '"S/ "#,##0.00';
          if (i % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
          }
        });
        fila++;
      });
    }

    if (indice < secciones.length - 1) fila += 2;
  });
}

interface FilaCuadre {
  concepto: string;
  subtotal: number | '';
  total: number | '';
  isHeader?: boolean;
  isSubtotal?: boolean;
  isFinal?: boolean;
  color?: string;
}

/** Hoja de cuadre contable: ingresos, descuentos, neto y costo empresa. */
export function agregarHojaCuadreContable(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
): void {
  const ws = workbook.addWorksheet('Cuadre Contable', {
    properties: { tabColor: { argb: COLORES.TOTALES } },
  });

  ws.columns = [{ width: 5 }, { width: 40 }, { width: 18 }, { width: 18 }];

  let fila = 1;

  ws.mergeCells(`B${fila}:D${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = `CUADRE CONTABLE - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
  titulo.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.TOTALES } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  titulo.border = BORDER_HEADER;
  ws.getRow(fila).height = 35;
  fila += 2;

  // Redondeo a 2 decimales: los importes ya vienen redondeados, así que el
  // acumulado no debe arrastrar ruido de punto flotante.
  const sumar = (selector: (d: DetalleExportacion) => number): number =>
    Math.round(
      (detalles.reduce((acc, d) => acc + (Number(selector(d)) || 0), 0) +
        Number.EPSILON) *
        100,
    ) / 100;

  const totalIngresosAfectos = sumar((d) => d.total_ingresos_afectos);
  const totalIngresosNoAfectos = sumar((d) => d.total_ingresos_no_afectos);
  const totalDescuentosLey = sumar((d) => d.total_descuentos_ley);
  const totalDescuentosOtros = sumar((d) => d.total_descuentos_otros);
  const totalAportesEmp = sumar((d) => d.total_aportes_empleador);

  const filasCuadre: FilaCuadre[] = [
    { concepto: 'INGRESOS', subtotal: '', total: '', isHeader: true },
    { concepto: 'Ingresos Afectos (Remuneraciones)', subtotal: totalIngresosAfectos, total: '', color: COLORES.INGRESOS },
    { concepto: 'Ingresos No Afectos (Beneficios)', subtotal: totalIngresosNoAfectos, total: '', color: COLORES.INGRESOS },
    { concepto: 'TOTAL INGRESOS', subtotal: '', total: totalIngresosAfectos + totalIngresosNoAfectos, isSubtotal: true },
    { concepto: '', subtotal: '', total: '' },
    { concepto: 'DESCUENTOS', subtotal: '', total: '', isHeader: true },
    { concepto: 'Descuentos de Ley (AFP/ONP, 5ta)', subtotal: totalDescuentosLey, total: '', color: COLORES.DESCUENTOS },
    { concepto: 'Otros Descuentos (Adelantos, Préstamos)', subtotal: totalDescuentosOtros, total: '', color: COLORES.DESCUENTOS },
    { concepto: 'TOTAL DESCUENTOS', subtotal: '', total: totalDescuentosLey + totalDescuentosOtros, isSubtotal: true },
    { concepto: '', subtotal: '', total: '' },
    { concepto: 'NETO A PAGAR', subtotal: '', total: Number(cab.total_neto) || 0, isFinal: true },
    { concepto: '', subtotal: '', total: '' },
    { concepto: 'APORTES DEL EMPLEADOR', subtotal: '', total: '', isHeader: true },
    { concepto: 'ESSALUD + SCTR + Vida Ley + SENATI', subtotal: totalAportesEmp, total: '', color: COLORES.APORTES },
    { concepto: 'TOTAL COSTO EMPRESA', subtotal: '', total: (Number(cab.total_neto) || 0) + totalAportesEmp, isFinal: true },
  ];

  escribirEncabezados(ws, fila, ['Concepto', 'Subtotal', 'Total']);
  fila++;

  filasCuadre.forEach((item) => {
    const cellConcepto = ws.getCell(`B${fila}`);
    const cellSubtotal = ws.getCell(`C${fila}`);
    const cellTotal = ws.getCell(`D${fila}`);

    cellConcepto.value = item.concepto;
    cellSubtotal.value = item.subtotal || '';
    cellTotal.value = item.total || '';

    cellConcepto.border = BORDER_TABLE;
    cellSubtotal.border = BORDER_TABLE;
    cellTotal.border = BORDER_TABLE;

    if (typeof item.subtotal === 'number') cellSubtotal.numFmt = '"S/ "#,##0.00';
    if (typeof item.total === 'number') cellTotal.numFmt = '"S/ "#,##0.00';

    if (item.isHeader) {
      cellConcepto.font = { bold: true, size: 11, color: { argb: COLORES.PRIMARY } };
    }
    if (item.isSubtotal) {
      cellConcepto.font = { bold: true };
      cellTotal.font = { bold: true };
      cellTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
    }
    if (item.isFinal) {
      cellConcepto.font = { bold: true, size: 12, color: { argb: COLORES.TEXT_WHITE } };
      cellTotal.font = { bold: true, size: 12, color: { argb: COLORES.TEXT_WHITE } };
      cellConcepto.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.PRIMARY } };
      cellTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.PRIMARY } };
      cellSubtotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.PRIMARY } };
    }
    if (item.color && typeof item.subtotal === 'number') {
      cellSubtotal.font = { color: { argb: item.color } };
    }

    fila++;
  });
}

/** Descarga el libro generado disparando el download del browser. */
export async function descargarLibro(
  workbook: ExcelJS.Workbook,
  nombreArchivo: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
