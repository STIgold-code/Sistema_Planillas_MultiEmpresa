/**
 * Tests de la guardia de rango de las tasas pensionarias.
 *
 * El caso 500.5 no es hipotético: es el valor exacto con el que el scraper
 * corrompió la fila de PRIMA en producción. El primer test lo fija para que
 * ninguna refactorización futura vuelva a dejar pasar esa lectura.
 */
import {
  AfpParseada,
  detectarPrimasIncoherentes,
  RANGOS_TASAS_PENSION,
  validarTasasPension,
} from './validar-tasas-pension';

describe('validarTasasPension', () => {
  const TASAS_VIGENTES = {
    aporteObligatorio: 10,
    comisionFlujo: 1.6,
    comisionMixtaFlujo: 0.18,
    comisionSaldo: 0.72,
    primaSeguro: 1.74,
  };

  it('acepta las tasas vigentes de una AFP real (PRIMA 2026)', () => {
    const r = validarTasasPension(TASAS_VIGENTES);
    expect(r.valido).toBe(true);
    expect(r.motivos).toHaveLength(0);
  });

  it('RECHAZA la corrupción real de producción: comision_flujo = 500.5', () => {
    const r = validarTasasPension({
      ...TASAS_VIGENTES,
      comisionFlujo: 500.5,
    });
    expect(r.valido).toBe(false);
    expect(r.motivos.join(' ')).toContain('comision_flujo=500.5');
  });

  it('RECHAZA una prima de seguro por debajo del piso histórico', () => {
    const r = validarTasasPension({ ...TASAS_VIGENTES, primaSeguro: 0.2 });
    expect(r.valido).toBe(false);
    expect(r.motivos.join(' ')).toContain('prima_seguro');
  });

  it('LÍMITE CONOCIDO: una prima de 1.25 pasa el rango porque es plausible por sí sola', () => {
    // Es el otro valor con el que se corrompió la fila de PRIMA. El rango no
    // puede atraparlo sin rechazar primas legítimas: lo atrapa el chequeo de
    // coherencia entre AFP (`detectarPrimasIncoherentes`).
    expect(
      validarTasasPension({ ...TASAS_VIGENTES, primaSeguro: 1.25 }).valido,
    ).toBe(true);
  });

  it('RECHAZA un aporte obligatorio de otro orden de magnitud', () => {
    expect(
      validarTasasPension({ ...TASAS_VIGENTES, aporteObligatorio: 100 }).valido,
    ).toBe(false);
    expect(
      validarTasasPension({ ...TASAS_VIGENTES, aporteObligatorio: 0 }).valido,
    ).toBe(false);
  });

  it('RECHAZA NaN e Infinity (parseFloat sobre una captura vacía)', () => {
    expect(validarTasasPension({ comisionFlujo: NaN }).valido).toBe(false);
    expect(validarTasasPension({ primaSeguro: Infinity }).valido).toBe(false);
  });

  it('acumula un motivo por cada tasa fuera de rango, no solo el primero', () => {
    const r = validarTasasPension({
      aporteObligatorio: 10,
      comisionFlujo: 500.5,
      primaSeguro: 0.2,
    });
    expect(r.motivos).toHaveLength(2);
  });

  it('ignora los campos ausentes: el upsert tampoco los toca', () => {
    expect(validarTasasPension({}).valido).toBe(true);
    expect(validarTasasPension({ comisionFlujo: 1.6 }).valido).toBe(true);
  });

  it('admite comisión mixta en 0 (tasa aún no cargada) pero no la sobre-flujo pura en 0', () => {
    expect(validarTasasPension({ comisionMixtaFlujo: 0 }).valido).toBe(true);
    expect(validarTasasPension({ comisionFlujo: 0 }).valido).toBe(false);
  });

  it('los rangos están declarados con justificación (se imprime en el rechazo)', () => {
    for (const rango of Object.values(RANGOS_TASAS_PENSION)) {
      expect(rango.min).toBeLessThan(rango.max);
      expect(rango.justificacion.length).toBeGreaterThan(0);
    }
  });
});

describe('detectarPrimasIncoherentes', () => {
  const afp = (nombre: string, primaSeguro: number): AfpParseada => ({
    nombre,
    tasas: { comisionFlujo: 1.6, comisionSaldo: 0.72, primaSeguro },
  });

  it('no reporta nada cuando las cuatro AFP traen la misma prima', () => {
    expect(
      detectarPrimasIncoherentes([
        afp('HABITAT', 1.74),
        afp('INTEGRA', 1.74),
        afp('PRIMA', 1.74),
        afp('PROFUTURO', 1.74),
      ]),
    ).toHaveLength(0);
  });

  it('DETECTA la corrupción real: PRIMA con 1.25 mientras las demás traen 1.74', () => {
    const incoherentes = detectarPrimasIncoherentes([
      afp('HABITAT', 1.74),
      afp('INTEGRA', 1.74),
      afp('PRIMA', 1.25),
      afp('PROFUTURO', 1.74),
    ]);
    expect(incoherentes).toHaveLength(1);
    expect(incoherentes[0].nombre).toBe('PRIMA');
    expect(incoherentes[0].motivo).toContain('1.25');
  });

  it('no se pronuncia con menos de tres AFP: sin mayoría no hay evidencia', () => {
    expect(
      detectarPrimasIncoherentes([afp('HABITAT', 1.74), afp('PRIMA', 1.25)]),
    ).toHaveLength(0);
  });

  it('no se pronuncia ante un empate (2 vs 2): no hay valor de referencia creíble', () => {
    expect(
      detectarPrimasIncoherentes([
        afp('HABITAT', 1.74),
        afp('INTEGRA', 1.74),
        afp('PRIMA', 1.25),
        afp('PROFUTURO', 1.25),
      ]),
    ).toHaveLength(0);
  });

  it('ignora las AFP sin prima leída', () => {
    const sinPrima: AfpParseada = { nombre: 'PROFUTURO', tasas: {} };
    expect(
      detectarPrimasIncoherentes([
        afp('HABITAT', 1.74),
        afp('INTEGRA', 1.74),
        afp('PRIMA', 1.25),
        sinPrima,
      ]),
    ).toHaveLength(1);
  });
});
