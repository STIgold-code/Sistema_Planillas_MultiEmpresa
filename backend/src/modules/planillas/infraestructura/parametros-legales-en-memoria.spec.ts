import { ParametrosLegalesEnMemoria } from './parametros-legales-en-memoria';
import { ParametroLegalNoVigenteError } from '../dominio/parametros/parametros-legales';

describe('ParametrosLegalesEnMemoria (adapter sobre planillas.config)', () => {
  const adapter = new ParametrosLegalesEnMemoria();
  const fecha = new Date('2026-03-31');

  it('resuelve el valor vigente para el período', () => {
    expect(adapter.rmv(fecha)).toBe(1130);
    expect(adapter.uit(fecha)).toBe(5500);
    expect(adapter.essaludTasa(fecha)).toBe(0.09);
    expect(adapter.tramosIR(fecha).length).toBeGreaterThan(0);
  });

  it('lanza error de dominio cuando no hay valor vigente (nunca devuelve 0 silencioso)', () => {
    const sinVigencia = new ParametrosLegalesEnMemoria({
      rmv: [{ valor: 1130, vigenciaDesde: new Date('2025-01-01') }],
    });
    const antes = new Date('2024-06-30');
    expect(() => sinVigencia.rmv(antes)).toThrow(ParametroLegalNoVigenteError);
  });

  it('selecciona el valor cuya ventana de vigencia contiene la fecha', () => {
    const versionado = new ParametrosLegalesEnMemoria({
      rmv: [
        {
          valor: 1025,
          vigenciaDesde: new Date('2024-01-01'),
          vigenciaHasta: new Date('2024-12-31'),
        },
        { valor: 1130, vigenciaDesde: new Date('2025-01-01') },
      ],
    });
    expect(versionado.rmv(new Date('2024-06-15'))).toBe(1025);
    expect(versionado.rmv(new Date('2026-03-31'))).toBe(1130);
  });
});
