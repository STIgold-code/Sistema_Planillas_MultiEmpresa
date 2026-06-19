/**
 * Guardia de certificación a nivel de EMPLEADO (borde de aplicación).
 *
 * Resuelve el régimen laboral efectivo del empleado (contrato del período con
 * prioridad sobre el default de la empresa), construye la estrategia vía factory
 * y aplica `asegurarRegimenCertificado`. Bloquea cualquier proceso de nómina
 * REAL para régimenes no certificados (AGRARIO/CONSTRUCCION_CIVIL) ANTES de
 * persistir.
 *
 * Centraliza el patrón usado por los servicios que promueven o reescriben
 * montos de planilla (edición de detalle, generación de boletas), de modo que
 * NINGÚN camino real pueda saltarse la guardia. Reutiliza la misma lógica que el
 * cálculo de planilla (`calcular-detalle-empleado.ts`).
 */
import { crearCalculadoraRegimen } from '../dominio/regimenes/regimen.factory';
import { asegurarRegimenCertificado } from './guardia-certificacion';
import {
  resolverRegimenLaboral,
  ContratoConRegimen,
  EmpresaConRegimenDefault,
} from './resolver-regimen-laboral';

/** Subset del empleado necesario para resolver y certificar el régimen. */
export interface EmpleadoParaCertificacion {
  contratos: ContratoConRegimen[];
  empresa: EmpresaConRegimenDefault;
}

/**
 * Lanza `RegimenNoCertificadoError` si el régimen efectivo del empleado no está
 * certificado para producción. No-op si lo está.
 */
export function asegurarEmpleadoCertificado(
  empleado: EmpleadoParaCertificacion,
): void {
  const contratoPeriodo = empleado.contratos?.[0] ?? null;
  const regimen = resolverRegimenLaboral(contratoPeriodo, empleado.empresa);
  const calculadora = crearCalculadoraRegimen(regimen);
  asegurarRegimenCertificado(calculadora);
}
