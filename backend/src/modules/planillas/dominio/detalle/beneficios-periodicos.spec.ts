import {
  calcularComputablesGratificacion,
  calcularGratificacionDetalle,
  calcularCtsDetalle,
  calcularBeneficiosTruncosDetalle,
  ParametrosBeneficiosTruncos,
  ParametrosComputablesGratificacion,
} from './beneficios-periodicos';

describe('calcularComputablesGratificacion', () => {
  const base = (
    overrides: Partial<ParametrosComputablesGratificacion> = {},
  ): ParametrosComputablesGratificacion => ({
    hayDiasTrabajados: true,
    sueldoPeriodo: 2000,
    sueldoCierreSemestre: 1800,
    asignacionFamiliarPeriodo: 113,
    asignacionFamiliarCierre: 113,
    promedioVariables: 0,
    ...overrides,
  });

  it('la ORDINARIA se congela al cierre del semestre (art. 3.2)', () => {
    expect(calcularComputablesGratificacion(base()).ordinaria).toBe(1913);
  });

  it('la TRUNCA usa la remuneración del período, no la del cierre (art. 5)', () => {
    expect(calcularComputablesGratificacion(base()).trunca).toBe(2113);
  });

  it('el promedio de variables regulares entra a las DOS bases', () => {
    const r = calcularComputablesGratificacion(
      base({ promedioVariables: 185.25 }),
    );
    expect(r.ordinaria).toBe(2098.25);
    expect(r.trunca).toBe(2298.25);
  });

  it('sin días devengados no hay base de gratificación', () => {
    const r = calcularComputablesGratificacion(
      base({ hayDiasTrabajados: false, promedioVariables: 185.25 }),
    );
    expect(r).toEqual({ ordinaria: 0, trunca: 0 });
  });

  it('la asignación familiar puede diferir entre el cierre y el período', () => {
    const r = calcularComputablesGratificacion(
      base({ asignacionFamiliarCierre: 102.5 }),
    );
    expect(r.ordinaria).toBe(1902.5);
    expect(r.trunca).toBe(2113);
  });
});

describe('calcularGratificacionDetalle', () => {
  it('paga semestre completo en julio con bonificación 30334 (9%)', () => {
    const r = calcularGratificacionDetalle(7, 3000, 6, 0.09);
    expect(r.gratificacionMonto).toBe(3000);
    expect(r.bonifExtraordinariaMonto).toBe(270);
  });

  it('no paga fuera de julio/diciembre', () => {
    expect(calcularGratificacionDetalle(3, 3000, 6, 0.09)).toEqual({
      gratificacionMonto: 0,
      bonifExtraordinariaMonto: 0,
    });
  });

  it('prorratea por meses incompletos', () => {
    expect(
      calcularGratificacionDetalle(12, 3000, 3, 0.09).gratificacionMonto,
    ).toBe(1500);
  });
});

describe('calcularCtsDetalle', () => {
  it('deposita semestre completo en noviembre', () => {
    // (3000/12)*6 = 1500
    expect(calcularCtsDetalle(11, 3000, 6, 0)).toBe(1500);
  });

  it('suma la fracción de días', () => {
    // (3600/12)*6 + (3600/360)*30 = 1800 + 300 = 2100
    expect(calcularCtsDetalle(5, 3600, 6, 30)).toBe(2100);
  });

  it('no deposita fuera de mayo/noviembre', () => {
    expect(calcularCtsDetalle(7, 3000, 6, 0)).toBe(0);
  });
});

/** Base común de un cese: sueldo 3600, computables 3000. */
function truncos(
  over: Partial<ParametrosBeneficiosTruncos> = {},
): ParametrosBeneficiosTruncos {
  return {
    empleadoCesa: true,
    mes: 6,
    diasTrabajados: 30,
    remComputableCts: 3000,
    remComputableGratificacion: 3000,
    sueldoBase: 3600,
    tieneAsignacionFamiliar: false,
    tieneFechaIngreso: true,
    asignacionFamiliarMonto: 113,
    ...over,
  };
}

describe('calcularBeneficiosTruncosDetalle', () => {
  it('devuelve 0 si el empleado no cesa', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ empleadoCesa: false }),
    );
    expect(r.totalBeneficiosSociales).toBe(0);
  });

  it('incluye asignación familiar en la base de vacaciones truncas', () => {
    const conAf = calcularBeneficiosTruncosDetalle(
      truncos({
        tieneAsignacionFamiliar: true,
        fechaIngreso: new Date(2026, 0, 1),
        fechaCese: new Date(2026, 5, 9),
      }),
    );
    const sinAf = calcularBeneficiosTruncosDetalle(
      truncos({
        fechaIngreso: new Date(2026, 0, 1),
        fechaCese: new Date(2026, 5, 9),
      }),
    );
    expect(conAf.vacTruncas).toBeGreaterThan(sinAf.vacTruncas);
  });
});

/**
 * FIX 2 — Gratificación trunca por meses calendario COMPLETOS.
 * Ley 27735 art. 7 y D.S. 005-2002-TR art. 5: la grati trunca se paga a razón
 * de un sexto por MES CALENDARIO COMPLETO laborado en el semestre. Los días
 * sueltos del mes de cese no generan sexto.
 */
describe('gratificación trunca — solo meses calendario COMPLETOS (Ley 27735 art. 7)', () => {
  it('cese el 09-jun paga 5/6 del semestre (junio no se completó)', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ mes: 6, fechaCese: new Date(2026, 5, 9) }),
    );
    expect(r.gratTrunca).toBe(2500); // 3000/6 × 5
  });

  it('cese el 30-jun (último día del mes) paga 6/6', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ mes: 6, fechaCese: new Date(2026, 5, 30) }),
    );
    expect(r.gratTrunca).toBe(3000); // 3000/6 × 6
  });

  it('cese el 31-jul paga 1/6 del semestre julio-diciembre', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ mes: 7, fechaCese: new Date(2026, 6, 31) }),
    );
    expect(r.gratTrunca).toBe(500); // 3000/6 × 1
  });

  it('cese el 15-jul paga 0/6: ningún mes del semestre se completó', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ mes: 7, fechaCese: new Date(2026, 6, 15) }),
    );
    expect(r.gratTrunca).toBe(0);
  });

  it('el mes del CESE manda sobre el mes de la planilla (ventana con día de corte)', () => {
    // Planilla de julio con ventana 26-jun → 25-jul: el trabajador cesó el
    // 30-jun, así que el semestre que trunca es enero-junio (6/6), no julio.
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ mes: 7, fechaCese: new Date(2026, 5, 30) }),
    );
    expect(r.gratTrunca).toBe(3000);
  });

  it('sin fecha de cese conserva el comportamiento histórico (mes en curso contado)', () => {
    const r = calcularBeneficiosTruncosDetalle(truncos({ mes: 6 }));
    expect(r.gratTrunca).toBe(3000);
  });
});

/**
 * FIX 4 — Deducción de los días NO laborados del semestre.
 * D.S. 005-2002-TR art. 3.4 (texto según D.S. 017-2002-TR): "El tiempo de
 * servicios para efectos del cálculo se determina por cada mes calendario
 * completo laborado en el período correspondiente. Los días que no se consideren
 * tiempo efectivamente laborado se deducirán a razón de un treintavo de la
 * fracción correspondiente."
 *
 * Computable 1800 → un treintavo del sexto = 1800/180 = S/ 10 por día.
 */
describe('gratificación ordinaria — deducción de días no laborados (D.S. 005-2002-TR art. 3.4)', () => {
  it('REGRESIÓN: sin ausencias registradas paga el íntegro y la bonif 9% completa', () => {
    const r = calcularGratificacionDetalle(7, 1800, 6, 0.09);
    expect(r.gratificacionMonto).toBe(1800);
    expect(r.bonifExtraordinariaMonto).toBe(162);
  });

  it('julio deduce los días de ENERO a JUNIO (caso real FRANCISCO: 5 días → 175/180)', () => {
    const r = calcularGratificacionDetalle(7, 1800, 6, 0.09, {
      2: 3,
      4: 2,
    });
    expect(r.gratificacionMonto).toBe(1750);
  });

  it('julio IGNORA los días del semestre siguiente (julio-diciembre)', () => {
    const r = calcularGratificacionDetalle(7, 1800, 6, 0.09, {
      7: 4,
      11: 6,
    });
    expect(r.gratificacionMonto).toBe(1800);
  });

  it('diciembre deduce de JULIO a DICIEMBRE, mes en curso incluido (caso real GARRO: 9 días)', () => {
    const r = calcularGratificacionDetalle(12, 1800, 6, 0.09, {
      1: 5, // semestre anterior: no deduce
      8: 5,
      10: 2,
      12: 2, // mes en curso
    });
    expect(r.gratificacionMonto).toBe(1710); // 1800 × 171/180
  });

  it('la bonificación extraordinaria 9% se calcula sobre la grati YA deducida', () => {
    const r = calcularGratificacionDetalle(7, 1800, 6, 0.09, { 3: 5 });
    expect(r.gratificacionMonto).toBe(1750);
    expect(r.bonifExtraordinariaMonto).toBe(157.5); // 1750 × 9%
  });

  it('nunca paga negativo: el piso es 0', () => {
    const r = calcularGratificacionDetalle(7, 1800, 6, 0.09, { 3: 200 });
    expect(r.gratificacionMonto).toBe(0);
    expect(r.bonifExtraordinariaMonto).toBe(0);
  });
});

describe('gratificación trunca — treintavos DENTRO de los meses completos', () => {
  it('REGRESIÓN: cese el 30-jun sin ausencias sigue pagando 6/6', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        remComputableGratificacion: 1800,
        fechaCese: new Date(2026, 5, 30),
        diasNoLaboradosPorMes: {},
      }),
    );
    expect(r.gratTrunca).toBe(1800);
  });

  it('cese el 30-jun con 5 días no laborados en enero-junio paga 175/180', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        remComputableGratificacion: 1800,
        fechaCese: new Date(2026, 5, 30),
        diasNoLaboradosPorMes: { 1: 2, 3: 3 },
      }),
    );
    expect(r.gratTrunca).toBe(1750);
  });

  it('cese el 09-jun ignora los días de JUNIO: junio no es mes completo', () => {
    // 5 meses completos (ene-may) = 1500, menos 1 treintavo del sexto por el
    // día de febrero. Los 4 días de junio no se deducen porque junio no aporta
    // sexto alguno.
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        remComputableGratificacion: 1800,
        fechaCese: new Date(2026, 5, 9),
        diasNoLaboradosPorMes: { 2: 1, 6: 4 },
      }),
    );
    expect(r.gratTrunca).toBe(1490);
  });

  it('cese el 30-nov solo mira julio-noviembre (semestre del cese)', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 11,
        remComputableGratificacion: 1800,
        fechaCese: new Date(2026, 10, 30),
        diasNoLaboradosPorMes: { 3: 6, 7: 3 },
      }),
    );
    expect(r.gratTrunca).toBe(1470); // 1800 × 5/6 − 3 × 10
  });

  it('nunca paga negativo: el piso es 0', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        remComputableGratificacion: 1800,
        fechaCese: new Date(2026, 5, 30),
        diasNoLaboradosPorMes: { 1: 200 },
      }),
    );
    expect(r.gratTrunca).toBe(0);
  });
});

/**
 * FIX 3 — Vacaciones truncas: dozavos y treintavos desde el ANIVERSARIO de
 * ingreso (D.L. 713 arts. 22-23; D.S. 012-92-TR art. 21), no desde enero.
 */
describe('vacaciones truncas — dozavos/treintavos desde el aniversario (D.L. 713 art. 22-23)', () => {
  it('ingreso 01-ene-2026 y cese 09-jun-2026 → 5 dozavos + 9 treintavos', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        fechaIngreso: new Date(2026, 0, 1),
        fechaCese: new Date(2026, 5, 9),
      }),
    );
    // (3600/12)×5 + (3600/360)×9 = 1500 + 90 = 1590
    expect(r.vacTruncas).toBe(1590);
  });

  it('aniversario a mitad de año: cuenta desde el último aniversario, no desde enero', () => {
    // Ingreso 10-nov-2024, cese 09-jun-2026 → último aniversario 10-nov-2025.
    // Del 10-nov al 09-jun hay 7 meses completos exactos y 0 días sueltos.
    // Contado desde enero (el bug) habrían salido 6 dozavos.
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        fechaIngreso: new Date(2024, 10, 10),
        fechaCese: new Date(2026, 5, 9),
      }),
    );
    // (3600/12)×7 = 2100
    expect(r.vacTruncas).toBe(2100);
  });

  it('cese exactamente EN el aniversario reinicia el récord (1 treintavo)', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 3,
        fechaIngreso: new Date(2024, 2, 15),
        fechaCese: new Date(2026, 2, 15),
      }),
    );
    // El año de récord se cerró el 14-mar; el 15-mar abre uno nuevo → 1 día.
    expect(r.vacTruncas).toBe(10); // 3600/360
  });

  it('cese el día ANTERIOR al aniversario paga el récord completo (12 dozavos)', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 3,
        fechaIngreso: new Date(2024, 2, 15),
        fechaCese: new Date(2026, 2, 14),
      }),
    );
    expect(r.vacTruncas).toBe(3600); // (3600/12)×12
  });

  it('cese en el último día del mes no deja treintavos sueltos', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        fechaIngreso: new Date(2026, 0, 1),
        fechaCese: new Date(2026, 5, 30),
      }),
    );
    expect(r.vacTruncas).toBe(1800); // (3600/12)×6, sin días sueltos
  });

  it('sin fechas conserva el comportamiento histórico (dozavos por mes calendario)', () => {
    const r = calcularBeneficiosTruncosDetalle(truncos({ mes: 6 }));
    expect(r.vacTruncas).toBe(1800); // (3600/12)×6
  });

  it('sin fecha de ingreso no genera vacaciones truncas', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({ tieneFechaIngreso: false }),
    );
    expect(r.vacTruncas).toBe(0);
  });
});

/** La CTS trunca NO cambia con estos fixes: sigue siendo meses + treintavos. */
describe('CTS trunca — sin cambios (D.S. 001-97-TR)', () => {
  it('mantiene (computable/12)×meses + (computable/360)×días trabajados', () => {
    const r = calcularBeneficiosTruncosDetalle(
      truncos({
        mes: 6,
        diasTrabajados: 9,
        fechaIngreso: new Date(2026, 0, 1),
        fechaCese: new Date(2026, 5, 9),
      }),
    );
    // mes 6 → mesesDesdeUltimoCts = 6 - 5 = 1; (3000/12)×1 + (3000/360)×9
    expect(r.ctsTrunca).toBe(325);
  });
});
