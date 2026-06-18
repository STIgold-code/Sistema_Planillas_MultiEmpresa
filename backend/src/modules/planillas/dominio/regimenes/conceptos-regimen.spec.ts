/**
 * W1 — Contrato de composición `conceptosRegimen()`.
 *
 * Verifica que cada estrategia ensambla su boleta COMPLETA: los conceptos
 * régimen-variables comunes Y los conceptos PROPIOS del régimen. Antes (5 métodos
 * fijos) el orquestador dejaba afuera BUC, CONAFOVICER, fondo de capacitación
 * (construcción civil) y la remuneración diaria prorrateada (agrario). Este spec
 * blinda que `conceptosRegimen()` los incluya, sin que el orquestador conozca
 * ningún régimen concreto.
 */
import { RegimenGeneral } from './regimen-general';
import { RegimenConstruccionCivil } from './regimen-construccion-civil';
import { RegimenAgrario } from './regimen-agrario';
import {
  ParametrosLegales,
  ParametrosAgrario,
  ParametrosConstruccionCivil,
} from '../parametros/parametros-legales';
import {
  CategoriaConstruccion,
  ContextoCalculo,
  RegimenLaboral,
  ResumenTareo,
  TamanoEmpresa,
  TramoIR,
} from '../tipos';
import { CLAVE_GRATIFICACION } from '../conceptos/gratificacion';
import { CLAVE_CTS } from '../conceptos/cts';
import { CLAVE_ESSALUD } from '../conceptos/salud-empleador';
import { CLAVE_BUC } from '../conceptos/bonificacion-unificada-construccion';
import { CLAVE_CONAFOVICER } from '../conceptos/conafovicer';
import { CLAVE_FONDO_CAPACITACION } from '../conceptos/fondo-capacitacion-construccion';
import { CLAVE_GRATI_CC } from '../conceptos/grati-construccion-civil';
import { CLAVE_CTS_CC } from '../conceptos/cts-construccion-civil';
import { CLAVE_PRORRATEO_AGRARIO } from '../conceptos/prorrateo-agrario';
import {
  CLAVE_GRATI_AGRARIO,
  CLAVE_CTS_AGRARIO,
} from '../conceptos/beneficios-agrario-separado';

const AGRARIO_STUB: ParametrosAgrario = {
  remMinimaDiaria: 47.61,
  rmvReferencia: 1130,
  essaludTasaGrande: 0.09,
  essaludTasaPequena: 0.06,
  gratiPctRb: 0.1666,
  ctsPctRb: 0.0972,
  diasVacaciones: 30,
};

const CC_STUB: ParametrosConstruccionCivil = {
  jornalBasicoDiario: 89.3,
  bucPorcentaje: 0.32,
  gratiJornales: 40,
  ctsPorcentaje: 0.15,
  conafovicerPorcentaje: 0.02,
  fondoCapacitacionPorcentaje: 0.0045,
  movilidadDiaria: 0,
  baeMonto: 0,
  diasMinimosGrati: 0,
};

const params: ParametrosLegales = {
  rmv: () => 1130,
  uit: () => 5500,
  asignacionFamiliar: () => 113,
  essaludTasa: () => 0.09,
  essaludMinimo: () => 101.7,
  sisMicroempresa: () => 15,
  tramosIR: (): TramoIR[] => [{ hasta: Infinity, tasa: 0.08 }],
  sctrSalud: () => 0,
  sctrPension: () => 0,
  agrario: (): ParametrosAgrario => AGRARIO_STUB,
  construccionCivil: (): ParametrosConstruccionCivil => CC_STUB,
};

const resumen = (overrides: Partial<ResumenTareo> = {}): ResumenTareo => ({
  diasTrabajados: 26,
  horasNormales: 208,
  horasExtras25: 0,
  horasExtras35: 0,
  horasExtrasNocturnas25: 0,
  horasExtrasNocturnas35: 0,
  diasNocturnos: 0,
  ...overrides,
});

const ctxBase = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.GENERAL,
  remuneracionMensual: 3000,
  remuneracionAfecta: 3000,
  remuneracionComputable: 3000,
  tieneHijos: false,
  periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
  resumenTareo: resumen(),
  devengados: {
    mesesGratificacion: 6,
    mesesCts: 6,
    diasCts: 0,
    sextoGratificacion: 0,
    diasVacaciones: 0,
  },
  ...overrides,
});

const claves = (
  conceptos: { clave: string }[],
): string[] => conceptos.map((c) => c.clave);

describe('conceptosRegimen() — contrato de composición W1', () => {
  it('GENERAL: incluye gratificación y EsSalud (mes de grati), sin conceptos propios extra', () => {
    // mes 7 → grati; sin BUC/CONAFOVICER/prorrateo (no son del régimen general).
    const r = new RegimenGeneral().conceptosRegimen(ctxBase(), params);
    const cs = claves(r.conceptos);
    expect(cs).toContain(CLAVE_GRATIFICACION);
    expect(cs).toContain(CLAVE_ESSALUD);
    expect(cs).not.toContain(CLAVE_BUC);
    expect(cs).not.toContain(CLAVE_PRORRATEO_AGRARIO);
  });

  it('GENERAL: incluye CTS en el mes de depósito (mayo)', () => {
    const ctx = ctxBase({
      periodo: { anio: 2026, mes: 5, fecha: new Date('2026-05-31') },
      devengados: {
        mesesGratificacion: 6,
        mesesCts: 6,
        diasCts: 0,
        sextoGratificacion: 500,
        diasVacaciones: 0,
      },
    });
    const cs = claves(new RegimenGeneral().conceptosRegimen(ctx, params).conceptos);
    expect(cs).toContain(CLAVE_CTS);
    expect(cs).toContain(CLAVE_ESSALUD);
  });

  it('CONSTRUCCION_CIVIL: compone sus conceptos PROPIOS (BUC, CONAFOVICER, fondo)', () => {
    const ctx = ctxBase({
      regimenLaboral: RegimenLaboral.CONSTRUCCION_CIVIL,
      categoriaConstruccion: CategoriaConstruccion.OPERARIO,
    });
    const cs = claves(
      new RegimenConstruccionCivil().conceptosRegimen(ctx, params).conceptos,
    );
    expect(cs).toContain(CLAVE_BUC);
    expect(cs).toContain(CLAVE_CONAFOVICER);
    expect(cs).toContain(CLAVE_FONDO_CAPACITACION);
    expect(cs).toContain(CLAVE_GRATI_CC);
    expect(cs).toContain(CLAVE_CTS_CC);
    expect(cs).toContain(CLAVE_ESSALUD);
  });

  it('AGRARIO separado: compone grati y CTS agrarios (sin prorrateo)', () => {
    const ctx = ctxBase({
      regimenLaboral: RegimenLaboral.AGRARIO,
      tamanoEmpresa: TamanoEmpresa.GRANDE,
      remuneracionComputable: 1500,
    });
    const cs = claves(new RegimenAgrario().conceptosRegimen(ctx, params).conceptos);
    expect(cs).toContain(CLAVE_GRATI_AGRARIO);
    expect(cs).toContain(CLAVE_CTS_AGRARIO);
    expect(cs).not.toContain(CLAVE_PRORRATEO_AGRARIO);
  });

  it('AGRARIO prorrateo: compone la remuneración diaria, no grati/CTS separados', () => {
    const ctx = ctxBase({
      regimenLaboral: RegimenLaboral.AGRARIO,
      usaProrrateoAgrario: true,
      remuneracionComputable: 1500,
      resumenTareo: resumen({ diasTrabajados: 30 }),
    });
    const cs = claves(new RegimenAgrario().conceptosRegimen(ctx, params).conceptos);
    expect(cs).toContain(CLAVE_PRORRATEO_AGRARIO);
    expect(cs).not.toContain(CLAVE_GRATI_AGRARIO);
    expect(cs).not.toContain(CLAVE_CTS_AGRARIO);
  });
});
