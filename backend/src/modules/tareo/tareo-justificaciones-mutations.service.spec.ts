/**
 * `getAlertasFaltas` cuenta faltas dentro de un rango de FECHAS, pero
 * `TareoDetalle.dia` es un ORDINAL del período. La traducción rango de fechas →
 * rango ordinal debe hacerse período por período, leyendo su ventana persistida.
 *
 * Antes el groupBy no filtraba por `dia`: cualquier período que solapara un solo
 * día aportaba TODAS sus faltas (sobreconteo). Estos tests fijan el fix y la
 * regresión cero en períodos calendario.
 */
import { TareoJustificacionesMutationsService } from './tareo-justificaciones-mutations.service';

/** Fecha al estilo Prisma `@db.Date`: medianoche UTC. */
const fechaBd = (anio: number, mes: number, dia: number): Date =>
  new Date(Date.UTC(anio, mes - 1, dia));

interface PeriodoMock {
  id: number;
  anio: number;
  mes: number;
  fecha_inicio: Date;
  fecha_fin: Date;
}

interface ArgsGroupBy {
  where: {
    tipo_marcacion_id: number;
    OR: {
      tareo: { periodo_id: number };
      dia: { gte: number; lte: number };
    }[];
  };
}

interface ArgsFindManyPeriodos {
  where: {
    empresa_id: number;
    fecha_inicio: { lte: Date };
    fecha_fin: { gte: Date };
  };
}

/** Argumentos capturados de las consultas, tipados (sin `any` de mock.calls). */
interface ArgsCapturados {
  groupBy?: ArgsGroupBy;
  periodos?: ArgsFindManyPeriodos;
}

function construirPrisma(periodos: PeriodoMock[]) {
  const capturado: ArgsCapturados = {};

  const groupBy = jest.fn().mockImplementation((args: ArgsGroupBy) => {
    capturado.groupBy = args;
    return Promise.resolve([{ tareo_id: 1, _count: { id: 4 } }]);
  });
  const periodoFindMany = jest
    .fn()
    .mockImplementation((args: ArgsFindManyPeriodos) => {
      capturado.periodos = args;
      return Promise.resolve(periodos);
    });

  const prisma = {
    tipoMarcacion: { findFirst: jest.fn().mockResolvedValue({ id: 9 }) },
    periodoTareo: { findMany: periodoFindMany },
    tareoDetalle: { groupBy },
    tareo: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          empleado_id: 50,
          periodo: { anio: 2026, mes: 7 },
        },
      ]),
    },
    empleado: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 50,
          numero_documento: '12345678',
          nombres: 'Ana',
          apellido_paterno: 'Pérez',
          apellido_materno: 'Ruiz',
          foto_url: null,
          area: null,
          sede: null,
          cargo: null,
        },
      ]),
    },
  };

  const service = new TareoJustificacionesMutationsService(
    prisma as never,
    {} as never,
  );

  return { service, groupBy, capturado };
}

const filtrosJulio = {
  fecha_inicio: new Date('2026-07-01'),
  fecha_fin: new Date('2026-07-31'),
  minimo_faltas: 3,
};

describe('TareoJustificacionesMutationsService.getAlertasFaltas', () => {
  it('busca períodos por SOLAPE de la ventana persistida, no por año', async () => {
    const { service, capturado } = construirPrisma([
      {
        id: 10,
        anio: 2026,
        mes: 7,
        fecha_inicio: fechaBd(2026, 6, 26),
        fecha_fin: fechaBd(2026, 7, 25),
      },
    ]);

    await service.getAlertasFaltas(7, filtrosJulio);

    expect(capturado.periodos?.where.empresa_id).toBe(7);
    expect(capturado.periodos?.where.fecha_inicio.lte).toEqual(
      fechaBd(2026, 7, 31),
    );
    expect(capturado.periodos?.where.fecha_fin.gte).toEqual(
      fechaBd(2026, 7, 1),
    );
  });

  it('con día de corte 25, filtra cada período por su rango ORDINAL (no sobrecuenta)', async () => {
    // Julio = 26-jun a 25-jul (ordinal 1 = 26-jun) y agosto = 26-jul a 25-ago.
    // El rango pedido (1-jul a 31-jul) toca ambos, pero solo parcialmente.
    const { service, capturado } = construirPrisma([
      {
        id: 10,
        anio: 2026,
        mes: 7,
        fecha_inicio: fechaBd(2026, 6, 26),
        fecha_fin: fechaBd(2026, 7, 25),
      },
      {
        id: 11,
        anio: 2026,
        mes: 8,
        fecha_inicio: fechaBd(2026, 7, 26),
        fecha_fin: fechaBd(2026, 8, 25),
      },
    ]);

    await service.getAlertasFaltas(7, filtrosJulio);

    expect(capturado.groupBy?.where.tipo_marcacion_id).toBe(9);
    const condiciones = capturado.groupBy?.where.OR ?? [];
    expect(condiciones).toHaveLength(2);

    // 1-jul es el ordinal 6 del período de julio; 25-jul es el 30 (fin de ventana).
    expect(condiciones[0].tareo.periodo_id).toBe(10);
    expect(condiciones[0].dia).toEqual({ gte: 6, lte: 30 });

    // En agosto solo entran 26-jul (ordinal 1) a 31-jul (ordinal 6).
    expect(condiciones[1].tareo.periodo_id).toBe(11);
    expect(condiciones[1].dia).toEqual({ gte: 1, lte: 6 });
  });

  it('regresión: en período calendario el ordinal es el día del mes', async () => {
    const { service, capturado } = construirPrisma([
      {
        id: 20,
        anio: 2026,
        mes: 7,
        fecha_inicio: fechaBd(2026, 7, 1),
        fecha_fin: fechaBd(2026, 7, 31),
      },
    ]);

    await service.getAlertasFaltas(7, filtrosJulio);

    const condiciones = capturado.groupBy?.where.OR ?? [];
    expect(condiciones).toHaveLength(1);
    expect(condiciones[0].tareo.periodo_id).toBe(20);
    expect(condiciones[0].dia).toEqual({ gte: 1, lte: 31 });
  });

  it('devuelve el empleado con sus faltas cuando supera el mínimo', async () => {
    const { service } = construirPrisma([
      {
        id: 20,
        anio: 2026,
        mes: 7,
        fecha_inicio: fechaBd(2026, 7, 1),
        fecha_fin: fechaBd(2026, 7, 31),
      },
    ]);

    const resultado = await service.getAlertasFaltas(7, filtrosJulio);

    expect(resultado.total).toBe(1);
    expect(resultado.empleados[0]).toMatchObject({
      empleado_id: 50,
      cantidad_faltas: 4,
      requiere_pre_aviso: true,
    });
  });

  it('sin períodos solapados no consulta faltas', async () => {
    const { service, groupBy } = construirPrisma([]);

    const resultado = await service.getAlertasFaltas(7, filtrosJulio);

    expect(groupBy).not.toHaveBeenCalled();
    expect(resultado.empleados).toEqual([]);
  });
});
