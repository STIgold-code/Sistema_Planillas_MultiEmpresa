/**
 * CIERRE del semestre que devenga la gratificación ordinaria y remuneración
 * VIGENTE a esa fecha.
 *
 * BASE LEGAL — Ley 27735 art. 3 y D.S. 005-2002-TR art. 3.2: la remuneración
 * computable de la gratificación de Fiestas Patrias es la VIGENTE AL 30 DE
 * JUNIO y la de Navidad la VIGENTE AL 30 DE NOVIEMBRE. Un aumento posterior al
 * cierre NO integra la gratificación de ese semestre: recién computa en el
 * siguiente.
 *
 * Vive en el BORDE de aplicación porque lee fechas Prisma (`@db.Date`, midnight
 * UTC) y `Decimal`; el dominio recibe la fecha y el monto ya resueltos.
 *
 * FUENTE DEL DATO HISTÓRICO: la tabla `contratos`. El sueldo del trabajador se
 * pacta en el contrato (`remuneracion`) y cada renovación o adenda abre una
 * fila nueva con su propia vigencia, así que el contrato vigente al cierre es
 * la única evidencia del sueldo de ese momento. `Empleado.sueldo_base` es el
 * sueldo de HOY y por eso no sirve para la gratificación.
 */
import { fechaCalendarioLocal } from '../../tareo/ventana-periodo';

/** Mes de pago de la gratificación de Fiestas Patrias (Ley 27735 art. 5). */
const MES_GRATIFICACION_FIESTAS_PATRIAS = 7;
/** Mes de pago de la gratificación de Navidad (Ley 27735 art. 5). */
const MES_GRATIFICACION_NAVIDAD = 12;
/** Mes de cierre del semestre enero-junio: junio. */
const MES_CIERRE_FIESTAS_PATRIAS = 6;
/** Mes de cierre del semestre julio-diciembre: noviembre (D.S. 005-2002-TR art. 3.2). */
const MES_CIERRE_NAVIDAD = 11;
/** Día de cierre en ambos casos: el 30. */
const DIA_CIERRE = 30;

/**
 * Contrato con su vigencia y la remuneración pactada. Subset mínimo de la fila
 * Prisma `Contrato` que este resolutor necesita.
 */
export interface ContratoVigencia {
  fecha_inicio: Date | string;
  fecha_fin: Date | string | null;
  /** `Contrato.remuneracion` (Decimal, nullable). */
  remuneracion: unknown;
}

/** Cierre del semestre resuelto para un período de planilla. */
export interface CierreSemestreGratificacion {
  /**
   * Fecha de cierre (30-jun / 30-nov). Ausente fuera de julio y diciembre: no
   * hay gratificación ordinaria que devengar.
   */
  fecha?: Date;
  /**
   * Remuneración pactada vigente al cierre. Ausente = sin evidencia histórica
   * (contrato sin remuneración registrada); quien llama cae al sueldo actual.
   */
  remuneracion?: number;
}

/**
 * Fecha de cierre del semestre que devenga la gratificación de `mes`.
 * Fuera de julio y diciembre devuelve `undefined`.
 */
export function fechaCierreSemestreGratificacion(
  mes: number,
  anio: number,
): Date | undefined {
  if (mes === MES_GRATIFICACION_FIESTAS_PATRIAS) {
    return new Date(anio, MES_CIERRE_FIESTAS_PATRIAS - 1, DIA_CIERRE);
  }
  if (mes === MES_GRATIFICACION_NAVIDAD) {
    return new Date(anio, MES_CIERRE_NAVIDAD - 1, DIA_CIERRE);
  }
  return undefined;
}

/**
 * Remuneración pactada vigente a `fecha` según el historial de contratos.
 *
 * Vigente = iniciado en o antes de la fecha y no terminado antes de ella. Si
 * varios contratos se superponen (renovación registrada con solape), gana el de
 * inicio más reciente: es el que rige. Sin candidato → `undefined`.
 */
export function resolverRemuneracionVigente(
  contratos: ContratoVigencia[] | undefined,
  fecha: Date,
): number | undefined {
  let vigente: { inicio: Date; remuneracion: number } | undefined;

  for (const contrato of contratos ?? []) {
    const remuneracion = Number(contrato.remuneracion);
    if (!Number.isFinite(remuneracion) || remuneracion <= 0) continue;

    const inicio = fechaCalendarioLocal(contrato.fecha_inicio);
    if (inicio > fecha) continue;

    const fin = contrato.fecha_fin
      ? fechaCalendarioLocal(contrato.fecha_fin)
      : null;
    if (fin && fin < fecha) continue;

    if (!vigente || inicio > vigente.inicio) {
      vigente = { inicio, remuneracion };
    }
  }

  return vigente?.remuneracion;
}

/**
 * Resuelve el cierre del semestre del período `mes`/`anio` y la remuneración
 * vigente en él. Fuera de julio y diciembre devuelve el objeto vacío.
 */
export function resolverCierreSemestreGratificacion(
  mes: number,
  anio: number,
  contratos?: ContratoVigencia[],
): CierreSemestreGratificacion {
  const fecha = fechaCierreSemestreGratificacion(mes, anio);
  if (!fecha) return {};
  return { fecha, remuneracion: resolverRemuneracionVigente(contratos, fecha) };
}
