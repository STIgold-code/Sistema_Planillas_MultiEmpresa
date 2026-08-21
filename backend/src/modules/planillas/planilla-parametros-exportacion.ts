/**
 * Bloque de PARÁMETROS EFECTIVAMENTE USADOS que acompaña a la exportación de
 * planilla.
 *
 * Regla dura: ninguna tasa se escribe a mano. Los valores salen del MISMO puerto
 * `ParametrosLegales` que consumió el motor (`parametros_legales` con la cascada
 * de `parametros_empresa`) y de la tabla `regimenes_pensionarios` para ONP/AFP.
 * Si mañana cambia la UIT o una tasa de SCTR, el Excel cambia solo. Lo único
 * literal acá es el NOMBRE de la norma que sustenta cada concepto — metadato,
 * no importe.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { DEDUCCION_UIT } from './dominio/conceptos/renta-quinta';
import { ParametrosLegales } from './dominio/parametros/parametros-legales';
import {
  ClaveEscalar,
  filaVigenteEn,
} from './infraestructura/parametros-legales-prisma';

/** De dónde salió el valor que usó el motor de cálculo. */
export type OrigenParametro =
  | 'PARAMETRO_LEGAL'
  | 'PARAMETRO_EMPRESA'
  | 'REGIMEN_PENSIONARIO'
  | 'NO_DISPONIBLE';

export interface TasaExportacion {
  codigo: string;
  etiqueta: string;
  valor: number;
  formato: 'PORCENTAJE' | 'MONTO';
  base_legal: string;
  origen: OrigenParametro;
  vigente_desde: Date | null;
}

export interface ComisionAfpExportacion {
  administradora: string;
  aporte: number;
  prima: number;
  comision_flujo: number;
  comision_mixta: number;
}

/**
 * Tramo de la escala progresiva del impuesto a la renta (Art. 53 LIR).
 * `hasta_uit` en null es el tramo abierto superior (el dominio usa `Infinity`,
 * que no sobrevive a JSON).
 */
export interface TramoIrExportacion {
  desde_uit: number;
  hasta_uit: number | null;
  tasa: number;
}

export interface ParametrosExportacion {
  /** Fecha con la que se resolvieron los parámetros versionados. */
  vigencia: Date;
  tasas: TasaExportacion[];
  comisiones_afp: ComisionAfpExportacion[];
  /** Escala del impuesto a la renta con la que se retuvo la 5.ª categoría. */
  tramos_ir: TramoIrExportacion[];
  /** Deducción fija de los trabajadores dependientes, en UIT (Art. 46 LIR). */
  deduccion_uit: number;
}

interface DescriptorTasa {
  codigo: string;
  /** Clave de `parametros_legales` de la que sale el valor. */
  clave: ClaveEscalar;
  etiqueta: string;
  formato: 'PORCENTAJE' | 'MONTO';
  base_legal: string;
  leer: (params: ParametrosLegales, fecha: Date) => number;
}

/**
 * Tasas escalares versionadas. `codigo` es el identificador que consume el
 * Excel; `clave` es la fila de la que salió (la bonificación extraordinaria de
 * la Ley 30334 reusa la tasa de EsSalud, por eso hay dos códigos sobre una
 * misma clave).
 */
const DESCRIPTORES: readonly DescriptorTasa[] = [
  {
    codigo: 'rmv',
    clave: 'rmv',
    etiqueta: 'Remuneración Mínima Vital',
    formato: 'MONTO',
    base_legal: 'Decreto Supremo que fija la RMV vigente',
    leer: (p, f) => p.rmv(f),
  },
  {
    codigo: 'uit',
    clave: 'uit',
    etiqueta: 'Unidad Impositiva Tributaria',
    formato: 'MONTO',
    base_legal: 'Decreto Supremo anual del MEF',
    leer: (p, f) => p.uit(f),
  },
  {
    codigo: 'asignacionFamiliar',
    clave: 'asignacionFamiliar',
    etiqueta: 'Asignación familiar (monto mensual)',
    formato: 'MONTO',
    base_legal: 'Ley 25129 · D.S. 035-90-TR',
    leer: (p, f) => p.asignacionFamiliar(f),
  },
  {
    codigo: 'essaludTasa',
    clave: 'essaludTasa',
    etiqueta: 'EsSalud (aporte del empleador)',
    formato: 'PORCENTAJE',
    base_legal: 'Ley 26790 art. 6',
    leer: (p, f) => p.essaludTasa(f),
  },
  {
    codigo: 'essaludMinimo',
    clave: 'essaludMinimo',
    etiqueta: 'EsSalud mínimo (piso sobre la RMV)',
    formato: 'MONTO',
    base_legal: 'Ley 26790 art. 6',
    leer: (p, f) => p.essaludMinimo(f),
  },
  {
    codigo: 'bonificacionExtraordinaria',
    clave: 'essaludTasa',
    etiqueta: 'Bonificación extraordinaria sobre gratificación',
    formato: 'PORCENTAJE',
    base_legal: 'Ley 30334 art. 3',
    leer: (p, f) => p.essaludTasa(f),
  },
  {
    codigo: 'sctrSalud',
    clave: 'sctrSalud',
    etiqueta: 'SCTR salud (empleador)',
    formato: 'PORCENTAJE',
    base_legal: 'Ley 26790 art. 19 · D.S. 003-98-SA',
    leer: (p, f) => p.sctrSalud(f),
  },
  {
    codigo: 'sctrPension',
    clave: 'sctrPension',
    etiqueta: 'SCTR pensión (empleador)',
    formato: 'PORCENTAJE',
    base_legal: 'Ley 26790 art. 19 · D.S. 003-98-SA',
    leer: (p, f) => p.sctrPension(f),
  },
  {
    codigo: 'vidaLeyTasa',
    clave: 'vidaLeyTasa',
    etiqueta: 'Seguro Vida Ley (empleador)',
    formato: 'PORCENTAJE',
    base_legal: 'D.Leg. 688 · D.U. 044-2019',
    leer: (p, f) => p.vidaLeyTasa(f),
  },
  {
    codigo: 'senatiTasa',
    clave: 'senatiTasa',
    etiqueta: 'SENATI (empleador)',
    formato: 'PORCENTAJE',
    base_legal: 'Ley 26272 art. 11',
    leer: (p, f) => p.senatiTasa(f),
  },
];

const BASE_LEGAL_ONP = 'D.L. 19990';
const CODIGO_ONP = 'onp';

interface FilaVigencia {
  clave: string;
  vigencia_desde: Date;
  vigencia_hasta: Date | null;
}

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

/** Porcentaje del schema (10, 13, 1.47…) a fracción, igual que el motor. */
const aFraccion = (valor: unknown): number => aNumero(valor) / 100;

function resolverProcedencia(
  clave: string,
  fecha: Date,
  filasLegales: FilaVigencia[],
  filasEmpresa: FilaVigencia[],
): { origen: OrigenParametro; vigente_desde: Date | null } {
  // Misma cascada que `ParametrosLegalesPrisma.escalar`: override de la empresa
  // vigente primero, valor nacional vigente después.
  const propia = filaVigenteEn(
    filasEmpresa.filter((f) => f.clave === clave),
    fecha,
  );
  if (propia) {
    return {
      origen: 'PARAMETRO_EMPRESA',
      vigente_desde: propia.vigencia_desde,
    };
  }
  const nacional = filaVigenteEn(
    filasLegales.filter((f) => f.clave === clave),
    fecha,
  );
  if (nacional) {
    return {
      origen: 'PARAMETRO_LEGAL',
      vigente_desde: nacional.vigencia_desde,
    };
  }
  return { origen: 'NO_DISPONIBLE', vigente_desde: null };
}

/**
 * Arma el bloque de parámetros con los que se calculó una planilla.
 *
 * @param parametros Puerto ya cargado con `PlanillaParametrosService.cargar`.
 * @param fecha Fecha de referencia del período (fin de la ventana de corte),
 *   la MISMA que `EntradaDetalle.fechaReferenciaParametros`.
 */
export async function construirParametrosExportacion(
  prisma: PrismaService,
  parametros: ParametrosLegales,
  empresaId: number,
  fecha: Date,
): Promise<ParametrosExportacion> {
  const claves = [...new Set(DESCRIPTORES.map((d) => d.clave))];
  const seleccion = {
    clave: true,
    vigencia_desde: true,
    vigencia_hasta: true,
  } as const;

  const [filasLegales, filasEmpresa, regimenes] = await Promise.all([
    prisma.parametroLegal.findMany({
      where: { clave: { in: claves } },
      select: seleccion,
    }),
    prisma.parametroEmpresa.findMany({
      where: { empresa_id: empresaId, clave: { in: claves } },
      select: seleccion,
    }),
    prisma.regimenPensionario.findMany({
      where: { activo: true },
      select: {
        nombre: true,
        tipo: true,
        aporte_obligatorio: true,
        prima_seguro: true,
        comision_flujo: true,
        comision_mixta_flujo: true,
      },
      orderBy: { nombre: 'asc' },
    }),
  ]);

  const tasas: TasaExportacion[] = DESCRIPTORES.map((d) => {
    const procedencia = resolverProcedencia(
      d.clave,
      fecha,
      filasLegales,
      filasEmpresa,
    );
    // El adapter lanza si la clave no tiene fila vigente. En ese caso la tasa se
    // marca como no disponible en vez de tumbar la exportación completa.
    let valor = 0;
    let origen = procedencia.origen;
    try {
      valor = d.leer(parametros, fecha);
    } catch {
      origen = 'NO_DISPONIBLE';
    }
    return {
      codigo: d.codigo,
      etiqueta: d.etiqueta,
      valor,
      formato: d.formato,
      base_legal: d.base_legal,
      origen,
      vigente_desde: procedencia.vigente_desde,
    };
  });

  const regimenOnp = regimenes.find((r) => r.tipo === 'ONP');
  tasas.push({
    codigo: CODIGO_ONP,
    etiqueta: 'ONP — Sistema Nacional de Pensiones',
    valor: regimenOnp ? aFraccion(regimenOnp.aporte_obligatorio) : 0,
    formato: 'PORCENTAJE',
    base_legal: BASE_LEGAL_ONP,
    origen: regimenOnp ? 'REGIMEN_PENSIONARIO' : 'NO_DISPONIBLE',
    vigente_desde: null,
  });

  const comisiones_afp: ComisionAfpExportacion[] = regimenes
    .filter((r) => r.tipo === 'AFP')
    .map((r) => ({
      administradora: r.nombre,
      aporte: aFraccion(r.aporte_obligatorio),
      prima: aFraccion(r.prima_seguro),
      comision_flujo: aFraccion(r.comision_flujo),
      comision_mixta: aFraccion(r.comision_mixta_flujo),
    }));

  // La escala del Art. 53 LIR sale del MISMO puerto que usó el motor. El tramo
  // superior es abierto: el dominio lo expresa con Infinity y el JSON con null.
  let tramos_ir: TramoIrExportacion[] = [];
  try {
    let desde = 0;
    tramos_ir = parametros.tramosIR(fecha).map((tramo) => {
      const exportado: TramoIrExportacion = {
        desde_uit: desde,
        hasta_uit: Number.isFinite(tramo.hasta) ? tramo.hasta : null,
        tasa: tramo.tasa,
      };
      desde = tramo.hasta;
      return exportado;
    });
  } catch {
    // Sin escala vigente la renta no puede escribirse como fórmula: el Excel
    // conservará el valor del sistema y lo marcará como divergente.
  }

  return {
    vigencia: fecha,
    tasas,
    comisiones_afp,
    tramos_ir,
    deduccion_uit: DEDUCCION_UIT,
  };
}
