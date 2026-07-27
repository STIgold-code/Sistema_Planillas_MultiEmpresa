/**
 * Tests for the Prisma-backed `ParametrosLegales` adapter (PR6 slice 2).
 *
 * The adapter resolves SCALAR legal keys (rmv, uit, asignacionFamiliar,
 * essaludTasa, essaludMinimo, sisMicroempresa, sctrSalud, sctrPension) from rows
 * of the `parametros_legales` table (clave/valor/vigencia). The STRUCTURED keys
 * (tramosIR, agrario, construccionCivil) cannot fit the single-Decimal table, so
 * they are delegated to a fallback `ParametrosLegales` (the in-memory adapter)
 * until a structured schema lands. This keeps the domain port intact (DIP).
 *
 * The adapter is fed an already-loaded snapshot of rows (the repository query
 * lives at the service edge), so these tests are pure and DB-free.
 */
import {
  ParametrosLegalesPrisma,
  FilaParametroLegal,
} from './parametros-legales-prisma';
import { ParametrosLegalesEnMemoria } from './parametros-legales-en-memoria';
import { ParametroLegalNoVigenteError } from '../dominio/parametros/parametros-legales';
import { CategoriaConstruccion } from '../dominio/tipos';

const fecha = (iso: string) => new Date(iso);

function filas(): FilaParametroLegal[] {
  return [
    {
      clave: 'rmv',
      valor: 1130,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
    {
      clave: 'uit',
      valor: 5500,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
    {
      clave: 'asignacionFamiliar',
      valor: 113,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
    {
      clave: 'essaludTasa',
      valor: 0.09,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
    {
      clave: 'essaludMinimo',
      valor: 101.7,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
  ];
}

describe('ParametrosLegalesPrisma', () => {
  const fallback = new ParametrosLegalesEnMemoria();
  const f = new Date('2026-03-31');

  it('resuelve claves escalares desde las filas de parametros_legales', () => {
    const adapter = new ParametrosLegalesPrisma(filas(), fallback);
    expect(adapter.rmv(f)).toBe(1130);
    expect(adapter.uit(f)).toBe(5500);
    expect(adapter.asignacionFamiliar(f)).toBe(113);
    expect(adapter.essaludTasa(f)).toBe(0.09);
    expect(adapter.essaludMinimo(f)).toBe(101.7);
  });

  it('resuelve por vigencia: elige la fila cuya ventana cubre la fecha', () => {
    const rows: FilaParametroLegal[] = [
      {
        clave: 'rmv',
        valor: 1025,
        vigencia_desde: fecha('2022-01-01'),
        vigencia_hasta: fecha('2024-12-31'),
      },
      {
        clave: 'rmv',
        valor: 1130,
        vigencia_desde: fecha('2025-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(rows, fallback);
    expect(adapter.rmv(new Date('2023-06-30'))).toBe(1025);
    expect(adapter.rmv(new Date('2026-03-31'))).toBe(1130);
  });

  it('ante vigencias solapadas, elige la fila con vigencia_desde MÁS RECIENTE (determinista)', () => {
    // Dos filas 'rmv' abiertas (vigencia_hasta = null) que se solapan en 2026.
    // El orden de inserción es la vieja primero; el adapter debe devolver la de
    // 2026, no la primera por inserción.
    const rows: FilaParametroLegal[] = [
      {
        clave: 'rmv',
        valor: 1130,
        vigencia_desde: fecha('2025-01-01'),
        vigencia_hasta: null,
      },
      {
        clave: 'rmv',
        valor: 1300,
        vigencia_desde: fecha('2026-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(rows, fallback);
    expect(adapter.rmv(new Date('2026-03-31'))).toBe(1300);
    // Antes de la vigencia de 2026 sigue valiendo la de 2025.
    expect(adapter.rmv(new Date('2025-06-30'))).toBe(1130);
  });

  it('el resultado no depende del orden de inserción de las filas', () => {
    const rows: FilaParametroLegal[] = [
      {
        clave: 'rmv',
        valor: 1300,
        vigencia_desde: fecha('2026-01-01'),
        vigencia_hasta: null,
      },
      {
        clave: 'rmv',
        valor: 1130,
        vigencia_desde: fecha('2025-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(rows, fallback);
    expect(adapter.rmv(new Date('2026-03-31'))).toBe(1300);
  });

  it('lanza ParametroLegalNoVigenteError si no hay fila vigente para la fecha', () => {
    const rows: FilaParametroLegal[] = [
      {
        clave: 'rmv',
        valor: 1130,
        vigencia_desde: fecha('2025-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(rows, fallback);
    expect(() => adapter.rmv(new Date('2020-01-01'))).toThrow(
      ParametroLegalNoVigenteError,
    );
  });

  it('delega claves estructuradas (tramosIR, agrario, construccionCivil) al fallback', () => {
    const adapter = new ParametrosLegalesPrisma(filas(), fallback);
    expect(adapter.tramosIR(f)).toEqual(fallback.tramosIR(f));
    const fCC = new Date('2026-06-30');
    expect(adapter.agrario(fCC)).toEqual(fallback.agrario(fCC));
    expect(
      adapter.construccionCivil(fCC, CategoriaConstruccion.OPERARIO),
    ).toEqual(fallback.construccionCivil(fCC, CategoriaConstruccion.OPERARIO));
  });

  it('produce los MISMOS valores escalares que el adapter in-memory (paridad de seed)', () => {
    const adapter = new ParametrosLegalesPrisma(filas(), fallback);
    expect(adapter.rmv(f)).toBe(fallback.rmv(f));
    expect(adapter.uit(f)).toBe(fallback.uit(f));
    expect(adapter.asignacionFamiliar(f)).toBe(fallback.asignacionFamiliar(f));
    expect(adapter.essaludTasa(f)).toBe(fallback.essaludTasa(f));
    expect(adapter.essaludMinimo(f)).toBe(fallback.essaludMinimo(f));
  });
});

describe('ParametrosLegalesPrisma — overlay de parámetros POR EMPRESA', () => {
  const fallback = new ParametrosLegalesEnMemoria();
  const f = fecha('2026-05-31');

  const globales = (): FilaParametroLegal[] => [
    ...filas(),
    {
      clave: 'sctrSalud',
      valor: 0.0123,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
    {
      clave: 'sctrPension',
      valor: 0.0123,
      vigencia_desde: fecha('2025-01-01'),
      vigencia_hasta: null,
    },
  ];

  it('el valor propio de la empresa GANA sobre el nacional para la misma clave', () => {
    // Póliza SCTR de la empresa: 1.5% / 2% (nivel de riesgo propio).
    const propios: FilaParametroLegal[] = [
      {
        clave: 'sctrSalud',
        valor: 0.015,
        vigencia_desde: fecha('2026-01-01'),
        vigencia_hasta: null,
      },
      {
        clave: 'sctrPension',
        valor: 0.02,
        vigencia_desde: fecha('2026-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(globales(), fallback, propios);
    expect(adapter.sctrSalud(f)).toBe(0.015);
    expect(adapter.sctrPension(f)).toBe(0.02);
  });

  it('sin valor propio para la clave, resuelve el nacional (cascada intacta)', () => {
    const propios: FilaParametroLegal[] = [
      {
        clave: 'sctrSalud',
        valor: 0.015,
        vigencia_desde: fecha('2026-01-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(globales(), fallback, propios);
    // sctrPension no tiene override → nacional 0.0123. Y el resto ni se entera.
    expect(adapter.sctrPension(f)).toBe(0.0123);
    expect(adapter.rmv(f)).toBe(1130);
  });

  it('el override respeta su VIGENCIA: fuera de la ventana rige el nacional', () => {
    // Póliza vieja que venció en 2025: para un período 2026 rige el nacional.
    const propios: FilaParametroLegal[] = [
      {
        clave: 'sctrSalud',
        valor: 0.0183,
        vigencia_desde: fecha('2024-01-01'),
        vigencia_hasta: fecha('2025-12-31'),
      },
    ];
    const adapter = new ParametrosLegalesPrisma(globales(), fallback, propios);
    expect(adapter.sctrSalud(f)).toBe(0.0123);
    // Y para un período DENTRO de la vigencia vieja, la tasa histórica revive
    // (recalcular meses pasados usa la póliza que regía entonces).
    expect(adapter.sctrSalud(fecha('2025-06-30'))).toBe(0.0183);
  });

  it('renovación de póliza: dos vigencias propias conviven y resuelve por fecha', () => {
    const propios: FilaParametroLegal[] = [
      {
        clave: 'vidaLeyTasa',
        valor: 0.008,
        vigencia_desde: fecha('2025-01-01'),
        vigencia_hasta: fecha('2026-02-28'),
      },
      {
        clave: 'vidaLeyTasa',
        valor: 0.0088,
        vigencia_desde: fecha('2026-03-01'),
        vigencia_hasta: null,
      },
    ];
    const adapter = new ParametrosLegalesPrisma(globales(), fallback, propios);
    expect(adapter.vidaLeyTasa(fecha('2026-01-31'))).toBe(0.008);
    expect(adapter.vidaLeyTasa(f)).toBe(0.0088);
  });

  it('sin filas de empresa el adapter se comporta EXACTAMENTE igual que antes', () => {
    const conVacio = new ParametrosLegalesPrisma(globales(), fallback, []);
    const sinParametro = new ParametrosLegalesPrisma(globales(), fallback);
    expect(conVacio.sctrSalud(f)).toBe(sinParametro.sctrSalud(f));
    expect(conVacio.rmv(f)).toBe(sinParametro.rmv(f));
  });
});
