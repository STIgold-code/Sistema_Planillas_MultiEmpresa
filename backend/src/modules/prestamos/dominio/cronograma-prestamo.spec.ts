/**
 * El cronograma es el papel que firma el trabajador. Estos tests fijan que diga
 * lo mismo que va a hacer el motor: el período correcto con día de corte, el
 * salto del adelanto de gratificación, y una última cuota que cierra la deuda
 * sin dejar céntimos fantasma.
 */
import {
  cuotaDesdeNumeroCuotas,
  numeroCuotasDesdeCuota,
  periodoDeFecha,
  primerPeriodoDescuento,
  proyectarCronograma,
  MAX_FILAS_PROYECTADAS,
} from './cronograma-prestamo';

const BASE = {
  montoTotal: 600,
  cuotaMensual: 200,
  tipo: 'PRESTAMO' as const,
  fechaOtorgado: '2026-07-10',
  diaCorte: null,
};

describe('periodoDeFecha — la ventana manda, no el mes calendario', () => {
  it('sin día de corte, el período es el mes de la fecha', () => {
    expect(periodoDeFecha(2026, 7, 28, null)).toEqual({ anio: 2026, mes: 7 });
  });

  it('antes o el mismo día del corte, el período es el mes de la fecha', () => {
    expect(periodoDeFecha(2026, 7, 24, 25)).toEqual({ anio: 2026, mes: 7 });
    expect(periodoDeFecha(2026, 7, 25, 25)).toEqual({ anio: 2026, mes: 7 });
  });

  it('pasado el corte, cae en el período SIGUIENTE', () => {
    // La ventana de julio con corte 25 va del 26-jun al 25-jul: el 28 ya es agosto.
    expect(periodoDeFecha(2026, 7, 28, 25)).toEqual({ anio: 2026, mes: 8 });
  });

  it('pasado el corte en diciembre, salta de año', () => {
    expect(periodoDeFecha(2026, 12, 30, 25)).toEqual({ anio: 2027, mes: 1 });
  });
});

describe('proyectarCronograma — el desfase que hacía firmar un papel equivocado', () => {
  it('un préstamo posterior al corte arranca el mes siguiente', () => {
    const proyeccion = proyectarCronograma({
      ...BASE,
      fechaOtorgado: '2026-07-28',
      diaCorte: 25,
    });

    expect(proyeccion?.filas[0].periodo).toBe('2026-08');
  });

  it('el mismo préstamo sin día de corte arranca en julio', () => {
    const proyeccion = proyectarCronograma({
      ...BASE,
      fechaOtorgado: '2026-07-28',
      diaCorte: null,
    });

    expect(proyeccion?.filas[0].periodo).toBe('2026-07');
  });

  it('no corre la fecha por zona horaria: el día 1 sigue siendo del mismo mes', () => {
    const proyeccion = proyectarCronograma({
      ...BASE,
      fechaOtorgado: '2026-07-01',
      diaCorte: null,
    });

    expect(proyeccion?.filas[0].periodo).toBe('2026-07');
  });
});

describe('proyectarCronograma — el saldo y las cuotas', () => {
  it('reparte el monto en cuotas consecutivas hasta cancelarlo', () => {
    const proyeccion = proyectarCronograma(BASE);

    expect(proyeccion?.filas.map((f) => f.periodo)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(proyeccion?.filas.at(-1)?.saldoFinal).toBe(0);
    expect(proyeccion?.totalProgramado).toBe(600);
    expect(proyeccion?.truncado).toBe(false);
  });

  it('la última cuota se ajusta al saldo y no deja céntimos fantasma', () => {
    const cuota = cuotaDesdeNumeroCuotas(1000, 3);
    const proyeccion = proyectarCronograma({
      ...BASE,
      montoTotal: 1000,
      cuotaMensual: cuota,
    });

    expect(cuota).toBe(333.34);
    expect(proyeccion?.filas).toHaveLength(3);
    expect(proyeccion?.filas.at(-1)?.cuota).toBe(333.32);
    expect(proyeccion?.totalProgramado).toBe(1000);
  });

  it('un descuento recurrente sin monto no es proyectable', () => {
    expect(proyectarCronograma({ ...BASE, montoTotal: null })).toBeNull();
  });

  it('una fecha inválida no revienta: devuelve null', () => {
    expect(
      proyectarCronograma({ ...BASE, fechaOtorgado: '2026-7-1' }),
    ).toBeNull();
  });

  it('una cuota irrisoria trunca en vez de colgar el navegador', () => {
    const proyeccion = proyectarCronograma({
      ...BASE,
      montoTotal: 5000,
      cuotaMensual: 1,
    });

    expect(proyeccion?.filas).toHaveLength(MAX_FILAS_PROYECTADAS);
    expect(proyeccion?.truncado).toBe(true);
  });
});

describe('adelanto de gratificación — solo julio y diciembre (Ley 27735)', () => {
  it('otorgado en marzo, el primer descuento es julio', () => {
    expect(
      primerPeriodoDescuento('ADELANTO_GRATIFICACION', { anio: 2026, mes: 3 }),
    ).toEqual({ anio: 2026, mes: 7 });
  });

  it('otorgado en agosto, el primer descuento es diciembre', () => {
    expect(
      primerPeriodoDescuento('ADELANTO_GRATIFICACION', { anio: 2026, mes: 8 }),
    ).toEqual({ anio: 2026, mes: 12 });
  });

  it('las cuotas saltan de julio a diciembre y al julio siguiente', () => {
    const proyeccion = proyectarCronograma({
      ...BASE,
      tipo: 'ADELANTO_GRATIFICACION',
      fechaOtorgado: '2026-03-10',
    });

    expect(proyeccion?.filas.map((f) => f.periodo)).toEqual([
      '2026-07',
      '2026-12',
      '2027-07',
    ]);
  });
});

describe('conversión entre cuota y número de cuotas', () => {
  it('el número de cuotas incluye la última parcial', () => {
    expect(numeroCuotasDesdeCuota(1000, 300)).toBe(4);
  });

  it('valores sin sentido devuelven cero en vez de Infinity', () => {
    expect(cuotaDesdeNumeroCuotas(1000, 0)).toBe(0);
    expect(numeroCuotasDesdeCuota(0, 100)).toBe(0);
  });
});
