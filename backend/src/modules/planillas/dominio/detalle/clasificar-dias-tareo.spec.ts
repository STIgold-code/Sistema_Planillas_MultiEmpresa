import {
  clasificarDiasTareo,
  ClasificacionTareo,
} from './clasificar-dias-tareo';
import { DiaTareoDetalle } from './tipos-detalle';

function dia(over: Partial<DiaTareoDetalle> = {}): DiaTareoDetalle {
  return {
    // La clasificación no mira la fecha; se fija una cualquiera para completar
    // el shape (el descuento dominical sí la usa, y tiene su propio spec).
    fecha: new Date(2026, 5, 1),
    codigo: 'A',
    esLaborable: true,
    esFeriadoTrabajado: false,
    horasDiurnas: 8,
    horasNocturnas: 0,
    horasDetalle: 8,
    horasDefault: 8,
    minutosNoLaborados: 0,
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
    // La falta es ausencia SIN GOCE: no devenga, así que NO cuenta como día
    // laborable (el haber se prorratea sin ella y las cotizaciones se calculan
    // sobre lo devengado). El legacy la contaba y cotizaba sobre base inflada.
    expect(c.diasLaborables).toBe(0);
  });

  it('excluye códigos NO_LABORABLE aunque es_laborable sea true', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'DL', esLaborable: true }),
      dia({ codigo: 'V', esLaborable: true }),
    ]);
    expect(c.diasLaborables).toBe(0);
    expect(c.diasVacaciones).toBe(1);
  });

  it('marca la licencia CON goce laborable como YA remunerada en el proporcional', () => {
    const c = clasificarDiasTareo([
      ...Array.from({ length: 26 }, () => dia()),
      ...Array.from({ length: 4 }, () =>
        dia({
          codigo: 'LCG',
          esLaborable: true,
          horasDetalle: 0,
          horasDiurnas: 0,
        }),
      ),
    ]);
    expect(c.diasLicenciaConGoce).toBe(4);
    // El día de licencia CON goce devenga: entra a `diasLaborables` y, por lo
    // tanto, ya está pagado dentro del sueldo proporcional (sueldo/30 × días).
    expect(c.diasLaborables).toBe(30);
    expect(c.diasLicenciaConGoceEnLaborables).toBe(4);
  });

  it('cuenta las licencias con goce de la familia (LF, LP, LCG) ya remuneradas', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'LF', horasDetalle: 0, horasDiurnas: 0 }),
      dia({ codigo: 'LP', horasDetalle: 0, horasDiurnas: 0 }),
      dia({ codigo: 'LIC-G', horasDetalle: 0, horasDiurnas: 0 }),
    ]);
    expect(c.diasLicenciaFallecimiento).toBe(1);
    expect(c.diasLicenciaPaternidad).toBe(1);
    expect(c.diasLicenciaConGoce).toBe(1);
    expect(c.diasLicenciaConGoceEnLaborables).toBe(3);
  });

  it('la licencia con goce NO laborable queda fuera del proporcional', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'LCG', esLaborable: false, horasDetalle: 0 }),
    ]);
    expect(c.diasLicenciaConGoce).toBe(1);
    expect(c.diasLaborables).toBe(0);
    // No entró al prorrateo: el concepto separado es el ÚNICO pago de ese día.
    expect(c.diasLicenciaConGoceEnLaborables).toBe(0);
  });

  it('acumula minutos de tardanza (T) desde el tiempo NO laborado del día', () => {
    // CAMBIO DE CONTRATO (deliberado): antes la tardanza se leía de
    // `horasDetalle`, el mismo campo que expresa las horas TRABAJADAS y que
    // alimenta las horas extras. Un solo dato con dos significados opuestos:
    // marcar T con 0.5 significaba a la vez "media hora tarde" y "jornada de
    // media hora". Ahora el tiempo descontable viaja en `minutosNoLaborados`,
    // su propio campo, y `horasDetalle` conserva un único significado.
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', minutosNoLaborados: 30, esLaborable: false }),
    ]);
    expect(c.minutosTardanza).toBe(30);
  });

  it('la tardanza ya NO se deduce de las horas trabajadas del día', () => {
    // Regresión del contrato viejo: una jornada de 8 horas con el código T no
    // puede interpretarse como 480 minutos de tardanza.
    const c = clasificarDiasTareo([dia({ codigo: 'T', horasDetalle: 8 })]);
    expect(c.minutosTardanza).toBe(0);
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

describe('clasificarDiasTareo - destaque a mina (política BM: 8h + 4 extras diurnas)', () => {
  it('MINA de 12h diurnas devenga el día y genera 2h al 25% y 2h al 35%', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'MINA', horasDetalle: 12, horasDiurnas: 12 }),
    ]);
    expect(c.diasLaborables).toBe(1);
    expect(c.turnoDia).toBe(1);
    expect(c.turnoNoche).toBe(0);
    expect(c.totalHorasExtrasDiurnas25).toBe(2);
    expect(c.totalHorasExtrasDiurnas35).toBe(2);
    expect(c.totalHorasExtrasNocturnas25).toBe(0);
  });

  it('MINA-F (feriado trabajado en destaque) suma además el feriado doble', () => {
    const c = clasificarDiasTareo([
      dia({
        codigo: 'MINA-F',
        horasDetalle: 12,
        horasDiurnas: 12,
        esFeriadoTrabajado: true,
      }),
    ]);
    // Día devengado + feriado trabajado (paga valorDía × 2 aparte) + extras.
    expect(c.diasLaborables).toBe(1);
    expect(c.cantidadFeriados).toBe(1);
    expect(c.totalHorasExtrasDiurnas25).toBe(2);
    expect(c.totalHorasExtrasDiurnas35).toBe(2);
  });

  it('DT (descanso trabajado al 100%, a elección del trabajador) devenga y paga doble aparte', () => {
    const c = clasificarDiasTareo([dia({ codigo: 'DT' })]);
    // Día base devengado + diasDescansoTrabajado paga valorDía × 2 aparte:
    // descanso ya remunerado en los 30 + día trabajado + sobretasa 100%.
    expect(c.diasLaborables).toBe(1);
    expect(c.diasDescansoTrabajado).toBe(1);
  });
});

describe('clasificarDiasTareo - tiempo NO laborado (tardanzas y permisos por horas)', () => {
  it('la tardanza (T) acumula sus minutos no laborados', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', minutosNoLaborados: 45 }),
    ]);
    expect(c.minutosTardanza).toBe(45);
  });

  it('acumula los minutos de tardanza de varios días', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', minutosNoLaborados: 45 }),
      dia({ codigo: 'T', minutosNoLaborados: 15 }),
      dia(),
    ]);
    expect(c.minutosTardanza).toBe(60);
  });

  it('la tardanza SIN minutos declarados no descuenta nada', () => {
    // Marcar T y olvidar los minutos no puede inventar un descuento.
    const c = clasificarDiasTareo([dia({ codigo: 'T' })]);
    expect(c.minutosTardanza).toBe(0);
  });

  it('la tardanza DEVENGA el día: el trabajador asistió', () => {
    // El descuento sale por su propia columna (valorMinuto × minutos), no por
    // sacar el día de la base como hacen las ausencias sin goce.
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', minutosNoLaborados: 45 }),
    ]);
    expect(c.diasLaborables).toBe(1);
  });

  it('los minutos no laborados NO alteran la jornada ni generan horas extras', () => {
    // Regresión de la ambigüedad que motivó la columna dedicada: `horas` sigue
    // siendo la jornada trabajada y `minutosNoLaborados` el tiempo descontado.
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', horasDetalle: 8, minutosNoLaborados: 120 }),
    ]);
    expect(c.horas8).toBe(1);
    expect(c.totalHorasExtrasDiurnas25).toBe(0);
    expect(c.minutosTardanza).toBe(120);
  });

  it('el permiso (P) con minutos es PARCIAL: acumula minutos y no cuenta día completo', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'P', minutosNoLaborados: 180 }),
    ]);
    expect(c.minutosPermiso).toBe(180);
    expect(c.diasPermiso).toBe(0);
    expect(c.diasLaborables).toBe(1);
  });

  it('el permiso (P) SIN minutos sigue siendo de día completo', () => {
    // Compatibilidad con el comportamiento previo: P sin minutos = un día.
    const c = clasificarDiasTareo([dia({ codigo: 'P' })]);
    expect(c.diasPermiso).toBe(1);
    expect(c.minutosPermiso).toBe(0);
  });

  it('convive un permiso parcial con uno de día completo', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'P', minutosNoLaborados: 120 }),
      dia({ codigo: 'P' }),
    ]);
    expect(c.minutosPermiso).toBe(120);
    expect(c.diasPermiso).toBe(1);
  });

  it('ignora minutos negativos o no numéricos', () => {
    const c = clasificarDiasTareo([
      dia({ codigo: 'T', minutosNoLaborados: -30 }),
    ]);
    expect(c.minutosTardanza).toBe(0);
  });
});
