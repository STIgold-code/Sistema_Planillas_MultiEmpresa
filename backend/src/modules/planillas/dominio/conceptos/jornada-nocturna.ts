/**
 * Concepto: jornada-nocturna (sobretasa 35%, D.S. 007-2002-TR).
 *
 * La sobretasa nocturna (35%) se aplica sobre la remuneración correspondiente
 * a los días trabajados en horario nocturno (10pm-6am).
 *
 * [ASUNCIÓN A VALIDAR]: la base de cálculo nocturna no puede ser menor a la
 * RMV (piso). La RMV se resuelve vía `ParametrosLegales` — nunca hardcodeada.
 * Confirmar la redacción exacta contra la norma citada antes de fijar este
 * piso de forma definitiva.
 *
 * Régimen-agnostic: depende solo de la remuneración, los días nocturnos y la RMV.
 */
import { ParametrosLegales } from '../parametros/parametros-legales';
import { ResultadoConcepto } from '../tipos';

export const CLAVE_BONIF_NOCTURNA = 'bonificacion_nocturna';

const SOBRETASA_NOCTURNA = 0.35;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

export function calcularJornadaNocturna(
  remuneracionMensual: number,
  diasNocturnos: number,
  fecha: Date,
  params: ParametrosLegales,
): ResultadoConcepto {
  if (diasNocturnos <= 0) return { conceptos: [] };

  const rmv = params.rmv(fecha);
  const baseMensual = Math.max(remuneracionMensual, rmv);
  const baseDiaria = baseMensual / 30;
  const monto = redondear2(baseDiaria * diasNocturnos * SOBRETASA_NOCTURNA);

  if (monto <= 0) return { conceptos: [] };

  return {
    conceptos: [
      {
        clave: CLAVE_BONIF_NOCTURNA,
        descripcion: 'Bonificación por trabajo nocturno (35%)',
        tipo: 'ingreso',
        monto,
      },
    ],
  };
}
