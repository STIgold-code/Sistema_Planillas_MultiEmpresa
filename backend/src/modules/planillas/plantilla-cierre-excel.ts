import ExcelJS from 'exceljs';
import type {
  DeudaPlantilla,
  PlantillaCierre,
  TrabajadorPlantilla,
} from './plantilla-cierre-datos';

/**
 * Libro de CIERRE DE PERÍODO: lo que el área contable llena para que la planilla
 * se pueda calcular con datos completos.
 *
 * Reemplaza al correo de texto libre, que dejaba fuera justo lo que el sistema
 * no puede deducir: el saldo real de cada préstamo, si un adelanto se descuenta
 * o ya se pagó, las fechas exactas de vacaciones y descansos médicos.
 *
 * Tres reglas de construcción:
 *  1. Nada se escribe a mano donde se pueda elegir. El trabajador se selecciona
 *     de una lista desplegable con el documento, no se teclea el nombre.
 *  2. Lo que el sistema ya sabe viene PRELLENADO y bloqueado, al lado de la
 *     celda donde el contador lo corrige. Confirmar es más rápido y más seguro
 *     que transcribir.
 *  3. Cada fila dice si está completa. La hoja "Control" cuenta lo que falta,
 *     así el archivo no se envía a medias.
 */

const COLOR = {
  titulo: 'FF1F4E79',
  cabecera: 'FF1F2937',
  llenar: 'FFFFF2CC',
  sistema: 'FFEDEDED',
  formula: 'FFE8F5E9',
  alerta: 'FFFDD5D5',
  ok: 'FF22C55E',
  texto: 'FFFFFFFF',
  gris: 'FF6B7280',
};

const MONEDA = '#,##0.00';
const FECHA = 'dd/mm/yyyy';
/**
 * Los documentos van SIEMPRE como texto. Varios DNI empiezan en cero
 * (06894124) y si Excel los toma como número pierden el cero: el desplegable
 * deja de coincidir y el VLOOKUP del nombre devuelve "no encontrado".
 */
const TEXTO = '@';

/** Filas en blanco que se dejan al final de cada tabla para altas nuevas. */
const FILAS_LIBRES = 15;

const borde = (): Partial<ExcelJS.Borders> => {
  const l: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: 'FFBFBFBF' },
  };
  return { top: l, left: l, bottom: l, right: l };
};

const relleno = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

/** Nombre de hoja tal como se referencia en fórmulas y validaciones. */
const HOJA_TRABAJADORES = 'Trabajadores';

interface Columna {
  titulo: string;
  ancho: number;
  /** Celda que el contador debe llenar (ámbar) o dato del sistema (gris). */
  rol: 'llenar' | 'sistema' | 'formula';
  formato?: string;
  /** Lista de valores admitidos: se aplica como validación desplegable. */
  opciones?: string[];
  /** true si la columna es obligatoria para considerar la fila completa. */
  obligatoria?: boolean;
  nota?: string;
}

function escribirTitulo(
  ws: ExcelJS.Worksheet,
  texto: string,
  subtitulo: string,
  ultimaColumna: number,
): void {
  ws.mergeCells(1, 1, 1, ultimaColumna);
  const t = ws.getCell(1, 1);
  t.value = texto;
  t.font = { bold: true, size: 14, color: { argb: COLOR.texto } };
  t.fill = relleno(COLOR.titulo);
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, ultimaColumna);
  const s = ws.getCell(2, 1);
  s.value = subtitulo;
  s.font = { size: 10, italic: true, color: { argb: COLOR.gris } };
  s.alignment = { vertical: 'top', wrapText: true };
  ws.getRow(2).height = 30;
}

function escribirCabecera(
  ws: ExcelJS.Worksheet,
  columnas: Columna[],
  fila: number,
): void {
  columnas.forEach((c, i) => {
    const cell = ws.getCell(fila, i + 1);
    cell.value = c.titulo;
    cell.font = { bold: true, size: 9, color: { argb: COLOR.texto } };
    cell.fill = relleno(COLOR.cabecera);
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = borde();
    if (c.nota) cell.note = c.nota;
    ws.getColumn(i + 1).width = c.ancho;
  });
  ws.getRow(fila).height = 38;
}

/**
 * Pinta las celdas editables de una tabla y aplica sus validaciones.
 * `hasta` es la última fila de la tabla, incluidas las filas libres.
 */
function prepararCeldas(
  ws: ExcelJS.Worksheet,
  columnas: Columna[],
  desde: number,
  hasta: number,
  refTrabajadores: string,
): void {
  for (let fila = desde; fila <= hasta; fila++) {
    columnas.forEach((c, i) => {
      const cell = ws.getCell(fila, i + 1);
      cell.border = borde();
      cell.font = { size: 10 };
      if (c.formato) cell.numFmt = c.formato;
      if (c.rol === 'llenar' && cell.value === null)
        cell.fill = relleno(COLOR.llenar);
      if (c.rol === 'sistema') cell.fill = relleno(COLOR.sistema);

      if (c.opciones) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${c.opciones.join(',')}"`],
          showErrorMessage: true,
          errorTitle: 'Valor no admitido',
          error: `Elige una opción de la lista: ${c.opciones.join(' / ')}`,
        };
      } else if (c.titulo.startsWith('Documento') && c.rol === 'llenar') {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [refTrabajadores],
          showErrorMessage: true,
          errorTitle: 'Trabajador no encontrado',
          error:
            'Elige el documento de la lista. Si el trabajador no aparece, primero hay que darlo de alta en el sistema.',
        };
      }
    });
  }
}

/** Marca en rojo las filas iniciadas a las que les falta un dato obligatorio. */
function alertarIncompletas(
  ws: ExcelJS.Worksheet,
  columnas: Columna[],
  desde: number,
  hasta: number,
): void {
  const obligatorias = columnas
    .map((c, i) => ({ c, letra: ws.getColumn(i + 1).letter }))
    .filter((x) => x.c.obligatoria);
  if (obligatorias.length === 0) return;

  const primeraLetra = ws.getColumn(1).letter;
  const faltaAlguna = obligatorias
    .map((x) => `${x.letra}${desde}=""`)
    .join(',');

  ws.addConditionalFormatting({
    ref: `A${desde}:${ws.getColumn(columnas.length).letter}${hasta}`,
    rules: [
      {
        type: 'expression',
        // La fila se pinta solo si ya se empezó a llenar y falta algo.
        formulae: [`AND($${primeraLetra}${desde}<>"",OR(${faltaAlguna}))`],
        priority: 1,
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: COLOR.alerta },
          },
        },
      },
    ],
  });
}

// ─── Hojas ───────────────────────────────────────────────────────────────────

function hojaInstrucciones(wb: ExcelJS.Workbook, datos: PlantillaCierre): void {
  const ws = wb.addWorksheet('Instrucciones', {
    properties: { tabColor: { argb: COLOR.titulo } },
  });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 120;

  escribirTitulo(
    ws,
    `CIERRE DE PLANILLA — ${datos.periodo.etiqueta}`,
    `${datos.empresa.razon_social} · RUC ${datos.empresa.ruc}`,
    3,
  );

  const bloques: (string | { t: string })[] = [
    { t: 'Para qué sirve este archivo' },
    'Reemplaza al correo de cierre. Acá se registra todo lo que el sistema no puede saber por sí solo: el saldo real de cada préstamo, si un adelanto se descuenta o ya se pagó, las fechas exactas de vacaciones y descansos médicos, los bonos y los descuentos del mes.',
    'Mientras esta información llegue completa, la planilla se calcula sin idas y vueltas.',
    '',
    { t: 'Cómo se llena' },
    'Celdas ÁMBAR: las llenas tú.',
    'Celdas GRISES: son datos que ya tiene el sistema. No se editan; están ahí para que los confirmes o veas si están mal.',
    'Filas ROJAS: empezaste a llenar la fila y falta un dato obligatorio.',
    'El trabajador SIEMPRE se elige de la lista desplegable, por número de documento. Si alguien no aparece en la lista, es porque no está dado de alta en el sistema: avísalo en la hoja "Planilla informal" o pide el alta antes.',
    '',
    { t: 'Antes de enviarlo' },
    'Revisa la hoja "Control": indica cuántas filas quedaron incompletas. Si marca alguna pendiente, el archivo todavía no está listo.',
    '',
    { t: 'Qué hoja usar para cada cosa' },
    'Préstamos — cuotas que se descuentan mes a mes. Confirma el saldo pendiente de cada uno.',
    'Adelantos — dinero entregado a cuenta. Indica si se descuenta este mes o si ya se descontó antes.',
    'Vacaciones y descansos — días de descanso vacacional, a cuenta de vacaciones o descanso médico, con sus fechas.',
    'Otros conceptos — bonos, retenciones judiciales y cualquier ingreso o descuento del mes.',
    'Planilla informal — personas que no están en el sistema.',
    'Política del período — jornada, refrigerio y de dónde salen las horas extras.',
    '',
    { t: 'Lo que NO va en este archivo' },
    'La asistencia diaria. Eso sigue yendo en el Excel de tareo, con sus códigos por día. Este archivo es solo para los conceptos económicos.',
  ];

  let fila = 4;
  for (const b of bloques) {
    const cell = ws.getCell(fila, 2);
    if (typeof b === 'object') {
      cell.value = b.t;
      cell.font = { bold: true, size: 11, color: { argb: COLOR.titulo } };
    } else if (b !== '') {
      cell.value = b;
      cell.font = { size: 10 };
      cell.alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(fila).height = b.length > 110 ? 28 : 15;
    }
    fila++;
  }

  fila++;
  const leyenda: [string, string][] = [
    ['Se llena', COLOR.llenar],
    ['Dato del sistema (no editar)', COLOR.sistema],
    ['Falta un dato obligatorio', COLOR.alerta],
  ];
  leyenda.forEach(([texto, color], i) => {
    const cell = ws.getCell(fila + i, 2);
    cell.value = texto;
    cell.fill = relleno(color);
    cell.border = borde();
    cell.font = { size: 10 };
  });
}

function hojaPeriodo(wb: ExcelJS.Workbook, datos: PlantillaCierre): void {
  const ws = wb.addWorksheet('Periodo', {
    properties: { tabColor: { argb: COLOR.titulo } },
  });
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 80;

  escribirTitulo(
    ws,
    'PERÍODO A CERRAR',
    'Estos datos vienen del sistema. Verifica que la ventana sea la correcta antes de llenar el resto.',
    3,
  );

  const p = datos.periodo;
  const filas: [string, string | number, string][] = [
    ['Período', p.etiqueta, 'Mes y año de la planilla'],
    [
      'Desde',
      p.fecha_inicio,
      p.dia_corte
        ? `Día de corte ${p.dia_corte}: el período NO es el mes calendario`
        : 'Período calendario',
    ],
    ['Hasta', p.fecha_fin, ''],
    ['Días del período', p.dias, 'Días reales de la ventana'],
    [
      'Período de tareo',
      p.periodo_tareo_existe
        ? `Creado (${p.estado_periodo_tareo})`
        : 'NO EXISTE — hay que crearlo antes de calcular',
      '',
    ],
    [
      'Trabajadores en el sistema',
      datos.trabajadores.length,
      'Incluye cesados del último año, por si hubo reingresos',
    ],
    [
      'Generado',
      datos.generado.slice(0, 16).replace('T', ' '),
      'Fecha en que se sacó esta foto del sistema',
    ],
  ];

  filas.forEach(([etiqueta, valor, nota], i) => {
    const fila = 4 + i;
    const a = ws.getCell(fila, 1);
    a.value = etiqueta;
    a.font = { bold: true, size: 10 };
    a.border = borde();
    const b = ws.getCell(fila, 2);
    b.value = valor;
    b.fill = relleno(COLOR.sistema);
    b.border = borde();
    b.font = { size: 10 };
    b.alignment = { horizontal: 'left' };
    const c = ws.getCell(fila, 3);
    c.value = nota;
    c.font = { size: 9, italic: true, color: { argb: COLOR.gris } };
  });

  if (!p.periodo_tareo_existe) {
    const aviso = ws.getCell(4 + filas.length + 1, 1);
    aviso.value =
      'ATENCIÓN: el período de tareo de este mes todavía no existe en el sistema. Créalo y carga la asistencia antes de calcular la planilla.';
    aviso.font = { bold: true, size: 10, color: { argb: 'FFC00000' } };
    ws.mergeCells(4 + filas.length + 1, 1, 4 + filas.length + 1, 3);
  }
}

/** Devuelve la referencia absoluta al rango de documentos, para las validaciones. */
function hojaTrabajadores(
  wb: ExcelJS.Workbook,
  trabajadores: TrabajadorPlantilla[],
): string {
  const ws = wb.addWorksheet(HOJA_TRABAJADORES, {
    properties: { tabColor: { argb: COLOR.sistema } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const columnas: Columna[] = [
    { titulo: 'Documento', ancho: 13, rol: 'sistema', formato: TEXTO },
    { titulo: 'Trabajador', ancho: 36, rol: 'sistema' },
    { titulo: 'Cargo', ancho: 22, rol: 'sistema' },
    { titulo: 'Estado en el sistema', ancho: 14, rol: 'sistema' },
    { titulo: 'Ingreso', ancho: 12, rol: 'sistema', formato: FECHA },
    { titulo: 'Cese', ancho: 12, rol: 'sistema', formato: FECHA },
    { titulo: 'Sueldo básico', ancho: 13, rol: 'sistema', formato: MONEDA },
    { titulo: 'Régimen pensionario', ancho: 20, rol: 'sistema' },
    { titulo: 'Asig. familiar', ancho: 11, rol: 'sistema' },
    { titulo: 'Días de vacaciones disponibles', ancho: 14, rol: 'sistema' },
    {
      titulo: '¿Sigue trabajando este período?',
      ancho: 16,
      rol: 'llenar',
      opciones: ['Sí', 'No', 'Reingresó'],
      nota: 'Marca "Reingresó" si figura cesado pero volvió a trabajar. Sin esto no se le genera planilla.',
    },
    { titulo: 'Observación', ancho: 40, rol: 'llenar' },
  ];

  escribirTitulo(
    ws,
    'TRABAJADORES EN EL SISTEMA',
    'Lista de referencia: de acá salen los desplegables de las demás hojas. Solo se llenan las dos últimas columnas, y únicamente si hay algo que corregir.',
    columnas.length,
  );
  escribirCabecera(ws, columnas, 4);

  const primera = 5;
  trabajadores.forEach((t, i) => {
    const fila = primera + i;
    const valores: (string | number | Date | null)[] = [
      t.documento,
      t.nombre,
      t.cargo,
      t.estado,
      t.fecha_ingreso ? new Date(t.fecha_ingreso) : null,
      t.fecha_cese ? new Date(t.fecha_cese) : null,
      t.sueldo_base,
      t.regimen_pensionario,
      t.asignacion_familiar ? 'Sí' : 'No',
      t.dias_vacaciones_disponibles,
      null,
      null,
    ];
    valores.forEach((v, c) => {
      ws.getCell(fila, c + 1).value = v;
    });
    ws.getCell(fila, 1).numFmt = TEXTO;
    // El cesado se resalta: es el caso que hay que revisar sí o sí.
    if (t.estado !== 'ACTIVO') {
      ws.getCell(fila, 4).font = {
        size: 10,
        bold: true,
        color: { argb: 'FFC00000' },
      };
    }
  });

  const ultima = primera + trabajadores.length - 1;
  prepararCeldas(ws, columnas, primera, ultima, '');

  return `${HOJA_TRABAJADORES}!$A$${primera}:$A$${ultima}`;
}

function hojaDeudas(
  wb: ExcelJS.Workbook,
  nombre: string,
  titulo: string,
  subtitulo: string,
  deudas: DeudaPlantilla[],
  refTrabajadores: string,
  esAdelanto: boolean,
): void {
  const ws = wb.addWorksheet(nombre, {
    properties: { tabColor: { argb: COLOR.llenar } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const columnas: Columna[] = [
    {
      titulo: 'Documento',
      ancho: 13,
      rol: 'llenar',
      obligatoria: true,
      formato: TEXTO,
    },
    { titulo: 'Trabajador', ancho: 34, rol: 'formula' },
    { titulo: 'Fecha otorgado', ancho: 13, rol: 'sistema', formato: FECHA },
    {
      titulo: 'Monto total otorgado',
      ancho: 14,
      rol: 'llenar',
      formato: MONEDA,
      nota: 'El monto por el que se otorgó la deuda. Si está vacío o mal, escríbelo: es el dato que el sistema no tiene.',
    },
    {
      titulo: esAdelanto ? 'Monto del adelanto' : 'Cuota mensual',
      ancho: 13,
      rol: 'sistema',
      formato: MONEDA,
    },
    {
      titulo: 'Saldo según el sistema',
      ancho: 18,
      rol: 'sistema',
      formato: MONEDA,
      nota: 'Lo que el sistema cree que falta cobrar. "SIN TOPE" significa que la cuota se descuenta TODOS LOS MESES sin fin: escribe al lado cuánto falta de verdad.',
    },
    { titulo: 'Cuotas ya aplicadas', ancho: 11, rol: 'sistema' },
    {
      titulo: esAdelanto ? 'MONTO REAL A DESCONTAR' : 'SALDO REAL PENDIENTE',
      ancho: 15,
      rol: 'llenar',
      formato: MONEDA,
      obligatoria: true,
      nota: 'Este es el dato que manda. Si coincide con el del sistema, repítelo igual.',
    },
    esAdelanto
      ? {
          titulo: 'Naturaleza',
          ancho: 26,
          rol: 'llenar',
          obligatoria: true,
          opciones: [
            'Se descuenta este mes',
            'Ya se descontó antes',
            'Pago de quincena ya entregado',
          ],
          nota: 'Distingue el adelanto que todavía hay que cobrar del que ya se cobró en un mes anterior.',
        }
      : {
          titulo: '¿Continúa vigente?',
          ancho: 14,
          rol: 'llenar',
          obligatoria: true,
          opciones: ['Sí', 'No - cancelado', 'No - ya pagado'],
        },
    { titulo: 'Observación', ancho: 42, rol: 'llenar' },
  ];

  escribirTitulo(ws, titulo, subtitulo, columnas.length);
  escribirCabecera(ws, columnas, 4);

  const primera = 5;
  deudas.forEach((d, i) => {
    const fila = primera + i;
    ws.getCell(fila, 1).value = d.documento;
    ws.getCell(fila, 1).numFmt = TEXTO;
    ws.getCell(fila, 3).value = d.fecha_otorgado
      ? new Date(d.fecha_otorgado)
      : null;
    ws.getCell(fila, 4).value = d.monto_total ?? null;
    ws.getCell(fila, 5).value = d.cuota_mensual;
    // Saldo NULL = descuento recurrente sin tope. Se dice con todas las letras;
    // el resaltado se aplica más abajo, después de dar formato a las columnas.
    ws.getCell(fila, 6).value =
      d.saldo_sistema === null ? 'SIN TOPE ⚠' : d.saldo_sistema;
    ws.getCell(fila, 7).value = d.cuotas_aplicadas;
    ws.getCell(fila, 10).value = d.observaciones;
  });

  const ultima = primera + deudas.length + FILAS_LIBRES - 1;
  // El nombre se resuelve solo desde el documento: no se teclea.
  for (let fila = primera; fila <= ultima; fila++) {
    ws.getCell(fila, 2).value = {
      formula: `IF($A${fila}="","",IFERROR(VLOOKUP($A${fila},${HOJA_TRABAJADORES}!$A:$B,2,FALSE),"⚠ documento no encontrado"))`,
    };
    ws.getCell(fila, 2).fill = relleno(COLOR.formula);
  }

  prepararCeldas(ws, columnas, primera, ultima, refTrabajadores);
  alertarIncompletas(ws, columnas, primera, ultima);

  // El "SIN TOPE" va en rojo por encima del formato de la columna: es el caso
  // que hace que una cuota salga mes tras mes sin fin, y tiene que saltar.
  deudas.forEach((d, i) => {
    if (d.saldo_sistema !== null) return;
    const celda = ws.getCell(primera + i, 6);
    celda.fill = relleno(COLOR.alerta);
    celda.font = { bold: true, size: 9, color: { argb: 'FF991B1B' } };
    celda.alignment = { horizontal: 'center' };
  });

  // Total de lo que efectivamente se va a descontar.
  const filaTotal = ultima + 1;
  ws.getCell(filaTotal, 2).value = 'TOTAL A DESCONTAR';
  ws.getCell(filaTotal, 8).value = { formula: `SUM(H${primera}:H${ultima})` };
  for (let c = 1; c <= columnas.length; c++) {
    const cell = ws.getCell(filaTotal, c);
    cell.font = { bold: true, size: 10, color: { argb: COLOR.texto } };
    cell.fill = relleno(COLOR.titulo);
    cell.border = borde();
    if (c === 8) cell.numFmt = MONEDA;
  }
}

function hojaVacaciones(wb: ExcelJS.Workbook, refTrabajadores: string): void {
  const ws = wb.addWorksheet('Vacaciones y descansos', {
    properties: { tabColor: { argb: COLOR.llenar } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const columnas: Columna[] = [
    {
      titulo: 'Documento',
      ancho: 13,
      rol: 'llenar',
      obligatoria: true,
      formato: TEXTO,
    },
    { titulo: 'Trabajador', ancho: 34, rol: 'formula' },
    {
      titulo: 'Tipo',
      ancho: 30,
      rol: 'llenar',
      obligatoria: true,
      opciones: [
        'Vacaciones',
        'A cuenta de vacaciones',
        'Descanso médico CON certificado',
        'Descanso médico SIN certificado',
        'Subsidio por maternidad',
      ],
      nota: 'El descanso médico CON certificado se paga; SIN certificado no se paga y recorta el dominical.',
    },
    {
      titulo: 'Desde',
      ancho: 12,
      rol: 'llenar',
      formato: FECHA,
      obligatoria: true,
    },
    {
      titulo: 'Hasta',
      ancho: 12,
      rol: 'llenar',
      formato: FECHA,
      obligatoria: true,
    },
    { titulo: 'Días', ancho: 8, rol: 'formula' },
    {
      titulo: 'Días disponibles del trabajador',
      ancho: 14,
      rol: 'formula',
      nota: 'Sale de la hoja Trabajadores. Solo aplica a vacaciones.',
    },
    {
      titulo: 'N° de documento de respaldo',
      ancho: 22,
      rol: 'llenar',
      nota: 'CITT del descanso médico o número del movimiento de personal.',
    },
    { titulo: 'Observación', ancho: 42, rol: 'llenar' },
  ];

  escribirTitulo(
    ws,
    'VACACIONES Y DESCANSOS MÉDICOS',
    'Una fila por cada tramo de días. Si el trabajador tuvo dos períodos separados, van en dos filas. Deja la hoja vacía si no hubo ninguno en el mes.',
    columnas.length,
  );
  escribirCabecera(ws, columnas, 4);

  const primera = 5;
  const ultima = primera + FILAS_LIBRES + 9;
  for (let fila = primera; fila <= ultima; fila++) {
    ws.getCell(fila, 2).value = {
      formula: `IF($A${fila}="","",IFERROR(VLOOKUP($A${fila},${HOJA_TRABAJADORES}!$A:$B,2,FALSE),"⚠ documento no encontrado"))`,
    };
    ws.getCell(fila, 2).fill = relleno(COLOR.formula);
    ws.getCell(fila, 6).value = {
      formula: `IF(OR($D${fila}="",$E${fila}=""),"",$E${fila}-$D${fila}+1)`,
    };
    ws.getCell(fila, 6).fill = relleno(COLOR.formula);
    ws.getCell(fila, 7).value = {
      formula: `IF($A${fila}="","",IFERROR(VLOOKUP($A${fila},${HOJA_TRABAJADORES}!$A:$J,10,FALSE),""))`,
    };
    ws.getCell(fila, 7).fill = relleno(COLOR.formula);
  }

  prepararCeldas(ws, columnas, primera, ultima, refTrabajadores);
  alertarIncompletas(ws, columnas, primera, ultima);
}

function hojaOtrosConceptos(
  wb: ExcelJS.Workbook,
  refTrabajadores: string,
): void {
  const ws = wb.addWorksheet('Otros conceptos', {
    properties: { tabColor: { argb: COLOR.llenar } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const columnas: Columna[] = [
    {
      titulo: 'Documento',
      ancho: 13,
      rol: 'llenar',
      obligatoria: true,
      formato: TEXTO,
    },
    { titulo: 'Trabajador', ancho: 34, rol: 'formula' },
    {
      titulo: 'Concepto',
      ancho: 30,
      rol: 'llenar',
      obligatoria: true,
      opciones: [
        'Bono / gratificación extraordinaria',
        'Movilidad',
        'Refrigerio',
        'Reintegro',
        'Retención judicial',
        'Otro descuento',
        'Otro ingreso',
      ],
    },
    {
      titulo: '¿Suma o resta?',
      ancho: 13,
      rol: 'llenar',
      obligatoria: true,
      opciones: ['Ingreso (suma)', 'Descuento (resta)'],
    },
    {
      titulo: 'Monto',
      ancho: 13,
      rol: 'llenar',
      formato: MONEDA,
      obligatoria: true,
    },
    { titulo: 'Observación / sustento', ancho: 52, rol: 'llenar' },
  ];

  escribirTitulo(
    ws,
    'OTROS INGRESOS Y DESCUENTOS DEL MES',
    'Bonos, movilidad, retenciones judiciales y cualquier concepto que no sea préstamo, adelanto ni vacaciones.',
    columnas.length,
  );
  escribirCabecera(ws, columnas, 4);

  const primera = 5;
  const ultima = primera + FILAS_LIBRES + 9;
  for (let fila = primera; fila <= ultima; fila++) {
    ws.getCell(fila, 2).value = {
      formula: `IF($A${fila}="","",IFERROR(VLOOKUP($A${fila},${HOJA_TRABAJADORES}!$A:$B,2,FALSE),"⚠ documento no encontrado"))`,
    };
    ws.getCell(fila, 2).fill = relleno(COLOR.formula);
  }

  prepararCeldas(ws, columnas, primera, ultima, refTrabajadores);
  alertarIncompletas(ws, columnas, primera, ultima);
}

function hojaInformal(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet('Planilla informal', {
    properties: { tabColor: { argb: COLOR.alerta } },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const columnas: Columna[] = [
    {
      titulo: 'Documento',
      ancho: 13,
      rol: 'llenar',
      obligatoria: true,
      formato: TEXTO,
    },
    { titulo: 'Nombre completo', ancho: 36, rol: 'llenar', obligatoria: true },
    { titulo: 'Sueldo acordado', ancho: 14, rol: 'llenar', formato: MONEDA },
    {
      titulo: 'Concepto del mes',
      ancho: 26,
      rol: 'llenar',
      opciones: ['Bono', 'Sueldo', 'Otro'],
    },
    {
      titulo: 'Monto',
      ancho: 13,
      rol: 'llenar',
      formato: MONEDA,
      obligatoria: true,
    },
    {
      titulo: '¿Se incorpora al sistema?',
      ancho: 16,
      rol: 'llenar',
      opciones: ['Sí', 'No', 'Pendiente de decidir'],
    },
    { titulo: 'Observación', ancho: 46, rol: 'llenar' },
  ];

  escribirTitulo(
    ws,
    'PLANILLA INFORMAL',
    'Personas que NO están dadas de alta en el sistema. Se registran acá para que el dato quede estructurado; el sistema no les calcula planilla mientras no se den de alta.',
    columnas.length,
  );
  escribirCabecera(ws, columnas, 4);

  const primera = 5;
  const ultima = primera + FILAS_LIBRES - 1;
  prepararCeldas(ws, columnas, primera, ultima, '');
  alertarIncompletas(ws, columnas, primera, ultima);
}

function hojaPolitica(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet('Politica del periodo', {
    properties: { tabColor: { argb: COLOR.llenar } },
  });
  ws.getColumn(1).width = 44;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 78;

  escribirTitulo(
    ws,
    'POLÍTICA DEL PERÍODO',
    'Tres definiciones que cambian el resultado del cálculo. Se confirman una vez por período.',
    3,
  );

  const filas: {
    etiqueta: string;
    opciones?: string[];
    valor?: number;
    nota: string;
  }[] = [
    {
      etiqueta: 'Jornada diaria (horas)',
      valor: 8,
      nota: 'Horas efectivas de trabajo. La ley fija un máximo de 8 diarias o 48 semanales.',
    },
    {
      etiqueta: 'Refrigerio (minutos)',
      valor: 60,
      nota: 'No es tiempo de trabajo: se descuenta de la permanencia antes de calcular horas extras.',
    },
    {
      etiqueta: '¿De dónde salen las horas extras?',
      opciones: [
        'Solo de los destaques a mina',
        'Del marcador (entrada y salida)',
        'Se cargan a mano en el tareo',
      ],
      nota: 'Si sale del marcador, la permanencia menos el refrigerio y menos la jornada es la hora extra. Sin esta definición se puede pagar de más.',
    },
    {
      etiqueta: '¿Hubo feriado trabajado en el período?',
      opciones: ['No', 'Sí — detallar en Otros conceptos'],
      nota: 'El feriado laborado sin descanso sustitutorio se paga doble (D.L. 713 art. 9).',
    },
  ];

  filas.forEach((f, i) => {
    const fila = 4 + i;
    const a = ws.getCell(fila, 1);
    a.value = f.etiqueta;
    a.font = { bold: true, size: 10 };
    a.border = borde();
    const b = ws.getCell(fila, 2);
    if (f.valor !== undefined) b.value = f.valor;
    b.fill = relleno(COLOR.llenar);
    b.border = borde();
    b.font = { size: 10 };
    if (f.opciones) {
      b.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${f.opciones.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Valor no admitido',
        error: `Elige una opción: ${f.opciones.join(' / ')}`,
      };
    }
    const c = ws.getCell(fila, 3);
    c.value = f.nota;
    c.font = { size: 9, italic: true, color: { argb: COLOR.gris } };
    c.alignment = { wrapText: true, vertical: 'top' };
  });
}

/** Resumen de completitud: qué falta antes de enviar el archivo. */
function hojaControl(wb: ExcelJS.Workbook, datos: PlantillaCierre): void {
  const ws = wb.addWorksheet('Control', {
    properties: { tabColor: { argb: COLOR.ok } },
  });
  ws.getColumn(1).width = 34;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 70;

  escribirTitulo(
    ws,
    'CONTROL DE COMPLETITUD',
    'Revisa esta hoja antes de enviar el archivo. Si alguna fila dice PENDIENTE, falta llenar algo.',
    4,
  );

  // Cada hoja se controla contra TODAS sus columnas obligatorias: la que menos
  // filas tenga llenas manda. Se usa COUNTA (no COUNT) porque varias columnas
  // obligatorias son texto y COUNT las ignoraría, dando un COMPLETO falso.
  const controles: {
    hoja: string;
    rango: string;
    obligatorias: string[];
    que: string;
  }[] = [
    {
      hoja: 'Prestamos',
      rango: 'A5:A100',
      obligatorias: ['H5:H100', 'I5:I100'],
      que: 'Cada préstamo necesita saldo real y si continúa vigente',
    },
    {
      hoja: 'Adelantos',
      rango: 'A5:A100',
      obligatorias: ['H5:H100', 'I5:I100'],
      que: 'Cada adelanto necesita monto y naturaleza',
    },
    {
      hoja: 'Vacaciones y descansos',
      rango: 'A5:A100',
      obligatorias: ['C5:C100', 'D5:D100', 'E5:E100'],
      que: 'Cada tramo necesita tipo, fecha desde y fecha hasta',
    },
    {
      hoja: 'Otros conceptos',
      rango: 'A5:A100',
      obligatorias: ['C5:C100', 'D5:D100', 'E5:E100'],
      que: 'Cada concepto necesita tipo, signo y monto',
    },
    {
      hoja: 'Planilla informal',
      rango: 'A5:A100',
      obligatorias: ['B5:B100', 'E5:E100'],
      que: 'Cada persona necesita nombre y monto',
    },
  ];

  ['Hoja', 'Filas usadas', 'Estado', 'Qué se revisa'].forEach((t, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = t;
    cell.font = { bold: true, size: 9, color: { argb: COLOR.texto } };
    cell.fill = relleno(COLOR.cabecera);
    cell.border = borde();
    cell.alignment = { horizontal: 'center' };
  });

  controles.forEach((c, i) => {
    const fila = 5 + i;
    const ref = `'${c.hoja}'`;
    ws.getCell(fila, 1).value = c.hoja;
    ws.getCell(fila, 2).value = { formula: `COUNTA(${ref}!${c.rango})` };
    const minimoLleno = c.obligatorias
      .map((r) => `COUNTA(${ref}!${r})`)
      .join(',');
    ws.getCell(fila, 3).value = {
      formula: `IF(COUNTA(${ref}!${c.rango})<=MIN(${minimoLleno}),"COMPLETO","PENDIENTE")`,
    };
    ws.getCell(fila, 4).value = c.que;
    for (let col = 1; col <= 4; col++) {
      ws.getCell(fila, col).border = borde();
      ws.getCell(fila, col).font = { size: 10 };
    }
    ws.getCell(fila, 3).font = { size: 10, bold: true };
  });

  const ultima = 4 + controles.length;
  ws.addConditionalFormatting({
    ref: `C5:C${ultima}`,
    rules: [
      {
        type: 'expression',
        formulae: ['$C5="PENDIENTE"'],
        priority: 1,
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            bgColor: { argb: COLOR.alerta },
          },
        },
      },
    ],
  });

  const resumen = ws.getCell(ultima + 2, 1);
  resumen.value = {
    formula: `IF(COUNTIF(C5:C${ultima},"PENDIENTE")=0,"✔ El archivo está completo y se puede enviar.","✖ Faltan datos: revisa las hojas marcadas en rojo.")`,
  };
  resumen.font = { bold: true, size: 12 };
  ws.mergeCells(ultima + 2, 1, ultima + 2, 4);

  const pie = ws.getCell(ultima + 4, 1);
  pie.value = `Plantilla generada el ${datos.generado.slice(0, 16).replace('T', ' ')} para el período ${datos.periodo.etiqueta}.`;
  pie.font = { size: 9, italic: true, color: { argb: COLOR.gris } };
  ws.mergeCells(ultima + 4, 1, ultima + 4, 4);
}

/** Construye el libro completo de la plantilla de cierre. */
export function construirLibroPlantillaCierre(
  datos: PlantillaCierre,
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Planillas MultiEmpresa';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  hojaInstrucciones(wb, datos);
  hojaPeriodo(wb, datos);
  const refTrabajadores = hojaTrabajadores(wb, datos.trabajadores);

  hojaDeudas(
    wb,
    'Prestamos',
    'PRÉSTAMOS VIGENTES',
    'Los préstamos que el sistema tiene activos, con el saldo que cree tener. Confirma o corrige el saldo real de cada uno; si está en cero y no debería, el descuento no se aplicaría. Agrega abajo los préstamos nuevos.',
    datos.prestamos,
    refTrabajadores,
    false,
  );

  hojaDeudas(
    wb,
    'Adelantos',
    'ADELANTOS DE SUELDO',
    'Dinero entregado a cuenta. Indica en "Naturaleza" si se descuenta en este período o si ya se descontó antes: un adelanto arrastrado se cobra dos veces.',
    datos.adelantos,
    refTrabajadores,
    true,
  );

  hojaVacaciones(wb, refTrabajadores);
  hojaOtrosConceptos(wb, refTrabajadores);
  hojaInformal(wb);
  hojaPolitica(wb);
  hojaControl(wb, datos);

  return wb;
}
