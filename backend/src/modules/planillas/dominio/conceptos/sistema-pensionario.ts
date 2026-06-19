/**
 * Concepto: sistema-pensionario (AFP / ONP).
 *
 * RENAME: this is the refactor of `calculos/deducciones.ts` into a pure domain
 * concept. Disambiguation: this models `sistema_pensionario` (AFP/ONP), which
 * is ORTHOGONAL to `regimen_laboral` (D.L. 728, REMYPE, etc.). The pension
 * descuento is régimen-agnostic — it depends only on the afecta base and the
 * worker's pension affiliation.
 *
 * - ONP: tasa fija 13% (con fallback si la tasa de la afiliación viene 0).
 * - AFP: 3 componentes (aporte obligatorio + prima seguro + comisión flujo)
 *   con tasas dinámicas (SBS) ya expresadas como fracciones.
 *
 * Referencias: TUO Ley del SPP (D.S. 054-97-EF); Ley 19990 (ONP).
 */
import {
  AfiliacionPensionaria,
  ResultadoConcepto,
  SistemaPensionario,
} from '../tipos';

export const CLAVE_ONP = 'onp';
export const CLAVE_AFP_APORTE = 'afp_aporte';
export const CLAVE_AFP_PRIMA = 'afp_prima';
export const CLAVE_AFP_COMISION = 'afp_comision';

/** Tasa ONP por defecto (13%) usada como fallback. */
const ONP_TASA_DEFECTO = 0.13;

const redondear2 = (valor: number): number => {
  const r = Math.round(valor * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

const descuento = (clave: string, descripcion: string, monto: number) => ({
  clave,
  descripcion,
  tipo: 'descuento' as const,
  monto: redondear2(monto),
});

export function calcularSistemaPensionario(
  baseAfecta: number,
  afiliacion: AfiliacionPensionaria | null,
): ResultadoConcepto {
  if (!afiliacion) return { conceptos: [] };

  if (afiliacion.sistema === SistemaPensionario.ONP) {
    const tasa = afiliacion.tasas?.aporteObligatorio || ONP_TASA_DEFECTO;
    return {
      conceptos: [descuento(CLAVE_ONP, 'Aporte ONP', baseAfecta * tasa)],
    };
  }

  // AFP
  const tasas = afiliacion.tasas ?? {
    aporteObligatorio: 0,
    primaSeguro: 0,
    comisionFlujo: 0,
  };
  return {
    conceptos: [
      descuento(
        CLAVE_AFP_APORTE,
        'Aporte AFP',
        baseAfecta * tasas.aporteObligatorio,
      ),
      descuento(
        CLAVE_AFP_PRIMA,
        'Prima seguro AFP',
        baseAfecta * tasas.primaSeguro,
      ),
      descuento(
        CLAVE_AFP_COMISION,
        'Comisión AFP',
        baseAfecta * tasas.comisionFlujo,
      ),
    ],
  };
}
