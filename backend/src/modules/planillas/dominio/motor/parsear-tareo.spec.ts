import { parsearTareo } from './parsear-tareo';
import { DetalleTareo } from '../tipos';

const dia = (over: Partial<DetalleTareo>): DetalleTareo => ({
  fecha: new Date('2026-03-01'),
  horasTrabajadas: 8,
  horasExtras: 0,
  esNocturno: false,
  esFeriado: false,
  asistio: true,
  ...over,
});

describe('parsear-tareo', () => {
  it('cuenta días trabajados solo cuando hubo asistencia', () => {
    const r = parsearTareo([dia({}), dia({ asistio: false }), dia({})]);
    expect(r.diasTrabajados).toBe(2);
  });

  it('separa HE en 25% (primeras 2h del día) y 35% (resto)', () => {
    const r = parsearTareo([dia({ horasExtras: 3 })]);
    expect(r.horasExtras25).toBe(2);
    expect(r.horasExtras35).toBe(1);
  });

  it('clasifica las HE nocturnas por separado', () => {
    const r = parsearTareo([dia({ horasExtras: 3, esNocturno: true })]);
    expect(r.horasExtrasNocturnas25).toBe(2);
    expect(r.horasExtrasNocturnas35).toBe(1);
    expect(r.horasExtras25).toBe(0);
    expect(r.diasNocturnos).toBe(1);
  });

  it('acumula horas normales de los días asistidos', () => {
    const r = parsearTareo([
      dia({ horasTrabajadas: 8 }),
      dia({ horasTrabajadas: 6 }),
    ]);
    expect(r.horasNormales).toBe(14);
  });

  it('un tareo vacío devuelve ceros', () => {
    const r = parsearTareo([]);
    expect(r.diasTrabajados).toBe(0);
    expect(r.horasNormales).toBe(0);
  });
});
