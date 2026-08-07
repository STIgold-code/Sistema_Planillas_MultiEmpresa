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
  empleado: { findFirst: jest.Mock };
  prestamoMovimiento: { create: jest.Mock };
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
    empleado: { findFirst: jest.fn() },
    prestamoMovimiento: { create: jest.fn() },
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

    await expect(service.create(5, CREAR_BASE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.empleado.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, empresa_id: 5 } }),
    );
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
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
    prisma.empleado.findFirst.mockResolvedValue({ id: 7 });

    await service.create(5, { ...CREAR_BASE, monto_total: 1200 });

    const datos = primerArgumento<{
      data: { saldo: number; monto_total: number; empresa_id: number };
    }>(prisma.prestamo.create);
    expect(datos.data.monto_total).toBe(1200);
    expect(datos.data.saldo).toBe(1200);
    expect(datos.data.empresa_id).toBe(5);
  });

  it('sin monto total el saldo queda en NULL (cuota recurrente)', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7 });

    await service.create(5, CREAR_BASE);

    const datos = primerArgumento<{
      data: { saldo: number | null; monto_total: number | null };
    }>(prisma.prestamo.create);
    expect(datos.data.monto_total).toBeNull();
    expect(datos.data.saldo).toBeNull();
  });

  it('rechaza una cuota mayor al monto total', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7 });

    await expect(
      service.create(5, {
        ...CREAR_BASE,
        cuota_mensual: 500,
        monto_total: 300,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
  });

  it('rechaza una cuota menor o igual a cero', async () => {
    const { service, prisma } = build();
    prisma.empleado.findFirst.mockResolvedValue({ id: 7 });

    await expect(
      service.create(5, { ...CREAR_BASE, cuota_mensual: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.prestamo.create).not.toHaveBeenCalled();
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
