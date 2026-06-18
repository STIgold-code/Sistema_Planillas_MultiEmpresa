/**
 * Guardia de certificación de producción.
 *
 * Bloquea la emisión de nómina REAL para régimenes cuyas reglas legales aún no
 * fueron confirmadas por un contador (`certificadoProduccion = false`: AGRARIO y
 * CONSTRUCCION_CIVIL hoy). El motor SÍ calcula esos régimenes (para pruebas y
 * validación), pero un proceso de planilla real debe invocar esta guardia para
 * que sea IMPOSIBLE emitir una boleta sin que el bloqueo sea evidente.
 *
 * Mecanismo elegido (documentado): lanzar `RegimenNoCertificadoError` en el borde
 * de aplicación, ANTES de calcular/persistir. Es preferible a un flag silencioso
 * o a marcar la boleta a posteriori porque el cálculo nunca llega a la BD: no hay
 * planilla "a medias" que un usuario pueda confundir con una válida.
 *
 * Cómo se levanta: cuando el contador confirme los puntos pendientes y se cambie
 * `CERTIFICADO_PRODUCCION` a `true` en la estrategia respectiva, la guardia deja
 * de bloquear ese régimen automáticamente.
 */
import { CalculadoraRegimen } from '../dominio/regimenes/calculadora-regimen.interface';
import { RegimenLaboral } from '../dominio/tipos';

/** Se lanza cuando se intenta correr planilla real con un régimen no certificado. */
export class RegimenNoCertificadoError extends Error {
  constructor(public readonly regimen: RegimenLaboral) {
    super(
      `El régimen "${regimen}" no está certificado para producción: sus reglas ` +
        `legales están pendientes de verificación por un contador. No se puede ` +
        `emitir planilla real hasta que se confirmen y se certifique el régimen.`,
    );
    this.name = 'RegimenNoCertificadoError';
  }
}

/**
 * Lanza `RegimenNoCertificadoError` si la estrategia no está certificada para
 * producción. No-op si lo está.
 */
export function asegurarRegimenCertificado(
  calculadora: CalculadoraRegimen,
): void {
  if (!calculadora.certificadoProduccion) {
    throw new RegimenNoCertificadoError(calculadora.regimen);
  }
}
