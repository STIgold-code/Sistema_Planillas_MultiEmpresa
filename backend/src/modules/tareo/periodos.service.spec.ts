/**
 * `generarTareos` debe crear un detalle por cada día ORDINAL de la ventana del
 * período (1..N), leyendo el rango de la BD y NUNCA reconstruyéndolo desde
 * anio/mes. Con día de corte, "julio" puede ser 26-jun → 25-jul (30 días).
 */
import { PeriodosService } from './periodos.service';

interface DetalleCreado {
  tareo_id: number;
  dia: number;
}

/** Forma del filtro que el servicio arma para buscar empleados con contrato. */
interface ArgsEmpleadoFindMany {
  where: { contratos: { some: { fecha_inicio: { lte: Date } } } };
}

/** Fecha al estilo Prisma `@db.Date`: medianoche UTC. */
const fechaBd = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

function construirPrisma(periodo: {
  anio: number;
  mes: number;
  fecha_inicio: Date;
  fecha_fin: Date;
}) {
  const detallesCreados: DetalleCreado[] = [];
  /** Rango de contratos vigentes con el que se consultó a los empleados. */
  const rangoContratos: { inicio?: Date; fin?: Date } = {};
  const empleadoFindMany = jest
    .fn()
    .mockImplementation((args: ArgsEmpleadoFindMany) => {
      rangoContratos.fin = args.where.contratos.some.fecha_inicio.lte;
      return Promise.resolve([
        { id: 1, area_id: null, sede_id: null, cargo_id: null },
      ]);
    });

  const tx = {
    tareo: { create: jest.fn().mockResolvedValue({ id: 500 }) },
    tareoDetalle: {
      createMany: jest.fn().mockImplementation(({ data }) => {
        detallesCreados.push(...(data as DetalleCreado[]));
        return Promise.resolve({ count: (data as DetalleCreado[]).length });
      }),
    },
  };

  const prisma = {
    periodoTareo: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1,
        empresa_id: 7,
        estado: 'BORRADOR',
        _count: { tareos: 0 },
        ...periodo,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    empleado: { findMany: empleadoFindMany },
    tareo: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest
      .fn()
      .mockImplementation(
        (cb: (t: typeof tx) => Promise<unknown>): Promise<unknown> => cb(tx),
      ),
  };

  return { prisma, detallesCreados, rangoContratos };
}

describe('PeriodosService.generarTareos — ventana del período', () => {
  it('con día de corte (26-jun a 25-jul) genera 30 detalles ordinales 1..30', async () => {
    const { prisma, detallesCreados, rangoContratos } = construirPrisma({
      anio: 2026,
      mes: 7,
      fecha_inicio: fechaBd(2026, 6, 26),
      fecha_fin: fechaBd(2026, 7, 25),
    });
    const service = new PeriodosService(prisma as never);

    await service.generarTareos(1, 7);

    expect(detallesCreados).toHaveLength(30);
    expect(detallesCreados[0]).toEqual({ tareo_id: 500, dia: 1 });
    expect(detallesCreados[29]).toEqual({ tareo_id: 500, dia: 30 });

    // El filtro de contratos vigentes usa la ventana real, no el mes calendario.
    expect(rangoContratos.fin?.getFullYear()).toBe(2026);
    expect(rangoContratos.fin?.getMonth()).toBe(6); // julio
    expect(rangoContratos.fin?.getDate()).toBe(25);
  });

  it('regresión: período calendario (julio) sigue generando 31 detalles', async () => {
    const { prisma, detallesCreados } = construirPrisma({
      anio: 2026,
      mes: 7,
      fecha_inicio: fechaBd(2026, 7, 1),
      fecha_fin: fechaBd(2026, 7, 31),
    });
    const service = new PeriodosService(prisma as never);

    await service.generarTareos(1, 7);

    expect(detallesCreados).toHaveLength(31);
    expect(detallesCreados[30]).toEqual({ tareo_id: 500, dia: 31 });
  });

  it('regresión: febrero no bisiesto genera 28 detalles', async () => {
    const { prisma, detallesCreados } = construirPrisma({
      anio: 2026,
      mes: 2,
      fecha_inicio: fechaBd(2026, 2, 1),
      fecha_fin: fechaBd(2026, 2, 28),
    });
    const service = new PeriodosService(prisma as never);

    await service.generarTareos(1, 7);

    expect(detallesCreados).toHaveLength(28);
  });
});
