/**
 * Orquestación por empleado del cálculo de planilla (borde de aplicación).
 *
 * Encadena el CAMINO REAL nuevo:
 *   1. Resuelve y valida el régimen (factory → estrategia → guardia certificación).
 *   2. Mapea Prisma → `EntradaCalculo` (mapper de aplicación).
 *   3. Calcula la boleta por el MOTOR NUEVO (`calcular-boleta`) usando el adapter
 *      Prisma de `ParametrosLegales`. El motor es la FUENTE DE VERDAD de los
 *      montos load-bearing del régimen.
 *   4. Completa los ~110 campos auxiliares del DTO (estructura salarial, días
 *      detallados, vida ley, SCTR empleador, computables, beneficios truncos) con
 *      el paso auxiliar legacy `calcularEmpleado`, y SOBREESCRIBE los montos
 *      load-bearing con los del motor nuevo. Así el motor queda en la ruta crítica
 *      real y la paridad de montos está blindada por `paridad-camino-real.spec`.
 *
 * Esta capa NO importa Nest. El servicio Nest le inyecta Prisma, los parámetros
 * legales y los promedios ya calculados.
 */
import { ParametrosLegales } from '../dominio/parametros/parametros-legales';
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { asegurarRegimenCertificado } from './guardia-certificacion';
import {
  mapearEntradaCalculo,
  EmpleadoParaMapeo,
} from './mapear-entrada-calculo';
import { extraerMontosLoadBearing } from './mapear-resultado-detalle';
import { EmpresaConRegimenDefault } from './resolver-regimen-laboral';

/** Salida del paso auxiliar legacy (DTO completo de ~130 campos). */
export type DetalleLegacy = Record<string, unknown>;

export interface ParametrosCalculoDetalle {
  empleado: EmpleadoParaMapeo;
  empresa: EmpresaConRegimenDefault;
  mes: number;
  anio: number;
  acumuladoRenta: number;
  retencionesPreviasRenta: number;
  /**
   * DTO auxiliar producido por el motor legacy (estructura/días/aportes
   * empleador/computables/truncos). El motor nuevo sobreescribe sus montos
   * load-bearing.
   */
  detalleLegacy: DetalleLegacy;
  parametros: ParametrosLegales;
}

/**
 * Calcula el detalle del empleado por el camino real nuevo y devuelve el DTO
 * completo con los montos load-bearing provenientes del MOTOR NUEVO.
 *
 * Lanza `RegimenNoCertificadoError` (vía la guardia) ANTES de calcular si el
 * régimen no está certificado para producción (AGRARIO/CONSTRUCCION_CIVIL).
 */
export function calcularDetalleEmpleado(
  params: ParametrosCalculoDetalle,
): DetalleLegacy {
  const { empleado, empresa, mes, anio, detalleLegacy } = params;

  const entrada = mapearEntradaCalculo({
    empleado,
    empresa,
    mes,
    anio,
    acumuladoRenta: params.acumuladoRenta,
    retencionesPreviasRenta: params.retencionesPreviasRenta,
  });

  const calculadora = crearCalculadoraRegimen(entrada.regimenLaboral);
  // Guardia de certificación: bloquea régimenes no certificados ANTES de calcular.
  asegurarRegimenCertificado(calculadora);

  const boleta = calcularBoleta(entrada, calculadora, params.parametros);
  const montos = extraerMontosLoadBearing(boleta);

  // El motor nuevo es la fuente de verdad de los montos load-bearing; el resto del
  // DTO (auxiliar) viene del paso legacy. La paridad de montos está garantizada
  // por paridad-camino-real.spec (motor === legacy al céntimo en GENERAL).
  return {
    ...detalleLegacy,
    ...montos,
  };
}
