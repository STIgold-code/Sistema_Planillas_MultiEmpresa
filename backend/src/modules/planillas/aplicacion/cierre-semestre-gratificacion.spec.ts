import {
  ContratoVigencia,
  fechaCierreSemestreGratificacion,
  resolverCierreSemestreGratificacion,
  resolverRemuneracionVigente,
} from './cierre-semestre-gratificacion';

/** Fecha `@db.Date` de Prisma: midnight UTC. */
const fechaPrisma = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

describe('cierre del semestre de gratificación (D.S. 005-2002-TR art. 3.2)', () => {
  it('julio cierra el 30 de junio', () => {
    expect(fechaCierreSemestreGratificacion(7, 2026)).toEqual(
      new Date(2026, 5, 30),
    );
  });

  it('diciembre cierra el 30 de noviembre', () => {
    expect(fechaCierreSemestreGratificacion(12, 2026)).toEqual(
      new Date(2026, 10, 30),
    );
  });

  it('los demás meses no tienen cierre: no hay gratificación ordinaria', () => {
    for (const mes of [1, 5, 6, 8, 11]) {
      expect(fechaCierreSemestreGratificacion(mes, 2026)).toBeUndefined();
    }
  });
});

describe('remuneración vigente al cierre', () => {
  const cierre = new Date(2026, 5, 30);

  it('toma el contrato vigente y no el posterior al cierre', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2020, 1, 1),
        fecha_fin: fechaPrisma(2026, 6, 30),
        remuneracion: 1800,
      },
      {
        fecha_inicio: fechaPrisma(2026, 7, 1),
        fecha_fin: null,
        remuneracion: 2000,
      },
    ];
    expect(resolverRemuneracionVigente(contratos, cierre)).toBe(1800);
  });

  it('el contrato que termina EL DÍA del cierre sigue vigente ese día', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2020, 1, 1),
        fecha_fin: fechaPrisma(2026, 6, 30),
        remuneracion: 1800,
      },
    ];
    expect(resolverRemuneracionVigente(contratos, cierre)).toBe(1800);
  });

  it('el contrato que empieza EL DÍA del cierre ya rige', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2026, 6, 30),
        fecha_fin: null,
        remuneracion: 2400,
      },
    ];
    expect(resolverRemuneracionVigente(contratos, cierre)).toBe(2400);
  });

  it('con contratos superpuestos gana el de inicio más reciente', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2020, 1, 1),
        fecha_fin: null,
        remuneracion: 1800,
      },
      {
        fecha_inicio: fechaPrisma(2026, 4, 1),
        fecha_fin: null,
        remuneracion: 2000,
      },
    ];
    expect(resolverRemuneracionVigente(contratos, cierre)).toBe(2000);
  });

  it('ignora contratos sin remuneración registrada', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2020, 1, 1),
        fecha_fin: null,
        remuneracion: 1800,
      },
      {
        fecha_inicio: fechaPrisma(2026, 4, 1),
        fecha_fin: null,
        remuneracion: null,
      },
    ];
    expect(resolverRemuneracionVigente(contratos, cierre)).toBe(1800);
  });

  it('sin contratos no inventa un sueldo: devuelve undefined', () => {
    expect(resolverRemuneracionVigente(undefined, cierre)).toBeUndefined();
    expect(resolverRemuneracionVigente([], cierre)).toBeUndefined();
  });

  it('resolverCierreSemestreGratificacion devuelve vacío fuera de julio/diciembre', () => {
    expect(resolverCierreSemestreGratificacion(5, 2026, [])).toEqual({});
  });

  it('resolverCierreSemestreGratificacion combina fecha y remuneración', () => {
    const contratos: ContratoVigencia[] = [
      {
        fecha_inicio: fechaPrisma(2020, 1, 1),
        fecha_fin: null,
        remuneracion: 1600,
      },
    ];
    expect(resolverCierreSemestreGratificacion(12, 2026, contratos)).toEqual({
      fecha: new Date(2026, 10, 30),
      remuneracion: 1600,
    });
  });
});
