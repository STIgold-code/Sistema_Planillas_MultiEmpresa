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
  COL,
  ENCABEZADOS,
  armarFila,
  esColumnaDias,
  esColumnaMonetaria,
  estiloEncabezado,
} from './planilla-export-layout';
import {
  COLUMNA_MODALIDAD,
  construirCeldasDerivadas,
  formulaTotalColumna,
  type CeldaDerivada,
  type ContextoFormulas,
} from './planilla-auditable-formulas';
import {
  FORMATO_MONEDA,
  RELLENO_DIVERGENTE,
  RELLENO_FORMULA,
  RELLENO_INSUMO,
  agregarHojaComoSeCalcula,
  agregarHojaParametros,
  relleno,
} from './planilla-auditable-hojas';
import { descargarLibro } from './planilla-export-hojas';
import type {
  CabeceraExportacion,
  DetalleExportacion,
  PlanillaExportacion,
} from './planilla-export-tipos';

/**
 * Exportación AUDITABLE de la planilla: el mismo detalle, pero con cada monto
 * derivado escrito como FÓRMULA de Excel que referencia sus insumos y las tasas
 * de la hoja "Parámetros". El contador puede cambiar una tasa y ver recalcularse
 * toda la planilla, o seguir cualquier importe hasta su origen.
 *
 * Garantía: una fórmula solo se escribe si reproduce el valor que calculó el
 * sistema (`planilla-auditable-formulas.ts`). Si no lo reproduce, la celda queda
 * con el importe de la planilla y marcada en rojo.
 */



/** Columnas que el contador puede editar para simular un escenario. */
function columnasInsumo(): Set<number> {
  const columnas = new Set<number>([
    COL.remBasica,
    COL.renta5ta,
    COL.remAfecta,
    COL.remComputable,
  ]);
  const agregarRango = (desde: number, hasta: number): void => {
    for (let c = desde; c <= hasta; c++) columnas.add(c);
  };
  // Ingresos afectos que no son fórmula (HAB. MENS. sí lo es).
  agregarRango(COL.haberMensual + 1, COL.afectosFin);
  // Ingresos no afectos, salvo BON. EXT. que se deriva de la gratificación.
  agregarRango(COL.noAfectosInicio, COL.noAfectosFin);
  columnas.delete(COL.bonifExtraordinaria);
  // Adelantos, préstamos y descuentos del tareo.
  agregarRango(COL.otrosInicio, COL.otrosFin);
  return columnas;
}

const COLUMNAS_INSUMO = columnasInsumo();


const FILA_ENCABEZADOS = 7;
const PRIMERA_FILA_DATOS = 8;

function pintarLeyenda(ws: ExcelJS.Worksheet, divergentes: number): void {
  const leyenda: [string, string][] = [
    ['Fórmula que reproduce el cálculo del sistema', RELLENO_FORMULA],
    ['Insumo editable (cambialo para simular)', RELLENO_INSUMO],
    ['Valor del sistema: la fórmula no lo reproduce', RELLENO_DIVERGENTE],
  ];
  leyenda.forEach(([texto, color], i) => {
    const cell = ws.getCell(2 + i, 8);
    cell.value = texto;
    cell.fill = relleno(color);
    cell.font = { size: 9 };
    cell.border = BORDER_TABLE;
    ws.mergeCells(2 + i, 8, 2 + i, 12);
  });

  const resumen = ws.getCell(5, 8);
  resumen.value =
    divergentes === 0
      ? 'Todas las celdas derivadas reproducen el importe de la planilla.'
      : `${divergentes} celda(s) no reproducen el importe de la planilla: conservan el valor del sistema y están marcadas en rojo.`;
  resumen.font = {
    size: 9,
    bold: divergentes > 0,
    color: { argb: divergentes === 0 ? COLORES.SUCCESS : COLORES.DANGER },
  };
  ws.mergeCells(5, 8, 5, 20);
}

function agregarHojaFormulas(
  workbook: ExcelJS.Workbook,
  cab: CabeceraExportacion,
  detalles: DetalleExportacion[],
  ctx: ContextoFormulas,
): void {
  const ws = workbook.addWorksheet('Planilla con fórmulas', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: FILA_ENCABEZADOS }],
    properties: { tabColor: { argb: COLORES.INGRESOS } },
  });

  ws.mergeCells('B1:F1');
  const titulo = ws.getCell('B1');
  titulo.value = cab.empresa
    ? `PLANILLA AUDITABLE — ${cab.empresa.razon_social}`
    : 'PLANILLA AUDITABLE';
  Object.assign(titulo, ESTILOS.titulo);
  ws.getRow(1).height = 30;

  ws.getCell('B2').value = `Período: ${meses[cab.mes - 1]} ${cab.anio}`;
  ws.getCell('B2').font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
  ws.getCell('B3').value = `Estado: ${cab.estado}`;
  ws.getCell('B4').value = `Total Empleados: ${detalles.length}`;

  CATEGORIAS.forEach((cat) => {
    ws.mergeCells(6, cat.start, 6, cat.end);
    const cell = ws.getCell(6, cat.start);
    cell.value = cat.label;
    Object.assign(cell, cat.style);
  });
  ws.getCell(6, COLUMNA_MODALIDAD).value = 'AFP';
  Object.assign(ws.getCell(6, COLUMNA_MODALIDAD), ESTILOS.headerDatos);
  ws.getRow(6).height = 22;

  const encabezados = [...ENCABEZADOS, 'MODALIDAD AFP'];
  const headerRow = ws.getRow(FILA_ENCABEZADOS);
  encabezados.forEach((texto, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = texto;
    Object.assign(cell, estiloEncabezado(i + 1));
  });
  headerRow.height = 35;

  [...ANCHOS, 18].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let divergentes = 0;

  detalles.forEach((d, indice) => {
    const numeroFila = PRIMERA_FILA_DATOS + indice;
    const row = ws.getRow(numeroFila);
    const valores = armarFila(d, indice);

    const derivadas = new Map<number, CeldaDerivada>();
    construirCeldasDerivadas(d, indice, numeroFila, ctx).forEach((celda) => {
      derivadas.set(celda.columna, celda);
      if (celda.estado === 'DIVERGENTE') divergentes++;
    });

    valores.forEach((valor, indiceColumna) => {
      const columna = indiceColumna + 1;
      const cell = row.getCell(columna);
      const derivada = derivadas.get(columna);

      if (derivada?.estado === 'FORMULA' && derivada.formula) {
        cell.value = { formula: derivada.formula, result: derivada.valor };
        cell.fill = relleno(RELLENO_FORMULA);
      } else if (derivada?.estado === 'DIVERGENTE') {
        cell.value = derivada.valor;
        cell.fill = relleno(RELLENO_DIVERGENTE);
        cell.note =
          'La fórmula no reproduce este importe: se conserva el valor calculado por el sistema.';
      } else if (esColumnaMonetaria(columna)) {
        cell.value = Number(valor) || 0;
        if (COLUMNAS_INSUMO.has(columna)) cell.fill = relleno(RELLENO_INSUMO);
      } else {
        cell.value = valor ?? '';
      }

      if (esColumnaMonetaria(columna)) {
        cell.numFmt = FORMATO_MONEDA;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (typeof valor === 'number') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { vertical: 'middle' };
      }
      cell.font = { size: 9 };
      cell.border = BORDER_TABLE;
    });

    const modalidad = row.getCell(COLUMNA_MODALIDAD);
    modalidad.value =
      d.sistema_pensionario === 'AFP' ? d.tipo_comision_afp || 'FLUJO' : '';
    modalidad.font = { size: 9 };
    modalidad.alignment = { horizontal: 'center', vertical: 'middle' };
    modalidad.border = BORDER_TABLE;

    row.height = 18;
  });

  const ultimaFilaDatos = PRIMERA_FILA_DATOS + detalles.length - 1;
  const filaTotales = ultimaFilaDatos + 1;
  const totalRow = ws.getRow(filaTotales);
  totalRow.getCell(1).value = 'TOTALES';
  totalRow.getCell(4).value = `${detalles.length} empleados`;

  if (detalles.length > 0) {
    for (let columna = 1; columna <= ENCABEZADOS.length; columna++) {
      if (!esColumnaMonetaria(columna) && !esColumnaDias(columna)) continue;
      const cell = totalRow.getCell(columna);
      cell.value = {
        formula: formulaTotalColumna(columna, PRIMERA_FILA_DATOS, ultimaFilaDatos),
        result: undefined,
      };
      if (esColumnaMonetaria(columna)) cell.numFmt = FORMATO_MONEDA;
    }
  }

  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
    cell.fill = relleno(COLORES.PRIMARY);
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = BORDER_HEADER;
  });
  totalRow.height = 22;

  pintarLeyenda(ws, divergentes);
}


/**
 * Descarga el libro auditable: Parámetros, Planilla con fórmulas y Cómo se
 * calcula.
 */
export async function exportarPlanillaAuditable(id: number): Promise<void> {
  try {
    const data = await api.get<PlanillaExportacion>(`/planillas/${id}/exportar`);
    const { cabecera: cab, detalles, parametros } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Planillas';
    workbook.created = new Date();

    const hojaParametros = agregarHojaParametros(workbook, parametros);

    const ctx: ContextoFormulas = {
      referencias: hojaParametros.referencias,
      valores: hojaParametros.valores,
      comisiones: parametros.comisiones_afp,
      aportaSenati: cab.empresa?.aporta_senati ?? false,
    };

    agregarHojaFormulas(workbook, cab, detalles, ctx);
    agregarHojaComoSeCalcula(workbook);

    await descargarLibro(
      workbook,
      `Planilla_Auditable_${meses[cab.mes - 1]}_${cab.anio}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    );

    toast.success('Excel auditable exportado correctamente');
  } catch (error: unknown) {
    console.error('Error al exportar la planilla auditable:', error);
    toast.error(getApiErrorMessage(error, 'Error al exportar la planilla auditable'));
  }
}
