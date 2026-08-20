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
  type ReferenciasParametros,
} from './planilla-auditable-formulas';
import { CONCEPTOS_DOCUMENTADOS } from './planilla-auditable-documentacion';
import { descargarLibro } from './planilla-export-hojas';
import type {
  CabeceraExportacion,
  DetalleExportacion,
  ParametrosExportacion,
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

const HOJA_PARAMETROS = 'Parámetros';
/** Excel requiere comillas simples al referenciar una hoja con acentos. */
const REF_HOJA = `'${HOJA_PARAMETROS}'`;

const RELLENO_FORMULA = 'FFE8F5E9';
const RELLENO_INSUMO = 'FFFFF3CD';
const RELLENO_DIVERGENTE = 'FFFDD5D5';

const FORMATO_PORCENTAJE = '0.0000%';
const FORMATO_MONEDA = '#,##0.00';

const relleno = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

const ETIQUETAS_ORIGEN: Record<string, string> = {
  PARAMETRO_LEGAL: 'Parámetro legal (nacional)',
  PARAMETRO_EMPRESA: 'Parámetro propio de la empresa',
  REGIMEN_PENSIONARIO: 'Régimen pensionario',
  NO_DISPONIBLE: 'No disponible',
};

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

interface HojaParametros {
  referencias: ReferenciasParametros;
  valores: Record<string, number>;
}

function agregarHojaParametros(
  workbook: ExcelJS.Workbook,
  parametros: ParametrosExportacion,
): HojaParametros {
  const ws = workbook.addWorksheet(HOJA_PARAMETROS, {
    properties: { tabColor: { argb: COLORES.APORTES } },
  });

  ws.columns = [
    { width: 4 }, { width: 46 }, { width: 16 },
    { width: 40 }, { width: 30 }, { width: 16 },
  ];

  let fila = 1;

  ws.mergeCells(`B${fila}:F${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = 'PARÁMETROS USADOS EN EL CÁLCULO';
  Object.assign(titulo, ESTILOS.titulo);
  ws.getRow(fila).height = 30;
  fila++;

  ws.mergeCells(`B${fila}:F${fila}`);
  ws.getCell(`B${fila}`).value = `Vigencia con la que se resolvieron: ${new Date(
    parametros.vigencia,
  ).toLocaleDateString('es-PE')}`;
  ws.getCell(`B${fila}`).font = { size: 11, color: { argb: COLORES.TEXT_GRAY } };
  fila++;

  ws.mergeCells(`B${fila}:F${fila}`);
  ws.getCell(`B${fila}`).value =
    'Las celdas en ámbar son editables: al cambiarlas se recalculan las fórmulas de la hoja "Planilla con fórmulas".';
  ws.getCell(`B${fila}`).font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  fila += 2;

  const escribirEncabezados = (titulos: string[]): void => {
    titulos.forEach((texto, i) => {
      const cell = ws.getCell(fila, 2 + i);
      cell.value = texto;
      cell.font = { bold: true, size: 10, color: { argb: COLORES.TEXT_WHITE } };
      cell.fill = relleno(COLORES.HEADER_DARK);
      cell.border = BORDER_HEADER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    fila++;
  };

  escribirEncabezados(['Parámetro', 'Valor', 'Base legal', 'Origen', 'Vigente desde']);

  const referenciasTasa: Record<string, string> = {};
  const valores: Record<string, number> = {};

  parametros.tasas.forEach((tasa) => {
    const disponible = tasa.origen !== 'NO_DISPONIBLE';
    ws.getCell(fila, 2).value = tasa.etiqueta;

    const celdaValor = ws.getCell(fila, 3);
    celdaValor.value = tasa.valor;
    celdaValor.numFmt =
      tasa.formato === 'PORCENTAJE' ? FORMATO_PORCENTAJE : FORMATO_MONEDA;
    celdaValor.fill = relleno(disponible ? RELLENO_INSUMO : RELLENO_DIVERGENTE);
    celdaValor.alignment = { horizontal: 'right' };

    ws.getCell(fila, 4).value = tasa.base_legal;
    ws.getCell(fila, 5).value = ETIQUETAS_ORIGEN[tasa.origen] ?? tasa.origen;
    ws.getCell(fila, 6).value = tasa.vigente_desde
      ? new Date(tasa.vigente_desde).toLocaleDateString('es-PE')
      : '—';

    for (let c = 2; c <= 6; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }

    // Solo las tasas realmente resueltas se ofrecen como referencia: sin fila
    // vigente no hay valor que citar y la fórmula debe degradar.
    if (disponible) {
      referenciasTasa[tasa.codigo] = `${REF_HOJA}!$C$${fila}`;
      valores[tasa.codigo] = tasa.valor;
    }
    fila++;
  });

  fila += 2;

  ws.mergeCells(`B${fila}:F${fila}`);
  const tituloAfp = ws.getCell(`B${fila}`);
  tituloAfp.value = 'COMISIONES AFP — D.L. 25897 art. 30 · Ley 29903';
  tituloAfp.font = { bold: true, size: 12, color: { argb: COLORES.PRIMARY } };
  fila++;

  escribirEncabezados([
    'Administradora', 'Aporte obligatorio', 'Prima de seguro',
    'Comisión sobre flujo', 'Comisión mixta (flujo)',
  ]);

  // Siempre se escribe al menos una fila: el rango del VLOOKUP tiene que ser
  // sintácticamente válido aunque no haya AFP cargadas.
  const filas = parametros.comisiones_afp.length > 0
    ? parametros.comisiones_afp
    : [{ administradora: '—', aporte: 0, prima: 0, comision_flujo: 0, comision_mixta: 0 }];

  const primeraFilaAfp = fila;
  filas.forEach((afp) => {
    ws.getCell(fila, 2).value = afp.administradora;
    [afp.aporte, afp.prima, afp.comision_flujo, afp.comision_mixta].forEach((valor, i) => {
      const cell = ws.getCell(fila, 3 + i);
      cell.value = valor;
      cell.numFmt = FORMATO_PORCENTAJE;
      cell.fill = relleno(RELLENO_INSUMO);
      cell.alignment = { horizontal: 'right' };
    });
    for (let c = 2; c <= 6; c++) {
      ws.getCell(fila, c).border = BORDER_TABLE;
      ws.getCell(fila, c).font = { size: 10, ...ws.getCell(fila, c).font };
    }
    fila++;
  });

  return {
    referencias: {
      tasa: referenciasTasa,
      rangoAfp: `${REF_HOJA}!$B$${primeraFilaAfp}:$F$${fila - 1}`,
    },
    valores,
  };
}

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

function agregarHojaComoSeCalcula(workbook: ExcelJS.Workbook): void {
  const ws = workbook.addWorksheet('Cómo se calcula', {
    properties: { tabColor: { argb: COLORES.DATOS } },
  });

  ws.columns = [{ width: 4 }, { width: 34 }, { width: 110 }];

  let fila = 1;

  ws.mergeCells(`B${fila}:C${fila}`);
  const titulo = ws.getCell(`B${fila}`);
  titulo.value = 'CÓMO SE CALCULA CADA CONCEPTO';
  Object.assign(titulo, ESTILOS.titulo);
  ws.getRow(fila).height = 30;
  fila++;

  ws.mergeCells(`B${fila}:C${fila}`);
  ws.getCell(`B${fila}`).value =
    'Conceptos que no se reducen a una sola fórmula de celda, con la norma que los sustenta.';
  ws.getCell(`B${fila}`).font = { size: 10, italic: true, color: { argb: COLORES.TEXT_GRAY } };
  fila += 2;

  CONCEPTOS_DOCUMENTADOS.forEach((concepto) => {
    ws.mergeCells(`B${fila}:C${fila}`);
    const encabezado = ws.getCell(`B${fila}`);
    encabezado.value = concepto.concepto.toUpperCase();
    encabezado.font = { bold: true, size: 12, color: { argb: COLORES.TEXT_WHITE } };
    encabezado.fill = relleno(COLORES.PRIMARY);
    encabezado.border = BORDER_HEADER;
    ws.getRow(fila).height = 22;
    fila++;

    ws.getCell(`B${fila}`).value = 'Base legal';
    ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
    ws.getCell(`C${fila}`).value = concepto.base_legal;
    ws.getCell(`C${fila}`).font = { size: 10, color: { argb: COLORES.PRIMARY } };
    fila++;

    ws.getCell(`B${fila}`).value = 'En una línea';
    ws.getCell(`B${fila}`).font = { bold: true, size: 10 };
    ws.getCell(`C${fila}`).value = concepto.resumen;
    ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(`C${fila}`).font = { size: 10 };
    fila++;

    concepto.pasos.forEach((paso) => {
      ws.getCell(`B${fila}`).value = paso.titulo;
      ws.getCell(`B${fila}`).font = { size: 10 };
      ws.getCell(`B${fila}`).alignment = { wrapText: true, vertical: 'top' };
      ws.getCell(`C${fila}`).value = paso.detalle;
      ws.getCell(`C${fila}`).font = { size: 10 };
      ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(fila).height = 32;
      fila++;
    });

    if (concepto.nota) {
      ws.getCell(`B${fila}`).value = 'Nota';
      ws.getCell(`B${fila}`).font = { bold: true, size: 10, color: { argb: COLORES.WARNING } };
      ws.getCell(`C${fila}`).value = concepto.nota;
      ws.getCell(`C${fila}`).font = { size: 10, italic: true };
      ws.getCell(`C${fila}`).alignment = { wrapText: true, vertical: 'top' };
      fila++;
    }

    fila++;
  });
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
