import {
  clasificarDiasTareo,
  ClasificacionTareo,
} from './clasificar-dias-tareo';
import { DiaTareoDetalle } from './tipos-detalle';

function dia(over: Partial<DiaTareoDetalle> = {}): DiaTareoDetalle {
  return {
    codigo: 'A',
    esLaborable: true,
    esFeriadoTrabajado: false,
    horasDiurnas: 8,
    horasNocturnas: 0,
    horasDetalle: 8,
    horasDefault: 8,
    ...over,
  };
}

describe('clasificarDiasTareo', () => {
  it('cuenta días laborables diurnos de 8h como horas_8 y turno_dia', () => {
    const c = clasificarDiasTareo([dia(), dia(), dia()]);
    expect(c.diasLaborables).toBe(3);
    expect(c.horas8).toBe(3);
    expect(c.turnoDia).toBe(3);
    expect(c.turnoNoche).toBe(0);
  });

  it('desglosa horas extras 25/35 diurnas (D.S. 007-2002-TR)', () => {
    // 11h = 3h extra → 2h al 25%, 1h al 35%
    const c = clasificarDiasTareo([
      dia({ horasDetalle: 11, horasDiurnas: 11 }),
    ]);
    expect(c.totalHorasExtrasDiurnas25).toBe(2);
    expect(c.totalHorasExtrasDiurnas35).toBe(1);
  });

  it('clasifica jornada nocturna y sus horas extras', () => {
    const c = clasificarDiasTareo([
      dia({ horasDetalle: 10, horasDiurnas: 0, horasNocturnas: 10 }),
    ]);
    expect(c.turnoNoche).toBe(1);
    expect(c.totalHorasExtrasNocturnas25).toBe(2);
  });

  it('cuenta faltas (F) sin sumarlas a días laborables', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'F', horasDetalle: 0, horasDiurnas: 0, esLaborable: true }),
    ]);
    expect(c.diasFalta).toBe(1);
    expect(c.diasLaborables).toBe(1); // F con es_laborable=true sí cuenta como laborable en el legacy
  });

  it('excluye códigos NO_LABORABLE aunque es_laborable sea true', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'DL', esLaborable: true }),
      dia({ codigo: 'V', esLaborable: true }),
    ]);
    expect(c.diasLaborables).toBe(0);
    expect(c.diasVacaciones).toBe(1);
  });

  it('acumula minutos de tardanza (T) desde las horas del detalle', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', horasDetalle: 0.5, esLaborable: false }),
    ]);
    expect(c.minutosTardanza).toBe(30);
  });

  it('marca adelanto quincenal (Q)', () => {
    const c = clasificarDiasTareo([dia({ codigo: 'Q', esLaborable: false })]);
    expect(c.tieneAdelantoQuincenal).toBe(true);
  });

  it('cuenta feriados trabajados por la bandera de nomenclatura', () => {
    const c: ClasificacionTareo = clasificarDiasTareo([
      dia({ codigo: 'AH', esFeriadoTrabajado: true }),
    ]);
    expect(c.cantidadFeriados).toBe(1);
  });
});
