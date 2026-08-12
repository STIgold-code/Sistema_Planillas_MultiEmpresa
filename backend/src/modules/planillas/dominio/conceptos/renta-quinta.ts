/**
 * Concepto: renta-quinta (Impuesto a la Renta de 5ta categoría).
 *
 * Pure refactor of `planillas.config.ts#calcularIR5taCategoria`. UIT y tramos
 * se resuelven vía `ParametrosLegales` por la fecha del período — sin números
 * mágicos en el dominio.
 *
 * Procedimiento (Art. 40 Reglamento LIR):
 * 1. Proyectar renta bruta anual.
 * 2. Sumar gratificaciones (julio y diciembre, si aún no pagadas).
 * 3. Restar 7 UIT (deducción fija para dependientes).
 * 4. Aplicar tasas progresivas por tramo.
 * 5. Descontar retenciones previas y dividir entre meses restantes.
 * 6. Inciso e): los ingresos EXTRAORDINARIOS del mes no se proyectan — se suman
 *    a la renta del ejercicio y su impuesto adicional se retiene íntegro en el
 *    mes en que se ponen a disposición.
 *
 * Régimen-agnostic: depende solo de la remuneración, el mes y los parámetros.
 */
import { ParametrosLegales } from '../parametros/parametros-legales';
import { ResultadoConcepto } from '../tipos';
import {
  impuestoAnualPorTramos,
  impuestoIngresosExtraordinarios,
} from './escala-impuesto-renta';

export const CLAVE_RENTA_5TA = 'renta_5ta';

/** Deducción fija para trabajadores dependientes (en UITs). */
const DEDUCCION_UIT = 7;

/**
 * Tasa plana para trabajadores NO DOMICILIADOS (Art. 54 inc. f y Art. 76 LIR):
 * retención mensual definitiva del 30% sobre la renta, SIN deducción de 7 UIT
 * y SIN proyección anual por tramos.
 */
const TASA_NO_DOMICILIADO = 0.3;

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

/**
 * @param ingresosExtraordinariosMes Montos distintos de la remuneración
 * ordinaria puestos a disposición ESTE mes (bonificación extraordinaria de la
 * Ley 30334, utilidades, reintegros). Ver `impuestoIngresosExtraordinarios`.
 */
export function calcularRentaQuinta(
  remuneracionMensual: number,
  mes: number,
  fecha: Date,
  params: ParametrosLegales,
  acumuladoAnterior = 0,
  retencionesPrevias = 0,
  domiciliado = true,
  ingresosExtraordinariosMes = 0,
): ResultadoConcepto {
  const extraordinarios = Math.max(0, ingresosExtraordinariosMes);
  if (remuneracionMensual <= 0 && extraordinarios <= 0)
    return { conceptos: [] };

  // NO DOMICILIADO: retención mensual definitiva del 30% sobre la renta del
  // mes, sin deducción ni proyección (Art. 54 inc. f y Art. 76 LIR). Los
  // extraordinarios del mes también son renta puesta a disposición.
  if (!domiciliado) {
    return {
      conceptos: [
        {
          clave: CLAVE_RENTA_5TA,
          descripcion: 'Retención IR 5ta categoría (no domiciliado 30%)',
          tipo: 'descuento',
          monto: redondear2(
            (remuneracionMensual + extraordinarios) * TASA_NO_DOMICILIADO,
          ),
        },
      ],
    };
  }

  const uit = params.uit(fecha);
  const tramos = params.tramosIR(fecha);

  const mesesRestantes = 12 - mes + 1;
  const rentaProyectada =
    acumuladoAnterior + remuneracionMensual * mesesRestantes;

  let gratificaciones = 0;
  if (mes <= 7) gratificaciones += remuneracionMensual;
  if (mes <= 12) gratificaciones += remuneracionMensual;

  const rentaBrutaAnual = rentaProyectada + gratificaciones;
  const deduccion = DEDUCCION_UIT * uit;
  const rentaNetaAnual = Math.max(0, rentaBrutaAnual - deduccion);

  // Cuota ordinaria del mes (incisos a–d): impuesto anual proyectado menos lo
  // ya retenido, prorrateado entre los meses que faltan del ejercicio.
  const impuestoAnual = impuestoAnualPorTramos(rentaNetaAnual, uit, tramos);
  const pendiente = Math.max(0, impuestoAnual - retencionesPrevias);
  const cuotaOrdinaria = pendiente / mesesRestantes;

  // Inciso e): el extraordinario del mes no se proyecta — su impuesto adicional
  // se retiene íntegro en este mes.
  const impuestoExtraordinarios = impuestoIngresosExtraordinarios(
    rentaBrutaAnual,
    extraordinarios,
    impuestoAnual,
    deduccion,
    uit,
    tramos,
  );

  const retencionMensual = redondear2(cuotaOrdinaria + impuestoExtraordinarios);
  if (retencionMensual <= 0) return { conceptos: [] };

  return {
    conceptos: [
      {
        clave: CLAVE_RENTA_5TA,
        descripcion: 'Retención IR 5ta categoría',
        tipo: 'descuento',
        monto: retencionMensual,
      },
    ],
  };
}
