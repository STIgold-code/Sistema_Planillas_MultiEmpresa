/**
 * Golden master contra la PLANILLA REAL de BENITES MALPICA INGENIEROS S.A.C.
 * (archivo 05.2026-PLL-*.xlsm, hoja PLL, mayo 2026).
 *
 * Tesis: con los MISMOS parámetros que usa BM (tasas SCTR de su nivel de
 * riesgo 1.5%/2%, SENATI 0.75%, EsSalud 9%), el motor reproduce al céntimo
 * los aportes del empleador y descuentos de ley del Excel del contador.
 * Las diferencias observadas en el Excel real son de PARÁMETROS o ediciones
 * manuales, no de lógica:
 *
 * - Asignación familiar: el Excel usa 930×10% = 93 (RMV 2018-2022, DESACTUALIZADA).
 *   El valor legal vigente es 1130×10% = 113 — el sistema, con parámetros
 *   versionados, aplica el correcto. NO se replica el valor viejo aquí.
 * - Renta de 5ta: en el Excel está TIPEADA a mano (sin fórmula) — no comparable.
 * - Vida Ley: el Excel usa tasas por trabajador (0.0075/0.0088) desde una hoja
 *   propia; el sistema usa una tasa única parametrizada. No se afirma aquí.
 */
import {
  calcularDetalleEmpleado,
  ParametrosCalculoDetalle,
} from '../aplicacion/calcular-detalle-empleado';
import {
  ParametrosLegalesEnMemoria,
  ValorVigente,
} from '../infraestructura/parametros-legales-en-memoria';
import { TramoIR } from '../dominio/tipos';
import { EmpleadoParaMapeo } from '../aplicacion/mapear-entrada-calculo';
import { EmpleadoParaDetalle } from '../aplicacion/mapear-entrada-detalle';
import {
  construirEmpleadoBm,
  mesCompleto30Dias,
  REGIMEN_ONP_BM,
} from './__fixtures__/benites-malpica.fixture';

const uno = <T>(valor: T): ValorVigente<T>[] => [
  { valor, vigenciaDesde: new Date('2000-01-01') },
];

const TRAMOS: TramoIR[] = [
  { hasta: 5, tasa: 0.08 },
  { hasta: 20, tasa: 0.14 },
  { hasta: 35, tasa: 0.17 },
  { hasta: 45, tasa: 0.2 },
  { hasta: Infinity, tasa: 0.3 },
];

/**
 * Parámetros con los que opera la planilla de BM: EsSalud 9% (piso 101.70),
 * SCTR Salud 1.5% y Pensión 2% (nivel de riesgo de su actividad metalúrgica,
 * columnas CV/CX del Excel), SENATI 0.75% (columna CZ).
 */
const parametrosBm = new ParametrosLegalesEnMemoria({
  rmv: uno(1130),
  uit: uno(5500),
  asignacionFamiliar: uno(113),
  essaludTasa: uno(0.09),
  essaludMinimo: uno(101.7),
  sisMicroempresa: uno(15),
  tramosIR: uno(TRAMOS),
  sctrSalud: uno(0.015),
  sctrPension: uno(0.02),
  vidaLeyTasa: uno(0.0053),
  senatiTasa: uno(0.0075),
});

const calcular = (
  empleado: ReturnType<typeof construirEmpleadoBm>,
  aportaSenati = true,
) =>
  calcularDetalleEmpleado({
    empleado: empleado as unknown as EmpleadoParaMapeo & EmpleadoParaDetalle,
    empresa: {
      regimen_laboral_default: 'GENERAL',
      aporta_senati: aportaSenati,
    },
    mes: 5,
    anio: 2026,
    acumuladoRenta: 0,
    retencionesPreviasRenta: 0,
    promedios: {
      promedioHorasExtras: 0,
      promedioComisiones: 0,
      promedioBonificaciones: 0,
      ultimaGratificacion: 0,
    },
    parametros: parametrosBm,
  } as ParametrosCalculoDetalle);

describe('Golden master BM — planilla real 05.2026 (aportes del empleador)', () => {
  // Fila 19 del Excel: BENITES MALPICA RAUL H., sueldo 5000, mes completo,
  // sin asignación familiar, con SCTR. Valores esperados leídos del Excel.
  const fila19 = construirEmpleadoBm({
    sueldoBase: 5000,
    regimenPensionario: null,
    detalles: mesCompleto30Dias(),
    sctr: true,
  });

  it('fila 19: remuneración afecta = 5000 (mes completo, sin asig. familiar)', () => {
    expect(calcular(fila19).total_ingresos_afectos).toBe(5000);
  });

  it('fila 19: EsSalud empleador 450.00 (9% de la afecta) — celda CN', () => {
    expect(calcular(fila19).essalud_empleador).toBe(450);
  });

  it('fila 19: SCTR Salud 75.00 (1.5%) y SCTR Pensión 100.00 (2%) — celdas CW/CY', () => {
    const dto = calcular(fila19);
    expect(dto.sctr_salud_empleador).toBe(75);
    expect(dto.sctr_pension_empleador).toBe(100);
  });

  it('fila 19: SENATI 37.50 (0.75% de la afecta) — celda DA', () => {
    expect(calcular(fila19).senati_empleador).toBe(37.5);
  });

  it('fila 19: sin SENATI activado el aporte es 0 (config por empresa)', () => {
    expect(calcular(fila19, false).senati_empleador).toBe(0);
  });
});

describe('Golden master BM — descuentos de ley del trabajador', () => {
  it('ONP 13% sobre la afecta (mecánica de la celda BE del Excel)', () => {
    // Caso BM-like: sueldo 2700 mes completo, ONP. 2700 × 13% = 351.
    const empleado = construirEmpleadoBm({
      sueldoBase: 2700,
      regimenPensionario: REGIMEN_ONP_BM,
      detalles: mesCompleto30Dias(),
    });
    const dto = calcular(empleado);
    expect(dto.total_ingresos_afectos).toBe(2700);
    expect(dto.onp).toBe(351);
  });

  it('piso EsSalud: afecta = RMV 1130 → EsSalud 101.70 (fila 21 del Excel)', () => {
    const empleado = construirEmpleadoBm({
      sueldoBase: 1130,
      regimenPensionario: null,
      detalles: mesCompleto30Dias(),
    });
    expect(calcular(empleado).essalud_empleador).toBe(101.7);
  });
});
