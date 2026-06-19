import { ahoraPeru, leerFechaPrisma } from '../utils/datetime.util';

/**
 * Reglas de negocio configurables del sistema RRHH
 * Estas constantes definen los límites y validaciones legales/empresariales
 */

export const BUSINESS_RULES = {
  // Edad mínima para trabajar (Ley peruana)
  EDAD_MINIMA: 18,

  // Sueldo mínimo vital vigente en Perú (S/.)
  // Actualizado: Mayo 2024 - D.S. N° 003-2024-TR
  SUELDO_MINIMO_PERU: 1025,

  // Sueldo por defecto al crear empleado (puede ser mayor al mínimo)
  SUELDO_DEFAULT: 1130,

  // Días de vigencia por defecto para documentos (1 año)
  DOCUMENTO_VIGENCIA_DEFECTO_DIAS: 365,

  // Días de anticipación para alertas de vencimiento
  ALERTA_VENCIMIENTO_DIAS: {
    CONTRATO: [30, 15, 7],
    DOCUMENTO: [30, 15, 7],
  },

  // Período de prueba en meses
  PERIODO_PRUEBA_MESES: 3,

  // Duración por defecto de contrato sujeto a modalidad (meses)
  CONTRATO_SUJETO_MODALIDAD_MESES: 3,

  // Límite máximo de horas extras semanales (Ley peruana)
  HORAS_EXTRAS_MAX_SEMANAL: 12,

  // Días de vacaciones por año
  VACACIONES_DIAS_POR_ANO: 30,
};

/**
 * Mensajes de error para validaciones de negocio
 */
export const BUSINESS_ERROR_MESSAGES = {
  SUELDO_MENOR_MINIMO: `El sueldo base no puede ser menor al sueldo mínimo vital (S/. ${BUSINESS_RULES.SUELDO_MINIMO_PERU})`,
  EDAD_MENOR_MINIMA: `El empleado debe tener al menos ${BUSINESS_RULES.EDAD_MINIMA} años de edad`,
  DNI_DUPLICADO_GLOBAL:
    'Ya existe un empleado ACTIVO con este número de documento en el sistema',
  DNI_DUPLICADO_EMPRESA:
    'Ya existe un empleado con este número de documento en esta empresa',
  DOCUMENTOS_OBLIGATORIOS_FALTANTES:
    'No se puede completar la operación. Faltan documentos obligatorios',
  DOCUMENTOS_VENCIDOS:
    'No se puede activar al empleado. Tiene documentos obligatorios vencidos',
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 * @param fechaNacimiento - Fecha de nacimiento
 * @returns Edad en años
 */
export function calcularEdad(fechaNacimiento: Date): number {
  const hoyPeru = ahoraPeru();
  const nac = leerFechaPrisma(fechaNacimiento);
  let edad = hoyPeru.year - nac.year;
  const mes = hoyPeru.month - nac.month;

  if (mes < 0 || (mes === 0 && hoyPeru.day < nac.day)) {
    edad--;
  }

  return edad;
}

/**
 * Valida si una fecha de nacimiento cumple con la edad mínima
 * @param fechaNacimiento - Fecha de nacimiento a validar
 * @returns true si cumple con la edad mínima
 */
export function validarEdadMinima(
  fechaNacimiento: Date | string | null,
): boolean {
  if (!fechaNacimiento) return false;

  const fecha =
    typeof fechaNacimiento === 'string'
      ? new Date(fechaNacimiento)
      : fechaNacimiento;
  const edad = calcularEdad(fecha);

  return edad >= BUSINESS_RULES.EDAD_MINIMA;
}

/**
 * Valida si un sueldo cumple con el mínimo legal
 * @param sueldo - Sueldo a validar
 * @returns true si cumple con el mínimo
 */
export function validarSueldoMinimo(
  sueldo: number | null | undefined,
): boolean {
  if (sueldo === null || sueldo === undefined) return true; // Se aplicará el default
  return sueldo >= BUSINESS_RULES.SUELDO_MINIMO_PERU;
}

/**
 * Estados de filtro para documentos de empleados
 * Usado en el listado de empleados para filtrar por estado de documentación
 */
export enum EstadoDocumentosFilter {
  VENCIDOS = 'vencidos',
  POR_VENCER = 'por_vencer',
  INCOMPLETOS = 'incompletos',
}

/**
 * Días para considerar un documento "por vencer"
 * Usa el primer valor de ALERTA_VENCIMIENTO_DIAS.DOCUMENTO (30 días)
 */
export const DIAS_POR_VENCER_DOCUMENTO =
  BUSINESS_RULES.ALERTA_VENCIMIENTO_DIAS.DOCUMENTO[0];
