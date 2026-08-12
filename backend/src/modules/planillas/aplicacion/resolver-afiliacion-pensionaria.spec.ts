import { resolverAfiliacionPensionaria } from './resolver-afiliacion-pensionaria';
import { SistemaPensionario, TipoComisionAfp } from '../dominio/tipos';

/** Fila de `regimenes_pensionarios` tal como la guarda Prisma (porcentajes). */
const INTEGRA = {
  tipo: 'AFP',
  aporte_obligatorio: 10,
  prima_seguro: 1.37,
  comision_flujo: 1.55,
  comision_mixta_flujo: 0.82,
};

describe('resolverAfiliacionPensionaria', () => {
  it('escala los porcentajes de Prisma a fracción y aplica la comisión de flujo', () => {
    expect(
      resolverAfiliacionPensionaria(INTEGRA, TipoComisionAfp.FLUJO),
    ).toEqual({
      sistema: SistemaPensionario.AFP,
      tasas: {
        aporteObligatorio: 0.1,
        primaSeguro: 0.0137,
        comisionFlujo: 0.0155,
      },
    });
  });

  it('el afiliado MIXTO recibe el componente sobre flujo de la mixta', () => {
    const afiliacion = resolverAfiliacionPensionaria(
      INTEGRA,
      TipoComisionAfp.MIXTA,
    );
    // 0.82 / 100 no es exacto en punto flotante; lo que importa es el céntimo
    // que llega a la boleta, no la representación binaria de la tasa.
    expect(afiliacion?.tasas?.comisionFlujo).toBeCloseTo(0.0082, 12);
    const base = 2713;
    expect(
      Math.round(base * (afiliacion?.tasas?.comisionFlujo ?? 0) * 100) / 100,
    ).toBe(22.25);
    // El aporte y la prima no se mueven: no dependen de la modalidad.
    expect(afiliacion?.tasas?.aporteObligatorio).toBe(0.1);
    expect(afiliacion?.tasas?.primaSeguro).toBe(0.0137);
  });

  it('la fila sin columna de comisión mixta no rompe: cae a 0 para el mixto', () => {
    const sinColumna = {
      tipo: 'AFP',
      aporte_obligatorio: 10,
      prima_seguro: 1.37,
      comision_flujo: 1.6,
    };
    expect(
      resolverAfiliacionPensionaria(sinColumna, TipoComisionAfp.MIXTA)?.tasas
        ?.comisionFlujo,
    ).toBe(0);
    expect(
      resolverAfiliacionPensionaria(sinColumna, null)?.tasas?.comisionFlujo,
    ).toBe(0.016);
  });

  it('la ONP no arrastra prima ni comisión', () => {
    const onp = {
      tipo: 'ONP',
      aporte_obligatorio: 13,
      prima_seguro: 0,
      comision_flujo: 0,
      comision_mixta_flujo: 0,
    };
    expect(resolverAfiliacionPensionaria(onp, TipoComisionAfp.MIXTA)).toEqual({
      sistema: SistemaPensionario.ONP,
      tasas: { aporteObligatorio: 0.13, primaSeguro: 0, comisionFlujo: 0 },
    });
  });

  it('sin régimen pensionario no hay afiliación', () => {
    expect(
      resolverAfiliacionPensionaria(null, TipoComisionAfp.FLUJO),
    ).toBeNull();
  });
});
