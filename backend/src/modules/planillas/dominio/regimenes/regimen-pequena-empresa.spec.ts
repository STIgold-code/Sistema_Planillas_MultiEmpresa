import { RegimenPequenaEmpresa } from './regimen-pequena-empresa';
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
  regimenLaboral: RegimenLaboral.PEQUENA_EMPRESA,
  remuneracionMensual: 2000,
  remuneracionAfecta: 2000,
  remuneracionComputable: 2000,
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

describe('RegimenPequenaEmpresa (REMYPE)', () => {
  const pequena = new RegimenPequenaEmpresa();

  it('expone el régimen PEQUENA_EMPRESA', () => {
    expect(pequena.regimen).toBe(RegimenLaboral.PEQUENA_EMPRESA);
  });

  it('gratificación = 1/2 sueldo en julio (Ley 30334 derivada por el orquestador)', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
    });
    // 2000 * 6/6 * 0.5 = 1000
    expect(pequena.gratificacion(c).conceptos[0]?.monto).toBe(1000);
  });

  it('CTS = 1/2 depósito en noviembre', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 11, fecha: new Date('2026-11-30') },
    });
    // (2000/12*6) * 0.5 = 500
    expect(pequena.cts(c).conceptos[0]?.monto).toBe(500);
  });

  it('vacaciones derecho 15 dias: valoriza solo los gozados del periodo', () => {
    const c = ctx({ devengados: { ...ctx().devengados, diasVacaciones: 15 } });
    // 2000/30*15 = 1000
    expect(pequena.vacaciones(c).conceptos[0]?.monto).toBe(1000);
  });

  it('asignacion familiar = 10% RMV si tiene hijos [ASUNCION A VALIDAR: AF en REMYPE pequena]', () => {
    expect(
      pequena.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos[0]
        ?.monto,
    ).toBe(113);
  });

  it('EsSalud = 9% de la afecta', () => {
    // 2000 * 0.09 = 180
    expect(pequena.saludEmpleador(ctx(), params).conceptos[0]?.monto).toBe(180);
  });
});
