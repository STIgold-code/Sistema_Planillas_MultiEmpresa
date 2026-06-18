import { RegimenMicroempresa } from './regimen-microempresa';
import { CalculadoraRegimen } from './calculadora-regimen.interface';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { stubParametrosRegimenes } from '../parametros/parametros-legales.stub';
import {
  ContextoCalculo,
  RegimenLaboral,
  ResumenTareo,
  TramoIR,
} from '../tipos';
import { CLAVE_SIS } from '../conceptos/salud-microempresa';

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
  vidaLeyTasa: () => 0,
  ...stubParametrosRegimenes,
};

const ctx = (overrides: Partial<ContextoCalculo> = {}): ContextoCalculo => ({
  regimenLaboral: RegimenLaboral.MICROEMPRESA,
  remuneracionMensual: 1130,
  remuneracionAfecta: 1130,
  remuneracionComputable: 1130,
  tieneHijos: true,
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

describe('RegimenMicroempresa (REMYPE)', () => {
  const micro: CalculadoraRegimen = new RegimenMicroempresa();

  it('expone el régimen MICROEMPRESA', () => {
    expect(micro.regimen).toBe(RegimenLaboral.MICROEMPRESA);
  });

  it('SIN gratificación (incluso en julio)', () => {
    expect(micro.gratificacion(ctx(), params).conceptos).toHaveLength(0);
  });

  it('SIN CTS (incluso en mes de depósito)', () => {
    const c = ctx({
      periodo: { anio: 2026, mes: 11, fecha: new Date('2026-11-30') },
    });
    expect(micro.cts(c, params).conceptos).toHaveLength(0);
  });

  it('vacaciones derecho 15 dias: valoriza los gozados del periodo', () => {
    const c = ctx({ devengados: { ...ctx().devengados, diasVacaciones: 15 } });
    // 1130/30*15 = 565
    expect(micro.vacaciones(c, params).conceptos[0]?.monto).toBe(565);
  });

  it('SIN asignacion familiar [ASUNCION A VALIDAR: AF en microempresa]', () => {
    expect(
      micro.asignacionFamiliar(ctx({ tieneHijos: true }), params).conceptos,
    ).toHaveLength(0);
  });

  it('salud = SIS (monto fijo), NO EsSalud 9%', () => {
    const r = micro.saludEmpleador(ctx(), params);
    const sis = r.conceptos.find((c) => c.clave === CLAVE_SIS);
    expect(sis?.monto).toBe(15);
    expect(sis?.tipo).toBe('aporte');
  });
});
