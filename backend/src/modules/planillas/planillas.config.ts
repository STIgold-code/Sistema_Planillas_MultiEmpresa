/**
 * Configuración de constantes para cálculo de planillas
 * Según legislación laboral peruana vigente
 *
 * IMPORTANTE: Actualizar estos valores cuando cambien las normas legales
 * - RMV: Actualizar cuando el gobierno modifique la Remuneración Mínima Vital
 * - UIT: Actualizar en enero de cada año
 * - ESSALUD_MINIMO: Recalcular si cambia la RMV (9% de RMV)
 */

// =============================================
// PARÁMETROS GENERALES
// =============================================

/** Remuneración Mínima Vital 2025 (S/.) */
export const RMV = Number(process.env.PLANILLA_RMV) || 1130;

/** Unidad Impositiva Tributaria 2026 (S/.) - D.S. 301-2025-EF */
export const UIT = Number(process.env.PLANILLA_UIT) || 5500;

/** Asignación familiar (10% de RMV) */
export const ASIGNACION_FAMILIAR =
  Number(process.env.PLANILLA_ASIG_FAMILIAR) || 113;

// =============================================
// APORTES Y CONTRIBUCIONES
// =============================================

/** ESSALUD - Porcentaje de aporte del empleador */
export const ESSALUD_PORCENTAJE =
  Number(process.env.PLANILLA_ESSALUD_PCT) || 0.09; // 9%

/** ESSALUD - Mínimo cuando Rem.Afecta < RMV (9% de RMV) */
export const ESSALUD_MINIMO = Number(process.env.PLANILLA_ESSALUD_MIN) || 101.7;

/** AFP - Aporte obligatorio del trabajador */
export const AFP_APORTE_PORCENTAJE =
  Number(process.env.PLANILLA_AFP_APORTE_PCT) || 0.1; // 10%

/** AFP - Prima de seguro */
export const AFP_SEGURO_PORCENTAJE =
  Number(process.env.PLANILLA_AFP_SEGURO_PCT) || 0.0137; // 1.37%

/** ONP - Porcentaje de aporte */
export const ONP_PORCENTAJE = Number(process.env.PLANILLA_ONP_PCT) || 0.13; // 13%

// =============================================
// HORAS EXTRAS Y TRABAJO NOCTURNO
// =============================================

/** Sobretasa por hora extra 25% (primeras 2 horas) - D.S. 007-2002-TR */
export const HE_SOBRETASA_25 = 0.25;

/** Sobretasa por hora extra 35% (desde 3ra hora) - D.S. 007-2002-TR */
export const HE_SOBRETASA_35 = 0.35;

/** Sobretasa por trabajo nocturno (10pm - 6am) - D.S. 007-2002-TR */
export const SOBRETASA_NOCTURNA = 0.35;

// =============================================
// VIDA LEY - D.U. 044-2019
// =============================================
// Obligatorio desde el primer día de trabajo
// Prima variable según aseguradora (típicamente 0.5% - 1.5%)

/** Vida Ley - Tasa de prima (configurable por empresa) */
export const VIDA_LEY_TASA =
  Number(process.env.PLANILLA_VIDA_LEY_TASA) || 0.0053; // 0.53% por defecto

// =============================================
// SCTR - Ley 26790 y D.S. 009-97-SA
// =============================================
// Obligatorio para actividades de riesgo (Anexo 5)
// Tasas según nivel de riesgo de la actividad económica

/** SCTR Nivel I - Actividades de bajo riesgo */
export const SCTR_NIVEL_I = 0.0063; // 0.63%

/** SCTR Nivel II - Actividades de riesgo moderado */
export const SCTR_NIVEL_II = 0.0123; // 1.23%

/** SCTR Nivel III - Actividades de riesgo alto */
export const SCTR_NIVEL_III = 0.0153; // 1.53%

/** SCTR Nivel IV - Actividades de riesgo muy alto */
export const SCTR_NIVEL_IV = 0.0183; // 1.83%

/** SCTR Salud - Tasa configurable (depende del nivel de riesgo) */
export const SCTR_SALUD_TASA =
  Number(process.env.PLANILLA_SCTR_SALUD_TASA) || SCTR_NIVEL_II;

/** SCTR Pensión - Tasa configurable (depende del nivel de riesgo) */
export const SCTR_PENSION_TASA =
  Number(process.env.PLANILLA_SCTR_PENSION_TASA) || SCTR_NIVEL_II;

// =============================================
// CONSTANTES DEPRECADAS (mantener por compatibilidad)
// =============================================

/** @deprecated Usar cálculo dinámico: (sueldo/30) × 2 */
export const FERIADO_SIN_ASIG_FAM =
  Number(process.env.PLANILLA_FERIADO_SIN_AF) || 103.58;

/** @deprecated Usar cálculo dinámico: (sueldo/30) × 2 */
export const FERIADO_CON_ASIG_FAM =
  Number(process.env.PLANILLA_FERIADO_CON_AF) || 113.94;

/** @deprecated Usar fórmula legal: (sueldo/30/8) × 1.25 */
export const HE25_BASE_RATIO =
  Number(process.env.PLANILLA_HE25_RATIO) || 0.2979;

/** @deprecated Usar fórmula legal: (sueldo/30/8) × 1.35 */
export const HE35_BASE_RATIO =
  Number(process.env.PLANILLA_HE35_RATIO) || 0.1609;

// =============================================
// IR 5TA CATEGORÍA
// =============================================

/**
 * Tramos del Impuesto a la Renta de 5ta Categoría
 * Según Art. 53 de la Ley del Impuesto a la Renta
 *
 * Los límites están expresados en UITs
 */
export const TRAMOS_IR_5TA = [
  { hasta: 5, tasa: 0.08 }, // Hasta 5 UIT: 8%
  { hasta: 20, tasa: 0.14 }, // Más de 5 hasta 20 UIT: 14%
  { hasta: 35, tasa: 0.17 }, // Más de 20 hasta 35 UIT: 17%
  { hasta: 45, tasa: 0.2 }, // Más de 35 hasta 45 UIT: 20%
  { hasta: Infinity, tasa: 0.3 }, // Más de 45 UIT: 30%
];

/** Deducción fija para trabajadores dependientes (en UITs) */
export const DEDUCCION_7UIT = 7;

// =============================================
// FUNCIONES DE CÁLCULO
// =============================================

/**
 * Calcula el Impuesto a la Renta de 5ta Categoría según legislación peruana
 *
 * Procedimiento (Art. 40 Reglamento LIR):
 * 1. Proyectar remuneración anual
 * 2. Sumar gratificaciones (julio y diciembre)
 * 3. Restar 7 UIT (deducción fija)
 * 4. Aplicar tasas progresivas
 * 5. Dividir entre meses restantes del año
 *
 * @param remuneracionMensual Remuneración bruta afecta mensual
 * @param mes Mes actual (1-12)
 * @param acumuladoAnterior Suma de remuneraciones de meses anteriores del año
 * @param retencionesPrevias IR ya retenido en meses anteriores
 * @returns Retención mensual de IR 5ta categoría
 */
export function calcularIR5taCategoria(
  remuneracionMensual: number,
  mes: number,
  acumuladoAnterior: number = 0,
  retencionesPrevias: number = 0,
): number {
  if (remuneracionMensual <= 0) return 0;

  // 1. Proyectar renta bruta anual
  const mesesRestantes = 12 - mes + 1;
  const rentaProyectada =
    acumuladoAnterior + remuneracionMensual * mesesRestantes;

  // 2. Agregar gratificaciones (julio y diciembre, si no han sido pagadas)
  let gratificaciones = 0;
  if (mes <= 7) gratificaciones += remuneracionMensual; // Gratificación julio
  if (mes <= 12) gratificaciones += remuneracionMensual; // Gratificación diciembre

  const rentaBrutaAnual = rentaProyectada + gratificaciones;

  // 3. Deducir 7 UIT (deducción fija para trabajadores dependientes)
  const deduccion = DEDUCCION_7UIT * UIT;
  const rentaNetaAnual = Math.max(0, rentaBrutaAnual - deduccion);

  if (rentaNetaAnual <= 0) return 0;

  // 4. Calcular impuesto anual por tramos
  let impuestoAnual = 0;
  let rentaRestante = rentaNetaAnual;
  let tramoAnterior = 0;

  for (const tramo of TRAMOS_IR_5TA) {
    const limiteTramo = tramo.hasta * UIT;
    const baseTramo = Math.min(rentaRestante, limiteTramo - tramoAnterior);

    if (baseTramo > 0) {
      impuestoAnual += baseTramo * tramo.tasa;
      rentaRestante -= baseTramo;
      tramoAnterior = limiteTramo;
    }

    if (rentaRestante <= 0) break;
  }

  // 5. Calcular retención mensual
  // Descontar retenciones previas y dividir entre meses restantes
  const retencionPendiente = Math.max(0, impuestoAnual - retencionesPrevias);
  const retencionMensual = retencionPendiente / mesesRestantes;

  return Math.round(retencionMensual * 100) / 100;
}

/**
 * Redondea un número a 2 decimales de forma segura
 */
export function round2(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return isNaN(rounded) ? 0 : rounded;
}

/**
 * Convierte un valor a número de forma segura
 */
export function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
