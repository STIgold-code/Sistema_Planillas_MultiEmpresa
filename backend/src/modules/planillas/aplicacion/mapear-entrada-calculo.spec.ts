/**
 * Tests for the Prisma → domain `EntradaCalculo` mapper (PR6 slice 2).
 *
 * The mapper is the aplicación-edge seam: it turns Prisma `Empleado`/`Contrato`
 * + tareo rows into the pure `EntradaCalculo` the domain engine consumes. The
 * domain never imports Prisma; all translation lives here. These tests lock the
 * translation rules (tareo horas priority, nocturno detection, AFP/ONP rate
 * scaling, régimen resolution) that the real-path parity depends on.
 */
import {
  mapearEntradaCalculo,
  EmpleadoParaMapeo,
} from './mapear-entrada-calculo';
import { RegimenLaboral, SistemaPensionario } from '../dominio/tipos';

function tipoMarcacion(
  over: Partial<
    EmpleadoParaMapeo['tareos'][0]['detalles'][0]['tipo_marcacion']
  > = {},
) {
  return {
    es_laborable: true,
    horas_diurnas: 8,
    horas_nocturnas: 0,
    horas_default: 8,
    ...over,
  };
}

function empleadoBase(
  over: Partial<EmpleadoParaMapeo> = {},
): EmpleadoParaMapeo {
  return {
    sueldo_base: 3000,
    asignacion_familiar: false,
    regimen_pensionario: {
      tipo: 'AFP',
      aporte_obligatorio: 10,
      prima_seguro: 1.74,
      comision_flujo: 1.47,
    },
    contratos: [{ regimen_laboral: null }],
    tareos: [
      {
        detalles: Array.from({ length: 30 }, () => ({
          horas: 8,
          tipo_marcacion: tipoMarcacion(),
        })),
      },
    ],
    ...over,
  };
}

const PERIODO = { mes: 3, anio: 2026 };
const EMPRESA = { regimen_laboral_default: 'GENERAL' as const };

describe('mapearEntradaCalculo', () => {
  it('mapea remuneración básica, régimen GENERAL y período', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase(),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.remuneracionBasica).toBe(3000);
    expect(entrada.regimenLaboral).toBe(RegimenLaboral.GENERAL);
    expect(entrada.periodo.mes).toBe(3);
    expect(entrada.periodo.anio).toBe(2026);
    // fecha de referencia = último día del mes (resolución de parámetros legales)
    expect(entrada.periodo.fecha.getDate()).toBe(31);
  });

  it('escala las tasas AFP de porcentaje a fracción', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase(),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.afiliacion).toEqual({
      sistema: SistemaPensionario.AFP,
      tasas: {
        aporteObligatorio: 0.1,
        primaSeguro: 0.0174,
        comisionFlujo: 0.0147,
      },
    });
  });

  it('mapea ONP con su aporte obligatorio', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({
        regimen_pensionario: {
          tipo: 'ONP',
          aporte_obligatorio: 13,
          prima_seguro: 0,
          comision_flujo: 0,
        },
      }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.afiliacion?.sistema).toBe(SistemaPensionario.ONP);
    expect(entrada.afiliacion?.tasas?.aporteObligatorio).toBe(0.13);
  });

  it('mapea afiliación null cuando no hay régimen pensionario', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ regimen_pensionario: null }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.afiliacion).toBeNull();
  });

  it('resuelve horas con prioridad detalle > nomenclatura > default', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({
        tareos: [
          {
            detalles: [
              // detalle.horas tiene prioridad → 10h, 2 HE
              {
                horas: 10,
                tipo_marcacion: tipoMarcacion({ horas_diurnas: 8 }),
              },
              // sin detalle.horas → usa nomenclatura (diurnas+nocturnas = 9) → 1 HE
              {
                horas: null,
                tipo_marcacion: tipoMarcacion({
                  horas_diurnas: 9,
                  horas_nocturnas: 0,
                }),
              },
              // sin detalle ni nomenclatura → default 8 → 0 HE
              {
                horas: null,
                tipo_marcacion: tipoMarcacion({
                  horas_diurnas: 0,
                  horas_nocturnas: 0,
                  horas_default: 8,
                }),
              },
            ],
          },
        ],
      }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tareo).toHaveLength(3);
    expect(entrada.tareo[0].horasTrabajadas).toBe(10);
    expect(entrada.tareo[0].horasExtras).toBe(2);
    expect(entrada.tareo[1].horasTrabajadas).toBe(9);
    expect(entrada.tareo[1].horasExtras).toBe(1);
    expect(entrada.tareo[2].horasTrabajadas).toBe(8);
    expect(entrada.tareo[2].horasExtras).toBe(0);
  });

  it('marca esNocturno cuando la nomenclatura tiene horas nocturnas', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({
        tareos: [
          {
            detalles: [
              {
                horas: 8,
                tipo_marcacion: tipoMarcacion({
                  horas_diurnas: 0,
                  horas_nocturnas: 8,
                }),
              },
            ],
          },
        ],
      }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tareo[0].esNocturno).toBe(true);
  });

  it('el contrato override gana sobre el default de la empresa', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({
        contratos: [{ regimen_laboral: 'PEQUENA_EMPRESA' }],
      }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.regimenLaboral).toBe(RegimenLaboral.PEQUENA_EMPRESA);
  });

  it('propaga acumulados de renta para la retención de IR 5ta', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase(),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
      acumuladoRenta: 18000,
      retencionesPreviasRenta: 250,
    });

    expect(entrada.acumuladoRenta).toBe(18000);
    expect(entrada.retencionesPreviasRenta).toBe(250);
  });

  // CAMBIO DE COMPORTAMIENTO INTENCIONAL: el legacy fijaba la asignación familiar
  // en 0 para TODOS (subpago heredado). El mapper ahora cablea el dato real
  // `empleado.asignacion_familiar` al flag de dominio `tieneHijos` (derecho a la
  // asignación, 10% RMV por ley), igual que el camino de detalle.
  it('cablea tieneHijos desde empleado.asignacion_familiar = true (corrige subpago legacy)', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ asignacion_familiar: true }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tieneHijos).toBe(true);
  });

  it('mantiene tieneHijos en false cuando empleado.asignacion_familiar = false', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ asignacion_familiar: false }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tieneHijos).toBe(false);
  });

  it('trata asignacion_familiar null como sin derecho (tieneHijos false)', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ asignacion_familiar: null }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tieneHijos).toBe(false);
  });
});

/**
 * Meses del semestre que devengan la gratificación (Ley 27735 art. 6 +
 * D.S. 005-2002-TR art. 3.3-3.4). El mapper los resuelve en el borde y el motor
 * los recibe ya calculados: sin esto `calcular-boleta` asumía SIEMPRE 6/6 y
 * pagaba la gratificación completa a quien ingresó a mitad del semestre.
 */
describe('mapearEntradaCalculo — devengados.mesesGratificacion', () => {
  const ingreso = (mes: number, dia: number): Date =>
    new Date(Date.UTC(2026, mes - 1, dia));

  it('sin fecha de ingreso registrada resuelve 6/6 (regresión)', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase(),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
    });

    expect(entrada.devengados?.mesesGratificacion).toBe(6);
  });

  it('ingreso el 01-ene resuelve 6/6 (regresión)', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ fecha_ingreso: ingreso(1, 1) }),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
    });

    expect(entrada.devengados?.mesesGratificacion).toBe(6);
  });

  it('ingreso el 01-abr resuelve 3/6 para la gratificación de julio', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ fecha_ingreso: ingreso(4, 1) }),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
    });

    expect(entrada.devengados?.mesesGratificacion).toBe(3);
  });

  it('ingreso el 15-mar resuelve 3/6: el mes incompleto no suma sexto', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ fecha_ingreso: ingreso(3, 15) }),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
    });

    expect(entrada.devengados?.mesesGratificacion).toBe(3);
  });

  it('ingreso el 01-jul resuelve 0/6 para la gratificación de julio', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ fecha_ingreso: ingreso(7, 1) }),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
    });

    expect(entrada.devengados?.mesesGratificacion).toBe(0);
  });

  // Los meses previos al ingreso ya no suman sexto: descontar además sus días
  // castigaría dos veces la misma ausencia (D.S. 005-2002-TR art. 3.4).
  it('solo suma días no laborados de los meses que el trabajador devenga', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ fecha_ingreso: ingreso(4, 1) }),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
      diasNoLaboradosMesesPrevios: { 2: 3, 5: 2 },
    });

    expect(entrada.devengados?.diasNoLaboradosSemestre).toBe(2);
  });

  it('REGRESIÓN: con 6/6 suma los días no laborados de todo el semestre', () => {
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase(),
      empresa: EMPRESA,
      mes: 7,
      anio: 2026,
      diasNoLaboradosMesesPrevios: { 2: 3, 5: 2 },
    });

    expect(entrada.devengados?.diasNoLaboradosSemestre).toBe(5);
  });
});
