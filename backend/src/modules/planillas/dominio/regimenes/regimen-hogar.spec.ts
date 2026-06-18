import { RegimenHogar } from './regimen-hogar';
import { ParametrosLegales } from '../parametros/parametros-legales';
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
};

const ctx = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.HOGAR,
  remuneracionMensual: 1200,
  remuneracionAfecta: 1200,
  remuneracionComputable: 1200,
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

describe('RegimenHogar (Ley 31047)', () => {
  const hogar = new RegimenHogar();

  it('expone el régimen HOGAR', () => {
    expect(hogar.regimen).toBe(RegimenLaboral.HOGAR);
  });

  it('gratificación = 1 sueldo completo en julio [ASUNCION A VALIDAR: entera vs media]', () => {
    expect(hogar.gratificacion(ctx()).conceptos[0]?.monto).toBe(1200);
  });

  it('CTS = 1 sueldo/año (semestre completo) en noviembre', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 11, fecha: new Date('2026-11-30') },
    });
    // 1200/12*6 = 600 (medio sueldo por semestre = 1 sueldo/año)
    expect(hogar.cts(c).conceptos[0]?.monto).toBe(600);
  });

  it('vacaciones derecho 30 dias: valoriza los gozados del periodo', () => {
    const c = ctx({ devengados: { ...ctx().devengados, diasVacaciones: 30 } });
    // 1200/30*30 = 1200
    expect(hogar.vacaciones(c).conceptos[0]?.monto).toBe(1200);
  });

  it('EsSalud = 9% de la afecta', () => {
    // 1200 * 0.09 = 108
    expect(hogar.saludEmpleador(ctx(), params).conceptos[0]?.monto).toBe(108);
  });

  it('asignacion familiar = 10% RMV si tiene hijos [ASUNCION A VALIDAR: AF en hogar]', () => {
    expect(
      hogar.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos[0]
        ?.monto,
    ).toBe(113);
  });
});
