/**
 * Aislamiento multiempresa y validaciones de negocio del CRUD de préstamos.
 * TODA query debe ir acotada por `empresa_id` (regla dura del repo).
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrestamosService } from './prestamos.service';

interface PrismaMock {
  prestamo: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  prestamoArchivo: { createMany: jest.Mock };
  empleado: { findFirst: jest.Mock };
  // Presentes SOLO para probar que el alta NUNCA los toca: un préstamo es un
  // acuerdo financiero, independiente del estado del tareo o de la planilla.
  periodoTareo: { findFirst: jest.Mock };
  planilla: { findFirst: jest.Mock };
  prestamoMovimiento: { create: jest.Mock };
  tipoDocumentoEmpleado: { findFirst: jest.Mock; create: jest.Mock };
  empleadoDocumento: { createMany: jest.Mock };
  $transaction: jest.Mock;
}

function build() {
  const prisma: PrismaMock = {
    prestamo: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      delete: jest.fn().mockResolvedValue({ id: 1 }),
    },
    prestamoArchivo: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    empleado: { findFirst: jest.fn() },
    periodoTareo: { findFirst: jest.fn() },
    planilla: { findFirst: jest.fn() },
    prestamoMovimiento: { create: jest.fn() },
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
  const service = new PrestamosService(prisma as never);
  return { service, prisma };
}

const CREAR_BASE = {
  empleado_id: 7,
  tipo: 'PRESTAMO' as const,
  cuota_mensual: 100,
  fecha_otorgado: '2026-08-01',
};

const USUARIO_ID = 3;

/** Convenio de descuento firmado, ya subido al storage. */
const CONVENIO = [
  {
    archivo_url: 'documentos/convenio.pdf',
    archivo_nombre: 'convenio.pdf',
    archivo_tipo: 'application/pdf',
    archivo_tamano: 2048,
  },
];

/** Primer argumento de la primera llamada, tipado (sin `any` de mock.calls). */
function primerArgumento<T>(mock: jest.Mock): T {
  return (mock.mock.calls as unknown as [T][])[0][0];
}

describe('PrestamosService — aislamiento multiempresa', () => {
  it('el listado filtra siempre por empresa_id', async () => {
    const { service, prisma } = build();

    await service.findAll(5, {});

    const argumentos = primerArgumento<{ where: { empresa_id: number } }>(
      prisma.prestamo.findMany,
    );
    expect(argumentos.where.empresa_id).toBe(5);
    const argumentosCount = primerArgumento<{ where: { empresa_id: number } }>(
      prisma.prestamo.count,
    );
    expect(argumentosCount.where.empresa_id).toBe(5);
  });

  it('no resuelve un préstamo de otra empresa (findFirst acotado)', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue(null);

    await expect(service.findOne(1, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.prestamo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, empresa_id: 5 } }),
    );
  });

  it('rechaza otorgar un préstamo a un empleado de otra empresa', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue(null);

    await expect(
      service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.empleado.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, empresa_id: 5 } }),
    );
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('la regularización no adjunta a préstamos de otra empresa', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue(null);

    await expect(
      service.agregarArchivos(1, 5, USUARIO_ID, CONVENIO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.prestamoArchivo.createMany).not.toHaveBeenCalled();
    expect(prisma.empleadoDocumento.createMany).not.toHaveBeenCalled();
  });

  it('la edición no toca préstamos de otra empresa', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue(null);

    await expect(
      service.update(1, 5, { cuota_mensual: 200 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.prestamo.update).not.toHaveBeenCalled();
  });

  it('la cancelación no toca préstamos de otra empresa', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue(null);

    await expect(service.cancelar(1, 5, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.prestamo.update).not.toHaveBeenCalled();
  });
});

describe('PrestamosService.create', () => {
  it('con monto total definido el saldo arranca igual al monto', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await service.create(
      5,
      { ...CREAR_BASE, monto_total: 1200 },
      USUARIO_ID,
      CONVENIO,
    );

    const datos = primerArgumento<{
      data: { saldo: number; monto_total: number; empresa_id: number };
    }>(prisma.prestamo.create);
    expect(datos.data.monto_total).toBe(1200);
    expect(datos.data.saldo).toBe(1200);
    expect(datos.data.empresa_id).toBe(5);
  });

  it('sin monto total el saldo queda en NULL (cuota recurrente)', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO);

    const datos = primerArgumento<{
      data: { saldo: number | null; monto_total: number | null };
    }>(prisma.prestamo.create);
    expect(datos.data.monto_total).toBeNull();
    expect(datos.data.saldo).toBeNull();
  });

  it('rechaza una cuota mayor al monto total', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(
        5,
        { ...CREAR_BASE, cuota_mensual: 500, monto_total: 300 },
        USUARIO_ID,
        CONVENIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('rechaza una cuota menor o igual a cero', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(
        5,
        { ...CREAR_BASE, cuota_mensual: 0 },
        USUARIO_ID,
        CONVENIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });
});

describe('PrestamosService.create — convenio obligatorio', () => {
  it('SIN documento adjunto NO se registra el préstamo', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(5, CREAR_BASE, USUARIO_ID, []),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('el convenio se rechaza ANTES de tocar la base', async () => {
    const { service, prisma } = build();

    await expect(
      service.create(5, CREAR_BASE, USUARIO_ID, []),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Ni siquiera se consulta el empleado: falla en la primera guarda.
    expect(prisma.empleado.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persiste el convenio colgado del préstamo', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO);

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
    }>(prisma.prestamo.create);
    expect(datos.data.archivos.create).toEqual([
      {
        archivo_url: 'documentos/convenio.pdf',
        archivo_nombre: 'convenio.pdf',
        archivo_tipo: 'application/pdf',
        archivo_tamano: 2048,
      },
    ]);
  });

  it('archiva el convenio en el legajo del empleado (un archivo, dos referencias)', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO);

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
    expect(documentos.data[0].archivo_url).toBe('documentos/convenio.pdf');
  });

  it('crea el tipo de documento CONVENIO_PRESTAMO si la empresa no lo tiene', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });
    prisma.tipoDocumentoEmpleado.findFirst.mockResolvedValue(null);

    await service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO);

    const tipo = primerArgumento<{
      data: { codigo: string; empresa_id: number };
    }>(prisma.tipoDocumentoEmpleado.create);
    expect(tipo.data.codigo).toBe('CONVENIO_PRESTAMO');
    expect(tipo.data.empresa_id).toBe(5);
  });
});

describe('PrestamosService.agregarArchivos — regularización', () => {
  it('sin archivos no hace nada y rechaza', async () => {
    const { service, prisma } = build();

    await expect(
      service.agregarArchivos(1, 5, USUARIO_ID, []),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.findFirst).not.toHaveBeenCalled();
  });

  it('adjunta el convenio a un préstamo ya registrado y lo archiva en el legajo', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      tipo: 'PRESTAMO',
      empleado_id: 7,
    });

    await service.agregarArchivos(1, 5, USUARIO_ID, CONVENIO);

    const archivos = primerArgumento<{
      data: { prestamo_id: number; archivo_url: string }[];
    }>(prisma.prestamoArchivo.createMany);
    expect(archivos.data).toEqual([
      {
        prestamo_id: 1,
        archivo_url: 'documentos/convenio.pdf',
        archivo_nombre: 'convenio.pdf',
        archivo_tipo: 'application/pdf',
        archivo_tamano: 2048,
      },
    ]);

    const documentos = primerArgumento<{
      data: { empleado_id: number }[];
    }>(prisma.empleadoDocumento.createMany);
    expect(documentos.data[0].empleado_id).toBe(7);
  });
});

describe('PrestamosService.update', () => {
  it('un ajuste de saldo deja rastro como movimiento AJUSTE', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      estado: 'ACTIVO',
      monto_total: 1000,
      saldo: 800,
    });

    await service.update(1, 5, { saldo: 600 });

    const movimiento = primerArgumento<{
      data: { monto: number; tipo: string };
    }>(prisma.prestamoMovimiento.create);
    expect(movimiento.data.tipo).toBe('AJUSTE');
    expect(movimiento.data.monto).toBe(-200);
  });

  it('un ajuste que deja el saldo en cero cancela la deuda (PAGADO)', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      estado: 'ACTIVO',
      monto_total: 1000,
      saldo: 150,
    });

    await service.update(1, 5, { saldo: 0 });

    const datos = primerArgumento<{ data: { estado?: string } }>(
      prisma.prestamo.update,
    );
    expect(datos.data.estado).toBe('PAGADO');
  });

  it('no permite editar un préstamo ya pagado', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      estado: 'PAGADO',
      monto_total: 1000,
      saldo: 0,
    });

    await expect(
      service.update(1, 5, { cuota_mensual: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no acepta saldo en un préstamo recurrente sin monto definido', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      estado: 'ACTIVO',
      monto_total: null,
      saldo: null,
    });

    await expect(service.update(1, 5, { saldo: 100 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PrestamosService.remove', () => {
  it('no elimina un préstamo que ya tiene movimientos', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      _count: { movimientos: 2 },
    });

    await expect(service.remove(1, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.prestamo.delete).not.toHaveBeenCalled();
  });

  it('elimina un préstamo sin movimientos', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      _count: { movimientos: 0 },
    });

    await expect(service.remove(1, 5)).resolves.toBeDefined();
    expect(prisma.prestamo.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

/**
 * Fecha ISO desplazada N días respecto de HOY EN PERÚ (evita tests que caducan).
 *
 * Se ancla en hora de Perú a propósito: el servicio compara contra la fecha
 * peruana, y con UTC-5 el "hoy" de UTC se adelanta un día pasadas las 19:00.
 * Anclar en UTC haría que el borde de "hoy" fallara solo de noche.
 */
function fechaEnDias(dias: number): string {
  const hoyPeru = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  const fecha = new Date(`${hoyPeru}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

describe('PrestamosService.create — el alta NO depende del período ni de la planilla', () => {
  it('no consulta períodos de tareo ni planillas', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO);

    expect(prisma.periodoTareo.findFirst).not.toHaveBeenCalled();
    expect(prisma.planilla.findFirst).not.toHaveBeenCalled();
  });

  it('acepta una fecha de un período largamente cerrado', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(
        5,
        { ...CREAR_BASE, fecha_otorgado: fechaEnDias(-200) },
        USUARIO_ID,
        CONVENIO,
      ),
    ).resolves.toBeDefined();
    expect(prisma.prestamo.create).toHaveBeenCalled();
  });

  it('rechaza una fecha de otorgamiento futura', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(
        5,
        { ...CREAR_BASE, fecha_otorgado: fechaEnDias(5) },
        USUARIO_ID,
        CONVENIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('acepta la fecha de hoy (borde no futuro)', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'ACTIVO' });

    await expect(
      service.create(
        5,
        { ...CREAR_BASE, fecha_otorgado: fechaEnDias(0) },
        USUARIO_ID,
        CONVENIO,
      ),
    ).resolves.toBeDefined();
  });
});

describe('PrestamosService — estado del trabajador', () => {
  it('no otorga préstamos a un trabajador cesado', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7, estado: 'CESADO' });

    await expect(
      service.create(5, CREAR_BASE, USUARIO_ID, CONVENIO),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('la REGULARIZACIÓN de archivos sí acepta un trabajador cesado', async () => {
    const { service, prisma } = build();
    prisma.prestamo.findFirst.mockResolvedValue({
      id: 1,
      tipo: 'PRESTAMO',
      empleado_id: 7,
    });

    await expect(
      service.agregarArchivos(1, 5, USUARIO_ID, CONVENIO),
    ).resolves.toBeDefined();
    expect(prisma.prestamoArchivo.createMany).toHaveBeenCalled();
  });
});
