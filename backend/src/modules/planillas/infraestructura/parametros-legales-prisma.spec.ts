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
