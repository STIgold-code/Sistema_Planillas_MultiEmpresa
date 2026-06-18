import { RegimenAgrario } from './regimen-agrario';
import {
  ParametrosLegales,
  ParametrosAgrario,
  ParametrosConstruccionCivil,
} from '../parametros/parametros-legales';
import {
  ContextoCalculo,
  RegimenLaboral,
  ResumenTareo,
  TamanoEmpresa,
  TramoIR,
} from '../tipos';

const AGRARIO: ParametrosAgrario = {
  remMinimaDiaria: 47.61,
  rmvReferencia: 1130,
  essaludTasaGrande: 0.09,
  essaludTasaPequena: 0.06,
  gratiPctRb: 0.1666,
  ctsPctRb: 0.0972,
  diasVacaciones: 30, // placeholder ⚠️ NO CONFIRMADO
};

const CC_STUB: ParametrosConstruccionCivil = {
  jornalBasicoDiario: 0,
  bucPorcentaje: 0,
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
  vidaLeyTasa: () => 0,
  agrario: (): ParametrosAgrario => AGRARIO,
  construccionCivil: (): ParametrosConstruccionCivil => CC_STUB,
};

const resumen = (overrides: Partial<ResumenTareo> = {}): ResumenTareo => ({
  diasTrabajados: 30,
  horasNormales: 240,
  horasExtras25: 0,
  horasExtras35: 0,
  horasExtrasNocturnas25: 0,
  horasExtrasNocturnas35: 0,
  diasNocturnos: 0,
  ...overrides,
});

const ctx = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.AGRARIO,
  remuneracionMensual: 1500,
  remuneracionAfecta: 1500,
  remuneracionComputable: 1500,
  tieneHijos: false,
  periodo: { anio: 2026, mes: 3, fecha: new Date('2026-03-31') },
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

describe('RegimenAgrario (Ley 31110)', () => {
  const agrario = new RegimenAgrario();

  it('expone el régimen AGRARIO', () => {
    expect(agrario.regimen).toBe(RegimenLaboral.AGRARIO);
  });

  it('NO está certificado para producción (pendiente verificación contador)', () => {
    expect(agrario.certificadoProduccion).toBe(false);
  });

  describe('sistema separado (✅ CONFIRMADO)', () => {
    it('gratificación = 16.66% de la RB', () => {
      // 1500 * 0.1666 = 249.90
      expect(agrario.gratificacion(ctx(), params).conceptos[0]?.monto).toBe(
        249.9,
      );
    });

    it('CTS = 9.72% de la RB', () => {
      // 1500 * 0.0972 = 145.80
      expect(agrario.cts(ctx(), params).conceptos[0]?.monto).toBe(145.8);
    });

    it('EsSalud empresa grande = 9% de la RB', () => {
      // 1500 * 0.09 = 135
      expect(
        agrario.saludEmpleador(
          ctx({ tamanoEmpresa: TamanoEmpresa.GRANDE }),
          params,
        ).conceptos[0]?.monto,
      ).toBe(135);
    });

    it('EsSalud empresa pequeña = 6% de la RB (2026)', () => {
      // 1500 * 0.06 = 90
      expect(
        agrario.saludEmpleador(
          ctx({ tamanoEmpresa: TamanoEmpresa.PEQUENA }),
          params,
        ).conceptos[0]?.monto,
      ).toBe(90);
    });
  });

  describe('sistema prorrateo (✅ CONFIRMADO)', () => {
    const cProrrateo = ctx({ usaProrrateoAgrario: true });

    it('no paga grati ni CTS por separado (van en el jornal)', () => {
      expect(agrario.gratificacion(cProrrateo, params).conceptos).toHaveLength(
        0,
      );
      expect(agrario.cts(cProrrateo, params).conceptos).toHaveLength(0);
    });

    it('remuneración diaria prorrateada = (RB+16.66%+9.72%)/30 × días', () => {
      // (1500 + 249.9 + 145.8)/30 = 63.19 ; ×30 = 1895.70
      expect(
        agrario.remuneracionDiaria(cProrrateo, params).conceptos[0]?.monto,
      ).toBe(1895.7);
    });
  });

  it('asignación familiar = 10% RMV si tiene hijos', () => {
    expect(
      agrario.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos[0]
        ?.monto,
    ).toBe(113);
  });

  // ⚠️ NO CONFIRMADO (a): vacaciones del agrario (15 vs 30 dias).
  it.skip('PENDIENTE validacion contador: dias de vacaciones agrario 15 vs 30', () => {
    // Cuando el contador confirme el N° de dias (Ley 31110 art. literal), fijar
    // el dato `diasVacaciones` y el valor esperado, y quitar el skip.
    const c = ctx({ devengados: { ...ctx().devengados, diasVacaciones: 30 } });
    // 1500/30*30 = 1500
    expect(agrario.vacaciones(c).conceptos[0]?.monto).toBe(1500);
  });
});
