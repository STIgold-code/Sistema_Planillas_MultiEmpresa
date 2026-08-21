'use client';

import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import ExcelJS from 'exceljs';
import { meses } from './types';
import { BORDER_HEADER, BORDER_TABLE, COLORES } from './planilla-export-constants';
import { ESTILOS } from './planilla-export-estilos';
import {
  FORMATO_MONEDA,
  RELLENO_DIVERGENTE,
  RELLENO_FORMULA,
  agregarHojaComoSeCalcula,
  agregarHojaParametros,
  relleno,
} from './planilla-auditable-hojas';
import { descargarLibro } from './planilla-export-hojas';
import { construirHojaTrabajador, type ContextoTrabajador } from './planilla-trabajador-conceptos';
import { nombreHoja, renderizarHojaTrabajador } from './planilla-trabajador-hoja';
import type { PlanillaExportacionTrabajadores } from './planilla-export-tipos';

/**
 * Exportación POR TRABAJADOR: una hoja por persona donde cada sol del neto se
 * sigue hasta el día del tareo, la tasa legal, el préstamo o la planilla
 * anterior que lo originó. Es la vista que pide un inspector o un gerente:
 * "¿por qué esta persona cobró lo que cobró?".
 *
 * Libro: Parámetros · Índice · una hoja por trabajador · Cómo se calcula.
 * Comparte con el export auditable la hoja de parámetros, la leyenda de colores
 * y la regla de oro: fórmula solo si reproduce al sistema.
 */

interface FilaIndice {
  nombreHoja: string;
  nombre: string;
  documento: string;
  netoSistema: number;
  filaNeto: number;
  divergentes: number;
}

function agregarHojaIndice(workbook: ExcelJS.Workbook, titulo: string, filas: FilaIndice[]): void {
  const ws = workbook.addWorksheet('Índice', {
    properties: { tabColor: { argb: COLORES.DATOS } },
    views: [{ state: 'frozen', ySplit: 6 }],
  });
  ws.columns = [
    { width: 5 }, { width: 44 }, { width: 14 }, { width: 16 },
    { width: 16 }, { width: 12 }, { width: 14 }, { width: 60 },
  ];

  ws.mergeCells('A1:H1');
  const celdaTitulo = ws.getCell('A1');
  celdaTitulo.value = titulo;
  Object.assign(celdaTitulo, ESTILOS.titulo);
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value =
    'Cada trabajador tiene su hoja. Hacé clic en el nombre para abrirla. La columna "Diferencia" compara el neto reconstruido con fórmulas contra el que calculó el sistema: debe ser 0.00.';
  ws.getCell('A2').font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  ws.getRow(2).height = 28;

  const leyenda: [string, string][] = [
    ['Fórmula que reproduce el cálculo del sistema', RELLENO_FORMULA],
    ['Valor del sistema: la fórmula no lo reproduce', RELLENO_DIVERGENTE],
  ];
  leyenda.forEach(([texto, color], i) => {
    const cell = ws.getCell(3 + i, 2);
    cell.value = texto;
    cell.fill = relleno(color);
    cell.font = { size: 9 };
    cell.border = BORDER_TABLE;
  });

  const encabezados = ['N°', 'Trabajador', 'Documento', 'Neto (sistema)', 'Neto (fórmulas)', 'Diferencia', 'Celdas en rojo', 'Lectura'];
  encabezados.forEach((texto, i) => {
    const cell = ws.getCell(6, i + 1);
    cell.value = texto;
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = relleno(COLORES.HEADER_DARK);
    cell.border = BORDER_HEADER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  filas.forEach((f, i) => {
    const fila = 7 + i;
    const refHoja = `'${f.nombreHoja.replace(/'/g, "''")}'`;
    ws.getCell(fila, 1).value = i + 1;
    const enlace = ws.getCell(fila, 2);
    enlace.value = { text: f.nombre, hyperlink: `#${refHoja}!A1` };
    enlace.font = { size: 10, underline: true, color: { argb: COLORES.DATOS } };
    ws.getCell(fila, 3).value = f.documento;
    ws.getCell(fila, 4).value = f.netoSistema;
    ws.getCell(fila, 5).value = { formula: `${refHoja}!$E$${f.filaNeto}` };
    ws.getCell(fila, 6).value = { formula: `ROUND(E${fila}-D${fila},2)` };
    ws.getCell(fila, 7).value = f.divergentes;
    ws.getCell(fila, 8).value =
      f.divergentes === 0
        ? 'Todos los importes se reconstruyen con fórmulas.'
        : `${f.divergentes} importe(s) conservan el valor del sistema: revisar la hoja.`;
    [4, 5, 6].forEach((c) => {
      ws.getCell(fila, c).numFmt = FORMATO_MONEDA;
      ws.getCell(fila, c).alignment = { horizontal: 'right' };
    });
    ws.getCell(fila, 5).fill = relleno(RELLENO_FORMULA);
    if (f.divergentes > 0) ws.getCell(fila, 7).fill = relleno(RELLENO_DIVERGENTE);
    for (let c = 1; c <= 8; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }
  });

  const filaTotal = 7 + filas.length;
  ws.getCell(filaTotal, 2).value = 'TOTAL';
  ws.getCell(filaTotal, 4).value = { formula: `SUM(D7:D${filaTotal - 1})` };
  ws.getCell(filaTotal, 5).value = { formula: `SUM(E7:E${filaTotal - 1})` };
  ws.getCell(filaTotal, 6).value = { formula: `ROUND(E${filaTotal}-D${filaTotal},2)` };
  ws.getCell(filaTotal, 7).value = { formula: `SUM(G7:G${filaTotal - 1})` };
  for (let c = 1; c <= 8; c++) {
    const cell = ws.getCell(filaTotal, c);
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = relleno(COLORES.PRIMARY);
    cell.border = BORDER_HEADER;
    if (c >= 4 && c <= 6) cell.numFmt = FORMATO_MONEDA;
  }

  ws.addConditionalFormatting({
    ref: `F7:F${filaTotal}`,
    rules: [
      {
        type: 'expression',
        formulae: ['AND(ISNUMBER($F7),$F7<>0)'],
        priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: RELLENO_DIVERGENTE } } },
      },
    ],
  });
}

export async function exportarPlanillaPorTrabajador(id: number): Promise<void> {
  try {
    const data = await api.get<PlanillaExportacionTrabajadores>(`/planillas/${id}/exportar-trabajadores`);
    const { cabecera: cab, detalles, parametros, periodo, trazabilidad } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Planillas';
    workbook.created = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const hojaParametros = agregarHojaParametros(workbook, parametros);
    const ctx: ContextoTrabajador = {
      cabecera: cab,
      periodo,
      referencias: hojaParametros.referencias,
      valores: hojaParametros.valores,
      comisiones: parametros.comisiones_afp,
      escalaIr: hojaParametros.escalaIr,
      tramos: parametros.tramos_ir ?? [],
      deduccionUit: parametros.deduccion_uit,
      aportaSenati: cab.empresa?.aporta_senati ?? false,
    };

    const porDocumento = new Map(trazabilidad.map((t) => [t.documento, t]));
    const indice: FilaIndice[] = [];
    const hojas = detalles.map((d, i) => {
      const traza = porDocumento.get(d.documento) ?? {
        empleado_id: 0,
        documento: d.documento,
        domiciliado: true,
        dias_permiso: 0,
        minutos_tardanza: 0,
        tareo: [],
        renta: { acumulado_previo: 0, retenciones_previas: 0 },
        prestamos: [],
        historial: [],
      };
      const hoja = construirHojaTrabajador(d, traza, ctx);
      const nombre = nombreHoja(i, d.nombres_apellidos);
      indice.push({
        nombreHoja: nombre,
        nombre: d.nombres_apellidos,
        documento: d.documento,
        netoSistema: d.neto_pagar,
        filaNeto: hoja.filaNeto,
        divergentes: hoja.divergentes,
      });
      return { nombre, hoja };
    });

    const titulo = cab.empresa
      ? `PLANILLA POR TRABAJADOR — ${cab.empresa.razon_social} — ${meses[cab.mes - 1]} ${cab.anio}`
      : `PLANILLA POR TRABAJADOR — ${meses[cab.mes - 1]} ${cab.anio}`;
    // Los modelos ya están construidos (son puros): el índice se agrega antes
    // de renderizar las hojas para quedar segundo, después de Parámetros.
    agregarHojaIndice(workbook, titulo, indice);
    hojas.forEach(({ nombre, hoja }) => {
      renderizarHojaTrabajador(
        workbook,
        nombre,
        hoja.constructor.filas,
        hoja.divergentes,
        hoja.constructor.filasConDiferencia,
      );
    });
    agregarHojaComoSeCalcula(workbook);

    await descargarLibro(
      workbook,
      `Planilla_Por_Trabajador_${meses[cab.mes - 1]}_${cab.anio}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );

    const conDivergencias = indice.filter((f) => f.divergentes > 0).length;
    if (conDivergencias === 0) {
      toast.success(`Excel por trabajador exportado: ${detalles.length} hojas, todas cierran con el sistema`);
    } else {
      toast.warning(`Excel exportado. ${conDivergencias} trabajador(es) tienen importes que la fórmula no reproduce: están en rojo.`);
    }
  } catch (error: unknown) {
    console.error('Error al exportar la planilla por trabajador:', error);
    toast.error(getApiErrorMessage(error, 'Error al exportar la planilla por trabajador'));
  }
}
