/**
 * Catálogo de regímenes laborales peruanos.
 *
 * Fuente única de la verdad para labels, certificación e implicaciones
 * de cada régimen. Compartido entre el formulario de contrato, la
 * configuración de empresa y el badge de régimen.
 *
 * Los valores del enum deben coincidir EXACTAMENTE con el backend:
 * GENERAL | PEQUENA_EMPRESA | MICROEMPRESA | AGRARIO | CONSTRUCCION_CIVIL | HOGAR
 *
 * "certificado": indica si el régimen ya está habilitado para generar
 * planilla real en producción. Los no certificados (AGRARIO,
 * CONSTRUCCION_CIVIL) se pueden ASIGNAR a un contrato, pero el backend
 * bloquea la generación de planilla real hasta su certificación contable.
 */

export const REGIMENES_LABORALES = [
  'GENERAL',
  'PEQUENA_EMPRESA',
  'MICROEMPRESA',
  'AGRARIO',
  'CONSTRUCCION_CIVIL',
  'HOGAR',
] as const;

export type RegimenLaboral = (typeof REGIMENES_LABORALES)[number];

export interface RegimenInfo {
  /** Valor del enum, idéntico al backend. */
  value: RegimenLaboral;
  /** Etiqueta legible para mostrar al usuario. */
  label: string;
  /** Etiqueta corta para badges y listas compactas. */
  labelCorto: string;
  /** true = habilitado para generar planilla real en producción. */
  certificado: boolean;
  /** Resumen de beneficios/implicaciones del régimen. */
  implicaciones: string;
}

export const REGIMENES_INFO: Record<RegimenLaboral, RegimenInfo> = {
  GENERAL: {
    value: 'GENERAL',
    label: 'General (D.L. 728)',
    labelCorto: 'General',
    certificado: true,
    implicaciones:
      'Gratificación: 2 sueldos/año · CTS: 1 sueldo · Vacaciones: 30 días',
  },
  PEQUENA_EMPRESA: {
    value: 'PEQUENA_EMPRESA',
    label: 'Pequeña empresa (REMYPE)',
    labelCorto: 'Pequeña empresa',
    certificado: true,
    implicaciones:
      'Gratificación: ½ sueldo · CTS: ½ sueldo · Vacaciones: 15 días',
  },
  MICROEMPRESA: {
    value: 'MICROEMPRESA',
    label: 'Microempresa (REMYPE)',
    labelCorto: 'Microempresa',
    certificado: true,
    implicaciones:
      'Sin gratificación · Sin CTS · Vacaciones: 15 días · Salud SIS',
  },
  AGRARIO: {
    value: 'AGRARIO',
    label: 'Agrario (Ley 31110)',
    labelCorto: 'Agrario',
    certificado: false,
    implicaciones: 'Régimen agrario · pendiente de certificación contable',
  },
  CONSTRUCCION_CIVIL: {
    value: 'CONSTRUCCION_CIVIL',
    label: 'Construcción civil',
    labelCorto: 'Construcción civil',
    certificado: false,
    implicaciones: 'Régimen propio · pendiente de certificación contable',
  },
  HOGAR: {
    value: 'HOGAR',
    label: 'Trabajadoras del hogar (Ley 31047)',
    labelCorto: 'Trabajadoras del hogar',
    certificado: true,
    implicaciones: 'Gratificación: 1 sueldo · CTS: 1 sueldo · Vacaciones: 30 días',
  },
};

/** Lista ordenada de regímenes para iterar en selects. */
export const REGIMENES_LISTA: RegimenInfo[] =
  REGIMENES_LABORALES.map((r) => REGIMENES_INFO[r]);

/** Aviso a mostrar cuando se elige un régimen no certificado. */
export const AVISO_REGIMEN_NO_CERTIFICADO =
  'Podrás registrar el contrato, pero aún no generar planilla real para este régimen (pendiente de certificación contable).';

/**
 * Devuelve la info de un régimen a partir de su valor, o null si el
 * valor es vacío/desconocido (p. ej. "heredar de la empresa").
 */
export function obtenerRegimenInfo(
  value: string | null | undefined,
): RegimenInfo | null {
  if (!value) return null;
  return REGIMENES_INFO[value as RegimenLaboral] ?? null;
}
