import {
  calcularJornadaNocturna,
  CLAVE_BONIF_NOCTURNA,
} from './jornada-nocturna';
import { ParametrosLegales } from '../parametros/parametros-legales';
import { stubParametrosRegimenes } from '../parametros/parametros-legales.stub';
import { TramoIR } from '../tipos';

const fecha = new Date('2026-03-31');

const paramsStub = (rmv: number): ParametrosLegales => ({
  rmv: () => rmv,
  uit: () => 0,
  asignacionFamiliar: () => 0,
  essaludTasa: () => 0,
  essaludMinimo: () => 0,
  sisMicroempresa: () => 0,
  tramosIR: (): TramoIR[] => [],
  sctrSalud: () => 0,
  sctrPension: () => 0,
  ...stubParametrosRegimenes,
});

const monto = (r: ReturnType<typeof calcularJornadaNocturna>): number =>
  r.conceptos
    .filter((c) => c.clave === CLAVE_BONIF_NOCTURNA)
    .reduce((a, c) => a + c.monto, 0);

describe('jornada-nocturna (35% sobretasa)', () => {
  // [ASUNCIÓN A VALIDAR]: la base de cálculo nocturna no puede ser menor a la RMV.
  it('la sobretasa 35% se calcula sobre una base nocturna no menor a RMV', () => {
    // remuneración S/1000 por debajo de RMV S/1130 → base = RMV
    const r = calcularJornadaNocturna(1000, 1, fecha, paramsStub(1130));
    // base diaria = 1130/30 = 37.667 ; sobretasa 35% sobre 1 día = 37.667·0.35 = 13.18
    expect(monto(r)).toBe(13.18);
  });

  it('usa la remuneración cuando supera la RMV', () => {
    const r = calcularJornadaNocturna(3000, 1, fecha, paramsStub(1130));
    // base diaria = 3000/30 = 100 ; 100·0.35 = 35
    expect(monto(r)).toBe(35);
  });

  it('sin días nocturnos no produce concepto', () => {
    const r = calcularJornadaNocturna(3000, 0, fecha, paramsStub(1130));
    expect(r.conceptos).toHaveLength(0);
  });
});
