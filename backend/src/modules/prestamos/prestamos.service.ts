import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPrestamo, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsearFechaISOenPeru } from '../../common/utils/datetime.util';
import {
  CancelarPrestamoDto,
  CreatePrestamoDto,
  FilterPrestamoDto,
  UpdatePrestamoDto,
} from './dto';

/** Últimos movimientos que se devuelven junto a cada préstamo del listado. */
const MOVIMIENTOS_EN_LISTADO = 5;

const SELECT_EMPLEADO = {
  id: true,
  nombres: true,
  apellido_paterno: true,
  apellido_materno: true,
  numero_documento: true,
} as const;

const SELECT_MOVIMIENTO = {
  id: true,
  planilla_id: true,
  monto: true,
  tipo: true,
  fecha: true,
  observaciones: true,
} as const;

/**
 * CRUD de préstamos y adelantos.
 *
 * Aislamiento multiempresa (regla dura del repo): TODA query filtra por
 * `empresa_id`. Nunca se resuelve un préstamo por id suelto.
 */
@Injectable()
export class PrestamosService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number, filters: FilterPrestamoDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.PrestamoWhereInput = {
      empresa_id: empresaId,
      ...(filters.empleado_id ? { empleado_id: filters.empleado_id } : {}),
      ...(filters.tipo ? { tipo: filters.tipo } : {}),
      ...(filters.estado ? { estado: filters.estado } : {}),
      ...(filters.buscar
        ? {
            empleado: {
              OR: [
                { nombres: { contains: filters.buscar, mode: 'insensitive' } },
                {
                  apellido_paterno: {
                    contains: filters.buscar,
                    mode: 'insensitive',
                  },
                },
                {
                  apellido_materno: {
                    contains: filters.buscar,
                    mode: 'insensitive',
                  },
                },
                { numero_documento: { contains: filters.buscar } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.prestamo.findMany({
        where,
        include: {
          empleado: { select: SELECT_EMPLEADO },
          movimientos: {
            select: SELECT_MOVIMIENTO,
            orderBy: { fecha: 'desc' },
            take: MOVIMIENTOS_EN_LISTADO,
          },
        },
        orderBy: [
          { estado: 'asc' },
          { fecha_otorgado: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prestamo.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, empresaId: number) {
    const prestamo = await this.prisma.prestamo.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        empleado: { select: SELECT_EMPLEADO },
        movimientos: {
          select: SELECT_MOVIMIENTO,
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    return prestamo;
  }

  async create(empresaId: number, dto: CreatePrestamoDto) {
    if (dto.cuota_mensual <= 0) {
      throw new BadRequestException('La cuota mensual debe ser mayor a cero');
    }

    if (dto.monto_total !== undefined && dto.cuota_mensual > dto.monto_total) {
      throw new BadRequestException(
        'La cuota mensual no puede ser mayor al monto total del préstamo',
      );
    }

    // Aislamiento multiempresa: el empleado debe ser de la empresa activa.
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      select: { id: true },
    });

    if (!empleado) {
      throw new NotFoundException(
        'Empleado no encontrado en la empresa activa',
      );
    }

    return this.prisma.prestamo.create({
      data: {
        empresa_id: empresaId,
        empleado_id: dto.empleado_id,
        tipo: dto.tipo,
        monto_total: dto.monto_total ?? null,
        cuota_mensual: dto.cuota_mensual,
        // Con monto total definido el saldo arranca igual al monto.
        saldo: dto.monto_total ?? null,
        fecha_otorgado: parsearFechaISOenPeru(dto.fecha_otorgado),
        observaciones: dto.observaciones ?? null,
      },
      include: { empleado: { select: SELECT_EMPLEADO } },
    });
  }

  async update(id: number, empresaId: number, dto: UpdatePrestamoDto) {
    const prestamo = await this.prisma.prestamo.findFirst({
      where: { id, empresa_id: empresaId },
      select: {
        id: true,
        estado: true,
        monto_total: true,
        saldo: true,
      },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    if (prestamo.estado !== EstadoPrestamo.ACTIVO) {
      throw new BadRequestException(
        'Solo se pueden editar préstamos en estado ACTIVO',
      );
    }

    if (dto.cuota_mensual !== undefined && dto.cuota_mensual <= 0) {
      throw new BadRequestException('La cuota mensual debe ser mayor a cero');
    }

    if (dto.saldo !== undefined && prestamo.saldo === null) {
      throw new BadRequestException(
        'Este préstamo es un descuento recurrente sin monto definido: no lleva saldo',
      );
    }

    const montoTotal =
      prestamo.monto_total === null ? null : Number(prestamo.monto_total);
    if (
      dto.saldo !== undefined &&
      montoTotal !== null &&
      dto.saldo > montoTotal
    ) {
      throw new BadRequestException(
        'El saldo no puede ser mayor al monto total del préstamo',
      );
    }

    const saldoAnterior =
      prestamo.saldo === null ? null : Number(prestamo.saldo);
    const ajustaSaldo = dto.saldo !== undefined && dto.saldo !== saldoAnterior;

    return this.prisma.$transaction(async (tx) => {
      if (ajustaSaldo && dto.saldo !== undefined && saldoAnterior !== null) {
        // Todo cambio de saldo deja rastro: el saldo es dinero del trabajador.
        await tx.prestamoMovimiento.create({
          data: {
            prestamo_id: id,
            monto: Number((dto.saldo - saldoAnterior).toFixed(2)),
            tipo: 'AJUSTE',
            observaciones: `Ajuste manual de saldo: ${saldoAnterior.toFixed(2)} → ${dto.saldo.toFixed(2)}`,
          },
        });
      }

      return tx.prestamo.update({
        where: { id },
        data: {
          ...(dto.cuota_mensual !== undefined
            ? { cuota_mensual: dto.cuota_mensual }
            : {}),
          ...(dto.saldo !== undefined ? { saldo: dto.saldo } : {}),
          ...(dto.observaciones !== undefined
            ? { observaciones: dto.observaciones }
            : {}),
          // Un ajuste que deja el saldo en cero cancela la deuda.
          ...(ajustaSaldo && dto.saldo === 0
            ? { estado: EstadoPrestamo.PAGADO }
            : {}),
        },
        include: { empleado: { select: SELECT_EMPLEADO } },
      });
    });
  }

  async cancelar(id: number, empresaId: number, dto: CancelarPrestamoDto) {
    const prestamo = await this.prisma.prestamo.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, estado: true, observaciones: true },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    if (prestamo.estado !== EstadoPrestamo.ACTIVO) {
      throw new BadRequestException(
        'Solo se pueden cancelar préstamos en estado ACTIVO',
      );
    }

    const observaciones = dto.motivo
      ? `[CANCELADO] ${dto.motivo}${prestamo.observaciones ? `\n${prestamo.observaciones}` : ''}`
      : prestamo.observaciones;

    return this.prisma.prestamo.update({
      where: { id },
      data: { estado: EstadoPrestamo.CANCELADO, observaciones },
      include: { empleado: { select: SELECT_EMPLEADO } },
    });
  }

  async remove(id: number, empresaId: number) {
    const prestamo = await this.prisma.prestamo.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, _count: { select: { movimientos: true } } },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    if (prestamo._count.movimientos > 0) {
      throw new BadRequestException(
        'El préstamo ya tiene movimientos registrados: cancélalo en lugar de eliminarlo',
      );
    }

    await this.prisma.prestamo.delete({ where: { id } });
    return { message: 'Préstamo eliminado correctamente' };
  }
}
