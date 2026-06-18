import { calcularBoleta } from './calcular-boleta';
import { RegimenGeneral } from '../regimenes/regimen-general';
import { ParametrosLegales } from '../parametros/parametros-legales';
import {
  EntradaCalculo,
  RegimenLaboral,
  SistemaPensionario,
  TramoIR,
} from '../tipos';
import { CLAVE_GRATIFICACION } from '../conceptos/gratificacion';
import { CLAVE_BONIF_EXTRAORDINARIA } from '../conceptos/bonificacion-extraordinaria';
import { CLAVE_ESSALUD } from '../conceptos/salud-empleador';
import { CLAVE_ONP } from '../conceptos/sistema-pensionario';

const params: ParametrosLegales = {
  rmv: () => 1130,
  uit: () => 5500,
  asignacionFamiliar: () => 113,
  essaludTasa: () => 0.09,
  essaludMinimo: () => 101.7,
  sisMicroempresa: () => 15,
  tramosIR: (): TramoIR[] => [
    { hasta: 5, tasa: 0.08 },
    { hasta: Infinity, tasa: 0.3 },
  ],
  sctrSalud: () => 0,
  sctrPension: () => 0,
};

const dias30 = Array.from({ length: 30 }, () => ({
  fecha: new Date('2026-07-15'),
  horasTrabajadas: 8,
  horasExtras: 0,
  esNocturno: false,
  esFeriado: false,
  asistio: true,
}));

const entradaBase: EntradaCalculo = {
  regimenLaboral: RegimenLaboral.GENERAL,
  remuneracionBasica: 3000,
  tieneHijos: false,
  afiliacion: { sistema: SistemaPensionario.ONP },
  periodo: { anio: 2026, mes: 7, fecha: new Date('2026-07-31') },
  tareo: dias30,
};

describe('calcular-boleta (orquestador)', () => {
  it('compone conceptos compartidos + régimen-variables sin conocer el régimen', () => {
    const boleta = calcularBoleta(entradaBase, new RegimenGeneral(), params);
    const claves = boleta.conceptos.map((c) => c.clave);
    expect(claves).toContain(CLAVE_GRATIFICACION);
    expect(claves).toContain(CLAVE_ESSALUD);
    expect(claves).toContain(CLAVE_ONP);
  });

  it('deriva la bonificación extraordinaria (Ley 30334) de la gratificación', () => {
    const boleta = calcularBoleta(entradaBase, new RegimenGeneral(), params);
    const grati = boleta.conceptos.find((c) => c.clave === CLAVE_GRATIFICACION);
    const bono = boleta.conceptos.find(
      (c) => c.clave === CLAVE_BONIF_EXTRAORDINARIA,
    );
    expect(grati?.monto).toBe(3000);
    expect(bono?.monto).toBe(270); // 9% de 3000
  });

  it('totaliza ingresos, descuentos, aportes y neto', () => {
    const boleta = calcularBoleta(entradaBase, new RegimenGeneral(), params);
    expect(boleta.totalIngresos).toBeGreaterThan(0);
    expect(boleta.totalDescuentos).toBeGreaterThan(0); // ONP
    expect(boleta.totalAportes).toBeGreaterThan(0); // EsSalud
    expect(boleta.neto).toBe(
      Math.round((boleta.totalIngresos - boleta.totalDescuentos) * 100) / 100,
    );
  });
});
