/**
 * Orquestación por empleado del cálculo de planilla (borde de aplicación).
 *
 * Camino REAL nuevo, SIN motor legacy:
 *   1. Resuelve y valida el régimen (factory → estrategia → guardia certificación).
 *   2. Construye el DTO COMPLETO (~110 campos: estructura salarial, días
 *      detallados, ingresos/descuentos, aportes del empleador, remuneraciones
 *      computables, beneficios truncos) con el motor PURO del dominio
 *      `calcularDetalleCompleto`.
 *   3. Mapea Prisma → `EntradaCalculo` y calcula los montos load-bearing del
 *      régimen con el MOTOR `calcular-boleta` (fuente de verdad de los montos
 *      régimen-variables, OCP).
 *   4. SOBREESCRIBE los montos load-bearing del DTO completo con los del motor
 *      de régimen. Para GENERAL ambos coinciden al céntimo (probado por
 *      `paridad-detalle-completo.spec` y `paridad-camino-real.spec`); para los
 *      demás régimenes el motor manda.
 *
 * Esta capa NO importa Nest ni Prisma. El servicio Nest inyecta las filas y los
 * parámetros legales.
 */
import { ParametrosLegales } from '../dominio/parametros/parametros-legales';
import { calcularBoleta } from '../dominio/motor/calcular-boleta';
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { calcularDetalleCompleto } from '../dominio/detalle/calcular-detalle-completo';
import { PromediosDetalle } from '../dominio/detalle/tipos-detalle';
import { asegurarRegimenCertificado } from './guardia-certificacion';
import {
  mapearEntradaCalculo,
  EmpleadoParaMapeo,
} from './mapear-entrada-calculo';
import {
  mapearEntradaDetalle,
  EmpleadoParaDetalle,
} from './mapear-entrada-detalle';
import { extraerMontosLoadBearing } from './mapear-resultado-detalle';
import { EmpresaConRegimenDefault } from './resolver-regimen-laboral';

/** DTO de salida (mismo shape de ~130 campos que persiste el servicio). */
export type DetalleLegacy = Record<string, unknown>;

export interface ParametrosCalculoDetalle {
  empleado: EmpleadoParaMapeo & EmpleadoParaDetalle;
  empresa: EmpresaConRegimenDefault;
  mes: number;
  anio: number;
  acumuladoRenta: number;
  retencionesPreviasRenta: number;
  promedios: PromediosDetalle;
  parametros: ParametrosLegales;
}

/**
 * Calcula el detalle del empleado por el camino real nuevo y devuelve el DTO
 * completo con los montos load-bearing provenientes del MOTOR de régimen.
 *
 * Lanza `RegimenNoCertificadoError` (vía la guardia) ANTES de calcular si el
 * régimen no está certificado para producción (AGRARIO/CONSTRUCCION_CIVIL).
 */
export function calcularDetalleEmpleado(
  params: ParametrosCalculoDetalle,
): DetalleLegacy {
  const { empleado, empresa, mes, anio } = params;

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

  // DTO auxiliar COMPLETO desde el motor puro del dominio (reemplaza al legacy).
  const entradaDetalle = mapearEntradaDetalle({
    empleado,
    mes,
    anio,
    acumuladoRenta: params.acumuladoRenta,
    retencionesPreviasRenta: params.retencionesPreviasRenta,
    promedios: params.promedios,
  });
  const detalleCompleto = calcularDetalleCompleto(
    entradaDetalle,
    params.parametros,
  );

  // Montos load-bearing por el motor de régimen (fuente de verdad, OCP).
  const boleta = calcularBoleta(entrada, calculadora, params.parametros);
  const montos = extraerMontosLoadBearing(boleta);

  return {
    ...detalleCompleto,
    ...montos,
    // Snapshot del régimen laboral efectivamente resuelto y usado para este
    // empleado (contrato > default de empresa). Se persiste tal cual en
    // PlanillaDetalle.regimen_laboral: la planilla es una FOTO del cálculo y el
    // régimen del contrato puede cambiar después. El enum del dominio comparte
    // los mismos miembros que el enum Prisma (mapeo 1:1 por contrato de diseño),
    // por lo que el valor es directamente asignable al campo Prisma.
    regimen_laboral: entrada.regimenLaboral,
  };
}
