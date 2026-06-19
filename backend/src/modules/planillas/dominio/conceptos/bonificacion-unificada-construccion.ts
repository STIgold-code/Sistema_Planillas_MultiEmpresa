/**
 * Concepto régimen-variable: Bonificación Unificada de Construcción (BUC).
 *
 * Bonificación que compensa herramientas, ropa y alimentación en construcción
 * civil. Se calcula como un porcentaje del jornal básico por día trabajado.
 *
 * ✅ CONFIRMADO (R.M. 197-2025-TR): operario 32%, oficial y peón 30% del básico.
 * El % y el jornal se resuelven vía `ParametrosLegales` por categoría.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_BUC = 'bonificacion_unificada_construccion';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaBuc {
  jornalBasicoDiario: number;
  bucPorcentaje: number;
  diasTrabajados: number;
}

export function calcularBuc(entrada: EntradaBuc): ResultadoConcepto {
  if (entrada.diasTrabajados <= 0 || entrada.jornalBasicoDiario <= 0) {
    return { conceptos: [] };
  }

  const monto = redondear2(
    entrada.jornalBasicoDiario * entrada.bucPorcentaje * entrada.diasTrabajados,
  );
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_BUC,
    descripcion: 'Bonificación Unificada de Construcción (BUC)',
    tipo: 'ingreso',
    monto,
  };
  return { conceptos: [concepto] };
}
