/**
 * Tests for the inverse mapper `extraerMontosLoadBearing` (PR6 slice 2).
 *
 * Turns the domain `ResultadoBoleta` (the NEW engine's output) into the subset of
 * `PlanillaDetalle` fields whose amounts the engine authoritatively computes
 * (haber, HE, nocturna, gratificación, bonif 30334, CTS, EsSalud empleador,
 * AFP/ONP, renta 5ta y los totales derivados). These are the load-bearing
 * amounts the real path routes through the engine; the remaining ~110 auxiliary
 * DTO fields (estructura, días, vida ley, computables, truncos) are filled from
 * the legacy auxiliary pass at the service edge.
 */
import { extraerMontosLoadBearing } from './mapear-resultado-detalle';
import { ResultadoBoleta } from '../dominio/tipos';

function boleta(conceptos: ResultadoBoleta['conceptos']): ResultadoBoleta {
  const ingresos = conceptos.filter((c) => c.tipo === 'ingreso');
  const descuentos = conceptos.filter((c) => c.tipo === 'descuento');
  const aportes = conceptos.filter((c) => c.tipo === 'aporte');
  const sum = (l: typeof conceptos) =>
    Math.round(l.reduce((a, c) => a + c.monto, 0) * 100) / 100;
  return {
    conceptos,
    totalIngresos: sum(ingresos),
    totalDescuentos: sum(descuentos),
    totalAportes: sum(aportes),
    neto: sum(ingresos) - sum(descuentos),
  };
}

describe('extraerMontosLoadBearing', () => {
  it('extrae el haber mensual y las horas extras como ingresos', () => {
    const r = extraerMontosLoadBearing(
      boleta([
        {
          clave: 'haber_mensual',
          descripcion: '',
          tipo: 'ingreso',
          monto: 3000,
        },
        {
          clave: 'horas_extras_25',
          descripcion: '',
          tipo: 'ingreso',
          monto: 62.52,
        },
        {
          clave: 'horas_extras_35',
          descripcion: '',
          tipo: 'ingreso',
          monto: 16.88,
        },
      ]),
    );
    expect(r.haber_mensual).toBe(3000);
    expect(r.horas_extras_25).toBe(62.52);
    expect(r.horas_extras_35).toBe(16.88);
    expect(r.horas_extras).toBe(79.4);
  });

  it('extrae pensión (AFP), EsSalud empleador y renta 5ta', () => {
    const r = extraerMontosLoadBearing(
      boleta([
        { clave: 'afp_aporte', descripcion: '', tipo: 'descuento', monto: 300 },
        { clave: 'afp_prima', descripcion: '', tipo: 'descuento', monto: 52.2 },
        {
          clave: 'afp_comision',
          descripcion: '',
          tipo: 'descuento',
          monto: 44.1,
        },
        {
          clave: 'essalud_empleador',
          descripcion: '',
          tipo: 'aporte',
          monto: 270,
        },
        { clave: 'renta_5ta', descripcion: '', tipo: 'descuento', monto: 0 },
      ]),
    );
    expect(r.afp_aporte).toBe(300);
    expect(r.afp_prima).toBe(52.2);
    expect(r.afp_seguro).toBe(52.2); // espejo de prima (igual que el legacy)
    expect(r.afp_comision).toBe(44.1);
    expect(r.essalud_empleador).toBe(270);
    expect(r.renta_5ta).toBe(0);
  });

  it('extrae ONP cuando el trabajador es ONP', () => {
    const r = extraerMontosLoadBearing(
      boleta([
        { clave: 'onp', descripcion: '', tipo: 'descuento', monto: 260 },
      ]),
    );
    expect(r.onp).toBe(260);
    expect(r.afp_aporte).toBe(0);
  });

  it('extrae gratificación, bonificación 30334 y CTS', () => {
    const r = extraerMontosLoadBearing(
      boleta([
        {
          clave: 'gratificacion',
          descripcion: '',
          tipo: 'ingreso',
          monto: 3000,
        },
        {
          clave: 'bonificacion_extraordinaria',
          descripcion: '',
          tipo: 'ingreso',
          monto: 270,
        },
        { clave: 'cts', descripcion: '', tipo: 'ingreso', monto: 1750 },
      ]),
    );
    expect(r.gratificacion_monto).toBe(3000);
    expect(r.bonif_extraordinaria).toBe(270);
    expect(r.cts_monto).toBe(1750);
  });

  it('campos sin concepto en la boleta quedan en 0', () => {
    const r = extraerMontosLoadBearing(boleta([]));
    expect(r.haber_mensual).toBe(0);
    expect(r.gratificacion_monto).toBe(0);
    expect(r.essalud_empleador).toBe(0);
  });
});
