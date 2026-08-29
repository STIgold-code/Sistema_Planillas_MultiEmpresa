/**
 * Genera el formato imprimible "Cronograma de descuento de prestamo".
 *
 * El documento se adjunta al convenio firmado por el trabajador y se archiva en
 * `prestamos_archivos`. Las formulas replican las reglas del motor de planilla:
 *  - cuota efectiva = MIN(cuota_mensual, saldo)  -> dominio/descuentos-prestamos.ts
 *  - el adelanto de gratificacion solo descuenta en julio y diciembre (Ley 27735)
 *
 * Uso: node tools/generar-formato-cronograma-prestamo.js
 */
const path = require('path');
const ExcelJS = require(
  path.join(__dirname, '..', 'backend', 'node_modules', 'exceljs'),
);

const SALIDA = path.join(
  __dirname,
  '..',
  'docs',
  'formatos',
  'cronograma-prestamo.xlsx',
);

const AZUL = 'FF1F3864';
const AZUL_CLARO = 'FFD9E2F3';
const GRIS_LABEL = 'FFF2F2F2';
const AMARILLO_ENTRADA = 'FFFFF9E6';
const GRIS_FORMULA = 'FFEDEDED';
const BORDE_GRIS = 'FFBFBFBF';

const TIPO_GRATIFICACION = 'ADELANTO DE GRATIFICACIÓN';
const TIPOS = ['PRÉSTAMO', 'ADELANTO DE SUELDO', TIPO_GRATIFICACION];
const MODALIDADES = [
  'Transferencia bancaria',
  'Depósito en cuenta',
  'Cheque',
  'Efectivo',
];
const ESTADOS = [
  'PENDIENTE',
  'DESCONTADA',
  'DIFERIDA',
  'CONDONADA',
  'CANCELADA',
];
const REGIMENES = [
  'General (D.L. 728)',
  'Pequeña empresa (REMYPE)',
  'Microempresa (REMYPE)',
  'Agrario (Ley 31110)',
  'Construcción civil',
  'Trabajadoras del hogar (Ley 31047)',
];

const FILA_TABLA = 21;
const PRIMERA_CUOTA = 22;
const MAX_CUOTAS = 24;
const ULTIMA_CUOTA = PRIMERA_CUOTA + MAX_CUOTAS - 1;
const FILA_TOTALES = ULTIMA_CUOTA + 1;

const borde = {
  top: { style: 'thin', color: { argb: BORDE_GRIS } },
  left: { style: 'thin', color: { argb: BORDE_GRIS } },
  bottom: { style: 'thin', color: { argb: BORDE_GRIS } },
  right: { style: 'thin', color: { argb: BORDE_GRIS } },
};

const relleno = (argb) => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

function seccion(ws, fila, texto) {
  ws.mergeCells(fila, 1, fila, 9);
  const celda = ws.getCell(fila, 1);
  celda.value = texto;
  celda.font = { bold: true, size: 11, color: { argb: AZUL } };
  celda.fill = relleno(AZUL_CLARO);
  celda.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(fila).height = 20;
  for (let col = 1; col <= 9; col += 1) ws.getCell(fila, col).border = borde;
}

/** Escribe un par etiqueta + celda de captura. `col` es la columna de la etiqueta. */
function campo(ws, fila, col, etiqueta, opciones = {}) {
  const {
    formula,
    valor,
    formato,
    lista,
    ancho = 3,
    requerido = false,
  } = opciones;

  const etq = ws.getCell(fila, col);
  etq.value = requerido ? etiqueta + ' *' : etiqueta;
  etq.font = { bold: true, size: 9 };
  etq.fill = relleno(GRIS_LABEL);
  etq.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
  etq.border = borde;

  const desde = col + 1;
  const hasta = col + ancho;
  ws.mergeCells(fila, desde, fila, hasta);
  const val = ws.getCell(fila, desde);

  if (formula) {
    val.value = { formula };
    val.fill = relleno(GRIS_FORMULA);
    val.font = { size: 9, italic: true, color: { argb: 'FF595959' } };
  } else {
    if (valor !== undefined) val.value = valor;
    val.fill = relleno(AMARILLO_ENTRADA);
    val.font = { size: 9 };
  }
  if (formato) val.numFmt = formato;
  val.alignment = { vertical: 'middle', indent: 1 };
  for (let c = desde; c <= hasta; c += 1) ws.getCell(fila, c).border = borde;

  if (lista) {
    val.dataValidation = {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      formulae: ['"' + lista.join(',') + '"'],
      error: 'Selecciona un valor de la lista.',
    };
  }
  return val;
}

/** @param {object|null} datos Valores de ejemplo; `null` deja la plantilla en blanco. */
function construirHoja(ws, datos) {
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: FILA_TABLA }];
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
  [6, 22, 14, 12, 13, 13, 13, 14, 26].forEach((ancho, i) => {
    ws.getColumn(i + 1).width = ancho;
  });

  // --- Encabezado ---
  ws.mergeCells(1, 1, 1, 9);
  const titulo = ws.getCell(1, 1);
  titulo.value = 'CRONOGRAMA DE DESCUENTO DE PRÉSTAMO / ADELANTO';
  titulo.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titulo.fill = relleno(AZUL);
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, 9);
  const sub = ws.getCell(2, 1);
  sub.value =
    'Anexo del convenio de descuento en planilla — autorización escrita del trabajador';
  sub.font = { size: 9, italic: true, color: { argb: 'FF595959' } };
  sub.alignment = { horizontal: 'center' };
  ws.getRow(3).height = 6;

  // --- 1. Identificacion ---
  seccion(ws, 4, '1. IDENTIFICACIÓN');
  campo(ws, 5, 1, 'Empresa (razón social)', {
    valor: datos && datos.empresa,
    requerido: true,
  });
  campo(ws, 5, 6, 'RUC', { valor: datos && datos.ruc, requerido: true });
  campo(ws, 6, 1, 'Domicilio fiscal', { valor: datos && datos.domicilio });
  campo(ws, 6, 6, 'N.° de documento', {
    valor: datos && datos.correlativo,
    requerido: true,
  });
  campo(ws, 7, 1, 'Trabajador (apellidos y nombres)', {
    valor: datos && datos.trabajador,
    requerido: true,
  });
  campo(ws, 7, 6, 'Tipo y N.° de documento', {
    valor: datos && datos.documento,
    requerido: true,
  });
  campo(ws, 8, 1, 'Cargo', { valor: datos && datos.cargo });
  campo(ws, 8, 6, 'Fecha de ingreso', {
    valor: datos && datos.fechaIngreso,
    formato: 'dd/mm/yyyy',
  });
  campo(ws, 9, 1, 'Área / centro de costo', { valor: datos && datos.area });
  campo(ws, 9, 6, 'Régimen laboral', {
    valor: datos && datos.regimen,
    lista: REGIMENES,
  });
  campo(ws, 10, 1, 'Remuneración mensual (S/)', {
    valor: datos && datos.remuneracion,
    formato: '#,##0.00',
    requerido: true,
  });
  campo(ws, 10, 6, 'Neto promedio referencial (S/)', {
    valor: datos && datos.neto,
    formato: '#,##0.00',
  });
  ws.getRow(11).height = 6;

  // --- 2. Condiciones ---
  seccion(ws, 12, '2. CONDICIONES DEL PRÉSTAMO');
  campo(ws, 13, 1, 'Tipo', {
    valor: datos && datos.tipo,
    lista: TIPOS,
    requerido: true,
  });
  campo(ws, 13, 6, 'Fecha de otorgamiento', {
    valor: datos && datos.fechaOtorgado,
    formato: 'dd/mm/yyyy',
    requerido: true,
  });
  campo(ws, 14, 1, 'Monto otorgado (S/)', {
    valor: datos && datos.monto,
    formato: '#,##0.00',
    requerido: true,
  });
  campo(ws, 14, 6, 'Modalidad de entrega', {
    valor: datos && datos.modalidad,
    lista: MODALIDADES,
  });
  campo(ws, 15, 1, 'Número de cuotas', {
    valor: datos && datos.cuotas,
    formato: '0',
    requerido: true,
  });
  campo(ws, 15, 6, 'N.° de operación / cheque', {
    valor: datos && datos.operacion,
  });
  campo(ws, 16, 1, 'Cuota mensual (S/)', {
    formula: 'IF(N(B15)>0,ROUND(B14/B15,2),0)',
    formato: '#,##0.00',
  });
  campo(ws, 16, 6, 'Banco y cuenta de abono', { valor: datos && datos.banco });
  campo(ws, 17, 1, 'Primer período de descuento', {
    valor: datos && datos.primerPeriodo,
    formato: 'mmmm yyyy',
    requerido: true,
  });
  campo(ws, 17, 6, 'Último período (calculado)', {
    formula:
      'IFERROR(LOOKUP(2,1/($E$' +
      PRIMERA_CUOTA +
      ':$E$' +
      ULTIMA_CUOTA +
      '>0),$C$' +
      PRIMERA_CUOTA +
      ':$C$' +
      ULTIMA_CUOTA +
      '),"")',
    formato: 'mmmm yyyy',
  });
  campo(ws, 18, 1, 'Incidencia de la cuota sobre la remuneración', {
    formula: 'IF(N(B10)>0,B16/B10,"")',
    formato: '0.0%',
  });
  campo(ws, 18, 6, 'Motivo del préstamo', { valor: datos && datos.motivo });
  ws.getRow(19).height = 6;

  // --- 3. Cronograma ---
  seccion(ws, 20, '3. CRONOGRAMA DE DESCUENTO');
  const encabezados = [
    'N.°',
    'Período (AAAA-MM)',
    'Fecha de descuento',
    'Saldo inicial',
    'Cuota',
    'Saldo final',
    'Planilla',
    'Estado',
    'Observación',
  ];
  encabezados.forEach((texto, i) => {
    const celda = ws.getCell(FILA_TABLA, i + 1);
    celda.value = texto;
    celda.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    celda.fill = relleno(AZUL);
    celda.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    celda.border = borde;
  });
  ws.getRow(FILA_TABLA).height = 26;

  for (let fila = PRIMERA_CUOTA; fila <= ULTIMA_CUOTA; fila += 1) {
    const esPrimera = fila === PRIMERA_CUOTA;
    const previa = fila - 1;

    ws.getCell(fila, 1).value = {
      formula:
        'IF(ROW()-' +
        FILA_TABLA +
        '<=N($B$15),ROW()-' +
        FILA_TABLA +
        ',"")',
    };

    // El adelanto de gratificacion salta a julio/diciembre; el resto es mensual.
    ws.getCell(fila, 3).value = {
      formula: esPrimera
        ? 'IF($A' + fila + '="","",EOMONTH($B$17,0))'
        : 'IF($A' +
          fila +
          '="","",IF($B$13="' +
          TIPO_GRATIFICACION +
          '",IF(MONTH($C' +
          previa +
          ')=7,EOMONTH($C' +
          previa +
          ',5),EOMONTH($C' +
          previa +
          ',7)),EOMONTH($C' +
          previa +
          ',1)))',
    };
    ws.getCell(fila, 2).value = {
      formula: 'IF($C' + fila + '="","",TEXT($C' + fila + ',"yyyy-mm"))',
    };
    ws.getCell(fila, 4).value = {
      formula: esPrimera
        ? 'IF($A' + fila + '="","",$B$14)'
        : 'IF($A' + fila + '="","",$F' + previa + ')',
    };
    // Replica cuotaEfectiva(): la cuota nunca excede el saldo. La ultima cuota
    // programada ademas absorbe el residuo del redondeo (1000/3 = 333.33 x 3
    // dejaria 0.01 colgado), para que el total siempre cuadre con lo otorgado.
    ws.getCell(fila, 5).value = {
      formula:
        'IF($A' +
        fila +
        '="","",IF($A' +
        fila +
        '=N($B$15),ROUND(N($D' +
        fila +
        '),2),ROUND(MIN($B$16,N($D' +
        fila +
        ')),2)))',
    };
    ws.getCell(fila, 6).value = {
      formula:
        'IF($A' +
        fila +
        '="","",ROUND(N($D' +
        fila +
        ')-N($E' +
        fila +
        '),2))',
    };
    ws.getCell(fila, 8).value = {
      formula: 'IF($A' + fila + '="","","PENDIENTE")',
    };

    for (let col = 1; col <= 9; col += 1) {
      const celda = ws.getCell(fila, col);
      celda.border = borde;
      celda.font = { size: 9 };
      if (col === 1 || col === 2 || col === 8) {
        celda.alignment = { horizontal: 'center' };
      }
      if (col === 3) celda.numFmt = 'dd/mm/yyyy';
      if (col >= 4 && col <= 6) celda.numFmt = '#,##0.00';
      // Las columnas Planilla y Observacion las llena el usuario al descontar.
      celda.fill = relleno(
        col === 7 || col === 9 ? AMARILLO_ENTRADA : GRIS_FORMULA,
      );
    }
    ws.getCell(fila, 8).dataValidation = {
      type: 'list',
      allowBlank: true,
      showErrorMessage: true,
      formulae: ['"' + ESTADOS.join(',') + '"'],
    };
    ws.getRow(fila).height = 15;
  }

  // --- Totales ---
  ws.mergeCells(FILA_TOTALES, 1, FILA_TOTALES, 4);
  const etqTotal = ws.getCell(FILA_TOTALES, 1);
  etqTotal.value = 'TOTAL PROGRAMADO';
  etqTotal.alignment = { horizontal: 'right', indent: 1, vertical: 'middle' };

  const total = ws.getCell(FILA_TOTALES, 5);
  total.value = {
    formula:
      'ROUND(SUM(E' + PRIMERA_CUOTA + ':E' + ULTIMA_CUOTA + '),2)',
  };
  total.numFmt = '#,##0.00';

  const saldo = ws.getCell(FILA_TOTALES, 6);
  saldo.value = {
    formula:
      'IFERROR(LOOKUP(2,1/($F$' +
      PRIMERA_CUOTA +
      ':$F$' +
      ULTIMA_CUOTA +
      '<>""),$F$' +
      PRIMERA_CUOTA +
      ':$F$' +
      ULTIMA_CUOTA +
      '),0)',
  };
  saldo.numFmt = '#,##0.00';

  ws.mergeCells(FILA_TOTALES, 7, FILA_TOTALES, 9);
  const cuadre = ws.getCell(FILA_TOTALES, 7);
  cuadre.value = {
    formula:
      'IF(ROUND(E' +
      FILA_TOTALES +
      '-N(B14),2)=0,"Cuadra con el monto otorgado","REVISAR: el total no cuadra")',
  };
  cuadre.alignment = { horizontal: 'center', vertical: 'middle' };

  for (let col = 1; col <= 9; col += 1) {
    const celda = ws.getCell(FILA_TOTALES, col);
    celda.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    celda.fill = relleno(AZUL);
    celda.border = borde;
  }
  ws.getRow(FILA_TOTALES).height = 20;

  // --- 4. Autorizacion ---
  const filaAut = FILA_TOTALES + 2;
  seccion(ws, filaAut, '4. AUTORIZACIÓN DE DESCUENTO');
  ws.mergeCells(filaAut + 1, 1, filaAut + 1, 9);
  const texto = ws.getCell(filaAut + 1, 1);
  texto.value =
    'El trabajador declara haber recibido el monto otorgado y autoriza de forma expresa a la empresa a descontar de su ' +
    'remuneración mensual la cuota indicada en este cronograma, hasta la cancelación total de la deuda. Asimismo, autoriza ' +
    'que, en caso de cese por cualquier causa, el saldo pendiente se descuente de su liquidación de beneficios sociales. ' +
    'Cualquier modificación del monto, del número de cuotas o del calendario de descuento requiere un nuevo cronograma ' +
    'firmado por ambas partes. Este documento forma parte del convenio de préstamo y se archiva en el legajo del trabajador.';
  texto.font = { size: 9 };
  texto.alignment = { wrapText: true, vertical: 'top' };
  texto.border = borde;
  ws.getRow(filaAut + 1).height = 62;

  const filaFirma = filaAut + 3;
  const firmas = [
    {
      desde: 1,
      hasta: 3,
      titulo: 'EL TRABAJADOR',
      detalle: 'Firma:\n\nNombre:\nDNI / CE:\nHuella digital:',
    },
    {
      desde: 4,
      hasta: 6,
      titulo: 'EL EMPLEADOR',
      detalle: 'Firma:\n\nNombre:\nCargo:\nRepresentante legal',
    },
    {
      desde: 7,
      hasta: 9,
      titulo: 'LUGAR Y FECHA',
      detalle: 'Lugar:\n\nFecha:',
    },
  ];
  firmas.forEach((firma) => {
    ws.mergeCells(filaFirma, firma.desde, filaFirma, firma.hasta);
    const cab = ws.getCell(filaFirma, firma.desde);
    cab.value = firma.titulo;
    cab.font = { bold: true, size: 9 };
    cab.alignment = { horizontal: 'center', vertical: 'middle' };
    cab.fill = relleno(GRIS_LABEL);
    cab.border = borde;

    ws.mergeCells(filaFirma + 1, firma.desde, filaFirma + 1, firma.hasta);
    const cuerpo = ws.getCell(filaFirma + 1, firma.desde);
    cuerpo.value = firma.detalle;
    cuerpo.font = { size: 8, color: { argb: 'FF595959' } };
    cuerpo.alignment = { wrapText: true, vertical: 'top', indent: 1 };
    cuerpo.border = borde;
  });
  ws.getRow(filaFirma + 1).height = 78;

  // --- Leyenda ---
  const filaLeyenda = filaFirma + 3;
  ws.getCell(filaLeyenda, 1).value = 'Leyenda:';
  ws.getCell(filaLeyenda, 1).font = { bold: true, size: 8 };
  ws.getCell(filaLeyenda, 2).value = 'Celda amarilla = la llenas tú';
  ws.getCell(filaLeyenda, 2).fill = relleno(AMARILLO_ENTRADA);
  ws.getCell(filaLeyenda, 2).font = { size: 8 };
  ws.mergeCells(filaLeyenda, 4, filaLeyenda, 6);
  ws.getCell(filaLeyenda, 4).value =
    'Celda gris = se calcula sola, no la edites';
  ws.getCell(filaLeyenda, 4).fill = relleno(GRIS_FORMULA);
  ws.getCell(filaLeyenda, 4).font = { size: 8 };
  ws.getCell(filaLeyenda + 1, 1).value =
    '(*) Campo obligatorio. Sin él, el cronograma no se calcula.';
  ws.getCell(filaLeyenda + 1, 1).font = {
    size: 8,
    italic: true,
    color: { argb: 'FF595959' },
  };

  ws.pageSetup.printArea = 'A1:I' + (filaLeyenda + 1);
}

function construirInstructivo(ws) {
  ws.views = [{ showGridLines: false }];
  [4, 30, 26, 62].forEach((ancho, i) => {
    ws.getColumn(i + 1).width = ancho;
  });

  ws.mergeCells(1, 1, 1, 4);
  const titulo = ws.getCell(1, 1);
  titulo.value = 'INSTRUCTIVO — Cronograma de descuento de préstamo';
  titulo.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titulo.fill = relleno(AZUL);
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  let fila = 3;

  const bloque = (texto) => {
    ws.mergeCells(fila, 1, fila, 4);
    const celda = ws.getCell(fila, 1);
    celda.value = texto;
    celda.font = { bold: true, size: 10, color: { argb: AZUL } };
    celda.fill = relleno(AZUL_CLARO);
    celda.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(fila).height = 18;
    fila += 1;
  };

  const filaTabla = (a, b, c, encabezado = false) => {
    const celdas = [
      { col: 2, valor: a },
      { col: 3, valor: b },
      { col: 4, valor: c },
    ];
    celdas.forEach(({ col, valor }) => {
      const celda = ws.getCell(fila, col);
      celda.value = valor;
      celda.font = {
        size: 9,
        bold: encabezado || col === 2,
        color: {
          argb: !encabezado && col === 3 ? 'FF1F6F3D' : 'FF000000',
        },
      };
      celda.alignment = { wrapText: true, vertical: 'top' };
      celda.border = borde;
      if (encabezado) celda.fill = relleno(GRIS_LABEL);
    });
    ws.getRow(fila).height = encabezado ? 18 : 30;
    fila += 1;
  };

  bloque('Cómo se usa');
  const pasos = [
    'Llena solo las celdas amarillas de la hoja "Cronograma". El calendario, las cuotas y los saldos se calculan solos.',
    'Revisa la celda de cuadre al final de la tabla: debe decir "Cuadra con el monto otorgado".',
    'Imprime, fírmalo con el trabajador y adjúntalo al convenio de préstamo. Sin firma no se puede descontar de la remuneración.',
    'Registra el préstamo en el sistema con los mismos valores (ver el mapeo de abajo) y sube el PDF firmado como archivo del préstamo.',
    'Cada vez que una planilla descuente una cuota, marca la fila como DESCONTADA y anota el número de planilla.',
  ];
  pasos.forEach((paso, i) => {
    ws.getCell(fila, 1).value = i + 1;
    ws.getCell(fila, 1).font = { bold: true, size: 9, color: { argb: AZUL } };
    ws.getCell(fila, 1).alignment = { horizontal: 'center', vertical: 'top' };
    ws.mergeCells(fila, 2, fila, 4);
    ws.getCell(fila, 2).value = paso;
    ws.getCell(fila, 2).font = { size: 9 };
    ws.getCell(fila, 2).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(fila).height = 26;
    fila += 1;
  });

  fila += 1;
  bloque('Mapeo con el sistema');
  filaTabla('Campo del formato', 'Campo del sistema', 'Nota', true);
  const mapeo = [
    [
      'Tipo',
      'prestamos.tipo',
      'PRÉSTAMO → PRESTAMO · ADELANTO DE SUELDO → ADELANTO_SUELDO · ADELANTO DE GRATIFICACIÓN → ADELANTO_GRATIFICACION',
    ],
    [
      'Monto otorgado',
      'prestamos.monto_total',
      'Déjalo vacío solo si es un descuento recurrente sin monto definido.',
    ],
    [
      'Cuota mensual',
      'prestamos.cuota_mensual',
      'Obligatorio siempre, incluso en descuentos recurrentes.',
    ],
    [
      'Monto otorgado (saldo inicial)',
      'prestamos.saldo',
      'Arranca igual al monto otorgado. Cada planilla aprobada lo amortiza.',
    ],
    [
      'Fecha de otorgamiento',
      'prestamos.fecha_otorgado',
      'Es la fecha de entrega del dinero, no la del primer descuento.',
    ],
    [
      'Motivo del préstamo',
      'prestamos.observaciones',
      'Máximo 500 caracteres.',
    ],
    [
      'Este documento firmado',
      'prestamos_archivos',
      'Sube el PDF escaneado. Es el respaldo de la autorización de descuento.',
    ],
    [
      'Planilla (por cuota)',
      'prestamos_movimientos.planilla_id',
      'El sistema lo registra al aprobar la planilla, como CARGO_PLANILLA.',
    ],
  ];
  mapeo.forEach((linea) => filaTabla(linea[0], linea[1], linea[2]));

  fila += 1;
  bloque('Reglas que ya aplica el motor de planilla');
  const reglas = [
    [
      'Última cuota',
      'La cuota nunca excede el saldo. Si el saldo es 150 y la cuota 500, se descuenta 150 y el préstamo queda PAGADO. En el cronograma, la última cuota además absorbe el residuo del redondeo para que el total cuadre con el monto otorgado.',
    ],
    [
      'Adelanto de gratificación',
      'Solo descuenta en julio y diciembre (Ley 27735). Al elegir ese tipo, el cronograma salta automáticamente a esos meses.',
    ],
    [
      'Varios préstamos activos',
      'La planilla suma las cuotas y amortiza primero el préstamo más antiguo.',
    ],
    [
      'Re-aprobar una planilla',
      'No vuelve a descontar: el cargo por planilla es idempotente.',
    ],
    [
      'Incidencia sobre la remuneración',
      'Es un control interno de la empresa, no un tope legal. Sirve para no dejar al trabajador sin líquido.',
    ],
  ];
  reglas.forEach((regla) => {
    ws.getCell(fila, 2).value = regla[0];
    ws.getCell(fila, 2).font = { size: 9, bold: true };
    ws.getCell(fila, 2).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(fila, 2).border = borde;
    ws.mergeCells(fila, 3, fila, 4);
    ws.getCell(fila, 3).value = regla[1];
    ws.getCell(fila, 3).font = { size: 9 };
    ws.getCell(fila, 3).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(fila, 3).border = borde;
    ws.getRow(fila).height = 28;
    fila += 1;
  });
}

const EJEMPLO = {
  empresa: 'GRUPO BM S.A.C.',
  ruc: '20512345678',
  domicilio: 'Av. Ejemplo 123, Lima',
  correlativo: 'PRE-2026-0041',
  trabajador: 'PÉREZ QUISPE, JUAN CARLOS',
  documento: 'DNI 45678912',
  cargo: 'Operario de producción',
  fechaIngreso: new Date(2023, 2, 1),
  area: 'Planta Lima',
  regimen: 'General (D.L. 728)',
  remuneracion: 2500,
  neto: 2180,
  tipo: 'PRÉSTAMO',
  fechaOtorgado: new Date(2026, 7, 20),
  monto: 3000,
  modalidad: 'Transferencia bancaria',
  cuotas: 6,
  operacion: '0093-884512',
  banco: 'BCP — 191-9876543-0-11',
  primerPeriodo: new Date(2026, 8, 1),
  motivo: 'Gastos médicos familiares',
};

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Planillas MultiEmpresa';
  wb.created = new Date();

  construirHoja(wb.addWorksheet('Cronograma'), null);
  construirHoja(wb.addWorksheet('Ejemplo'), EJEMPLO);
  construirInstructivo(wb.addWorksheet('Instructivo'));

  await wb.xlsx.writeFile(SALIDA);
  console.log('Generado: ' + SALIDA);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
