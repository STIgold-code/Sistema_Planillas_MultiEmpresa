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

  it('tieneHijos es false para preservar paridad con el legacy (asig. familiar no viene del tareo)', () => {
    // PARIDAD: el motor legacy `calcularEmpleado` fija asignación familiar = 0
    // ("no viene del tareo"). Para no mover el cálculo del camino real respecto al
    // legacy, el mapper NO activa la asignación familiar todavía. Es una BRECHA
    // LEGAL conocida del legacy (no paga asig. familiar), heredada a propósito en
    // este slice para mantener paridad al céntimo. Habilitarla es un cambio de
    // comportamiento separado que actualizará los golden conscientemente.
    const entrada = mapearEntradaCalculo({
      empleado: empleadoBase({ asignacion_familiar: true }),
      empresa: EMPRESA,
      mes: PERIODO.mes,
      anio: PERIODO.anio,
    });

    expect(entrada.tieneHijos).toBe(false);
  });
});
