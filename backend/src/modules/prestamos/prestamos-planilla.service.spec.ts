/**
 * Regla temporal del DESCUENTO.
 *
 * El alta de un préstamo es libre (acuerdo financiero, independiente del tareo).
 * El único acoplamiento temporal vive acá: la cuota entra a partir de la primera
 * planilla cuyo período alcance la fecha de otorgamiento. Nunca se retro-descuenta.
 *
 * El corte se compara contra el FIN DE LA VENTANA del período de tareo, que con
 * día de corte por empresa NO coincide con el fin del mes calendario.
 */
import { PrestamosPlanillaService } from './prestamos-planilla.service';

interface FilaPrestamo {
  id: number;
  empleado_id: number;
  tipo: 'PRESTAMO' | 'ADELANTO_SUELDO' | 'ADELANTO_GRATIFICACION';
  cuota_mensual: number;
  saldo: number | null;
  fecha_otorgado: Date;
}

/**
 * Simula el filtro `fecha_otorgado: { lte: fechaFinPeriodo }` que aplica Prisma,
 * para poder afirmar sobre el comportamiento y no solo sobre el `where`.
 */
function build(prestamos: FilaPrestamo[]) {
  const prisma = {
    prestamo: {
      findMany: jest.fn().mockImplementation((args: unknown) => {
        const where = (args as { where: { fecha_otorgado?: { lte: Date } } })
          .where;
        const tope = where.fecha_otorgado?.lte;
        return Promise.resolve(
          tope ? prestamos.filter((p) => p.fecha_otorgado <= tope) : prestamos,
        );
      }),
    },
  };
  const service = new PrestamosPlanillaService(prisma as never);
  return { service, prisma };
}

/** Primer argumento de la primera llamada, tipado (sin `any` de mock.calls). */
function primerArgumento<T>(mock: jest.Mock): T {
  return (mock.mock.calls as unknown as [T][])[0][0];
}

const PRESTAMO_BASE: FilaPrestamo = {
  id: 1,
  empleado_id: 100,
  tipo: 'PRESTAMO',
  cuota_mensual: 100,
  saldo: 500,
  fecha_otorgado: new Date('2026-08-10'),
};

// Ventana con día de corte 25: el período de agosto va 26-jul → 25-ago.
const FIN_PERIODO_AGOSTO = new Date('2026-08-25');

describe('PrestamosPlanillaService — regla temporal del descuento', () => {
  it('un préstamo otorgado ANTES del fin del período SÍ descuenta', async () => {
    const { service } = build([
      { ...PRESTAMO_BASE, fecha_otorgado: new Date('2026-08-10') },
    ]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );

    expect(descuentos.get(100)?.prestamo).toBe(100);
  });

  it('un préstamo otorgado DESPUÉS del fin del período NO descuenta', async () => {
    const { service } = build([
      { ...PRESTAMO_BASE, fecha_otorgado: new Date('2026-08-28') },
    ]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );

    expect(descuentos.get(100)).toBeUndefined();
  });

  it('BORDE: otorgado EXACTAMENTE el último día del período sí descuenta', async () => {
    const { service } = build([
      { ...PRESTAMO_BASE, fecha_otorgado: new Date('2026-08-25') },
    ]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );

    expect(descuentos.get(100)?.prestamo).toBe(100);
  });

  it('BORDE: otorgado el día siguiente al cierre queda para el período próximo', async () => {
    const prestamos = [
      { ...PRESTAMO_BASE, fecha_otorgado: new Date('2026-08-26') },
    ];

    const agosto = build(prestamos);
    const enAgosto = await agosto.service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );
    expect(enAgosto.get(100)).toBeUndefined();

    // Período de septiembre: 26-ago → 25-sep. Ahí sí entra.
    const septiembre = build(prestamos);
    const enSeptiembre = await septiembre.service.descuentosPorEmpleado(
      5,
      [100],
      9,
      new Date('2026-09-25'),
    );
    expect(enSeptiembre.get(100)?.prestamo).toBe(100);
  });

  it('usa la ventana de corte, NO el fin del mes calendario', async () => {
    // Otorgado el 28-ago: cae dentro del mes calendario de agosto pero FUERA
    // de la ventana (que cerró el 25). No debe descontar en agosto.
    const { service } = build([
      { ...PRESTAMO_BASE, fecha_otorgado: new Date('2026-08-28') },
    ]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );

    expect(descuentos.get(100)).toBeUndefined();
  });

  it('mezcla: solo entran los préstamos que el período alcanza', async () => {
    const { service } = build([
      { ...PRESTAMO_BASE, id: 1, fecha_otorgado: new Date('2026-07-01') },
      {
        ...PRESTAMO_BASE,
        id: 2,
        cuota_mensual: 50,
        fecha_otorgado: new Date('2026-08-25'),
      },
      {
        ...PRESTAMO_BASE,
        id: 3,
        cuota_mensual: 999,
        fecha_otorgado: new Date('2026-09-01'),
      },
    ]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [100],
      8,
      FIN_PERIODO_AGOSTO,
    );

    // 100 + 50; el de septiembre queda fuera.
    expect(descuentos.get(100)?.prestamo).toBe(150);
  });

  it('acota la consulta a la empresa y a los préstamos ACTIVOS', async () => {
    const { service, prisma } = build([PRESTAMO_BASE]);

    await service.descuentosPorEmpleado(5, [100], 8, FIN_PERIODO_AGOSTO);

    const donde = primerArgumento<{
      where: {
        empresa_id: number;
        estado: string;
        fecha_otorgado: { lte: Date };
      };
    }>(prisma.prestamo.findMany).where;
    expect(donde.empresa_id).toBe(5);
    expect(donde.estado).toBe('ACTIVO');
    expect(donde.fecha_otorgado.lte).toEqual(FIN_PERIODO_AGOSTO);
  });

  it('sin empleados no consulta la base', async () => {
    const { service, prisma } = build([PRESTAMO_BASE]);

    const descuentos = await service.descuentosPorEmpleado(
      5,
      [],
      8,
      FIN_PERIODO_AGOSTO,
    );

    expect(descuentos.size).toBe(0);
    expect(prisma.prestamo.findMany).not.toHaveBeenCalled();
  });
});
