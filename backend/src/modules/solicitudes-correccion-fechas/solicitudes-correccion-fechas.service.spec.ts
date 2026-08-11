/**
 * Corrección de fechas de contrato con aprobación.
 *
 * Lo que blindan estos tests:
 * - el sustento es OBLIGATORIO y se rechaza ANTES de tocar la base;
 * - aprobar aplica las fechas al contrato y archiva el sustento en el legajo;
 * - la advertencia de planillas usa la VENTANA REAL del período de tareo, no el
 *   mes calendario (regla de oro del repo);
 * - rechazar NO toca el contrato;
 * - TODA query va acotada por `empresa_id` (regla dura del repo);
 * - no se admite una segunda solicitud PENDIENTE sobre el mismo contrato.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SolicitudesCorreccionFechasService } from './solicitudes-correccion-fechas.service';

interface PrismaMock {
  solicitudCorreccionFecha: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  contrato: { findFirst: jest.Mock; update: jest.Mock };
  planilla: { findMany: jest.Mock };
  periodoTareo: { findMany: jest.Mock };
  tipoDocumentoEmpleado: { findFirst: jest.Mock; create: jest.Mock };
  empleadoDocumento: { createMany: jest.Mock };
  $transaction: jest.Mock;
}

function build() {
  const prisma: PrismaMock = {
    solicitudCorreccionFecha: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    contrato: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 10 }),
    },
    planilla: { findMany: jest.fn().mockResolvedValue([]) },
    periodoTareo: { findMany: jest.fn().mockResolvedValue([]) },
    tipoDocumentoEmpleado: {
      findFirst: jest.fn().mockResolvedValue({ id: 30 }),
      create: jest.fn().mockResolvedValue({ id: 30 }),
    },
    empleadoDocumento: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: PrismaMock) => unknown) =>
    fn(prisma),
  );
  const service = new SolicitudesCorreccionFechasService(prisma as never);
  return { service, prisma };
}

const EMPRESA_ID = 5;
const USUARIO_ID = 3;

/** Sustento ya subido al storage. */
const SUSTENTO = [
  {
    archivo_url: 'documentos/adenda.pdf',
    archivo_nombre: 'adenda.pdf',
    archivo_tipo: 'application/pdf',
    archivo_tamano: 4096,
  },
];

const CREAR_BASE = {
  contrato_id: 10,
  motivo: 'La fecha de fin se digitó con un error de tipeo',
  fecha_inicio: '2026-07-01',
  fecha_fin: '2026-12-31',
};

/** Fecha `@db.Date` tal como la devuelve Prisma (medianoche UTC). */
function fechaDb(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const CONTRATO_VIGENTE = {
  id: 10,
  empleado_id: 7,
  estado: 'ACTIVO',
  fecha_inicio: fechaDb('2026-07-01'),
  fecha_fin: fechaDb('2026-11-30'),
};

/** Solicitud PENDIENTE lista para resolver. */
function solicitudPendiente(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    empresa_id: EMPRESA_ID,
    contrato_id: 10,
    empleado_id: 7,
    estado: 'PENDIENTE',
    fecha_inicio_actual: fechaDb('2026-07-01'),
    fecha_fin_actual: fechaDb('2026-11-30'),
    fecha_inicio_propuesta: fechaDb('2026-07-01'),
    fecha_fin_propuesta: fechaDb('2026-12-31'),
    motivo: 'Corrección de dedazo en la fecha de fin',
    archivos: SUSTENTO.map((a, i) => ({ id: i + 1, ...a })),
    ...overrides,
  };
}

/** Primer argumento de la primera llamada, tipado (sin `any` de mock.calls). */
function primerArgumento<T>(mock: jest.Mock): T {
  return (mock.mock.calls as unknown as [T][])[0][0];
}

describe('SolicitudesCorreccionFechasService.create — sustento obligatorio', () => {
  it('SIN sustento la solicitud se rechaza ANTES de tocar la base', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(EMPRESA_ID, CREAR_BASE, USUARIO_ID, []),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Ni siquiera se consulta el contrato: falla en la primera guarda.
    expect(prisma.contrato.findFirst).not.toHaveBeenCalled();
    expect(prisma.solicitudCorreccionFecha.findFirst).not.toHaveBeenCalled();
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('persiste el sustento colgado de la solicitud', async () => {
    const { service, prisma } = build();
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.create(EMPRESA_ID, CREAR_BASE, USUARIO_ID, SUSTENTO);

    const datos = primerArgumento<{
      data: {
        archivos: {
          create: {
            archivo_url: string;
            archivo_nombre: string;
            archivo_tipo: string | null;
            archivo_tamano: number | null;
          }[];
        };
      };
    }>(prisma.solicitudCorreccionFecha.create);
    expect(datos.data.archivos.create).toEqual([
      {
        archivo_url: 'documentos/adenda.pdf',
        archivo_nombre: 'adenda.pdf',
        archivo_tipo: 'application/pdf',
        archivo_tamano: 4096,
      },
    ]);
  });

  it('guarda el snapshot de las fechas actuales del contrato', async () => {
    const { service, prisma } = build();
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.create(EMPRESA_ID, CREAR_BASE, USUARIO_ID, SUSTENTO);

    const datos = primerArgumento<{
      data: {
        empresa_id: number;
        empleado_id: number;
        fecha_inicio_actual: Date;
        fecha_fin_actual: Date | null;
      };
    }>(prisma.solicitudCorreccionFecha.create);
    expect(datos.data.empresa_id).toBe(EMPRESA_ID);
    expect(datos.data.empleado_id).toBe(7);
    expect(datos.data.fecha_inicio_actual).toBe(CONTRATO_VIGENTE.fecha_inicio);
    expect(datos.data.fecha_fin_actual).toBe(CONTRATO_VIGENTE.fecha_fin);
  });
});

describe('SolicitudesCorreccionFechasService.create — validaciones', () => {
  it('rechaza un motivo demasiado corto', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(
        EMPRESA_ID,
        { ...CREAR_BASE, motivo: 'typo' },
        USUARIO_ID,
        SUSTENTO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('rechaza un año fuera del rango de contratos (dedazo tipo 2926)', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(
        EMPRESA_ID,
        { ...CREAR_BASE, fecha_inicio: '2926-07-01' },
        USUARIO_ID,
        SUSTENTO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('rechaza una fecha de fin anterior a la de inicio', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(
        EMPRESA_ID,
        { ...CREAR_BASE, fecha_fin: '2026-06-30' },
        USUARIO_ID,
        SUSTENTO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('rechaza una solicitud que no propone ningún cambio', async () => {
    const { service, prisma } = build();
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await expect(
      service.create(
        EMPRESA_ID,
        { ...CREAR_BASE, fecha_inicio: '2026-07-01', fecha_fin: '2026-11-30' },
        USUARIO_ID,
        SUSTENTO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('rechaza una segunda solicitud PENDIENTE sobre el mismo contrato', async () => {
    const { service, prisma } = build();
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.create(EMPRESA_ID, CREAR_BASE, USUARIO_ID, SUSTENTO),
    ).rejects.toBeInstanceOf(BadRequestException);

    const argumentos = primerArgumento<{
      where: { contrato_id: number; empresa_id: number; estado: string };
    }>(prisma.solicitudCorreccionFecha.findFirst);
    expect(argumentos.where).toEqual({
      contrato_id: 10,
      empresa_id: EMPRESA_ID,
      estado: 'PENDIENTE',
    });
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });
});

describe('SolicitudesCorreccionFechasService — aislamiento multiempresa', () => {
  it('el listado filtra siempre por empresa_id', async () => {
    const { service, prisma } = build();

    await service.findAll(EMPRESA_ID, {});

    const argumentos = primerArgumento<{ where: { empresa_id: number } }>(
      prisma.solicitudCorreccionFecha.findMany,
    );
    expect(argumentos.where.empresa_id).toBe(EMPRESA_ID);
    const argumentosCount = primerArgumento<{ where: { empresa_id: number } }>(
      prisma.solicitudCorreccionFecha.count,
    );
    expect(argumentosCount.where.empresa_id).toBe(EMPRESA_ID);
  });

  it('no resuelve una solicitud de otra empresa', async () => {
    const { service, prisma } = build();

    await expect(service.findOne(1, EMPRESA_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.solicitudCorreccionFecha.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, empresa_id: EMPRESA_ID } }),
    );
  });

  it('no crea una solicitud sobre un contrato de otra empresa', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(EMPRESA_ID, CREAR_BASE, USUARIO_ID, SUSTENTO),
    ).rejects.toBeInstanceOf(NotFoundException);

    const argumentos = primerArgumento<{
      where: { id: number; empleado: { empresa_id: number } };
    }>(prisma.contrato.findFirst);
    expect(argumentos.where).toEqual({
      id: 10,
      empleado: { empresa_id: EMPRESA_ID },
    });
    expect(prisma.solicitudCorreccionFecha.create).not.toHaveBeenCalled();
  });

  it('la aprobación no aplica fechas a un contrato de otra empresa', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    // El contrato existe, pero no pertenece a la empresa activa.
    prisma.contrato.findFirst.mockResolvedValue(null);

    await expect(
      service.aprobar(1, EMPRESA_ID, USUARIO_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contrato.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('la resolución acota el update por empresa y por estado PENDIENTE', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      where: { id: number; empresa_id: number; estado: string };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.where).toEqual({
      id: 1,
      empresa_id: EMPRESA_ID,
      estado: 'PENDIENTE',
    });
  });
});

describe('SolicitudesCorreccionFechasService.aprobar', () => {
  it('aplica las fechas propuestas al contrato', async () => {
    const { service, prisma } = build();
    const solicitud = solicitudPendiente();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(solicitud);
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    expect(prisma.contrato.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        fecha_inicio: solicitud.fecha_inicio_propuesta,
        fecha_fin: solicitud.fecha_fin_propuesta,
      },
    });
  });

  it('archiva el sustento en el legajo del trabajador (un archivo, dos referencias)', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const documentos = primerArgumento<{
      data: {
        empleado_id: number;
        archivo_url: string;
        subido_por_id: number;
        tipo_documento_empleado_id: number;
      }[];
    }>(prisma.empleadoDocumento.createMany);
    expect(documentos.data).toHaveLength(1);
    expect(documentos.data[0].empleado_id).toBe(7);
    expect(documentos.data[0].subido_por_id).toBe(USUARIO_ID);
    // Reutiliza la MISMA url: no se duplica el storage.
    expect(documentos.data[0].archivo_url).toBe('documentos/adenda.pdf');
  });

  it('crea el tipo de documento de sustento si la empresa no lo tiene', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);
    prisma.tipoDocumentoEmpleado.findFirst.mockResolvedValue(null);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const tipo = primerArgumento<{
      data: { codigo: string; empresa_id: number };
    }>(prisma.tipoDocumentoEmpleado.create);
    expect(tipo.data.codigo).toBe('SUSTENTO_CORR_FECHA');
    expect(tipo.data.empresa_id).toBe(EMPRESA_ID);
  });

  it('no aprueba una solicitud que ya fue resuelta', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({ estado: 'APROBADA' }),
    );

    await expect(
      service.aprobar(1, EMPRESA_ID, USUARIO_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.contrato.update).not.toHaveBeenCalled();
  });
});

describe('SolicitudesCorreccionFechasService.rechazar', () => {
  it('no toca el contrato', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );

    await service.rechazar(1, EMPRESA_ID, USUARIO_ID, {
      observaciones_admin: 'La adenda no corresponde a este contrato',
    });

    expect(prisma.contrato.update).not.toHaveBeenCalled();
    expect(prisma.empleadoDocumento.createMany).not.toHaveBeenCalled();

    const argumentos = primerArgumento<{
      data: { estado: string; observaciones_admin: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.estado).toBe('RECHAZADA');
    expect(argumentos.data.observaciones_admin).toBe(
      'La adenda no corresponde a este contrato',
    );
  });

  it('no rechaza una solicitud que ya fue resuelta', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({ estado: 'RECHAZADA' }),
    );

    await expect(
      service.rechazar(1, EMPRESA_ID, USUARIO_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.solicitudCorreccionFecha.updateMany).not.toHaveBeenCalled();
  });
});

/**
 * Empresa con día de corte 25: el período "julio 2026" va del 26/06 al 25/07.
 * Estos tests existen para probar que la advertencia se calcula con esa ventana
 * persistida y NO con el mes calendario.
 */
describe('SolicitudesCorreccionFechasService.aprobar — advertencia de planillas', () => {
  const PLANILLA_JULIO_CON_CORTE = {
    anio: 2026,
    mes: 7,
    periodo_tareo: {
      fecha_inicio: fechaDb('2026-06-26'),
      fecha_fin: fechaDb('2026-07-25'),
    },
  };

  it('solo mira planillas APROBADA o PAGADA de la empresa activa', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      where: { empresa_id: number; estado: { in: string[] } };
    }>(prisma.planilla.findMany);
    expect(argumentos.where.empresa_id).toBe(EMPRESA_ID);
    expect(argumentos.where.estado.in).toEqual(['APROBADA', 'PAGADA']);
  });

  it('advierte cuando el rango cae en la ventana del período aunque sea otro mes calendario', async () => {
    const { service, prisma } = build();
    // Rango afectado: 28/06 → 30/06. En mes calendario sería "junio" y no
    // dispararía nada; con la ventana real cae dentro del período de julio.
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({
        fecha_inicio_actual: fechaDb('2026-06-28'),
        fecha_fin_actual: fechaDb('2026-06-30'),
        fecha_inicio_propuesta: fechaDb('2026-06-28'),
        fecha_fin_propuesta: fechaDb('2026-06-29'),
      }),
    );
    prisma.contrato.findFirst.mockResolvedValue({
      ...CONTRATO_VIGENTE,
      fecha_inicio: fechaDb('2026-06-28'),
      fecha_fin: fechaDb('2026-06-30'),
    });
    prisma.planilla.findMany.mockResolvedValue([PLANILLA_JULIO_CON_CORTE]);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.advertencia_planillas).toBe(
      'El cambio afecta períodos con planilla aprobada o pagada (julio 2026): ' +
        'los cálculos existentes no se recalculan automáticamente.',
    );
  });

  it('NO advierte cuando el rango cae fuera de la ventana aunque sea el mismo mes calendario', async () => {
    const { service, prisma } = build();
    // Rango afectado: 28/07 → 31/07. Es "julio" en calendario, pero el período
    // de julio cerró el 25/07: la planilla aprobada no cubre esos días.
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({
        fecha_inicio_actual: fechaDb('2026-07-28'),
        fecha_fin_actual: fechaDb('2026-07-31'),
        fecha_inicio_propuesta: fechaDb('2026-07-29'),
        fecha_fin_propuesta: fechaDb('2026-07-31'),
      }),
    );
    prisma.contrato.findFirst.mockResolvedValue({
      ...CONTRATO_VIGENTE,
      fecha_inicio: fechaDb('2026-07-28'),
      fecha_fin: fechaDb('2026-07-31'),
    });
    prisma.planilla.findMany.mockResolvedValue([PLANILLA_JULIO_CON_CORTE]);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.advertencia_planillas).toBeNull();
  });

  it('resuelve la ventana por (año, mes) cuando la planilla no tiene período enlazado', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({
        fecha_inicio_actual: fechaDb('2026-06-28'),
        fecha_fin_actual: fechaDb('2026-06-30'),
        fecha_inicio_propuesta: fechaDb('2026-06-28'),
        fecha_fin_propuesta: fechaDb('2026-06-29'),
      }),
    );
    prisma.contrato.findFirst.mockResolvedValue({
      ...CONTRATO_VIGENTE,
      fecha_inicio: fechaDb('2026-06-28'),
      fecha_fin: fechaDb('2026-06-30'),
    });
    prisma.planilla.findMany.mockResolvedValue([
      { anio: 2026, mes: 7, periodo_tareo: null },
    ]);
    prisma.periodoTareo.findMany.mockResolvedValue([
      {
        anio: 2026,
        mes: 7,
        fecha_inicio: fechaDb('2026-06-26'),
        fecha_fin: fechaDb('2026-07-25'),
      },
    ]);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const busqueda = primerArgumento<{ where: { empresa_id: number } }>(
      prisma.periodoTareo.findMany,
    );
    expect(busqueda.where.empresa_id).toBe(EMPRESA_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.advertencia_planillas).toContain('julio 2026');
  });

  it('omite planillas sin ventana persistida en vez de reconstruirla del mes', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente(),
    );
    prisma.contrato.findFirst.mockResolvedValue(CONTRATO_VIGENTE);
    prisma.planilla.findMany.mockResolvedValue([
      { anio: 2026, mes: 7, periodo_tareo: null },
    ]);
    prisma.periodoTareo.findMany.mockResolvedValue([]);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.advertencia_planillas).toBeNull();
  });

  it('con muchos períodos afectados el mensaje se acota y entra en la columna', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({
        fecha_inicio_actual: fechaDb('2022-01-01'),
        fecha_fin_actual: null,
        fecha_inicio_propuesta: fechaDb('2022-02-01'),
        fecha_fin_propuesta: null,
      }),
    );
    prisma.contrato.findFirst.mockResolvedValue({
      ...CONTRATO_VIGENTE,
      fecha_inicio: fechaDb('2022-01-01'),
      fecha_fin: null,
    });
    // 36 períodos liquidados consecutivos (3 años de planillas).
    prisma.planilla.findMany.mockResolvedValue(
      Array.from({ length: 36 }, (_, i) => {
        const anio = 2023 + Math.floor(i / 12);
        const mes = (i % 12) + 1;
        const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
        return {
          anio,
          mes,
          periodo_tareo: {
            fecha_inicio: fechaDb(`${anio}-${String(mes).padStart(2, '0')}-01`),
            fecha_fin: fechaDb(
              `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`,
            ),
          },
        };
      }),
    );

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    const advertencia = argumentos.data.advertencia_planillas ?? '';
    expect(advertencia).toContain('24 período(s) más');
    expect(advertencia.length).toBeLessThanOrEqual(1000);
  });

  it('un contrato indefinido advierte sobre todo período posterior al inicio', async () => {
    const { service, prisma } = build();
    prisma.solicitudCorreccionFecha.findFirst.mockResolvedValue(
      solicitudPendiente({
        fecha_inicio_actual: fechaDb('2026-01-01'),
        fecha_fin_actual: null,
        fecha_inicio_propuesta: fechaDb('2026-02-01'),
        fecha_fin_propuesta: null,
      }),
    );
    prisma.contrato.findFirst.mockResolvedValue({
      ...CONTRATO_VIGENTE,
      fecha_inicio: fechaDb('2026-01-01'),
      fecha_fin: null,
    });
    prisma.planilla.findMany.mockResolvedValue([PLANILLA_JULIO_CON_CORTE]);

    await service.aprobar(1, EMPRESA_ID, USUARIO_ID);

    const argumentos = primerArgumento<{
      data: { advertencia_planillas: string | null };
    }>(prisma.solicitudCorreccionFecha.updateMany);
    expect(argumentos.data.advertencia_planillas).toContain('julio 2026');
  });
});
