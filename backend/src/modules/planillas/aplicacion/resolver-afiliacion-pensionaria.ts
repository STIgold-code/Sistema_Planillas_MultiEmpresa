/**
 * Borde de aplicación COMPARTIDO por los dos motores: traduce la fila Prisma
 * `regimenes_pensionarios` + el `tipo_comision_afp` del empleado a la
 * `AfiliacionPensionaria` pura del dominio.
 *
 * Vive en un módulo propio a propósito. `mapear-entrada-calculo` (camino de
 * régimen) y `mapear-entrada-detalle` (camino de detalle) alimentan el MISMO
 * campo `afp_comision` del DTO —el segundo motor pisa al primero en
 * `extraerMontosLoadBearing`—, así que si cada uno resolviera la tasa por su
 * cuenta, una divergencia haría que la planilla persista un valor y la boleta
 * muestre otro. Con una sola función la paridad es estructural, no una
 * coincidencia que haya que testear campo por campo.
 *
 * Traducción: el schema guarda las tasas como PORCENTAJE (10, 13, 1.47…); el
 * dominio las espera como fracción, de ahí la división entre 100.
 */
import {
  normalizarTipoComisionAfp,
  resolverTasaComisionAfp,
} from '../dominio/conceptos/comision-afp';
import { AfiliacionPensionaria, SistemaPensionario } from '../dominio/tipos';

/** Subset de `regimenes_pensionarios` que el cálculo pensionario necesita. */
export interface RegimenPensionarioParaAfiliacion {
  tipo: string;
  aporte_obligatorio: unknown;
  prima_seguro: unknown;
  comision_flujo: unknown;
  /**
   * Componente sobre flujo de la comisión MIXTA. Opcional: las filas y fixtures
   * previos a modelar la modalidad no lo traen y caen a 0, que es exactamente lo
   * que corresponde cuando la tasa no está cargada.
   */
  comision_mixta_flujo?: unknown;
}

const aNumero = (valor: unknown): number => {
  const n = Number(valor);
  return Number.isNaN(n) ? 0 : n;
};

export function resolverAfiliacionPensionaria(
  regimen: RegimenPensionarioParaAfiliacion | null,
  tipoComision: unknown,
): AfiliacionPensionaria | null {
  if (!regimen) return null;

  if (regimen.tipo === 'ONP') {
    return {
      sistema: SistemaPensionario.ONP,
      tasas: {
        aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
        primaSeguro: 0,
        comisionFlujo: 0,
      },
    };
  }

  return {
    sistema: SistemaPensionario.AFP,
    tasas: {
      aporteObligatorio: aNumero(regimen.aporte_obligatorio) / 100,
      primaSeguro: aNumero(regimen.prima_seguro) / 100,
      comisionFlujo: resolverTasaComisionAfp(
        {
          flujo: aNumero(regimen.comision_flujo) / 100,
          mixtaFlujo: aNumero(regimen.comision_mixta_flujo) / 100,
        },
        normalizarTipoComisionAfp(tipoComision),
      ),
    },
  };
}
