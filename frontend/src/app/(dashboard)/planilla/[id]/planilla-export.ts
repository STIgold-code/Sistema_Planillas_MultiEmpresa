'use client';

import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { formatDateSafe } from '@/lib/utils';
import ExcelJS from 'exceljs';
import { meses } from './types';
import { COLORES, BORDER_TABLE, BORDER_HEADER } from './planilla-export-constants';

interface CabeceraExportacion {
  anio: number;
  mes: number;
  estado: string;
  fecha_proceso: string;
  total_bruto: number;
  total_neto: number;
  total_descuentos: number;
}
interface DetalleExportacion {
  documento: string;
  nombres_apellidos: string;
  situacion: string;
  cargo: string;
  cliente: string;
  sede: string;
  banco: string;
  cuenta: string;
  cci: string;
  cuspp: string;
  fecha_ingreso: string;
  fecha_cese: string;
  sistema_pensionario: string;
  nombre_sistema_pensionario: string;
  total_dias: number;
  dias_trabajados: number;
  dias_vacaciones: number;
  turno_dia: number;
  turno_noche: number;
  horas_8: number;
  cant_feriados: number;
  suspension: number;
  faltas: number;
  licencia_con_goce: number;
  licencia_sin_goce: number;
  descanso_medico: number;
  subsidio_incapacidad: number;
  subsidio_maternidad: number;
  rem_basica: number;
  haber_mensual: number;
  sueldo_nocturno: number;
  he_25: number;
  he_25_monto: number;
  he_35: number;
  he_35_monto: number;
  feriado_trabajado: number;
  bonif_nocturna: number;
  asig_familiar_monto: number;
  asig_cliente_monto: number;
  movilidad_monto: number;
  refrigerio_monto: number;
  bono_movilidad: number;
  bono_refrigerio: number;
  bono_productividad: number;
  bono_productividad_monto: number;
  bono_desempeno: number;
  bono_desempeno_monto: number;
  bono_armado: number;
  bono_armado_monto: number;
  bono_referido: number;
  compen_vacacional: number;
  remun_vacacional: number;
  vac: number;
  grat: number;
  gratificacion_monto: number;
  cts: number;
  cts_monto: number;
  descanso_medico_monto: number;
  subsidio_incapacidad_monto: number;
  subsidio_maternidad_monto: number;
  licencia_goce_monto: number;
  reintegro_dias_trab: number;
  reintegro_inafecto: number;
  venta_vacaciones: number;
  afp_aporte: number;
  afp_prima: number;
  afp_comision: number;
  snp_onp: number;
  adelanto_quincena: number;
  adelanto_vacacional: number;
  adelanto_cts: number;
  adelanto_gratificacion: number;
  otros_adelantos: number;
  otros_descuentos: number;
  prestamo: number;
  retencion_judicial: number;
  renta_5ta: number;
  faltas_monto: number;
  tardanzas_monto: number;
  permisos_monto: number;
  dcts_sobregiro: number;
  dcts_reintegro: number;
  rem_afecta: number;
  rem_computable_afp: number;
  bonif_extraordinaria: number;
  neto_pagar: number;
  total_sueldo: number;
  total_ingresos: number;
  total_ingresos_afectos: number;
  total_ingresos_no_afectos: number;
  total_descuentos: number;
  total_descuentos_ley: number;
  total_descuentos_otros: number;
  essalud: number;
  sctr_salud_empleador: number;
  sctr_pension_empleador: number;
  vida_ley_empleador: number;
  total_aportes_empleador: number;
}
interface PlanillaExportacion {
  cabecera: CabeceraExportacion;
  detalles: DetalleExportacion[];
}

/**
 * Exporta la planilla en Excel multi-hoja (Resumen Ejecutivo, Detalle, etc.).
 * Extraido del hook usePlanillaDetalle.ts para que el hook quede por debajo
 * de 400 LOC. El comportamiento es exactamente el mismo: trigger al
 * download del browser via blob URL + toast de exito/error.
 */
export async function exportarPlanillaExcel(id: number): Promise<void> {
    try {
      const data = await api.get<PlanillaExportacion>(`/planillas/${id}/exportar`);
      const cab = data.cabecera;
      const detalles = data.detalles;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema RRHH ERMIR';
      workbook.created = new Date();

      // ========================================
      // CARGAR LOGO
      // ========================================
      let logoImageId: number | null = null;
      try {
        const logoResponse = await fetch('/images/logo-ermir-icon.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBuffer = await logoBlob.arrayBuffer();
          logoImageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
          });
        }
      } catch {
        // Si no se puede cargar el logo, continuar sin él
      }

      // ========================================
      // CALCULAR ESTADÍSTICAS
      // ========================================
      const mesActual = cab.mes;
      const anioActual = cab.anio;
      const primerDiaMes = new Date(anioActual, mesActual - 1, 1);
      const ultimoDiaMes = new Date(anioActual, mesActual, 0);

      const porCliente = new Map<string, { empleados: number; neto: number }>();
      const porSede = new Map<string, { empleados: number; neto: number }>();
      const porPension = new Map<string, { empleados: number; aporte: number }>();
      const cesadosMes: DetalleExportacion[] = [];
      const nuevosMes: DetalleExportacion[] = [];
      const conRetencionJudicial: DetalleExportacion[] = [];
      const conSubsidios: DetalleExportacion[] = [];
      const conFaltas: DetalleExportacion[] = [];

      detalles.forEach((d) => {
        const neto = Number(d.neto_pagar) || 0;
        const cliente = d.cliente || 'Sin Cliente';
        const sede = d.sede || 'Sin Sede';
        const pension = d.sistema_pensionario || 'Sin Pensión';

        if (!porCliente.has(cliente)) porCliente.set(cliente, { empleados: 0, neto: 0 });
        porCliente.get(cliente)!.empleados++;
        porCliente.get(cliente)!.neto += neto;

        if (!porSede.has(sede)) porSede.set(sede, { empleados: 0, neto: 0 });
        porSede.get(sede)!.empleados++;
        porSede.get(sede)!.neto += neto;

        const aporteTotal = (Number(d.afp_aporte) || 0) + (Number(d.afp_prima) || 0) + (Number(d.afp_comision) || 0) + (Number(d.snp_onp) || 0);
        if (!porPension.has(pension)) porPension.set(pension, { empleados: 0, aporte: 0 });
        porPension.get(pension)!.empleados++;
        porPension.get(pension)!.aporte += aporteTotal;

        if (d.fecha_cese) {
          const fechaCese = new Date(d.fecha_cese);
          if (fechaCese >= primerDiaMes && fechaCese <= ultimoDiaMes) {
            cesadosMes.push(d);
          }
        }
        if (d.fecha_ingreso) {
          const fechaIngreso = new Date(d.fecha_ingreso);
          if (fechaIngreso >= primerDiaMes && fechaIngreso <= ultimoDiaMes) {
            nuevosMes.push(d);
          }
        }
        if ((Number(d.retencion_judicial) || 0) > 0) {
          conRetencionJudicial.push(d);
        }
        if ((Number(d.subsidio_incapacidad_monto) || 0) > 0 || (Number(d.subsidio_maternidad_monto) || 0) > 0) {
          conSubsidios.push(d);
        }
        if ((Number(d.faltas) || 0) > 0) {
          conFaltas.push(d);
        }
      });

      // ========================================
      // ESTILOS REUTILIZABLES
      // ========================================
      const styles = {
        titulo: {
          font: { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.PRIMARY } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
        },
        subtitulo: {
          font: { bold: true, size: 11, color: { argb: COLORES.PRIMARY } },
          alignment: { horizontal: 'left' as const },
        },
        headerDatos: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.DATOS } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerDias: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.DIAS } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerEstructura: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.ESTRUCTURA } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerIngresos: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.INGRESOS } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerDescuentos: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.DESCUENTOS } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerTotales: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.TOTALES } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
        headerAportes: {
          font: { bold: true, size: 9, color: { argb: COLORES.TEXT_WHITE } },
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.APORTES } },
          alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
          border: BORDER_HEADER,
        },
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
          fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.PRIMARY } },
          alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
          border: BORDER_HEADER,
          numFmt: '#,##0.00',
        },
        zebraLight: { fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: COLORES.BG_LIGHT } } },
      };

      // ========================================
      // HOJA 1: RESUMEN EJECUTIVO
      // ========================================
      const wsResumen = workbook.addWorksheet('Resumen Ejecutivo', {
        properties: { tabColor: { argb: COLORES.PRIMARY } },
      });

      wsResumen.columns = [
        { width: 12 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 },
      ];

      let resRow = 1;

      if (logoImageId !== null) {
        wsResumen.addImage(logoImageId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 70, height: 70 } });
        wsResumen.getRow(1).height = 35;
        wsResumen.getRow(2).height = 35;
      }

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      const empresaTitulo = wsResumen.getCell(`B${resRow}`);
      empresaTitulo.value = 'ERMIR S.A.C.';
      empresaTitulo.font = { bold: true, size: 18, color: { argb: COLORES.HEADER_DARK } };
      empresaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
      resRow++;

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      wsResumen.getCell(`B${resRow}`).value = 'RUC: 20100123456';
      wsResumen.getCell(`B${resRow}`).font = { size: 11, color: { argb: COLORES.TEXT_GRAY } };
      wsResumen.getCell(`B${resRow}`).alignment = { horizontal: 'center' };
      resRow += 2;

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      const tituloReporte = wsResumen.getCell(`B${resRow}`);
      tituloReporte.value = `REPORTE DE PLANILLA - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
      tituloReporte.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
      tituloReporte.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.PRIMARY } };
      tituloReporte.alignment = { horizontal: 'center', vertical: 'middle' };
      tituloReporte.border = BORDER_HEADER;
      wsResumen.getRow(resRow).height = 35;
      resRow++;

      wsResumen.mergeCells(`B${resRow}:D${resRow}`);
      wsResumen.getCell(`B${resRow}`).value = `Generado: ${new Date().toLocaleDateString('es-PE')}`;
      wsResumen.getCell(`B${resRow}`).font = { size: 10, color: { argb: COLORES.TEXT_GRAY } };

      wsResumen.mergeCells(`E${resRow}:F${resRow}`);
      const estadoCell = wsResumen.getCell(`E${resRow}`);
      estadoCell.value = `Estado: ${cab.estado}`;
      estadoCell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
      estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cab.estado === 'PAGADA' ? COLORES.SUCCESS : COLORES.WARNING } };
      estadoCell.alignment = { horizontal: 'center' };

      wsResumen.getCell(`G${resRow}`).value = `${detalles.length} empleados`;
      wsResumen.getCell(`G${resRow}`).font = { bold: true, size: 10 };
      wsResumen.getCell(`G${resRow}`).alignment = { horizontal: 'right' };
      resRow += 3;

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      wsResumen.getCell(`B${resRow}`).value = 'INDICADORES FINANCIEROS';
      wsResumen.getCell(`B${resRow}`).font = { bold: true, size: 14, color: { argb: COLORES.HEADER_DARK } };
      resRow++;

      const kpis = [
        { label: 'Total Ingresos', value: Number(cab.total_bruto) || 0, color: COLORES.INGRESOS, bgColor: COLORES.BG_SUCCESS },
        { label: 'Total Descuentos', value: Number(cab.total_descuentos) || 0, color: COLORES.DESCUENTOS, bgColor: COLORES.BG_DANGER },
        { label: 'Neto a Pagar', value: Number(cab.total_neto) || 0, color: COLORES.TOTALES, bgColor: 'FFEDE9FE' },
      ];

      kpis.forEach((kpi, i) => {
        const col = String.fromCharCode(67 + i * 2);
        const cell = wsResumen.getCell(`${col}${resRow}`);
        cell.value = kpi.label;
        cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.color } };
        cell.alignment = { horizontal: 'center' };
        cell.border = BORDER_TABLE;
        wsResumen.mergeCells(`${col}${resRow}:${String.fromCharCode(col.charCodeAt(0) + 1)}${resRow}`);
      });
      resRow++;

      kpis.forEach((kpi, i) => {
        const col = String.fromCharCode(67 + i * 2);
        const cell = wsResumen.getCell(`${col}${resRow}`);
        cell.value = kpi.value;
        cell.numFmt = '"S/ "#,##0.00';
        cell.font = { bold: true, size: 16, color: { argb: kpi.color } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bgColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = BORDER_TABLE;
        wsResumen.mergeCells(`${col}${resRow}:${String.fromCharCode(col.charCodeAt(0) + 1)}${resRow}`);
      });
      wsResumen.getRow(resRow).height = 40;
      resRow += 3;

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      wsResumen.getCell(`B${resRow}`).value = 'RESUMEN POR CLIENTE';
      wsResumen.getCell(`B${resRow}`).font = { bold: true, size: 14, color: { argb: COLORES.HEADER_DARK } };
      resRow++;

      ['Cliente', 'Empleados', 'Neto a Pagar'].forEach((h, i) => {
        const col = String.fromCharCode(66 + i);
        const cell = wsResumen.getCell(`${col}${resRow}`);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
        cell.border = BORDER_HEADER;
        cell.alignment = { horizontal: 'center' };
      });
      resRow++;

      let clienteRowIdx = 0;
      Array.from(porCliente.entries()).sort((a, b) => b[1].neto - a[1].neto).forEach(([cliente, stats]) => {
        const isEven = clienteRowIdx % 2 === 0;
        [cliente, stats.empleados, stats.neto].forEach((v, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsResumen.getCell(`${col}${resRow}`);
          cell.value = v;
          cell.border = BORDER_TABLE;
          cell.alignment = { horizontal: i === 0 ? 'left' : (i === 1 ? 'center' : 'right') };
          if (i === 2) cell.numFmt = '"S/ "#,##0.00';
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
        });
        resRow++;
        clienteRowIdx++;
      });
      resRow += 2;

      wsResumen.mergeCells(`B${resRow}:G${resRow}`);
      wsResumen.getCell(`B${resRow}`).value = 'RESUMEN AFP vs ONP';
      wsResumen.getCell(`B${resRow}`).font = { bold: true, size: 14, color: { argb: COLORES.HEADER_DARK } };
      resRow++;

      ['Sistema', 'Empleados', 'Total Aportes'].forEach((h, i) => {
        const col = String.fromCharCode(66 + i);
        const cell = wsResumen.getCell(`${col}${resRow}`);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
        cell.border = BORDER_HEADER;
        cell.alignment = { horizontal: 'center' };
      });
      resRow++;

      let pensionRowIdx = 0;
      Array.from(porPension.entries()).forEach(([pension, stats]) => {
        const isEven = pensionRowIdx % 2 === 0;
        [pension, stats.empleados, stats.aporte].forEach((v, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsResumen.getCell(`${col}${resRow}`);
          cell.value = v;
          cell.border = BORDER_TABLE;
          cell.alignment = { horizontal: i === 0 ? 'left' : (i === 1 ? 'center' : 'right') };
          if (i === 2) cell.numFmt = '"S/ "#,##0.00';
          if (isEven) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
        });
        resRow++;
        pensionRowIdx++;
      });

      // ========================================
      // HOJA 2: PLANILLA DETALLADA
      // ========================================
      const ws = workbook.addWorksheet('Planilla Detalle', {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 7 }],
        properties: { tabColor: { argb: COLORES.DATOS } },
      });

      if (logoImageId !== null) {
        ws.addImage(logoImageId, { tl: { col: 0, row: 0 }, ext: { width: 50, height: 50 } });
      }

      ws.mergeCells('B1:K1');
      const titleCell = ws.getCell('B1');
      titleCell.value = 'PLANILLA DE REMUNERACIONES';
      Object.assign(titleCell, styles.titulo);
      ws.getRow(1).height = 30;

      ws.getCell('B2').value = `Período: ${meses[cab.mes - 1]} ${cab.anio}`;
      ws.getCell('B2').font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
      ws.getCell('B3').value = `Fecha de Proceso: ${new Date(cab.fecha_proceso).toLocaleDateString('es-PE')}`;
      ws.getCell('B4').value = `Total Empleados: ${detalles.length}`;
      ws.getCell('F2').value = `Estado: ${cab.estado}`;
      ws.getCell('F2').font = { bold: true };

      const categorias = [
        { start: 1, end: 12, label: 'DATOS DEL TRABAJADOR', style: styles.headerDatos },
        { start: 13, end: 26, label: 'CONTROL DE DÍAS', style: styles.headerDias },
        { start: 27, end: 39, label: 'ESTRUCTURA SALARIAL', style: styles.headerEstructura },
        { start: 40, end: 50, label: 'INGRESOS AFECTOS', style: styles.headerIngresos },
        { start: 51, end: 65, label: 'INGRESOS NO AFECTOS', style: styles.headerIngresos },
        { start: 66, end: 66, label: 'TOTAL', style: styles.headerIngresos },
        { start: 67, end: 72, label: 'DESC. LEY', style: styles.headerDescuentos },
        { start: 73, end: 86, label: 'OTROS DESC.', style: styles.headerDescuentos },
        { start: 87, end: 88, label: 'TOTALES', style: styles.headerTotales },
        { start: 89, end: 93, label: 'APORTES EMP.', style: styles.headerAportes },
        { start: 94, end: 95, label: 'REM. COMP.', style: styles.headerDatos },
        { start: 96, end: 98, label: 'BANCO', style: styles.headerDatos },
      ];

      categorias.forEach(cat => {
        ws.mergeCells(6, cat.start, 6, cat.end);
        const cell = ws.getCell(6, cat.start);
        cell.value = cat.label;
        Object.assign(cell, cat.style);
      });
      ws.getRow(6).height = 22;

      const headers = [
        'N°', 'SITUACIÓN', 'DNI', 'APELLIDOS Y NOMBRES', 'CLIENTE', 'SEDE', 'CARGO',
        'F. INGRESO', 'F. CESE', 'PENSIÓN', 'AFP/ONP', 'CUSPP',
        'DÍAS MES', 'DÍAS TRAB.', 'T. DÍA', 'T. NOCHE', 'DÍAS 8H', 'FALTAS', 'VAC.',
        'D. MÉD.', 'SUB. INC.', 'SUB. MAT.', 'LIC. S/G', 'LIC. C/G', 'SUSP.', 'FERIADOS',
        'REM. BÁS.', 'B. PROD.', 'B. DESP.', 'B. MOV.', 'B. REF.', 'B. ARM.', 'HE 25%', 'HE 35%',
        'B. NOCT.', 'VAC', 'GRAT', 'CTS', 'TOT. ESTR.',
        'HAB. MENS.', 'S. NOCT.', 'HE 25%', 'HE 35%', 'FERIADO', 'D. MÉD.', 'SUB. INC.',
        'SUB. MAT.', 'ASIG. FAM.', 'LIC. GOCE', 'TOT. AFEC.',
        'REM. VAC.', 'COMP. VAC.', 'CTS', 'GRATIF.', 'BON. EXT.', 'MOVIL.', 'REFRIG.',
        'B. DESP.', 'ASIG. CLI.', 'B. PROD.', 'B. ARM.', 'B. REF.', 'REINT.', 'VTA. VAC.', 'TOT. NO AF.',
        'TOT. ING.',
        'AFP AP.', 'AFP PR.', 'AFP COM.', 'ONP', 'RENTA 5TA', 'TOT. LEY',
        'AD. QUIN.', 'AD. VAC.', 'AD. CTS', 'AD. GRAT.', 'OTR. AD.', 'D. FALTAS', 'D. PERM.', 'D. TARD.',
        'D. SOBR.', 'D. REINT.', 'PRÉST.', 'RET. JUD.', 'OTR. D.', 'TOT. OTR.',
        'TOT. DESC.', 'NETO',
        'ESSALUD', 'SCTR S.', 'SCTR P.', 'VIDA LEY', 'TOT. AP.',
        'REM. AF.', 'REM. COMP.',
        'BANCO', 'N° CTA.', 'CCI',
      ];

      const headerRow = ws.getRow(7);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        if (i < 12) Object.assign(cell, styles.headerDatos);
        else if (i < 26) Object.assign(cell, styles.headerDias);
        else if (i < 39) Object.assign(cell, styles.headerEstructura);
        else if (i < 66) Object.assign(cell, styles.headerIngresos);
        else if (i < 86) Object.assign(cell, styles.headerDescuentos);
        else if (i < 88) Object.assign(cell, styles.headerTotales);
        else if (i < 93) Object.assign(cell, styles.headerAportes);
        else Object.assign(cell, styles.headerDatos);
      });
      headerRow.height = 35;

      const colWidths = [
        5, 8, 10, 32, 18, 15, 15, 10, 10, 6, 12, 14,
        6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6,
        10, 9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 10,
        10, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10,
        9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10,
        10,
        9, 9, 9, 8, 9, 10,
        9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10,
        10, 11,
        9, 9, 9, 9, 10,
        10, 10,
        12, 14, 20,
      ];
      colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      const totales: number[] = new Array(headers.length).fill(0);
      const colsMonetarias = new Set([
        27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
        40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
        67, 68, 69, 70, 71, 72,
        73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
        87, 88,
        89, 90, 91, 92, 93,
        94, 95,
      ]);

      detalles.forEach((d, idx) => {
        const rowNum = idx + 8;
        const rowData = [
          idx + 1, d.situacion, d.documento, d.nombres_apellidos, d.cliente, d.sede, d.cargo,
          d.fecha_ingreso ? formatDateSafe(d.fecha_ingreso) : '', d.fecha_cese ? formatDateSafe(d.fecha_cese) : '',
          d.sistema_pensionario, d.nombre_sistema_pensionario, d.cuspp,
          d.total_dias, d.dias_trabajados, d.turno_dia, d.turno_noche, d.horas_8,
          d.faltas, d.dias_vacaciones, d.descanso_medico, d.subsidio_incapacidad, d.subsidio_maternidad,
          d.licencia_sin_goce, d.licencia_con_goce, d.suspension, d.cant_feriados,
          d.rem_basica, d.bono_productividad, d.bono_desempeno, d.bono_movilidad, d.bono_refrigerio,
          d.bono_armado, d.he_25, d.he_35, d.bonif_nocturna, d.vac, d.grat, d.cts, d.total_sueldo,
          d.haber_mensual, d.sueldo_nocturno, d.he_25_monto, d.he_35_monto, d.feriado_trabajado,
          d.descanso_medico_monto, d.subsidio_incapacidad_monto, d.subsidio_maternidad_monto,
          d.asig_familiar_monto, d.licencia_goce_monto, d.total_ingresos_afectos,
          d.remun_vacacional, d.compen_vacacional, d.cts_monto, d.gratificacion_monto, d.bonif_extraordinaria,
          d.movilidad_monto, d.refrigerio_monto, d.bono_desempeno_monto, d.asig_cliente_monto,
          d.bono_productividad_monto, d.bono_armado_monto, d.bono_referido,
          (d.reintegro_dias_trab || 0) + (d.reintegro_inafecto || 0), d.venta_vacaciones, d.total_ingresos_no_afectos,
          d.total_ingresos,
          d.afp_aporte, d.afp_prima, d.afp_comision, d.snp_onp, d.renta_5ta, d.total_descuentos_ley,
          d.adelanto_quincena, d.adelanto_vacacional, d.adelanto_cts, d.adelanto_gratificacion,
          d.otros_adelantos, d.faltas_monto, d.permisos_monto || 0, d.tardanzas_monto || 0, d.dcts_sobregiro, d.dcts_reintegro,
          d.prestamo, d.retencion_judicial, d.otros_descuentos, d.total_descuentos_otros,
          d.total_descuentos, d.neto_pagar,
          d.essalud, d.sctr_salud_empleador, d.sctr_pension_empleador, d.vida_ley_empleador, d.total_aportes_empleador,
          d.rem_afecta, d.rem_computable_afp,
          d.banco, d.cuenta, d.cci,
        ];

        const row = ws.getRow(rowNum);
        rowData.forEach((val, colIdx) => {
          const cell = row.getCell(colIdx + 1);
          const numVal = Number(val) || 0;

          if (colsMonetarias.has(colIdx + 1)) {
            cell.value = numVal;
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            totales[colIdx] += numVal;
          } else if (typeof val === 'number') {
            cell.value = val;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (colIdx >= 12 && colIdx < 26) totales[colIdx] += val;
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

      const totalRowNum = detalles.length + 8;
      const totalRow = ws.getRow(totalRowNum);
      totalRow.getCell(1).value = 'TOTALES';
      totalRow.getCell(4).value = `${detalles.length} empleados`;

      totales.forEach((total, colIdx) => {
        if (total !== 0) {
          const cell = totalRow.getCell(colIdx + 1);
          cell.value = total;
          if (colsMonetarias.has(colIdx + 1)) {
            cell.numFmt = '#,##0.00';
          }
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

      // ========================================
      // HOJA 3: RESUMEN
      // ========================================
      const wsRes = workbook.addWorksheet('Resumen');

      wsRes.mergeCells('A1:C1');
      wsRes.getCell('A1').value = 'RESUMEN DE PLANILLA';
      wsRes.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      wsRes.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      wsRes.getCell('A1').alignment = { horizontal: 'center' };
      wsRes.getRow(1).height = 28;

      wsRes.getCell('A2').value = `${meses[cab.mes - 1]} ${cab.anio}`;
      wsRes.getCell('A2').font = { bold: true, size: 14 };

      const resData = [
        { label: 'Total Empleados', value: detalles.length, isMoney: false },
        { label: 'Fecha de Proceso', value: new Date(cab.fecha_proceso).toLocaleDateString('es-PE'), isMoney: false },
        { label: '', value: '', isMoney: false },
        { label: 'RESUMEN FINANCIERO', value: 'MONTO S/', isMoney: false, isHeader: true },
        { label: 'Total Ingresos Brutos', value: totales[65] || cab.total_bruto, isMoney: true },
        { label: 'Total Descuentos', value: totales[84] || cab.total_descuentos, isMoney: true },
        { label: 'NETO A PAGAR', value: totales[85] || cab.total_neto, isMoney: true, isTotal: true },
        { label: '', value: '', isMoney: false },
        { label: 'APORTES DEL EMPLEADOR', value: '', isMoney: false, isHeader: true },
        { label: 'ESSALUD (9%)', value: totales[86], isMoney: true },
        { label: 'SCTR Salud', value: totales[87], isMoney: true },
        { label: 'SCTR Pensión', value: totales[88], isMoney: true },
        { label: 'Vida Ley', value: totales[89], isMoney: true },
        { label: 'Total Aportes', value: totales[90], isMoney: true, isTotal: true },
      ];

      resData.forEach((item, i) => {
        const rowNum = i + 4;
        wsRes.getCell(`A${rowNum}`).value = item.label;
        if (item.isMoney && typeof item.value === 'number') {
          wsRes.getCell(`B${rowNum}`).value = item.value;
          wsRes.getCell(`B${rowNum}`).numFmt = '"S/ "#,##0.00';
        } else {
          wsRes.getCell(`B${rowNum}`).value = item.value;
        }
        if (item.isHeader) {
          wsRes.getCell(`A${rowNum}`).font = { bold: true, size: 11, color: { argb: 'FF1F4E79' } };
          wsRes.getCell(`B${rowNum}`).font = { bold: true, size: 11 };
        }
        if (item.isTotal) {
          wsRes.getCell(`A${rowNum}`).font = { bold: true };
          wsRes.getCell(`B${rowNum}`).font = { bold: true };
          wsRes.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
        }
      });

      wsRes.getColumn(1).width = 25;
      wsRes.getColumn(2).width = 18;

      // ========================================
      // HOJA 4: ABONO BANCOS
      // ========================================
      const wsBancos = workbook.addWorksheet('Abono Bancos');

      const bancosHeaders = ['N°', 'DNI', 'APELLIDOS Y NOMBRES', 'BANCO', 'N° CUENTA', 'CCI', 'MONTO'];
      const bancosHeaderRow = wsBancos.getRow(1);
      bancosHeaders.forEach((h, i) => {
        const cell = bancosHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = { bottom: { style: 'medium' } };
      });
      bancosHeaderRow.height = 22;

      let totalAbono = 0;
      detalles.forEach((d, i) => {
        const row = wsBancos.getRow(i + 2);
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

      const bancosTotalRow = wsBancos.getRow(detalles.length + 2);
      bancosTotalRow.getCell(1).value = 'TOTAL';
      bancosTotalRow.getCell(1).font = { bold: true };
      bancosTotalRow.getCell(7).value = totalAbono;
      bancosTotalRow.getCell(7).numFmt = '#,##0.00';
      bancosTotalRow.getCell(7).font = { bold: true };
      bancosTotalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };

      [5, 12, 35, 15, 18, 22, 14].forEach((w, i) => { wsBancos.getColumn(i + 1).width = w; });

      // ========================================
      // HOJA 5: AFP/ONP
      // ========================================
      const wsAFP = workbook.addWorksheet('AFP-ONP');

      const afpHeaders = ['N°', 'DNI', 'APELLIDOS Y NOMBRES', 'CUSPP', 'TIPO', 'NOMBRE', 'REM. ASEG.', 'APORTE', 'PRIMA', 'COM.', 'TOTAL'];
      const afpHeaderRow = wsAFP.getRow(1);
      afpHeaders.forEach((h, i) => {
        const cell = afpHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
        cell.alignment = { horizontal: 'center' };
      });
      afpHeaderRow.height = 22;

      let totalAFP = 0;
      detalles.forEach((d, i) => {
        const row = wsAFP.getRow(i + 2);
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
        row.getCell(7).value = Number(d.rem_computable_afp) || 0;
        row.getCell(8).value = aporte || onp;
        row.getCell(9).value = prima;
        row.getCell(10).value = comision;
        row.getCell(11).value = total;

        [7, 8, 9, 10, 11].forEach(c => { row.getCell(c).numFmt = '#,##0.00'; });

        if (i % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
          });
        }
      });

      const afpTotalRow = wsAFP.getRow(detalles.length + 2);
      afpTotalRow.getCell(1).value = 'TOTAL';
      afpTotalRow.getCell(1).font = { bold: true };
      afpTotalRow.getCell(11).value = totalAFP;
      afpTotalRow.getCell(11).numFmt = '#,##0.00';
      afpTotalRow.getCell(11).font = { bold: true };
      afpTotalRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };

      [5, 10, 30, 14, 6, 16, 11, 11, 10, 10, 11].forEach((w, i) => { wsAFP.getColumn(i + 1).width = w; });

      // ========================================
      // HOJA 6: ALERTAS Y CONTROL
      // ========================================
      const wsAlertas = workbook.addWorksheet('Alertas', {
        properties: { tabColor: { argb: COLORES.DANGER } },
      });

      wsAlertas.columns = [
        { width: 5 }, { width: 6 }, { width: 12 }, { width: 35 }, { width: 18 }, { width: 15 }, { width: 18 },
      ];

      let alertRow = 1;

      wsAlertas.mergeCells(`B${alertRow}:G${alertRow}`);
      const alertTitulo = wsAlertas.getCell(`B${alertRow}`);
      alertTitulo.value = `ALERTAS Y CONTROL - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
      alertTitulo.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
      alertTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.DANGER } };
      alertTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
      alertTitulo.border = BORDER_HEADER;
      wsAlertas.getRow(alertRow).height = 35;
      alertRow += 2;

      wsAlertas.mergeCells(`B${alertRow}:G${alertRow}`);
      wsAlertas.getCell(`B${alertRow}`).value = `EMPLEADOS CESADOS EN EL MES (${cesadosMes.length})`;
      wsAlertas.getCell(`B${alertRow}`).font = { bold: true, size: 12, color: { argb: COLORES.DANGER } };
      wsAlertas.getCell(`B${alertRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_DANGER } };
      alertRow++;

      if (cesadosMes.length === 0) {
        wsAlertas.getCell(`B${alertRow}`).value = '✓ No hay empleados cesados en este período';
        wsAlertas.getCell(`B${alertRow}`).font = { color: { argb: COLORES.SUCCESS } };
        alertRow++;
      } else {
        ['#', 'DNI', 'Nombre', 'Sede', 'F. Cese'].forEach((h, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsAlertas.getCell(`${col}${alertRow}`);
          cell.value = h;
          cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
          cell.border = BORDER_HEADER;
        });
        alertRow++;
        cesadosMes.forEach((d, i) => {
          [i + 1, d.documento, d.nombres_apellidos, d.sede, formatDateSafe(d.fecha_cese)].forEach((v, j) => {
            const col = String.fromCharCode(66 + j);
            const cell = wsAlertas.getCell(`${col}${alertRow}`);
            cell.value = v;
            cell.border = BORDER_TABLE;
            if (i % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
          });
          alertRow++;
        });
      }
      alertRow += 2;

      wsAlertas.mergeCells(`B${alertRow}:G${alertRow}`);
      wsAlertas.getCell(`B${alertRow}`).value = `EMPLEADOS NUEVOS EN EL MES (${nuevosMes.length})`;
      wsAlertas.getCell(`B${alertRow}`).font = { bold: true, size: 12, color: { argb: COLORES.SUCCESS } };
      wsAlertas.getCell(`B${alertRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_SUCCESS } };
      alertRow++;

      if (nuevosMes.length === 0) {
        wsAlertas.getCell(`B${alertRow}`).value = 'No hay empleados nuevos en este período';
        wsAlertas.getCell(`B${alertRow}`).font = { color: { argb: COLORES.TEXT_GRAY } };
        alertRow++;
      } else {
        ['#', 'DNI', 'Nombre', 'Sede', 'F. Ingreso'].forEach((h, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsAlertas.getCell(`${col}${alertRow}`);
          cell.value = h;
          cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
          cell.border = BORDER_HEADER;
        });
        alertRow++;
        nuevosMes.forEach((d, i) => {
          [i + 1, d.documento, d.nombres_apellidos, d.sede, formatDateSafe(d.fecha_ingreso)].forEach((v, j) => {
            const col = String.fromCharCode(66 + j);
            const cell = wsAlertas.getCell(`${col}${alertRow}`);
            cell.value = v;
            cell.border = BORDER_TABLE;
            if (i % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
          });
          alertRow++;
        });
      }
      alertRow += 2;

      wsAlertas.mergeCells(`B${alertRow}:G${alertRow}`);
      wsAlertas.getCell(`B${alertRow}`).value = `CON RETENCIÓN JUDICIAL (${conRetencionJudicial.length})`;
      wsAlertas.getCell(`B${alertRow}`).font = { bold: true, size: 12, color: { argb: COLORES.WARNING } };
      wsAlertas.getCell(`B${alertRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_WARNING } };
      alertRow++;

      if (conRetencionJudicial.length === 0) {
        wsAlertas.getCell(`B${alertRow}`).value = '✓ No hay empleados con retención judicial';
        wsAlertas.getCell(`B${alertRow}`).font = { color: { argb: COLORES.SUCCESS } };
        alertRow++;
      } else {
        ['#', 'DNI', 'Nombre', 'Monto'].forEach((h, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsAlertas.getCell(`${col}${alertRow}`);
          cell.value = h;
          cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
          cell.border = BORDER_HEADER;
        });
        alertRow++;
        conRetencionJudicial.forEach((d, i) => {
          [i + 1, d.documento, d.nombres_apellidos, Number(d.retencion_judicial) || 0].forEach((v, j) => {
            const col = String.fromCharCode(66 + j);
            const cell = wsAlertas.getCell(`${col}${alertRow}`);
            cell.value = v;
            cell.border = BORDER_TABLE;
            if (j === 3) cell.numFmt = '"S/ "#,##0.00';
            if (i % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
          });
          alertRow++;
        });
      }
      alertRow += 2;

      wsAlertas.mergeCells(`B${alertRow}:G${alertRow}`);
      wsAlertas.getCell(`B${alertRow}`).value = `CON FALTAS (${conFaltas.length})`;
      wsAlertas.getCell(`B${alertRow}`).font = { bold: true, size: 12, color: { argb: COLORES.DANGER } };
      wsAlertas.getCell(`B${alertRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_DANGER } };
      alertRow++;

      if (conFaltas.length === 0) {
        wsAlertas.getCell(`B${alertRow}`).value = '✓ No hay empleados con faltas';
        wsAlertas.getCell(`B${alertRow}`).font = { color: { argb: COLORES.SUCCESS } };
      } else {
        ['#', 'DNI', 'Nombre', 'Días Falta', 'Descuento'].forEach((h, i) => {
          const col = String.fromCharCode(66 + i);
          const cell = wsAlertas.getCell(`${col}${alertRow}`);
          cell.value = h;
          cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
          cell.border = BORDER_HEADER;
        });
        alertRow++;
        conFaltas.forEach((d, i) => {
          [i + 1, d.documento, d.nombres_apellidos, d.faltas, Number(d.faltas_monto) || 0].forEach((v, j) => {
            const col = String.fromCharCode(66 + j);
            const cell = wsAlertas.getCell(`${col}${alertRow}`);
            cell.value = v;
            cell.border = BORDER_TABLE;
            if (j === 4) cell.numFmt = '"S/ "#,##0.00';
            if (i % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.BG_LIGHT } };
          });
          alertRow++;
        });
      }

      // ========================================
      // HOJA 7: CUADRE CONTABLE
      // ========================================
      const wsCuadre = workbook.addWorksheet('Cuadre Contable', {
        properties: { tabColor: { argb: COLORES.TOTALES } },
      });

      wsCuadre.columns = [
        { width: 5 }, { width: 40 }, { width: 18 }, { width: 18 },
      ];

      let cuadreRow = 1;

      wsCuadre.mergeCells(`B${cuadreRow}:D${cuadreRow}`);
      const cuadreTitulo = wsCuadre.getCell(`B${cuadreRow}`);
      cuadreTitulo.value = `CUADRE CONTABLE - ${meses[cab.mes - 1].toUpperCase()} ${cab.anio}`;
      cuadreTitulo.font = { bold: true, size: 16, color: { argb: COLORES.TEXT_WHITE } };
      cuadreTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.TOTALES } };
      cuadreTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
      cuadreTitulo.border = BORDER_HEADER;
      wsCuadre.getRow(cuadreRow).height = 35;
      cuadreRow += 2;

      let totalIngresosAfectos = 0;
      let totalIngresosNoAfectos = 0;
      let totalDescuentosLey = 0;
      let totalDescuentosOtros = 0;
      let totalAportesEmp = 0;

      detalles.forEach((d) => {
        totalIngresosAfectos += Number(d.total_ingresos_afectos) || 0;
        totalIngresosNoAfectos += Number(d.total_ingresos_no_afectos) || 0;
        totalDescuentosLey += Number(d.total_descuentos_ley) || 0;
        totalDescuentosOtros += Number(d.total_descuentos_otros) || 0;
        totalAportesEmp += Number(d.total_aportes_empleador) || 0;
      });

      const cuadreData = [
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
        { concepto: 'ESSALUD + SCTR + Vida Ley', subtotal: totalAportesEmp, total: '', color: COLORES.APORTES },
        { concepto: 'TOTAL COSTO EMPRESA', subtotal: '', total: (Number(cab.total_neto) || 0) + totalAportesEmp, isFinal: true },
      ];

      ['Concepto', 'Subtotal', 'Total'].forEach((h, i) => {
        const col = String.fromCharCode(66 + i);
        const cell = wsCuadre.getCell(`${col}${cuadreRow}`);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.HEADER_DARK } };
        cell.border = BORDER_HEADER;
        cell.alignment = { horizontal: 'center' };
      });
      cuadreRow++;

      cuadreData.forEach((item) => {
        const cellConcepto = wsCuadre.getCell(`B${cuadreRow}`);
        const cellSubtotal = wsCuadre.getCell(`C${cuadreRow}`);
        const cellTotal = wsCuadre.getCell(`D${cuadreRow}`);

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

        cuadreRow++;
      });

      // ========================================
      // GUARDAR
      // ========================================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planilla_${meses[cab.mes - 1]}_${cab.anio}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Excel exportado correctamente');
    } catch (error: unknown) {
      console.error('Error al exportar:', error);
      toast.error(getApiErrorMessage(error, 'Error al exportar'));
    }
}
