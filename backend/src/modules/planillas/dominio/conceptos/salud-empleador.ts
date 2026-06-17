/**
 * Concepto régimen-variable: aporte de salud del empleador.
 *
 * GENERAL/REMYPE pequeña/agrario/hogar/construcción: EsSalud 9% sobre la
 * remuneración afecta, con piso = 9% de la RMV cuando la afecta es menor a la
 * RMV. Microempresa usa SIS (monto fijo) en su propia estrategia, no aquí.
 *
 * Es un APORTE del empleador (no descuenta al trabajador). Todos los montos
 * (RMV, tasa, piso) se resuelven vía `ParametrosLegales` en la estrategia.
 *
 * Régimen-variable: vive detrás de `CalculadoraRegimen`.
 */
import { ConceptoBoleta, ResultadoConcepto } from '../tipos';

export const CLAVE_ESSALUD = 'essalud_empleador';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export interface EntradaSaludEmpleador {
  remuneracionAfecta: number;
  rmv: number;
  essaludTasa: number;
  essaludMinimo: number;
}

export function calcularSaludEmpleador(
  entrada: EntradaSaludEmpleador,
): ResultadoConcepto {
  if (entrada.remuneracionAfecta <= 0) return { conceptos: [] };

  const monto =
    entrada.remuneracionAfecta < entrada.rmv
      ? redondear2(entrada.essaludMinimo)
      : redondear2(entrada.remuneracionAfecta * entrada.essaludTasa);

  if (monto <= 0) return { conceptos: [] };

  const concepto: ConceptoBoleta = {
    clave: CLAVE_ESSALUD,
    descripcion: 'Aporte EsSalud (empleador)',
    tipo: 'aporte',
    monto,
  };
  return { conceptos: [concepto] };
}
