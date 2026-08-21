import { redondear2, reproduce } from './planilla-auditable-formulas';
import type {
  DiaTareoExportacion,
  MesHistorialExportacion,
} from './planilla-export-tipos';

/**
 * Modelo PURO de la hoja por trabajador: una lista de filas con celdas que ya
 * saben su columna, su valor o su fórmula y su estilo. El renderizado con
 * ExcelJS vive aparte (`planilla-trabajador-hoja.ts`); acá no hay DOM, ni red,
 * ni librería de Excel. Solo aritmética y strings de fórmula.
 *
 * REGLA DE ORO (heredada del export auditable): una fórmula solo se escribe si
 * REPRODUCE el importe que calculó el sistema. Si no lo reproduce, la celda
 * conserva el valor del sistema y queda marcada como divergente. Nunca se
 * entrega una hoja que contradiga la planilla.
 *
 * Disposición de columnas del libro mayor (una línea por concepto):
 *   A  número de día / lunes de semana      E  importe (fórmula)
 *   B  etiqueta                             F  importe según el sistema
 *   C  cantidad o base                      G  diferencia
 *   D  factor o tasa                        H..L  de dónde sale
 *
 * La tabla del tareo reutiliza las mismas columnas con otra semántica:
 *   A día · B fecha · C código · D horas · E devenga · F sin goce · G lunes
 *   H extras 25 % · I extras 35 % · J nocturno · K feriado · L descripción
 */

export type FormatoCelda =
  | 'moneda'
  | 'porcentaje'
  | 'entero'
  | 'fecha'
  | 'horas'
  | 'fraccion'
  | 'texto';

export type EstiloCelda =
  | 'titulo'
  | 'subtitulo'
  | 'seccion'
  | 'encabezado'
  | 'etiqueta'
  | 'dato'
  | 'insumo'
  | 'formula'
  | 'divergente'
  | 'sistema'
  | 'diferencia'
  | 'total'
  | 'nota';

export interface Celda {
  columna: number;
  valor?: string | number | Date | null;
  /** Fórmula de Excel SIN el `=` inicial. Excluyente con `valor`. */
  formula?: string;
  formato?: FormatoCelda;
  estilo?: EstiloCelda;
  /** Comentario de la celda (se muestra al pasar el cursor). */
  nota?: string;
  /** Última columna de un merge horizontal que arranca en `columna`. */
  mergeHasta?: number;
}

export interface Fila {
  celdas: Celda[];
  alto?: number;
}

export const COLUMNA = {
  numero: 1,
  etiqueta: 2,
  cantidad: 3,
  factor: 4,
  importe: 5,
  sistema: 6,
  diferencia: 7,
  origen: 8,
  ultima: 12,
} as const;

/** Columnas de la tabla del tareo. */
export const TAREO = {
  dia: 1,
  fecha: 2,
  codigo: 3,
  horas: 4,
  devenga: 5,
  sinGoce: 6,
  lunes: 7,
  he25: 8,
  he35: 9,
  nocturno: 10,
  feriado: 11,
  descripcion: 12,
} as const;

export const ANCHOS_COLUMNAS = [11, 42, 14, 14, 14, 14, 12, 10, 10, 9, 9, 48];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function letra(columna: number): string {
  let n = columna;
  let resultado = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    resultado = LETRAS[resto] + resultado;
    n = Math.floor((n - 1) / 26);
  }
  return resultado;
}

/** Referencia absoluta a una celda de ESTA hoja. */
export const ref = (columna: number, fila: number): string =>
  `$${letra(columna)}$${fila}`;

const rango = (columna: number, desde: number, hasta: number): string =>
  `${ref(columna, desde)}:${ref(columna, hasta)}`;

/** Fecha local a partir de un ISO `yyyy-mm-dd`, sin corrimiento de zona. */
export function fechaLocal(iso: string): Date {
  const [a, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** Lunes de la semana calendario (ISO 8601) a la que pertenece la fecha. */
export function lunesDe(fecha: Date): Date {
  const desplazamiento = (fecha.getDay() + 6) % 7;
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - desplazamiento);
}

const claveFecha = (fecha: Date): string =>
  `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;

/** Resultado de escribir una línea de concepto: dónde quedó y cuánto vale. */
export interface Linea {
  fila: number;
  /** Referencia absoluta a la celda del importe. */
  refImporte: string;
  estado: 'FORMULA' | 'DIVERGENTE' | 'INSUMO';
  /** Lo que la celda del importe VALE: el resultado de la fórmula o el valor del sistema. */
  valorCelda: number;
}

export interface OpcionesLinea {
  etiqueta: string;
  /** Valor o fórmula para la columna "cantidad". */
  cantidad?: { valor?: number | string; formula?: string; formato?: FormatoCelda };
  /** Valor o fórmula para la columna "factor". */
  factor?: { valor?: number | string; formula?: string; formato?: FormatoCelda };
  /** Fórmula del importe (sin `=`). `null` = no se pudo construir. */
  formula: string | null;
  /** Importe que la fórmula debería dar, calculado en JavaScript. `null` = no se pudo. */
  esperado: number | null;
  /** Importe que calculó el sistema. */
  sistema: number;
  /** Texto de la columna "de dónde sale". */
  origen?: string;
  formato?: FormatoCelda;
  /** Fila de total: negrita y fondo. */
  total?: boolean;
}

/**
 * Constructor secuencial de la hoja. Lleva el cursor de fila para que cada
 * línea pueda referenciar a las anteriores con direcciones absolutas.
 */
export class ConstructorHoja {
  readonly filas: Fila[] = [];
  divergentes = 0;
  /** Filas con una celda de diferencia (fórmula − sistema): las únicas que se pintan si no dan cero. */
  readonly filasConDiferencia: number[] = [];
  /** Celdas que se completan al final, cuando ya se conoce la fila destino. */
  private readonly pendientes: Celda[] = [];

  /** Número de la PRÓXIMA fila que se escribirá (1-based). */
  get filaActual(): number {
    return this.filas.length + 1;
  }

  agregar(celdas: Celda[], alto?: number): number {
    this.filas.push({ celdas, alto });
    return this.filas.length;
  }

  vacia(): void {
    this.agregar([]);
  }

  titulo(texto: string, subtitulo: string): void {
    this.agregar(
      [{ columna: COLUMNA.etiqueta, valor: texto, estilo: 'titulo', mergeHasta: COLUMNA.ultima }],
      30,
    );
    this.agregar([
      { columna: COLUMNA.etiqueta, valor: subtitulo, estilo: 'subtitulo', mergeHasta: COLUMNA.ultima },
    ]);
  }

  seccion(texto: string, nota?: string): void {
    this.vacia();
    this.agregar(
      [{ columna: COLUMNA.numero, valor: texto, estilo: 'seccion', mergeHasta: COLUMNA.ultima }],
      22,
    );
    if (nota) {
      this.agregar(
        [{ columna: COLUMNA.numero, valor: nota, estilo: 'nota', mergeHasta: COLUMNA.ultima }],
        30,
      );
    }
  }

  encabezado(textos: (string | null)[]): void {
    this.agregar(
      textos.flatMap((texto, i) =>
        texto === null ? [] : [{ columna: i + 1, valor: texto, estilo: 'encabezado' as const }],
      ),
      30,
    );
  }

  /** Fila de dato descriptivo: etiqueta + valor (+ origen). Devuelve la ref del valor. */
  dato(
    etiqueta: string,
    valor: string | number | Date | null,
    opciones: { formato?: FormatoCelda; insumo?: boolean; origen?: string; formula?: string } = {},
  ): string {
    const fila = this.filaActual;
    const celdas: Celda[] = [
      { columna: COLUMNA.etiqueta, valor: etiqueta, estilo: 'etiqueta' },
      {
        columna: COLUMNA.cantidad,
        ...(opciones.formula ? { formula: opciones.formula } : { valor }),
        formato: opciones.formato,
        estilo: opciones.formula ? 'formula' : opciones.insumo ? 'insumo' : 'dato',
      },
    ];
    if (opciones.origen) {
      celdas.push({
        columna: COLUMNA.origen,
        valor: opciones.origen,
        estilo: 'nota',
        mergeHasta: COLUMNA.ultima,
      });
    }
    this.agregar(celdas);
    return ref(COLUMNA.cantidad, fila);
  }

  /**
   * Línea de concepto. Decide FORMULA vs DIVERGENTE con la regla de oro y
   * escribe importe, valor del sistema y diferencia.
   */
  linea(o: OpcionesLinea): Linea {
    const fila = this.filaActual;
    const formato = o.formato ?? 'moneda';
    const reproduceSistema =
      o.formula !== null && o.esperado !== null && reproduce(o.esperado, o.sistema);

    const estado: Linea['estado'] = reproduceSistema ? 'FORMULA' : 'DIVERGENTE';
    if (!reproduceSistema) this.divergentes++;
    this.filasConDiferencia.push(fila);

    const celdas: Celda[] = [
      { columna: COLUMNA.etiqueta, valor: o.etiqueta, estilo: o.total ? 'total' : 'etiqueta' },
    ];
    if (o.cantidad) {
      celdas.push({
        columna: COLUMNA.cantidad,
        valor: o.cantidad.valor,
        formula: o.cantidad.formula,
        formato: o.cantidad.formato ?? 'entero',
        estilo: o.cantidad.formula ? 'formula' : 'insumo',
      });
    }
    if (o.factor) {
      celdas.push({
        columna: COLUMNA.factor,
        valor: o.factor.valor,
        formula: o.factor.formula,
        formato: o.factor.formato ?? 'moneda',
        estilo: o.factor.formula ? 'formula' : 'insumo',
      });
    }
    celdas.push(
      reproduceSistema
        ? { columna: COLUMNA.importe, formula: o.formula ?? undefined, formato, estilo: 'formula' }
        : {
            columna: COLUMNA.importe,
            valor: o.sistema,
            formato,
            estilo: 'divergente',
            nota:
              o.esperado === null
                ? 'No se pudo construir la fórmula (falta un parámetro o una tabla): se conserva el valor calculado por el sistema.'
                : `La fórmula daría ${redondear2(o.esperado).toFixed(2)} y el sistema calculó ${o.sistema.toFixed(2)}: se conserva el valor del sistema.`,
          },
      { columna: COLUMNA.sistema, valor: o.sistema, formato, estilo: 'sistema' },
      {
        columna: COLUMNA.diferencia,
        formula: `ROUND(${ref(COLUMNA.importe, fila)}-${ref(COLUMNA.sistema, fila)},2)`,
        formato,
        estilo: 'diferencia',
      },
    );
    if (o.origen) {
      celdas.push({
        columna: COLUMNA.origen,
        valor: o.origen,
        estilo: 'nota',
        mergeHasta: COLUMNA.ultima,
      });
    }
    this.agregar(celdas);

    return {
      fila,
      refImporte: ref(COLUMNA.importe, fila),
      estado,
      valorCelda: reproduceSistema ? redondear2(o.esperado ?? 0) : o.sistema,
    };
  }

  /** Línea cuyo importe es un dato del sistema que no se deriva en la hoja. */
  insumo(etiqueta: string, sistema: number, origen: string): Linea {
    const fila = this.filaActual;
    this.agregar([
      { columna: COLUMNA.etiqueta, valor: etiqueta, estilo: 'etiqueta' },
      { columna: COLUMNA.importe, valor: sistema, formato: 'moneda', estilo: 'insumo' },
      { columna: COLUMNA.sistema, valor: sistema, formato: 'moneda', estilo: 'sistema' },
      { columna: COLUMNA.origen, valor: origen, estilo: 'nota', mergeHasta: COLUMNA.ultima },
    ]);
    return { fila, refImporte: ref(COLUMNA.importe, fila), estado: 'INSUMO', valorCelda: sistema };
  }

  /** Suma de líneas previas como una línea de total. */
  suma(etiqueta: string, lineas: Linea[], sistema: number, origen?: string): Linea {
    const formula = lineas.length > 0 ? `ROUND(${lineas.map((l) => l.refImporte).join('+')},2)` : '0';
    const esperado = lineas.reduce((acc, l) => acc + l.valorCelda, 0);
    return this.linea({ etiqueta, formula, esperado, sistema, origen, total: true });
  }

  /** Reserva una celda cuyo contenido se define al final (`resolver`). */
  pendiente(celda: Celda): Celda {
    this.pendientes.push(celda);
    return celda;
  }

  /** Rango absoluto de una columna entre dos filas de esta hoja. */
  rango(columna: number, desde: number, hasta: number): string {
    return rango(columna, desde, hasta);
  }
}

// ─── Historial (antecedentes del ejercicio) ──────────────────────────────────

export interface RefsHistorial {
  rangoAnio: string;
  rangoMes: string;
  rangoRemAfecta: string;
  rangoRenta: string;
  /** Primera y última fila de datos; iguales y sin datos si el historial está vacío. */
  vacio: boolean;
}

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

export function escribirHistorial(h: ConstructorHoja, historial: MesHistorialExportacion[]): RefsHistorial {
  h.seccion(
    'ANTECEDENTES — planillas previas del trabajador',
    'De acá salen el acumulado de renta de 5.ª (meses anteriores del mismo año) y los promedios del semestre que alimentan la gratificación y la CTS. Solo cuentan planillas calculadas, revisadas, aprobadas o pagadas.',
  );
  h.encabezado([null, 'Período', 'Año', 'Mes', 'Días trab.', 'Rem. afecta', 'Renta 5.ª ret.', 'Horas extras', 'Bonificac.', 'Gratificac.', null, 'Estado']);

  const primera = h.filaActual;
  if (historial.length === 0) {
    h.agregar([
      { columna: COLUMNA.etiqueta, valor: 'Sin planillas previas', estilo: 'nota' },
      { columna: 3, valor: 0, estilo: 'dato' },
      { columna: 4, valor: 0, estilo: 'dato' },
      { columna: 6, valor: 0, formato: 'moneda', estilo: 'dato' },
      { columna: 7, valor: 0, formato: 'moneda', estilo: 'dato' },
    ]);
  }
  historial.forEach((m) => {
    h.agregar([
      { columna: 2, valor: `${MESES_CORTOS[m.mes - 1]} ${m.anio}`, estilo: 'etiqueta' },
      { columna: 3, valor: m.anio, formato: 'entero', estilo: 'dato' },
      { columna: 4, valor: m.mes, formato: 'entero', estilo: 'dato' },
      { columna: 5, valor: m.dias_trabajados, formato: 'entero', estilo: 'dato' },
      { columna: 6, valor: m.remuneracion_afecta, formato: 'moneda', estilo: 'dato' },
      { columna: 7, valor: m.renta_5ta, formato: 'moneda', estilo: 'dato' },
      { columna: 8, valor: m.horas_extras, formato: 'moneda', estilo: 'dato' },
      { columna: 9, valor: m.bonificaciones, formato: 'moneda', estilo: 'dato' },
      { columna: 10, valor: m.gratificacion, formato: 'moneda', estilo: 'dato' },
      { columna: 12, valor: m.estado, estilo: 'dato' },
    ]);
  });
  const ultima = h.filaActual - 1;

  return {
    rangoAnio: h.rango(3, primera, ultima),
    rangoMes: h.rango(4, primera, ultima),
    rangoRemAfecta: h.rango(6, primera, ultima),
    rangoRenta: h.rango(7, primera, ultima),
    vacio: historial.length === 0,
  };
}

// ─── Tareo ───────────────────────────────────────────────────────────────────

export interface SemanaTareo {
  lunes: Date;
  ausenciasSinGoce: number;
}

export interface RefsTareo {
  primeraFila: number;
  ultimaFila: number;
  rangoCodigo: string;
  rangoHoras: string;
  rangoDevenga: string;
  rangoSinGoce: string;
  rangoLunes: string;
  rangoHe25: string;
  rangoHe35: string;
  rangoNocturno: string;
  rangoFeriado: string;
  /** Semanas calendario presentes en el período, en orden. */
  semanas: SemanaTareo[];
  /** Conteos calculados en JavaScript, para los importes esperados. */
  conteo: ConteoTareo;
}

export interface ConteoTareo {
  devengan: number;
  sinGoce: number;
  he25Diurnas: number;
  he25Nocturnas: number;
  he35Diurnas: number;
  he35Nocturnas: number;
  turnosNoche: number;
  feriados: number;
  porCodigo: (codigos: string[]) => number;
}

const JORNADA = 8;
const TRAMO_25 = 2;

function efectoDelDia(d: DiaTareoExportacion): string {
  const efectos: string[] = [];
  if (d.devenga) efectos.push('devenga');
  else efectos.push('no devenga');
  if (d.sin_goce) efectos.push('recorta dominical');
  if (d.devenga && d.horas > JORNADA) efectos.push(`${d.horas - JORNADA} h extra`);
  if (d.feriado_trabajado) efectos.push('feriado trabajado');
  if (d.nocturno) efectos.push('nocturno');
  return `${d.descripcion} — ${efectos.join(', ')}`;
}

export function escribirTareo(h: ConstructorHoja, tareo: DiaTareoExportacion[]): RefsTareo {
  h.seccion(
    'TAREO DEL PERÍODO — día por día',
    'Único dato de entrada de la hoja: todo lo que sigue se deriva de estas filas. "Devenga" y "Sin goce" se clasificaron con la misma regla que el motor de cálculo. Las horas extras se calculan solo sobre días que devengan: 2 primeras al 25 %, el resto al 35 %.',
  );
  h.encabezado(['Día', 'Fecha', 'Código', 'Horas', 'Devenga', 'Sin goce', 'Lunes de la semana', 'HE 25 %', 'HE 35 %', 'Noct.', 'Feriado', 'Descripción y efecto']);

  const primera = h.filaActual;
  const semanas = new Map<string, SemanaTareo>();
  const conteo = {
    devengan: 0, sinGoce: 0,
    he25Diurnas: 0, he25Nocturnas: 0, he35Diurnas: 0, he35Nocturnas: 0,
    turnosNoche: 0, feriados: 0,
  };
  const porCodigo = new Map<string, number>();

  tareo.forEach((d) => {
    const fila = h.filaActual;
    const fecha = fechaLocal(d.fecha);
    const lunes = lunesDe(fecha);
    const clave = claveFecha(lunes);
    const semana = semanas.get(clave) ?? { lunes, ausenciasSinGoce: 0 };
    if (d.sin_goce) semana.ausenciasSinGoce += 1;
    semanas.set(clave, semana);

    porCodigo.set(d.codigo, (porCodigo.get(d.codigo) ?? 0) + 1);
    if (d.devenga) conteo.devengan += 1;
    if (d.sin_goce) conteo.sinGoce += 1;
    if (d.feriado_trabajado) conteo.feriados += 1;
    if (d.devenga && d.nocturno) conteo.turnosNoche += 1;
    if (d.devenga && d.horas > JORNADA) {
      const extras = d.horas - JORNADA;
      const he25 = Math.min(TRAMO_25, extras);
      const he35 = Math.max(0, extras - TRAMO_25);
      if (d.nocturno) {
        conteo.he25Nocturnas += he25;
        conteo.he35Nocturnas += he35;
      } else {
        conteo.he25Diurnas += he25;
        conteo.he35Diurnas += he35;
      }
    }

    const rFecha = ref(TAREO.fecha, fila);
    const rHoras = ref(TAREO.horas, fila);
    const rDevenga = ref(TAREO.devenga, fila);
    h.agregar([
      { columna: TAREO.dia, valor: d.dia, formato: 'entero', estilo: 'dato' },
      { columna: TAREO.fecha, valor: fecha, formato: 'fecha', estilo: 'dato' },
      { columna: TAREO.codigo, valor: d.codigo, estilo: d.sin_goce ? 'divergente' : 'insumo' },
      { columna: TAREO.horas, valor: d.horas, formato: 'horas', estilo: 'insumo' },
      { columna: TAREO.devenga, valor: d.devenga ? 1 : 0, formato: 'entero', estilo: 'dato' },
      { columna: TAREO.sinGoce, valor: d.sin_goce ? 1 : 0, formato: 'entero', estilo: 'dato' },
      { columna: TAREO.lunes, formula: `${rFecha}-WEEKDAY(${rFecha},3)`, formato: 'fecha', estilo: 'formula' },
      { columna: TAREO.he25, formula: `IF(${rDevenga}=1,MIN(${TRAMO_25},MAX(0,${rHoras}-${JORNADA})),0)`, formato: 'horas', estilo: 'formula' },
      { columna: TAREO.he35, formula: `IF(${rDevenga}=1,MAX(0,${rHoras}-${JORNADA + TRAMO_25}),0)`, formato: 'horas', estilo: 'formula' },
      { columna: TAREO.nocturno, valor: d.nocturno ? 1 : 0, formato: 'entero', estilo: 'dato' },
      { columna: TAREO.feriado, valor: d.feriado_trabajado ? 1 : 0, formato: 'entero', estilo: 'dato' },
      { columna: TAREO.descripcion, valor: efectoDelDia(d), estilo: 'nota' },
    ]);
  });

  // Sin tareo la hoja igual necesita rangos válidos: una fila vacía con ceros.
  if (tareo.length === 0) {
    h.agregar([
      { columna: TAREO.fecha, valor: 'Sin tareo registrado para este período', estilo: 'nota' },
      { columna: TAREO.horas, valor: 0, estilo: 'dato' },
      { columna: TAREO.devenga, valor: 0, estilo: 'dato' },
      { columna: TAREO.sinGoce, valor: 0, estilo: 'dato' },
      { columna: TAREO.he25, valor: 0, estilo: 'dato' },
      { columna: TAREO.he35, valor: 0, estilo: 'dato' },
      { columna: TAREO.nocturno, valor: 0, estilo: 'dato' },
      { columna: TAREO.feriado, valor: 0, estilo: 'dato' },
    ]);
  }
  const ultima = h.filaActual - 1;

  return {
    primeraFila: primera,
    ultimaFila: ultima,
    rangoCodigo: h.rango(TAREO.codigo, primera, ultima),
    rangoHoras: h.rango(TAREO.horas, primera, ultima),
    rangoDevenga: h.rango(TAREO.devenga, primera, ultima),
    rangoSinGoce: h.rango(TAREO.sinGoce, primera, ultima),
    rangoLunes: h.rango(TAREO.lunes, primera, ultima),
    rangoHe25: h.rango(TAREO.he25, primera, ultima),
    rangoHe35: h.rango(TAREO.he35, primera, ultima),
    rangoNocturno: h.rango(TAREO.nocturno, primera, ultima),
    rangoFeriado: h.rango(TAREO.feriado, primera, ultima),
    semanas: Array.from(semanas.values()).sort((a, b) => a.lunes.getTime() - b.lunes.getTime()),
    conteo: {
      ...conteo,
      porCodigo: (codigos) => codigos.reduce((acc, c) => acc + (porCodigo.get(c) ?? 0), 0),
    },
  };
}

/** `COUNTIF` sobre la columna de códigos para uno o varios códigos. */
export function formulaConteoCodigos(refs: RefsTareo, codigos: string[]): string {
  return codigos.map((c) => `COUNTIF(${refs.rangoCodigo},"${c}")`).join('+');
}
