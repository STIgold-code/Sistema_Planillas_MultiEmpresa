/**
 * Orquestador `calcular-boleta` — núcleo puro del motor de planillas.
 *
 * Recibe la `CalculadoraRegimen` YA RESUELTA (la factory la selecciona fuera) y
 * la compone con los conceptos régimen-agnósticos. CERO `if (regimen === ...)`:
 * el orquestador no conoce ningún régimen concreto (OCP). Agregar un régimen no
 * toca este archivo.
 *
 * Flujo:
 *   1. parsear-tareo → resumen de días/horas/HE.
 *   2. Conceptos compartidos: haber proporcional, horas extras, jornada nocturna
 *      → remuneración afecta (base de pensión, EsSalud y renta 5ta).
 *   3. Conceptos régimen-variables vía la estrategia: gratificación, CTS,
 *      vacaciones, asignación familiar, salud del empleador.
 *   4. Bonificación extraordinaria (Ley 30334) derivada de la gratificación.
 *   5. Descuentos: sistema pensionario (AFP/ONP), renta 5ta.
 *   6. Totaliza ingresos/descuentos/aportes y neto.
 *
 * Puro: no importa Prisma ni Nest. Recibe `ParametrosLegales` (DIP).
 */
import {
  ConceptoBoleta,
  ContextoCalculo,
  DatosDevengados,
  EntradaCalculo,
  ResultadoBoleta,
} from '../tipos';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { CalculadoraRegimen } from '../regimenes/calculadora-regimen.interface';
import { parsearTareo } from './parsear-tareo';
import { calcularHorasExtras } from '../conceptos/horas-extras';
import { calcularJornadaNocturna } from '../conceptos/jornada-nocturna';
import { calcularSistemaPensionario } from '../conceptos/sistema-pensionario';
import { calcularRentaQuinta } from '../conceptos/renta-quinta';
import { CLAVE_GRATIFICACION } from '../conceptos/gratificacion';
import { calcularBonificacionExtraordinaria } from '../conceptos/bonificacion-extraordinaria';

const redondear2 = (v: number): number => {
  const r = Math.round(v * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
};

const sumar = (conceptos: ConceptoBoleta[]): number =>
  redondear2(conceptos.reduce((acc, c) => acc + c.monto, 0));

function resolverDevengados(
  entrada: EntradaCalculo,
  remuneracionComputable: number,
): DatosDevengados {
  const d = entrada.devengados ?? {};
  return {
    mesesGratificacion: d.mesesGratificacion ?? 6,
    mesesCts: d.mesesCts ?? 6,
    diasCts: d.diasCts ?? 0,
    sextoGratificacion:
      d.sextoGratificacion ?? redondear2(remuneracionComputable / 6),
    diasVacaciones: d.diasVacaciones ?? 0,
  };
}

export function calcularBoleta(
  entrada: EntradaCalculo,
  calculadora: CalculadoraRegimen,
  params: ParametrosLegales,
): ResultadoBoleta {
  const { fecha } = entrada.periodo;
  const resumenTareo = parsearTareo(entrada.tareo);
  const sueldoBase = entrada.remuneracionBasica;

  // 1. Conceptos compartidos afectos (haber proporcional + HE + nocturna).
  const hayDiasTrabajados = resumenTareo.diasTrabajados > 0;
  const haberMensual = hayDiasTrabajados
    ? redondear2((sueldoBase / 30) * resumenTareo.diasTrabajados)
    : 0;

  const conceptosCompartidos: ConceptoBoleta[] = [];
  if (haberMensual > 0) {
    conceptosCompartidos.push({
      clave: 'haber_mensual',
      descripcion: 'Haber mensual',
      tipo: 'ingreso',
      monto: haberMensual,
    });
  }

  const horasExtras = calcularHorasExtras(sueldoBase, resumenTareo);
  conceptosCompartidos.push(...horasExtras.conceptos);

  const nocturna = calcularJornadaNocturna(
    sueldoBase,
    resumenTareo.diasNocturnos,
    fecha,
    params,
  );
  conceptosCompartidos.push(...nocturna.conceptos);

  // Remuneración afecta (base de pensión, EsSalud y renta 5ta).
  const remuneracionAfecta = sumar(conceptosCompartidos);
  const remuneracionComputable = hayDiasTrabajados ? sueldoBase : 0;

  // 2. Contexto régimen-variable.
  const devengados = resolverDevengados(entrada, remuneracionComputable);
  const ctx: ContextoCalculo = {
    regimenLaboral: entrada.regimenLaboral,
    remuneracionMensual: sueldoBase,
    remuneracionAfecta,
    remuneracionComputable,
    tieneHijos: entrada.tieneHijos,
    periodo: entrada.periodo,
    resumenTareo,
    devengados,
  };

  // 3. Beneficios régimen-variables (vía estrategia, sin conocer el régimen).
  const gratificacion = calculadora.gratificacion(ctx, params);
  const cts = calculadora.cts(ctx, params);
  const vacaciones = calculadora.vacaciones(ctx, params);
  const asignacionFamiliar = calculadora.asignacionFamiliar(ctx, params);
  const saludEmpleador = calculadora.saludEmpleador(ctx, params);

  // 4. Bonificación extraordinaria (Ley 30334) derivada de la gratificación.
  const montoGratificacion =
    gratificacion.conceptos.find((c) => c.clave === CLAVE_GRATIFICACION)
      ?.monto ?? 0;
  const bonificacion = calcularBonificacionExtraordinaria(
    montoGratificacion,
    params.essaludTasa(fecha),
  );

  // 5. Descuentos: pensión y renta 5ta.
  const pension = calcularSistemaPensionario(
    remuneracionAfecta,
    entrada.afiliacion,
  );
  const rentaQuinta = calcularRentaQuinta(
    remuneracionAfecta,
    entrada.periodo.mes,
    fecha,
    params,
    entrada.acumuladoRenta ?? 0,
    entrada.retencionesPreviasRenta ?? 0,
  );

  // 6. Consolidar y totalizar.
  const conceptos: ConceptoBoleta[] = [
    ...conceptosCompartidos,
    ...gratificacion.conceptos,
    ...bonificacion.conceptos,
    ...cts.conceptos,
    ...vacaciones.conceptos,
    ...asignacionFamiliar.conceptos,
    ...saludEmpleador.conceptos,
    ...pension.conceptos,
    ...rentaQuinta.conceptos,
  ];

  const ingresos = conceptos.filter((c) => c.tipo === 'ingreso');
  const descuentos = conceptos.filter((c) => c.tipo === 'descuento');
  const aportes = conceptos.filter((c) => c.tipo === 'aporte');

  const totalIngresos = sumar(ingresos);
  const totalDescuentos = sumar(descuentos);
  const totalAportes = sumar(aportes);

  return {
    conceptos,
    totalIngresos,
    totalDescuentos,
    totalAportes,
    neto: redondear2(totalIngresos - totalDescuentos),
  };
}
