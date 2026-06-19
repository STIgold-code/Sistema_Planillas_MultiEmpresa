import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TipoMovimientoInventario,
  EstadoItemInventario,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterMovimientosDto } from './dto';
import { parsearFechaISOenPeru } from '../../common/utils/datetime.util';

/** Tipos que SUMAN al stock (entradas) y que RESTAN (salidas). */
const TIPOS_ENTRADA = ['ENTRADA', 'DEVOLUCION'] as const;
const TIPOS_SALIDA = ['ENTREGA', 'BAJA'] as const;

@Injectable()
export class MovimientosInventarioService {
  constructor(private prisma: PrismaService) {}

  /**
   * Filtros base (sin tipo/dirección): empresa + rango de fechas + tipo de
   * prenda + empleado. Reutilizado por el resumen, que debe contar todos los
   * tipos sin importar el filtro de dirección de la tabla.
   */
  private construirWhereBase(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Prisma.MovimientoInventarioWhereInput {
    const { tipo_uniforme_id, empleado_id, desde, hasta } = filters;
    const where: Prisma.MovimientoInventarioWhereInput = {
      empresa_id: empresaId,
    };
    if (empleado_id) where.empleado_id = empleado_id;
    if (tipo_uniforme_id) where.item = { is: { tipo_uniforme_id } };
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = parsearFechaISOenPeru(desde);
      if (hasta) where.fecha.lte = parsearFechaISOenPeru(hasta);
    }
    return where;
  }

  /** Filtros completos: base + tipo puntual o dirección (entradas/salidas). */
  private construirWhere(
    empresaId: number,
    filters: FilterMovimientosDto,
  ): Prisma.MovimientoInventarioWhereInput {
    const where = this.construirWhereBase(empresaId, filters);
    if (filters.tipo_movimiento) {
      where.tipo_movimiento = filters.tipo_movimiento;
    } else if (filters.direccion === 'ENTRADAS') {
      where.tipo_movimiento = { in: [...TIPOS_ENTRADA] };
    } else if (filters.direccion === 'SALIDAS') {
      where.tipo_movimiento = { in: [...TIPOS_SALIDA] };
    }
    return where;
  }

  /**
   * Conteo de movimientos por tipo (para las tarjetas de resumen). Respeta el
   * rango de fechas y filtros de prenda/empleado, pero cuenta TODOS los tipos.
   */
  async resumen(empresaId: number, filters: FilterMovimientosDto) {
    const grupos = await this.prisma.movimientoInventario.groupBy({
      by: ['tipo_movimiento'],
      where: this.construirWhereBase(empresaId, filters),
      _count: { _all: true },
    });
    const base = { ENTRADA: 0, ENTREGA: 0, DEVOLUCION: 0, BAJA: 0 };
    for (const g of grupos) base[g.tipo_movimiento] = g._count._all;
    return base;
  }

  /**
   * Kardex de movimientos de inventario, paginado y filtrable. El modelo
   * MovimientoInventario no define relación hacia Empleado (solo guarda el
   * empleado_id escalar), por eso los empleados se resuelven en una segunda
   * consulta batch y se mapean en memoria.
   */
  async findAll(empresaId: number, filters: FilterMovimientosDto) {
    const { page = 1, limit = 20 } = filters;
    const where = this.construirWhere(empresaId, filters);

    const [movimientos, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where,
        select: {
          id: true,
          tipo_movimiento: true,
          fecha: true,
          empleado_id: true,
          motivo: true,
          item: {
            select: {
              id: true,
              codigo: true,
              talla: true,
              precio: true,
              estado: true,
              tipo_uniforme: { select: { id: true, nombre: true } },
              ingreso: { select: { numero_documento: true } },
            },
          },
          usuario: { select: { id: true, nombre_completo: true } },
        },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    const data = await this.resolverYMapear(movimientos, empresaId);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Lista TODOS los movimientos que matchean el filtro (sin paginar), para export. */
  async listarParaExport(empresaId: number, filters: FilterMovimientosDto) {
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: this.construirWhere(empresaId, filters),
      select: {
        id: true,
        tipo_movimiento: true,
        fecha: true,
        empleado_id: true,
        motivo: true,
        item: {
          select: {
            id: true,
            codigo: true,
            talla: true,
            precio: true,
            estado: true,
            tipo_uniforme: { select: { id: true, nombre: true } },
            ingreso: { select: { numero_documento: true } },
          },
        },
        usuario: { select: { id: true, nombre_completo: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return this.resolverYMapear(movimientos, empresaId);
  }

  /**
   * Resuelve los nombres de empleados (relación escalar) en una consulta batch
   * y mapea los movimientos a la forma de salida.
   */
  private async resolverYMapear(
    movimientos: Array<{
      id: number;
      tipo_movimiento: TipoMovimientoInventario;
      fecha: Date;
      empleado_id: number | null;
      motivo: string | null;
      item: {
        id: number;
        codigo: string;
        talla: string;
        precio: Prisma.Decimal;
        estado: EstadoItemInventario;
        tipo_uniforme: { id: number; nombre: string };
        ingreso: { numero_documento: string | null } | null;
      };
      usuario: { id: number; nombre_completo: string };
    }>,
    empresaId: number,
  ) {
    const empleadoIds = [
      ...new Set(
        movimientos
          .map((m) => m.empleado_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const empleados = empleadoIds.length
      ? await this.prisma.empleado.findMany({
          where: { id: { in: empleadoIds }, empresa_id: empresaId },
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        })
      : [];
    const empleadoPorId = new Map(empleados.map((e) => [e.id, e]));

    return movimientos.map((m) => ({
      id: m.id,
      tipo_movimiento: m.tipo_movimiento,
      fecha: m.fecha,
      item: {
        id: m.item.id,
        codigo: m.item.codigo,
        talla: m.item.talla,
        precio: m.item.precio,
        estado: m.item.estado,
        tipo_uniforme: {
          id: m.item.tipo_uniforme.id,
          nombre: m.item.tipo_uniforme.nombre,
        },
      },
      // La factura es del ingreso de compra; solo aplica a movimientos ENTRADA.
      factura:
        m.tipo_movimiento === 'ENTRADA'
          ? (m.item.ingreso?.numero_documento ?? null)
          : null,
      empleado:
        m.empleado_id !== null
          ? (empleadoPorId.get(m.empleado_id) ?? null)
          : null,
      motivo: m.motivo,
      usuario: { id: m.usuario.id, nombre_completo: m.usuario.nombre_completo },
    }));
  }
}
