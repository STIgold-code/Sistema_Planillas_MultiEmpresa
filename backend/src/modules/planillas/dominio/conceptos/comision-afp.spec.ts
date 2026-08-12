import {
  normalizarTipoComisionAfp,
  resolverTasaComisionAfp,
  TasasComisionAfp,
} from './comision-afp';
import { TipoComisionAfp } from '../tipos';

/** Tasas vigentes 2026 de AFP HABITAT (SBS), ya como fracción. */
const HABITAT: TasasComisionAfp = { flujo: 0.0147, mixtaFlujo: 0.0038 };

describe('comisión AFP — resolución por tipo de comisión del afiliado', () => {
  it('el afiliado por FLUJO paga la comisión sobre flujo pura', () => {
    expect(resolverTasaComisionAfp(HABITAT, TipoComisionAfp.FLUJO)).toBe(
      0.0147,
    );
  });

  it('el afiliado por MIXTA paga solo el componente sobre flujo de la mixta', () => {
    expect(resolverTasaComisionAfp(HABITAT, TipoComisionAfp.MIXTA)).toBe(
      0.0038,
    );
  });

  it('sin tipo declarado cae a FLUJO (fallback documentado del dato faltante)', () => {
    expect(resolverTasaComisionAfp(HABITAT, null)).toBe(0.0147);
    expect(resolverTasaComisionAfp(HABITAT, undefined)).toBe(0.0147);
  });

  it('la AFP sin tasa mixta cargada no cobra comisión al afiliado mixto', () => {
    const sinMixta: TasasComisionAfp = { flujo: 0.016, mixtaFlujo: 0 };
    expect(resolverTasaComisionAfp(sinMixta, TipoComisionAfp.MIXTA)).toBe(0);
  });

  it('dos afiliados de la misma AFP con distinto tipo pagan distinta comisión', () => {
    const base = 2713;
    const porFlujo =
      base * resolverTasaComisionAfp(HABITAT, TipoComisionAfp.FLUJO);
    const porMixta =
      base * resolverTasaComisionAfp(HABITAT, TipoComisionAfp.MIXTA);
    expect(Math.round(porFlujo * 100) / 100).toBe(39.88);
    expect(Math.round(porMixta * 100) / 100).toBe(10.31);
  });
});

describe('normalizarTipoComisionAfp', () => {
  it('acepta los dos valores del enum', () => {
    expect(normalizarTipoComisionAfp('FLUJO')).toBe(TipoComisionAfp.FLUJO);
    expect(normalizarTipoComisionAfp('MIXTA')).toBe(TipoComisionAfp.MIXTA);
  });

  it('cualquier otro valor cae a null (→ fallback a flujo)', () => {
    expect(normalizarTipoComisionAfp(null)).toBeNull();
    expect(normalizarTipoComisionAfp(undefined)).toBeNull();
    expect(normalizarTipoComisionAfp('')).toBeNull();
    expect(normalizarTipoComisionAfp('M/S')).toBeNull();
    expect(normalizarTipoComisionAfp(1)).toBeNull();
  });
});
