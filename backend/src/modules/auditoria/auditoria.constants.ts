/**
 * Constantes del módulo de auditoría
 * Centraliza validaciones y configuración para seguridad y consistencia
 */

/**
 * Lista blanca de tablas auditables
 * Solo estas tablas pueden ser consultadas via los endpoints de historial
 */
export const TABLAS_AUDITABLES = [
  'empleados',
  'contratos',
  'planillas',
  'periodos_tareo',
  'sesiones_tareo',
  'justificaciones_tareo',
  'solicitudes_vacaciones',
  'vacantes',
  'postulantes',
  'users',
  'boletas',
  'documentos',
] as const;

export type TablaAuditable = (typeof TABLAS_AUDITABLES)[number];

/**
 * Configuración de paginación
 */
export const AUDITORIA_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  MAX_EXPORT_LIMIT: 10000,
} as const;

/**
 * Valida si una tabla está en la lista blanca
 */
export function isTablaAuditable(tabla: string): tabla is TablaAuditable {
  return TABLAS_AUDITABLES.includes(tabla as TablaAuditable);
}

/**
 * Parsea un valor numérico de forma segura
 * Retorna undefined si el valor no es un número válido
 */
export function parseIntSafe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parsea una fecha de forma segura
 * Retorna undefined si la fecha no es válida
 */
export function parseDateSafe(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Parsea y limita el valor de paginación
 */
export function parsePagination(
  page?: string,
  limit?: string,
): { page: number; limit: number } {
  const parsedPage = Math.max(
    1,
    parseIntSafe(page) || AUDITORIA_PAGINATION.DEFAULT_PAGE,
  );
  const parsedLimit = Math.min(
    AUDITORIA_PAGINATION.MAX_LIMIT,
    Math.max(1, parseIntSafe(limit) || AUDITORIA_PAGINATION.DEFAULT_LIMIT),
  );
  return { page: parsedPage, limit: parsedLimit };
}
