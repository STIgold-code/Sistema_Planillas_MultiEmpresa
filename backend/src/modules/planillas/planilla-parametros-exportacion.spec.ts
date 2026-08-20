/**
 * El bloque de parámetros de la exportación NO puede tener tasas escritas a
 * mano: si mañana cambia la UIT o una tasa de SCTR, el Excel auditable tiene que
 * cambiar solo. Estos tests fijan esa garantía.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { construirParametrosExportacion } from './planilla-parametros-exportacion';
import { ParametrosLegalesEnMemoria } from './infraestructura/parametros-legales-en-memoria';
import { ParametrosLegalesPrisma } from './infraestructura/parametros-legales-prisma';

const FECHA = new Date(2026, 6, 31); // 31/07/2026

interface FilaCruda {
  clave: string;
  valor: number;
  vigencia_desde: Date;
  vigencia_hasta: Date | null;
}

const fila = (
  clave: string,
  valor: number,
  desde: Date,
  hasta: Date | null = null,
): FilaCruda => ({
  clave,
  valor,
  vigencia_desde: desde,
  vigencia_hasta: hasta,
});

const REGIMENES = [
  {
    nombre: 'AFP Integra',
    tipo: 'AFP',
    aporte_obligatorio: 10,
    prima_seguro: 1.74,
    comision_flujo: 1.55,
    comision_mixta_flujo: 0.82,
  },
  {
    nombre: 'ONP',
    tipo: 'ONP',
    aporte_obligatorio: 13,
    prima_seguro: 0,
    comision_flujo: 0,
    comision_mixta_flujo: 0,
  },
];

function prismaFalso(
  filasLegales: FilaCruda[],
  filasEmpresa: FilaCruda[] = [],
  regimenes: unknown[] = REGIMENES,
) {
  return {
    parametroLegal: { findMany: jest.fn().mockResolvedValue(filasLegales) },
    parametroEmpresa: { findMany: jest.fn().mockResolvedValue(filasEmpresa) },
    regimenPensionario: { findMany: jest.fn().mockResolvedValue(regimenes) },
  } as unknown as PrismaService;
}

describe('construirParametrosExportacion', () => {
  it('toma el valor del MISMO puerto que consumió el motor, no de una constante', async () => {
    // Fila nacional con un valor deliberadamente distinto al del fallback:
    // si el builder hardcodeara la tasa, este test fallaría.
    const filas = [fila('essaludTasa', 0.11, new Date(2026, 0, 1))];
    const params = new ParametrosLegalesPrisma(
      filas,
      new ParametrosLegalesEnMemoria(),
    );

    const resultado = await construirParametrosExportacion(
      prismaFalso(filas),
      params,
      1,
      FECHA,
    );

    const essalud = resultado.tasas.find((t) => t.codigo === 'essaludTasa');
    expect(essalud?.valor).toBe(0.11);
    expect(essalud?.origen).toBe('PARAMETRO_LEGAL');
    expect(essalud?.vigente_desde).toEqual(new Date(2026, 0, 1));
  });

  it('reporta el override de la empresa cuando la cascada lo elige', async () => {
    const nacionales = [fila('sctrSalud', 0.0053, new Date(2020, 0, 1))];
    const propias = [fila('sctrSalud', 0.0125, new Date(2026, 0, 1))];
    const params = new ParametrosLegalesPrisma(
      nacionales,
      new ParametrosLegalesEnMemoria(),
      propias,
    );

    const resultado = await construirParametrosExportacion(
      prismaFalso(nacionales, propias),
      params,
      7,
      FECHA,
    );

    const sctr = resultado.tasas.find((t) => t.codigo === 'sctrSalud');
    expect(sctr?.valor).toBe(0.0125);
    expect(sctr?.origen).toBe('PARAMETRO_EMPRESA');
    expect(sctr?.vigente_desde).toEqual(new Date(2026, 0, 1));
  });

  it('degrada a NO_DISPONIBLE en vez de tumbar la exportación si falta la fila', async () => {
    // Adapter Prisma SIN fila de `uit`: `escalar` lanza ParametroLegalNoVigenteError.
    const filas = [fila('rmv', 1130, new Date(2026, 0, 1))];
    const params = new ParametrosLegalesPrisma(
      filas,
      new ParametrosLegalesEnMemoria(),
    );

    const resultado = await construirParametrosExportacion(
      prismaFalso(filas),
      params,
      1,
      FECHA,
    );

    const uit = resultado.tasas.find((t) => t.codigo === 'uit');
    expect(uit?.origen).toBe('NO_DISPONIBLE');
    expect(uit?.valor).toBe(0);
    // El resto de las tasas sigue viajando.
    expect(resultado.tasas.find((t) => t.codigo === 'rmv')?.valor).toBe(1130);
  });

  it('deriva la bonificación extraordinaria de la tasa de EsSalud (Ley 30334)', async () => {
    const filas = [fila('essaludTasa', 0.09, new Date(2026, 0, 1))];
    const params = new ParametrosLegalesPrisma(
      filas,
      new ParametrosLegalesEnMemoria(),
    );

    const resultado = await construirParametrosExportacion(
      prismaFalso(filas),
      params,
      1,
      FECHA,
    );

    const bonificacion = resultado.tasas.find(
      (t) => t.codigo === 'bonificacionExtraordinaria',
    );
    expect(bonificacion?.valor).toBe(0.09);
    expect(bonificacion?.base_legal).toContain('30334');
  });

  it('trae ONP y las comisiones AFP de regimenes_pensionarios, escaladas a fracción', async () => {
    const params = new ParametrosLegalesEnMemoria();

    const resultado = await construirParametrosExportacion(
      prismaFalso([]),
      params,
      1,
      FECHA,
    );

    const onp = resultado.tasas.find((t) => t.codigo === 'onp');
    expect(onp?.valor).toBeCloseTo(0.13, 6);
    expect(onp?.origen).toBe('REGIMEN_PENSIONARIO');

    expect(resultado.comisiones_afp).toHaveLength(1);
    const integra = resultado.comisiones_afp[0];
    expect(integra.administradora).toBe('AFP Integra');
    expect(integra.aporte).toBeCloseTo(0.1, 6);
    expect(integra.prima).toBeCloseTo(0.0174, 6);
    expect(integra.comision_flujo).toBeCloseTo(0.0155, 6);
    expect(integra.comision_mixta).toBeCloseTo(0.0082, 6);
  });

  it('marca ONP como no disponible si no hay régimen cargado', async () => {
    const params = new ParametrosLegalesEnMemoria();

    const resultado = await construirParametrosExportacion(
      prismaFalso([], [], []),
      params,
      1,
      FECHA,
    );

    expect(resultado.tasas.find((t) => t.codigo === 'onp')?.origen).toBe(
      'NO_DISPONIBLE',
    );
    expect(resultado.comisiones_afp).toEqual([]);
  });

  it('expone la fecha de vigencia con la que se resolvieron los parámetros', async () => {
    const resultado = await construirParametrosExportacion(
      prismaFalso([]),
      new ParametrosLegalesEnMemoria(),
      1,
      FECHA,
    );
    expect(resultado.vigencia).toEqual(FECHA);
  });
});
