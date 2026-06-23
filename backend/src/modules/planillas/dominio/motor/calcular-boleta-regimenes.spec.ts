/**
 * Regression tests for the régimen-aware orchestration of `calcular-boleta`.
 *
 * C-3: in the agrario PRORRATEO system the base salary must be counted ONCE.
 *      The strategy contributes its own `remuneracion_diaria_agraria` (which
 *      already embeds the base), so the orchestrator MUST NOT also emit the
 *      generic `haber_mensual`.
 *
 * C-4: the Ley 30334 extraordinary bonus must be derived from EVERY gratificación
 *      key the strategy declares — not only the GENERAL `'gratificacion'` key.
 *      Construcción civil declares `'gratificacion_construccion_civil'`; agrario
 *      (separado) declares `'gratificacion_agraria'`.
 */
import { calcularBoleta } from './calcular-boleta';
import { RegimenAgrario } from '../regimenes/regimen-agrario';
import { RegimenConstruccionCivil } from '../regimenes/regimen-construccion-civil';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { stubParametrosRegimenes } from '../parametros/parametros-legales.stub';
import {
  CategoriaConstruccion,
  EntradaCalculo,
  RegimenLaboral,
  SistemaPensionario,
  TamanoEmpresa,
  TramoIR,
} from '../tipos';
import { CLAVE_PRORRATEO_AGRARIO } from '../conceptos/prorrateo-agrario';
import { CLAVE_GRATI_CC } from '../conceptos/grati-construccion-civil';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../conceptos/bonificacion-extraordinaria';

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
  ...stubParametrosRegimenes,
};

const dias = (n: number, fecha: string) =>
  Array.from({ length: n }, () => ({
    fecha: new Date(fecha),
    horasTrabajadas: 8,
    horasExtras: 0,
    esNocturno: false,
    esFeriado: false,
    asistio: true,
  }));

describe('calcular-boleta — orquestación por régimen (C-3, C-4)', () => {
  it('C-3: agrario PRORRATEADO 30 días no duplica el sueldo base (sin haber_mensual genérico)', () => {
    const entrada: EntradaCalculo = {
      regimenLaboral: RegimenLaboral.AGRARIO,
      remuneracionBasica: 1500,
      tieneHijos: false,
      afiliacion: { sistema: SistemaPensionario.ONP },
      periodo: { anio: 2026, mes: 3, fecha: new Date('2026-03-31') },
      tareo: dias(30, '2026-03-15'),
    };

    const agrario = new RegimenAgrario();
    // Forzar el sistema de prorrateo: la estrategia aporta su remuneración base.
    jest.spyOn(agrario, 'aportaHaberBase').mockReturnValue(true);
    jest
      .spyOn(agrario, 'conceptosRegimen')
      .mockImplementation((ctx, p) =>
        agrario.remuneracionDiaria({ ...ctx, usaProrrateoAgrario: true }, p),
      );

    const boleta = calcularBoleta(entrada, agrario, params);
    const claves = boleta.conceptos.map((c) => c.clave);

    // El sueldo base aparece UNA sola vez: como remuneración diaria agraria,
    // NO como haber_mensual genérico.
    expect(claves).toContain(CLAVE_PRORRATEO_AGRARIO);
    expect(claves).not.toContain('haber_mensual');

    const remDiaria = boleta.conceptos.find(
      (c) => c.clave === CLAVE_PRORRATEO_AGRARIO,
    )?.monto;
    // (1500 + 16.66% + 9.72%) / 30 * 30 = 1500 * 1.2638 = 1895.70
    expect(remDiaria).toBeCloseTo(1895.7, 1);
    // El haber genérico (1500) NO debe sumarse encima.
    expect(boleta.totalIngresos).toBeLessThan(2000);
  });

  it('C-4: operario CC en julio paga bonificación 30334 (~9%) sobre la grati CC', () => {
    const entrada: EntradaCalculo = {
      regimenLaboral: RegimenLaboral.CONSTRUCCION_CIVIL,
      remuneracionBasica: 2680, // 89.30 * 30
      tieneHijos: false,
      afiliacion: { sistema: SistemaPensionario.ONP },
      periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
      tareo: dias(26, '2026-07-15'),
    };

    const cc = new RegimenConstruccionCivil();
    const ctx = {
      regimenLaboral: RegimenLaboral.CONSTRUCCION_CIVIL,
      remuneracionMensual: 2680,
      remuneracionAfecta: 2680,
      remuneracionComputable: 2680,
      tieneHijos: false,
      periodo: entrada.periodo,
      resumenTareo: {
        diasTrabajados: 26,
        horasNormales: 208,
        horasExtras25: 0,
        horasExtras35: 0,
        horasExtrasNocturnas25: 0,
        horasExtrasNocturnas35: 0,
        diasNocturnos: 0,
      },
      devengados: {
        mesesGratificacion: 6,
        mesesCts: 6,
        diasCts: 0,
        sextoGratificacion: 0,
        diasVacaciones: 0,
      },
      categoriaConstruccion: CategoriaConstruccion.OPERARIO,
    };
    const gratiCC = cc.gratificacion(ctx, params).conceptos[0]?.monto ?? 0;
    expect(gratiCC).toBeGreaterThan(0);

    const boleta = calcularBoleta(entrada, cc, params);
    const gratiEnBoleta = boleta.conceptos.find(
      (c) => c.clave === CLAVE_GRATI_CC,
    )?.monto;
    expect(gratiEnBoleta).toBeGreaterThan(0);

    const bono = boleta.conceptos.find(
      (c) => c.clave === CLAVE_BONIF_EXTRAORDINARIA,
    );
    // Bonificación 30334 = 9% de la grati CC.
    expect(bono).toBeDefined();
    expect(bono?.monto).toBeCloseTo((gratiEnBoleta ?? 0) * 0.09, 2);
  });
});
