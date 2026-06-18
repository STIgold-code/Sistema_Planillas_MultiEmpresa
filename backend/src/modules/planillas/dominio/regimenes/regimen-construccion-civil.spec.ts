import { RegimenConstruccionCivil } from './regimen-construccion-civil';
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
  TramoIR,
} from '../tipos';

const AGRARIO_STUB: ParametrosAgrario = {
  remMinimaDiaria: 47.61,
  rmvReferencia: 1130,
  essaludTasaGrande: 0.09,
  essaludTasaPequena: 0.06,
  gratiPctRb: 0.1666,
  ctsPctRb: 0.0972,
  diasVacaciones: 30,
};

/** Tabla CC 2026 por categoría (✅ jornales y BUC confirmados). */
const TABLA_CC: Record<CategoriaConstruccion, ParametrosConstruccionCivil> = {
  [CategoriaConstruccion.OPERARIO]: ccCat(89.3, 0.32),
  [CategoriaConstruccion.OFICIAL]: ccCat(69.75, 0.3),
  [CategoriaConstruccion.PEON]: ccCat(62.8, 0.3),
};

function ccCat(jornal: number, buc: number): ParametrosConstruccionCivil {
  return {
    jornalBasicoDiario: jornal,
    bucPorcentaje: buc,
    gratiJornales: 40,
    ctsPorcentaje: 0.15,
    conafovicerPorcentaje: 0.02,
    fondoCapacitacionPorcentaje: 0.0045,
    movilidadDiaria: 0, // ⚠️ NO CONFIRMADO
    baeMonto: 0, // ⚠️ NO CONFIRMADO
    diasMinimosGrati: 0, // ⚠️ NO CONFIRMADO
  };
}

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
  construccionCivil: (
    fecha: Date,
    categoria: CategoriaConstruccion,
  ): ParametrosConstruccionCivil => {
    void fecha; // stub: la resolución por categoría no depende de la fecha
    return TABLA_CC[categoria];
  },
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

const ctx = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.CONSTRUCCION_CIVIL,
  remuneracionMensual: 2321.8, // operario 89.30 * 26
  remuneracionAfecta: 2321.8,
  remuneracionComputable: 2321.8,
  tieneHijos: false,
  categoriaConstruccion: CategoriaConstruccion.OPERARIO,
  periodo: { anio: 2026, mes: 3, fecha: new Date('2026-03-15') },
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

describe('RegimenConstruccionCivil (R.M. 197-2025-TR)', () => {
  const cc = new RegimenConstruccionCivil();

  it('expone el régimen CONSTRUCCION_CIVIL', () => {
    expect(cc.regimen).toBe(RegimenLaboral.CONSTRUCCION_CIVIL);
  });

  it('NO está certificado para producción (pendiente verificación contador)', () => {
    expect(cc.certificadoProduccion).toBe(false);
  });

  it('BUC operario = 32% del jornal por día (✅ CONFIRMADO)', () => {
    // 89.30 * 0.32 * 26 = 742.98
    expect(cc.bonificacionUnificada(ctx(), params).conceptos[0]?.monto).toBe(
      742.98,
    );
  });

  it('BUC peón = 30% del jornal (✅ CONFIRMADO)', () => {
    const c = ctx({ categoriaConstruccion: CategoriaConstruccion.PEON });
    // 62.80 * 0.30 * 26 = 489.84
    expect(cc.bonificacionUnificada(c, params).conceptos[0]?.monto).toBe(
      489.84,
    );
  });

  it('gratificación Fiestas Patrias = 40 jornales (✅ CONFIRMADO)', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-15') },
      // devengue completo de Fiestas Patrias: 7/7 (ene–jul)
      devengados: { ...ctx().devengados, mesesGratificacion: 7 },
    });
    // 89.30 * 40 = 3572
    expect(cc.gratificacion(c, params).conceptos[0]?.monto).toBe(3572);
  });

  it('CTS = 15% del total de jornales básicos (✅ CONFIRMADO)', () => {
    // 89.30 * 26 = 2321.80 ; 15% = 348.27
    expect(cc.cts(ctx(), params).conceptos[0]?.monto).toBe(348.27);
  });

  it('CONAFOVICER es DESCUENTO al trabajador del 2% (✅ tasa)', () => {
    const r = cc.conafovicer(ctx(), params).conceptos[0];
    expect(r?.tipo).toBe('descuento');
    // 2321.80 * 0.02 = 46.44
    expect(r?.monto).toBe(46.44);
  });

  it('Fondo de Capacitación = 0.45% (aporte empleador, ✅ CONFIRMADO)', () => {
    // 2321.80 * 0.0045 = 10.45
    const r = cc.fondoCapacitacion(ctx(), params).conceptos[0];
    expect(r?.tipo).toBe('aporte');
    expect(r?.monto).toBe(10.45);
  });

  it('EsSalud 9% sobre la afecta (✅ CONFIRMADO obligatorio)', () => {
    // 2321.80 * 0.09 = 208.96
    expect(cc.saludEmpleador(ctx(), params).conceptos[0]?.monto).toBe(208.96);
  });

  it('asignación familiar = 10% RMV si tiene hijos', () => {
    expect(
      cc.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos[0]
        ?.monto,
    ).toBe(113);
  });

  // ⚠️ NO CONFIRMADO (b): base CONAFOVICER jornal basico vs remuneracion total.
  it.skip('PENDIENTE validacion contador: base CONAFOVICER jornal basico vs total', () => {
    // Cuando el contador confirme la base literal R.M. 197-2025-TR, fijar la
    // base en la estrategia y el valor esperado, y quitar el skip.
    expect(cc.conafovicer(ctx(), params).conceptos[0]?.monto).toBe(0);
  });

  // ⚠️ NO CONFIRMADO (c): monto BAE exacto + tasa SCTR.
  it.skip('PENDIENTE validacion contador: monto BAE 2026 y tasa SCTR construccion', () => {
    // BAE y SCTR llegan como dato (baeMonto, sctrSalud/sctrPension). Cuando el
    // contador confirme montos/tasa, agregar el calculo y el valor esperado.
    expect(
      params.construccionCivil(
        ctx().periodo.fecha,
        CategoriaConstruccion.OPERARIO,
      ).baeMonto,
    ).toBeGreaterThan(0);
  });

  // ⚠️ NO CONFIRMADO (d): dias minimos de obra para grati de construccion civil.
  it.skip('PENDIENTE validacion contador: dias minimos de obra para grati CC', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-15') },
      resumenTareo: resumen({ diasTrabajados: 5 }),
    });
    // Con diasMinimosGrati confirmado > 5, la grati no debe devengarse.
    expect(cc.gratificacion(c, params).conceptos).toHaveLength(0);
  });

  // ⚠️ NO CONFIRMADO (e): movilidad diaria construccion civil.
  it.skip('PENDIENTE validacion contador: movilidad diaria construccion civil', () => {
    // Cuando el contador confirme monto/condiciones, agregar concepto movilidad
    // y su test en verde (dato movilidadDiaria deja de ser 0).
    expect(
      params.construccionCivil(
        ctx().periodo.fecha,
        CategoriaConstruccion.OPERARIO,
      ).movilidadDiaria,
    ).toBeGreaterThan(0);
  });
});
