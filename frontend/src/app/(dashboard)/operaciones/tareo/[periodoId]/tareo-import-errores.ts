'use client';

import ExcelJS from 'exceljs';
// meses inline para evitar dep circular

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
/**
 * Descarga un Excel con el detalle de errores de importacion de tareo.
 * Extraido de useTareoDetalle.ts para mantener el hook por debajo de 700 LOC.
 *
 * Genera 2 hojas:
 *   - Resumen: cantidad por tipo de error + instrucciones + codigos validos
 *   - Detalle de Errores: una fila por error con sugerencia de correccion
 */
export async function descargarErroresImportacionExcel(params: {
  importPreview: null | { errores: Array<{ tipo: string; fila: number; columna?: string; empleado?: string; dia?: number | null; valor?: string; mensaje?: string }> };
  importFile?: { name: string } | null;
  periodo?: { mes: number; anio: number };
}): Promise<void> {
  const { importPreview, importFile, periodo } = params;
  if (!importPreview?.errores || importPreview.errores.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RRHH-Ermir';
  workbook.created = new Date();

  const mesNombre = meses[periodo?.mes ? periodo.mes - 1 : 0];
  const anio = periodo?.anio || new Date().getFullYear();
  const fechaHora = new Date().toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const conteoErrores = importPreview.errores.reduce((acc, err) => {
    acc[err.tipo] = (acc[err.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

    // ── Hoja 1: Resumen ────────────────────────────────────────────────────────
    const sheetResumen = workbook.addWorksheet('Resumen', {
      properties: { tabColor: { argb: 'FF3B82F6' } },
    });
    sheetResumen.columns = [{ width: 5 }, { width: 25 }, { width: 40 }, { width: 5 }];

    sheetResumen.mergeCells('B2:C2');
    const titulo = sheetResumen.getCell('B2');
    titulo.value = 'ERMIR - Reporte de Errores de Importación';
    titulo.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };
    titulo.alignment = { horizontal: 'center' };

    sheetResumen.getCell('B4').value = 'Archivo importado:';
    sheetResumen.getCell('C4').value = importFile?.name || 'archivo.xlsx';
    sheetResumen.getCell('B5').value = 'Fecha de importación:';
    sheetResumen.getCell('C5').value = fechaHora;
    sheetResumen.getCell('B6').value = 'Período:';
    sheetResumen.getCell('C6').value = `${mesNombre} ${anio}`;
    ['B4', 'B5', 'B6'].forEach(cell => {
      sheetResumen.getCell(cell).font = { bold: true, color: { argb: 'FF6B7280' } };
    });
    ['C4', 'C5', 'C6'].forEach(cell => {
      sheetResumen.getCell(cell).font = { color: { argb: 'FF111827' } };
    });

    sheetResumen.mergeCells('B8:C8');
    const tituloResumen = sheetResumen.getCell('B8');
    tituloResumen.value = '📊 RESUMEN DE ERRORES';
    tituloResumen.font = { size: 12, bold: true, color: { argb: 'FF1E40AF' } };
    tituloResumen.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    tituloResumen.alignment = { horizontal: 'center' };

    let filaResumen = 9;
    sheetResumen.getCell(`B${filaResumen}`).value = 'Total de errores:';
    sheetResumen.getCell(`C${filaResumen}`).value = importPreview.errores.length;
    sheetResumen.getCell(`C${filaResumen}`).font = { bold: true, size: 14, color: { argb: 'FFDC2626' } };
    filaResumen++;

    const tiposErrorConfig: Record<string, { nombre: string; color: string }> = {
      'DNI_NO_ENCONTRADO': { nombre: 'DNIs no encontrados', color: 'FFFBBF24' },
      'CODIGO_NO_RECONOCIDO': { nombre: 'Códigos inválidos', color: 'FFF97316' },
      'DIA_FUERA_CONTRATO': { nombre: 'Días fuera de contrato', color: 'FF3B82F6' },
      'DNI_INVALIDO': { nombre: 'DNIs inválidos', color: 'FFEF4444' },
      'CELDA_VACIA': { nombre: 'Celdas vacías', color: 'FF9CA3AF' },
    };

    Object.entries(conteoErrores).forEach(([tipo, cantidad]) => {
      const config = tiposErrorConfig[tipo] || { nombre: tipo, color: 'FF9CA3AF' };
      sheetResumen.getCell(`B${filaResumen}`).value = `   ${config.nombre}:`;
      sheetResumen.getCell(`C${filaResumen}`).value = cantidad;
      sheetResumen.getCell(`B${filaResumen}`).font = { color: { argb: 'FF6B7280' } };
      filaResumen++;
    });

    filaResumen += 2;
    sheetResumen.mergeCells(`B${filaResumen}:C${filaResumen}`);
    const tituloCorregir = sheetResumen.getCell(`B${filaResumen}`);
    tituloCorregir.value = '💡 CÓMO CORREGIR LOS ERRORES';
    tituloCorregir.font = { size: 12, bold: true, color: { argb: 'FF059669' } };
    tituloCorregir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    tituloCorregir.alignment = { horizontal: 'center' };
    filaResumen++;

    const instrucciones = [
      '1. Ve a la hoja "Detalle de Errores" para ver cada error',
      '2. Abre tu archivo Excel original',
      '3. Busca la fila y columna indicada en cada error',
      '4. Corrige el valor según la sugerencia',
      '5. Guarda el archivo y vuelve a importar',
    ];
    instrucciones.forEach(instruccion => {
      sheetResumen.mergeCells(`B${filaResumen}:C${filaResumen}`);
      sheetResumen.getCell(`B${filaResumen}`).value = instruccion;
      sheetResumen.getCell(`B${filaResumen}`).font = { color: { argb: 'FF374151' } };
      filaResumen++;
    });

    filaResumen += 2;
    sheetResumen.mergeCells(`B${filaResumen}:C${filaResumen}`);
    const tituloCodigos = sheetResumen.getCell(`B${filaResumen}`);
    tituloCodigos.value = '📋 CÓDIGOS DE MARCACIÓN VÁLIDOS';
    tituloCodigos.font = { size: 12, bold: true, color: { argb: 'FF7C3AED' } };
    tituloCodigos.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } };
    tituloCodigos.alignment = { horizontal: 'center' };
    filaResumen++;

    const codigosValidos = [
      { codigo: 'T', descripcion: 'Trabajado (día laborado)' },
      { codigo: 'D', descripcion: 'Descanso semanal' },
      { codigo: 'F', descripcion: 'Falta injustificada' },
      { codigo: 'V', descripcion: 'Vacaciones' },
      { codigo: 'DM', descripcion: 'Descanso médico / Subsidio' },
      { codigo: 'LSG', descripcion: 'Licencia sin goce de haber' },
      { codigo: 'FT', descripcion: 'Feriado trabajado' },
      { codigo: 'DT', descripcion: 'Descanso trabajado (domingo/sábado)' },
    ];

    codigosValidos.forEach(item => {
      sheetResumen.getCell(`B${filaResumen}`).value = item.codigo;
      sheetResumen.getCell(`B${filaResumen}`).font = { bold: true, name: 'Consolas', color: { argb: 'FF7C3AED' } };
      sheetResumen.getCell(`B${filaResumen}`).alignment = { horizontal: 'center' };
      sheetResumen.getCell(`C${filaResumen}`).value = item.descripcion;
      sheetResumen.getCell(`C${filaResumen}`).font = { color: { argb: 'FF6B7280' } };
      filaResumen++;
    });

    // ── Hoja 2: Detalle de Errores ─────────────────────────────────────────────
    const sheetDetalle = workbook.addWorksheet('Detalle de Errores', {
      properties: { tabColor: { argb: 'FFEF4444' } },
    });

    sheetDetalle.columns = [
      { header: 'Fila Excel', key: 'fila', width: 10 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Día', key: 'dia', width: 8 },
      { header: 'Valor Ingresado', key: 'valor', width: 15 },
      { header: '¿Qué pasó?', key: 'problema', width: 45 },
      { header: 'Cómo solucionarlo', key: 'solucion', width: 45 },
    ];

    const headerRow = sheetDetalle.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 30;

    const mensajesError: Record<string, { problema: string; solucion: string; color: string }> = {
      'DNI_NO_ENCONTRADO': {
        problema: 'Este DNI no está registrado en el sistema como empleado activo.',
        solucion: 'Verifica que el DNI esté correcto. Si es un empleado nuevo, regístralo primero en el sistema.',
        color: 'FFFEF3C7',
      },
      'CODIGO_NO_RECONOCIDO': {
        problema: 'El código de marcación ingresado no es válido.',
        solucion: 'Usa uno de los códigos válidos: T, D, F, V, DM, LSG, FT, DT. Revisa la hoja "Resumen" para ver todos los códigos.',
        color: 'FFFED7AA',
      },
      'DIA_FUERA_CONTRATO': {
        problema: 'El empleado no tiene contrato vigente para este día.',
        solucion: 'Verifica las fechas del contrato del empleado. Solo puedes marcar días dentro del período de contrato.',
        color: 'FFDBEAFE',
      },
      'DNI_INVALIDO': {
        problema: 'El formato del DNI no es válido (debe tener 8 dígitos numéricos).',
        solucion: 'Corrige el DNI para que tenga exactamente 8 números sin espacios ni caracteres especiales.',
        color: 'FFFEE2E2',
      },
      'CELDA_VACIA': {
        problema: 'La celda está vacía o tiene un valor no reconocido.',
        solucion: 'Ingresa un código de marcación válido o déjala vacía si no deseas modificar ese día.',
        color: 'FFF3F4F6',
      },
    };

    importPreview.errores.forEach((err) => {
      const config = mensajesError[err.tipo] || {
        problema: err.mensaje,
        solucion: 'Revisa el valor ingresado.',
        color: 'FFF3F4F6',
      };

      let dni = '-';
      if (err.tipo === 'DNI_NO_ENCONTRADO' || err.tipo === 'DNI_INVALIDO') {
        dni = err.valor || '-';
      } else if (err.empleado) {
        const match = err.empleado.match(/\d{8}/);
        if (match) dni = match[0];
      }

      const row = sheetDetalle.addRow({
        fila: err.fila,
        dni,
        empleado: err.empleado || '(no encontrado)',
        dia: err.dia || '-',
        valor: err.valor || '(vacío)',
        problema: config.problema,
        solucion: config.solucion,
      });

      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: config.color } };
      row.getCell('fila').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('dni').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('dni').font = { name: 'Consolas' };
      row.getCell('dia').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('valor').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('valor').font = { name: 'Consolas', bold: true };
      row.getCell('problema').alignment = { wrapText: true, vertical: 'middle' };
      row.getCell('solucion').alignment = { wrapText: true, vertical: 'middle' };
      row.height = 45;
    });

    sheetDetalle.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    sheetDetalle.autoFilter = { from: 'A1', to: `G${importPreview.errores.length + 1}` };
    sheetDetalle.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Errores_Importacion_${mesNombre}_${anio}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
