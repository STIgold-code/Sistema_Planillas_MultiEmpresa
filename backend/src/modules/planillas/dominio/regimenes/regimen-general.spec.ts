import { RegimenGeneral } from './regimen-general';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { stubParametrosRegimenes } from '../parametros/parametros-legales.stub';
import {
  ContextoCalculo,
  RegimenLaboral,
  ResumenTareo,
  TramoIR,
} from '../tipos';

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
  ...stubParametrosRegimenes,
};

const ctx = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.GENERAL,
  remuneracionMensual: 3000,
  remuneracionAfecta: 3000,
  remuneracionComputable: 3000,
  tieneHijos: false,
  periodo: { anio: 2026, mes: 3, fecha: new Date('2026-03-31') },
  resumenTareo: resumen(),
  devengados: {
    mesesGratificacion: 6,
    mesesCts: 6,
    diasCts: 0,
    sextoGratificacion: 500,
    diasVacaciones: 0,
  },
  ...overrides,
});

describe('RegimenGeneral (D.L. 728)', () => {
  const general = new RegimenGeneral();

  it('expone el régimen GENERAL', () => {
    expect(general.regimen).toBe(RegimenLaboral.GENERAL);
  });

  it('gratificación = 1 sueldo completo en julio', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
    });
    expect(general.gratificacion(c).conceptos[0]?.monto).toBe(3000);
  });

  it('CTS = 1 sueldo (incluye 1/6 grati) en noviembre', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 11, fecha: new Date('2026-11-30') },
    });
    // (3000+500)/12*6 = 1750
    expect(general.cts(c).conceptos[0]?.monto).toBe(1750);
  });

  it('asignación familiar = 10% RMV solo si tiene hijos', () => {
    expect(
      general.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos[0]
        ?.monto,
    ).toBe(113);
    expect(
      general.asignacionFamiliar(ctx({ tieneHijos: false }), params).conceptos,
    ).toHaveLength(0);
  });

  it('EsSalud = 9% de la afecta', () => {
    expect(general.saludEmpleador(ctx(), params).conceptos[0]?.monto).toBe(270);
  });

  it('vacaciones = 0 cuando no hay días gozados', () => {
    expect(general.vacaciones(ctx()).conceptos).toHaveLength(0);
  });
});
