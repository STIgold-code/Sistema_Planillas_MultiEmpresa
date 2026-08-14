/**
 * La sincronización vacaciones → tareo debe apoyarse en la VENTANA persistida de
 * cada período, no en el mes calendario.
 *
 * Con día de corte 25, unas vacaciones del 20 al 30 de julio caen en DOS
 * períodos (julio: 26-jun a 25-jul, y agosto: 26-jul a 25-ago). Enumerar meses
 * calendario solo encontraba julio y perdía los días del 26 en adelante.
 */
import { VacacionesTareoSyncService } from './vacaciones-tareo-sync.service';

/** Fecha al estilo Prisma `@db.Date`: medianoche UTC. */
const fechaBd = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

interface PeriodoMock {
  id: number;
  anio: number;
  mes: number;
  estado: string;
  fecha_inicio: Date;
  fecha_fin: Date;
}

interface ArgsFindManyPeriodos {
  where: {
    empresa_id: number;
    fecha_inicio: { lte: Date };
    fecha_fin: { gte: Date };
  };
}

interface JustificacionCreada {
  tareo_id: number;
  dia_inicio: number;
  dia_fin: number;
}

interface DiaMarcado {
  tareo_id: number;
  dia: number;
}

const PERIODO_JULIO_CON_CORTE: PeriodoMock = {
  id: 10,
  anio: 2026,
  mes: 7,
  estado: 'ABIERTO',
  fecha_inicio: fechaBd(2026, 6, 26),
  fecha_fin: fechaBd(2026, 7, 25),
};

const PERIODO_AGOSTO_CON_CORTE: PeriodoMock = {
  id: 11,
  anio: 2026,
  mes: 8,
  estado: 'ABIERTO',
  fecha_inicio: fechaBd(2026, 7, 26),
  fecha_fin: fechaBd(2026, 8, 25),
};

const PERIODO_JULIO_CALENDARIO: PeriodoMock = {
  id: 20,
  anio: 2026,
  mes: 7,
  estado: 'ABIERTO',
  fecha_inicio: fechaBd(2026, 7, 1),
  fecha_fin: fechaBd(2026, 7, 31),
};

/** Filtro en lote sobre `TareoDetalle`: un tareo y un conjunto de ordinales. */
interface WhereLoteDetalle {
  tareo_id: number;
  dia: { in: number[] };
}

/** Fila de `TareoDetalle` en un createMany: sin tipo => detalle vacío del tareo. */
interface DetalleCreado {
  tareo_id: number;
  dia: number;
  tipo_marcacion_id?: number | null;
}

function construirPrisma(periodos: PeriodoMock[]) {
  const capturado: { periodos?: ArgsFindManyPeriodos } = {};
  const periodoFindMany = jest
    .fn()
    .mockImplementation((args: ArgsFindManyPeriodos) => {
      capturado.periodos = args;
      return Promise.resolve(periodos);
    });
  const justificacionesCreadas: JustificacionCreada[] = [];
  const diasMarcados: DiaMarcado[] = [];
  const detallesCreados: DiaMarcado[] = [];
  const diasLimpiados: DiaMarcado[] = [];

  // Cada período tiene su propio tareo; el id se deriva del periodo_id.
  const tareoFindFirst = jest
    .fn()
    .mockImplementation(({ where }: { where: { periodo_id: number } }) =>
      Promise.resolve({ id: where.periodo_id * 10 }),
    );

  const prisma = {
    tipoMarcacion: { findFirst: jest.fn().mockResolvedValue({ id: 9 }) },
    periodoTareo: { findMany: periodoFindMany },
    tareo: { findFirst: tareoFindFirst, create: jest.fn() },
    empleado: { findUnique: jest.fn().mockResolvedValue(null) },
    tareoDetalle: {
      // Por defecto el tareo ya tiene creados todos sus detalles, así que el
      // marcado en lote resuelve todo por updateMany. Los tests que ejercitan
      // los días faltantes sobreescriben este mock.
      findMany: jest
        .fn()
        .mockImplementation(({ where }: { where: WhereLoteDetalle }) =>
          Promise.resolve(where.dia.in.map((dia) => ({ dia }))),
        ),
      createMany: jest
        .fn()
        .mockImplementation(({ data }: { data: DetalleCreado[] }) => {
          for (const fila of data) {
            // Sin tipo_marcacion_id => es la creación inicial del tareo;
            // con tipo => es un día de vacaciones marcado directo al crear.
            const destino =
              fila.tipo_marcacion_id == null ? detallesCreados : diasMarcados;
            destino.push({ tareo_id: fila.tareo_id, dia: fila.dia });
          }
          return Promise.resolve({ count: data.length });
        }),
      updateMany: jest
        .fn()
        .mockImplementation(
          ({
            where,
            data,
          }: {
            where: WhereLoteDetalle;
            data: { tipo_marcacion_id: number | null };
          }) => {
            const destino =
              data.tipo_marcacion_id === null ? diasLimpiados : diasMarcados;
            for (const dia of where.dia.in) {
              destino.push({ tareo_id: where.tareo_id, dia });
            }
            return Promise.resolve({ count: where.dia.in.length });
          },
        ),
    },
    tareoJustificacion: {
      findFirst: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: JustificacionCreada }) => {
          justificacionesCreadas.push(data);
          return Promise.resolve({ id: 1 });
        }),
    },
  };

  const service = new VacacionesTareoSyncService(prisma as never);

  return {
    service,
    prisma,
    capturado,
    justificacionesCreadas,
    diasMarcados,
    detallesCreados,
    diasLimpiados,
  };
}

/** Días ordinales marcados/limpiados en el tareo indicado. */
const ordinalesDe = (registros: DiaMarcado[], tareoId: number): number[] =>
  registros.filter((r) => r.tareo_id === tareoId).map((r) => r.dia);

/** Vacaciones del 20 al 30 de julio de 2026 (11 días). */
const SOLICITUD = {
  id: 77,
  empleado_id: 5,
  empresa_id: 7,
  fecha_inicio_aprobada: fechaBd(2026, 7, 20),
  fecha_fin_aprobada: fechaBd(2026, 7, 30),
  fecha_inicio_solicitada: fechaBd(2026, 7, 20),
  fecha_fin_solicitada: fechaBd(2026, 7, 30),
  dias_aprobados: 11,
  dias_solicitados: 11,
};

describe('VacacionesTareoSyncService — períodos por solape de ventana', () => {
  it('busca períodos cuyo rango persistido solapa con las vacaciones', async () => {
    const { service, capturado } = construirPrisma([PERIODO_JULIO_CON_CORTE]);

    await service.verificarPeriodosCerrados(
      7,
      fechaBd(2026, 7, 20),
      fechaBd(2026, 7, 30),
    );

    expect(capturado.periodos?.where.empresa_id).toBe(7);
    expect(capturado.periodos?.where.fecha_inicio.lte).toEqual(
      fechaBd(2026, 7, 30),
    );
    expect(capturado.periodos?.where.fecha_fin.gte).toEqual(
      fechaBd(2026, 7, 20),
    );
  });

  it('vacaciones que cruzan el corte 25 tocan los períodos de julio Y agosto', async () => {
    const { service, justificacionesCreadas, diasMarcados } = construirPrisma([
      PERIODO_JULIO_CON_CORTE,
      PERIODO_AGOSTO_CON_CORTE,
    ]);

    const resultado = await service.sincronizarConTareo(SOLICITUD, 1);

    expect(resultado.exito).toBe(true);
    expect(resultado.periodosAfectados).toBe(2);
    // 20-jul a 30-jul = 11 días, repartidos entre ambos períodos.
    expect(resultado.diasMarcados).toBe(11);
    expect(resultado.justificacionesCreadas).toBe(2);

    // Julio: ordinal 1 = 26-jun, así que 20-jul es el 25 y la ventana corta el 30.
    expect(justificacionesCreadas[0]).toMatchObject({
      tareo_id: 100,
      dia_inicio: 25,
      dia_fin: 30,
    });
    expect(ordinalesDe(diasMarcados, 100)).toEqual([25, 26, 27, 28, 29, 30]);

    // Agosto: ordinal 1 = 26-jul, así que 30-jul es el 5.
    expect(justificacionesCreadas[1]).toMatchObject({
      tareo_id: 110,
      dia_inicio: 1,
      dia_fin: 5,
    });
    expect(ordinalesDe(diasMarcados, 110)).toEqual([1, 2, 3, 4, 5]);
  });

  it('regresión: en período calendario el ordinal es el día del mes', async () => {
    const { service, justificacionesCreadas, diasMarcados } = construirPrisma([
      PERIODO_JULIO_CALENDARIO,
    ]);

    const resultado = await service.sincronizarConTareo(SOLICITUD, 1);

    expect(resultado.periodosAfectados).toBe(1);
    expect(resultado.diasMarcados).toBe(11);
    expect(justificacionesCreadas[0]).toMatchObject({
      dia_inicio: 20,
      dia_fin: 30,
    });
    expect(diasMarcados.map((d) => d.dia)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ]);
  });

  it('el tareo faltante se crea con N detalles = días de la ventana', async () => {
    const { service, prisma, detallesCreados } = construirPrisma([
      PERIODO_JULIO_CON_CORTE,
    ]);
    prisma.tareo.findFirst.mockResolvedValue(null);
    prisma.tareo.create.mockResolvedValue({ id: 100 });

    await service.sincronizarConTareo(SOLICITUD, 1);

    // 26-jun a 25-jul = 30 días ordinales.
    expect(detallesCreados).toHaveLength(30);
    expect(detallesCreados[0]).toEqual({ tareo_id: 100, dia: 1 });
    expect(detallesCreados[29]).toEqual({ tareo_id: 100, dia: 30 });
  });

  it('revertir limpia los mismos ordinales que marcó la sincronización', async () => {
    const { service, diasLimpiados } = construirPrisma([
      PERIODO_JULIO_CON_CORTE,
      PERIODO_AGOSTO_CON_CORTE,
    ]);

    const resultado = await service.revertirSincronizacion(SOLICITUD);

    expect(resultado.diasMarcados).toBe(11);
    expect(ordinalesDe(diasLimpiados, 100)).toEqual([25, 26, 27, 28, 29, 30]);
    expect(ordinalesDe(diasLimpiados, 110)).toEqual([1, 2, 3, 4, 5]);
  });
});

/**
 * El marcado y la reversión deben resolverse en un número FIJO de consultas por
 * período, no una por día: una vacación de 30 días generaba ~60 round-trips
 * secuenciales a la BD.
 */
describe('VacacionesTareoSyncService — marcado y reversión en lote', () => {
  it('marca todo el período con findMany + updateMany, sin una consulta por día', async () => {
    const { service, prisma, diasMarcados } = construirPrisma([
      PERIODO_JULIO_CALENDARIO,
    ]);

    await service.sincronizarConTareo(SOLICITUD, 1);

    // 11 días => 1 findMany + 1 updateMany, y ningún createMany de marcación.
    expect(prisma.tareoDetalle.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.tareoDetalle.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.tareoDetalle.createMany).not.toHaveBeenCalled();

    expect(prisma.tareoDetalle.updateMany).toHaveBeenCalledWith({
      where: {
        tareo_id: 200,
        dia: { in: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
      },
      data: { tipo_marcacion_id: 9 },
    });
    expect(ordinalesDe(diasMarcados, 200)).toHaveLength(11);
  });

  it('los días sin detalle previo se crean marcados en un solo createMany', async () => {
    const { service, prisma, diasMarcados } = construirPrisma([
      PERIODO_JULIO_CALENDARIO,
    ]);
    // Solo existen los detalles del 20 al 24; del 25 al 30 faltan.
    prisma.tareoDetalle.findMany.mockResolvedValue([
      { dia: 20 },
      { dia: 21 },
      { dia: 22 },
      { dia: 23 },
      { dia: 24 },
    ]);

    const resultado = await service.sincronizarConTareo(SOLICITUD, 1);

    expect(resultado.diasMarcados).toBe(11);
    expect(prisma.tareoDetalle.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.tareoDetalle.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.tareoDetalle.createMany).toHaveBeenCalledWith({
      data: [25, 26, 27, 28, 29, 30].map((dia) => ({
        tareo_id: 200,
        dia,
        tipo_marcacion_id: 9,
      })),
    });
    expect(ordinalesDe(diasMarcados, 200)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ]);
  });

  it('la reversión usa un único updateMany por período con dia IN (...)', async () => {
    const { service, prisma } = construirPrisma([
      PERIODO_JULIO_CON_CORTE,
      PERIODO_AGOSTO_CON_CORTE,
    ]);

    await service.revertirSincronizacion(SOLICITUD);

    // Dos períodos afectados => exactamente dos updateMany, no uno por día.
    expect(prisma.tareoDetalle.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.tareoDetalle.updateMany).toHaveBeenNthCalledWith(1, {
      where: { tareo_id: 100, dia: { in: [25, 26, 27, 28, 29, 30] } },
      data: { tipo_marcacion_id: null },
    });
    expect(prisma.tareoDetalle.updateMany).toHaveBeenNthCalledWith(2, {
      where: { tareo_id: 110, dia: { in: [1, 2, 3, 4, 5] } },
      data: { tipo_marcacion_id: null },
    });
  });

  it('la reversión suma los días REALMENTE limpiados, no los esperados', async () => {
    const { service, prisma } = construirPrisma([PERIODO_JULIO_CALENDARIO]);
    // El tareo solo tenía 4 de los 11 días con detalle persistido.
    prisma.tareoDetalle.updateMany.mockResolvedValue({ count: 4 });

    const resultado = await service.revertirSincronizacion(SOLICITUD);

    expect(resultado.diasMarcados).toBe(4);
  });
});
