import ExcelJS from 'exceljs';

/**
 * Lectura y VALIDACIÓN de la plantilla de cierre que devuelve el área contable.
 *
 * Módulo PURO: recibe el buffer del archivo y devuelve lo que se leyó más los
 * problemas encontrados. No toca la base de datos. Quien decide qué hacer con
 * el resultado es `plantilla-cierre-importacion.ts`.
 *
 * Regla de diseño: NUNCA se descarta una fila en silencio. Una fila que no se
 * puede aplicar sale como ERROR con su número de fila y su motivo; una que se
 * aplica pero merece revisión sale como ADVERTENCIA. Un archivo mal llenado
 * tiene que ser visible, no invisible.
 */

/** Fila que no se puede aplicar: bloquea la importación. */
export interface ErrorLectura {
  hoja: string;
  fila: number;
  motivo: string;
}

/** Fila que se aplica, pero conviene mirarla. */
export interface AdvertenciaLectura {
  hoja: string;
  fila: number;
  motivo: string;
}

export interface DeudaLeida {
  fila: number;
  documento: string;
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO';
  fecha_otorgado: Date | null;
  monto_total: number | null;
  cuota: number | null;
  /** Saldo real (préstamos) o monto a descontar (adelantos). */
  monto_confirmado: number;
  /** Préstamos: si continúa. Adelantos: la naturaleza declarada. */
  decision: string;
  observacion: string;
}

export interface ReingresoLeido {
  fila: number;
  documento: string;
  /** Sí / No / Reingresó, tal cual lo marcó el contador. */
  marca: string;
  observacion: string;
}

/** Filas que se informan pero no se cargan: no hay dónde persistirlas todavía. */
export interface FilaInformativa {
  fila: number;
  documento: string;
  detalle: string;
}

export interface PoliticaLeida {
  jornada_horas: number | null;
  refrigerio_minutos: number | null;
  origen_horas_extras: string;
  feriado_trabajado: string;
}

export interface PlantillaLeida {
  prestamos: DeudaLeida[];
  adelantos: DeudaLeida[];
  reingresos: ReingresoLeido[];
  vacaciones: FilaInformativa[];
  otrosConceptos: FilaInformativa[];
  planillaInformal: FilaInformativa[];
  politica: PoliticaLeida;
  errores: ErrorLectura[];
  advertencias: AdvertenciaLectura[];
}

/** Primera fila de datos de todas las tablas de la plantilla. */
const PRIMERA_FILA = 5;
/** Se recorre con holgura: el contador puede haber agregado filas al final. */
const ULTIMA_FILA = 200;

const HOJAS = {
  trabajadores: 'Trabajadores',
  prestamos: 'Prestamos',
  adelantos: 'Adelantos',
  vacaciones: 'Vacaciones y descansos',
  otros: 'Otros conceptos',
  informal: 'Planilla informal',
  politica: 'Politica del periodo',
} as const;

/**
 * Texto de una celda, normalizado.
 *
 * Los documentos llegan como texto, pero si alguien pega un DNI sin el formato
 * de la plantilla puede llegar como número y perder el cero inicial: por eso
 * los valores numéricos se convierten sin notación científica y el llamador
 * decide si hay que rellenar ceros.
 */
function texto(celda: ExcelJS.Cell | undefined): string {
  const v = celda?.value;
  const plano = comoPrimitiva(v);
  if (plano !== null) return plano;

  if (typeof v === 'object' && v !== null) {
    // Celda con fórmula: interesa el resultado calculado, no la fórmula.
    if ('result' in v) {
      const resultado = comoPrimitiva(v.result);
      if (resultado !== null) return resultado;
    }
    if ('richText' in v && Array.isArray(v.richText)) {
      return v.richText
        .map((t) => t.text)
        .join('')
        .trim();
    }
    if ('text' in v && typeof v.text === 'string') return v.text.trim();
  }
  // Hipervínculos, errores de fórmula y demás: vacío antes que "[object Object]".
  return '';
}

/** Texto de un valor de celda simple; null si no es una primitiva legible. */
function comoPrimitiva(v: unknown): string | null {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

function numero(celda: ExcelJS.Cell | undefined): number | null {
  const t = texto(celda).replace(/,/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fecha(celda: ExcelJS.Cell | undefined): Date | null {
  const v = celda?.value;
  if (v instanceof Date) return v;
  const t = texto(celda);
  if (!t) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(t);
  if (iso) return new Date(`${iso[0]}T00:00:00Z`);
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (dmy) {
    return new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
  }
  return null;
}

/**
 * Documentos válidos y su longitud original, leídos de la hoja de referencia.
 * Sirven para reconocer un DNI al que Excel le comió el cero inicial.
 */
function leerDocumentosValidos(wb: ExcelJS.Workbook): Map<string, string> {
  const ws = wb.getWorksheet(HOJAS.trabajadores);
  const mapa = new Map<string, string>();
  if (!ws) return mapa;
  for (let fila = PRIMERA_FILA; fila <= ULTIMA_FILA; fila++) {
    const doc = texto(ws.getCell(fila, 1));
    if (!doc) continue;
    mapa.set(doc, doc);
    // Un documento que empieza en cero también se indexa sin él: así una celda
    // que llegó como número (6894124) se resuelve al documento real (06894124).
    const sinCeros = doc.replace(/^0+/, '');
    if (sinCeros !== doc) mapa.set(sinCeros, doc);
  }
  return mapa;
}

/** Resuelve el documento de una fila contra la lista de trabajadores. */
function resolverDocumento(
  bruto: string,
  validos: Map<string, string>,
): string | null {
  if (!bruto) return null;
  return validos.get(bruto) ?? validos.get(bruto.replace(/^0+/, '')) ?? null;
}

interface ContextoHoja {
  ws: ExcelJS.Worksheet;
  nombre: string;
  validos: Map<string, string>;
  errores: ErrorLectura[];
  advertencias: AdvertenciaLectura[];
}

/**
 * Lee una hoja de deudas (préstamos o adelantos).
 *
 * Las columnas son las que escribe `plantilla-cierre-excel`:
 * A documento · C fecha · D monto total · E cuota · F saldo del sistema ·
 * H monto confirmado · I decisión · J observación.
 */
function leerDeudas(
  ctx: ContextoHoja,
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO',
): DeudaLeida[] {
  const leidas: DeudaLeida[] = [];
  const vistos = new Set<string>();

  for (let fila = PRIMERA_FILA; fila <= ULTIMA_FILA; fila++) {
    const bruto = texto(ctx.ws.getCell(fila, 1));
    if (!bruto) continue;

    const documento = resolverDocumento(bruto, ctx.validos);
    if (!documento) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo: `El documento "${bruto}" no corresponde a ningún trabajador del sistema.`,
      });
      continue;
    }

    const montoConfirmado = numero(ctx.ws.getCell(fila, 8));
    const decision = texto(ctx.ws.getCell(fila, 9));

    if (montoConfirmado === null) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo:
          tipo === 'PRESTAMO'
            ? 'Falta el saldo real pendiente. Sin ese dato el préstamo no descuenta nada.'
            : 'Falta el monto real a descontar.',
      });
      continue;
    }
    if (montoConfirmado < 0) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo: 'El monto no puede ser negativo.',
      });
      continue;
    }
    if (!decision) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo:
          tipo === 'PRESTAMO'
            ? 'Falta indicar si el préstamo continúa vigente.'
            : 'Falta indicar la naturaleza del adelanto (si se descuenta este mes o ya se descontó).',
      });
      continue;
    }

    const cuota = numero(ctx.ws.getCell(fila, 5));
    if (tipo === 'PRESTAMO' && (cuota === null || cuota <= 0)) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo: 'Falta la cuota mensual del préstamo.',
      });
      continue;
    }

    // Un mismo trabajador puede tener varias deudas; lo que no puede haber son
    // dos filas idénticas, que terminarían cobrando dos veces.
    const clave = `${documento}|${cuota ?? montoConfirmado}|${montoConfirmado}`;
    if (vistos.has(clave)) {
      ctx.errores.push({
        hoja: ctx.nombre,
        fila,
        motivo: 'Fila duplicada: mismo trabajador, misma cuota y mismo monto.',
      });
      continue;
    }
    vistos.add(clave);

    if (
      tipo === 'PRESTAMO' &&
      montoConfirmado === 0 &&
      decision.startsWith('Sí')
    ) {
      ctx.advertencias.push({
        hoja: ctx.nombre,
        fila,
        motivo:
          'El préstamo se marca como vigente pero su saldo quedó en cero: no va a descontar nada.',
      });
    }

    leidas.push({
      fila,
      documento,
      tipo,
      fecha_otorgado: fecha(ctx.ws.getCell(fila, 3)),
      monto_total: numero(ctx.ws.getCell(fila, 4)),
      cuota,
      monto_confirmado: montoConfirmado,
      decision,
      observacion: texto(ctx.ws.getCell(fila, 10)),
    });
  }
  return leidas;
}

/** Marcas de continuidad en la hoja de trabajadores (columna K). */
function leerReingresos(ctx: ContextoHoja): ReingresoLeido[] {
  const leidos: ReingresoLeido[] = [];
  for (let fila = PRIMERA_FILA; fila <= ULTIMA_FILA; fila++) {
    const bruto = texto(ctx.ws.getCell(fila, 1));
    if (!bruto) continue;
    const marca = texto(ctx.ws.getCell(fila, 11));
    if (!marca) continue;

    const documento = resolverDocumento(bruto, ctx.validos);
    if (!documento) continue;

    leidos.push({
      fila,
      documento,
      marca,
      observacion: texto(ctx.ws.getCell(fila, 12)),
    });
  }
  return leidos;
}

/** Hojas que se informan pero todavía no se cargan solas. */
function leerInformativas(
  ctx: ContextoHoja,
  columnas: number[],
  etiquetas: string[],
): FilaInformativa[] {
  const leidas: FilaInformativa[] = [];
  for (let fila = PRIMERA_FILA; fila <= ULTIMA_FILA; fila++) {
    const bruto = texto(ctx.ws.getCell(fila, 1));
    if (!bruto) continue;
    const documento = resolverDocumento(bruto, ctx.validos) ?? bruto;
    const partes = columnas
      .map((c, i) => {
        const v = texto(ctx.ws.getCell(fila, c));
        return v ? `${etiquetas[i]}: ${v}` : '';
      })
      .filter(Boolean);
    leidas.push({ fila, documento, detalle: partes.join(' · ') });
  }
  return leidas;
}

function leerPolitica(wb: ExcelJS.Workbook): PoliticaLeida {
  const ws = wb.getWorksheet(HOJAS.politica);
  if (!ws) {
    return {
      jornada_horas: null,
      refrigerio_minutos: null,
      origen_horas_extras: '',
      feriado_trabajado: '',
    };
  }
  return {
    jornada_horas: numero(ws.getCell(4, 2)),
    refrigerio_minutos: numero(ws.getCell(5, 2)),
    origen_horas_extras: texto(ws.getCell(6, 2)),
    feriado_trabajado: texto(ws.getCell(7, 2)),
  };
}

/**
 * Lee la plantilla completa.
 *
 * Devuelve lo que dice el archivo, no lo que hay en la base: emparejar cada
 * fila con el préstamo vigente que le corresponde es responsabilidad del
 * servicio de importación, que sí tiene acceso a Prisma.
 */
export async function leerPlantillaCierre(
  buffer: Buffer,
): Promise<PlantillaLeida> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const errores: ErrorLectura[] = [];
  const advertencias: AdvertenciaLectura[] = [];

  const faltantes = Object.values(HOJAS).filter((h) => !wb.getWorksheet(h));
  if (faltantes.length > 0) {
    errores.push({
      hoja: '(libro)',
      fila: 0,
      motivo: `El archivo no tiene las hojas esperadas: ${faltantes.join(', ')}. ¿Se subió la plantilla correcta?`,
    });
    return {
      prestamos: [],
      adelantos: [],
      reingresos: [],
      vacaciones: [],
      otrosConceptos: [],
      planillaInformal: [],
      politica: leerPolitica(wb),
      errores,
      advertencias,
    };
  }

  const validos = leerDocumentosValidos(wb);
  const ctx = (nombre: string): ContextoHoja => ({
    ws: wb.getWorksheet(nombre),
    nombre,
    validos,
    errores,
    advertencias,
  });

  return {
    prestamos: leerDeudas(ctx(HOJAS.prestamos), 'PRESTAMO'),
    adelantos: leerDeudas(ctx(HOJAS.adelantos), 'ADELANTO_SUELDO'),
    reingresos: leerReingresos(ctx(HOJAS.trabajadores)),
    vacaciones: leerInformativas(
      ctx(HOJAS.vacaciones),
      [3, 4, 5, 6, 8],
      ['Tipo', 'Desde', 'Hasta', 'Días', 'Documento de respaldo'],
    ),
    otrosConceptos: leerInformativas(
      ctx(HOJAS.otros),
      [3, 4, 5, 6],
      ['Concepto', 'Signo', 'Monto', 'Observación'],
    ),
    planillaInformal: leerInformativas(
      ctx(HOJAS.informal),
      [2, 3, 5, 6],
      ['Nombre', 'Sueldo', 'Monto', '¿Se incorpora?'],
    ),
    politica: leerPolitica(wb),
    errores,
    advertencias,
  };
}
