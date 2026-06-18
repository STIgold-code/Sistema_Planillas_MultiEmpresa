/**
 * Concepto régimen-variable: aporte EsSalud del régimen AGRARIO (Ley 31110).
 *
 * Regla genuinamente distinta del 9% plano: la tasa de EsSalud agrario tiene
 * GRADUALIDAD PROPIA por tamaño de empresa.
 *   - Empresa GRANDE (>=100 trab. o ventas >1700 UIT): 9% desde 2025.
 *   - Empresa PEQUEÑA: 6% hasta 2027, 9% desde 2028.
 * La base de cálculo es la Remuneración Básica (RB).
 *
 * ✅ CONFIRMADO: gradualidad por tamaño y base RB. Las tasas se resuelven vía
 * `ParametrosLegales` (cero hardcodeo en dominio); la estrategia elige la tasa
 * según el tamaño de empresa que llega en el contexto.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_ESSALUD_AGRARIO = 'essalud_agrario';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaSaludAgrario {
  /** Remuneración Básica (base del aporte agrario). */
  remuneracionBasica: number;
  /** Tasa ya resuelta por la estrategia según el tamaño de empresa. */
  essaludTasa: number;
}

export function calcularSaludAgrario(
  entrada: EntradaSaludAgrario,
): ResultadoConcepto {
  if (entrada.remuneracionBasica <= 0) return { conceptos: [] };

  const monto = redondear2(entrada.remuneracionBasica * entrada.essaludTasa);
  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_ESSALUD_AGRARIO,
    descripcion: 'Aporte EsSalud agrario (empleador)',
    tipo: 'aporte',
    monto,
  };
  return { conceptos: [concepto] };
}
