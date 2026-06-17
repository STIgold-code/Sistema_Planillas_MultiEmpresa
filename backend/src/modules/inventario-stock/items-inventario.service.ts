import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterItemsDto } from './dto';

@Injectable()
export class ItemsInventarioService {
  constructor(private prisma: PrismaService) {}

  private construirWhere(
    empresaId: number,
    filters: FilterItemsDto,
  ): Prisma.ItemInventarioWhereInput {
    const { buscar, estado, tipo_uniforme_id, proveedor_id, talla } = filters;
    const where: Prisma.ItemInventarioWhereInput = { empresa_id: empresaId };
    if (estado) where.estado = estado;
    if (tipo_uniforme_id) where.tipo_uniforme_id = tipo_uniforme_id;
    if (proveedor_id) where.proveedor_id = proveedor_id;
    if (talla) where.talla = talla.trim().toUpperCase();
    if (buscar) {
      where.codigo = { contains: buscar.trim(), mode: 'insensitive' };
    }
    return where;
  }

  private readonly includeRelaciones = {
    tipo_uniforme: { select: { id: true, nombre: true, genero: true } },
    proveedor: { select: { id: true, nombre: true } },
    empleado: {
      select: {
        id: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
      },
    },
  } as const;

  async findAll(empresaId: number, filters: FilterItemsDto) {
    const { page = 1, limit = 50 } = filters;
    const where = this.construirWhere(empresaId, filters);

    const [data, total] = await Promise.all([
      this.prisma.itemInventario.findMany({
        where,
        include: this.includeRelaciones,
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.itemInventario.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Lista TODOS los items que matchean los filtros (sin paginar), para export. */
  async listarParaExport(empresaId: number, filters: FilterItemsDto) {
    return this.prisma.itemInventario.findMany({
      where: this.construirWhere(empresaId, filters),
      include: this.includeRelaciones,
      orderBy: { codigo: 'asc' },
    });
  }

  async resumen(empresaId: number) {
    const grupos = await this.prisma.itemInventario.groupBy({
      by: ['estado'],
      where: { empresa_id: empresaId },
      _count: { _all: true },
    });
    const base = { DISPONIBLE: 0, ENTREGADO: 0, BAJA: 0 };
    for (const g of grupos) {
      base[g.estado] = g._count._all;
    }
    return base;
  }

  /**
   * Existencias agregadas por prenda + talla: cuánto hay DISPONIBLE, el stock
   * mínimo configurado (catálogo de tallas) y cuánto falta para alcanzarlo.
   * Estructura para la vista de stock: totales generales + prendas con sus
   * tallas. El faltante se calcula por talla como max(0, mínimo − disponibles).
   */
  async existencias(empresaId: number) {
    const [tipos, grupos] = await Promise.all([
      this.prisma.tipoUniforme.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: {
          id: true,
          nombre: true,
          tallas: {
            select: { valor: true, stock_minimo: true },
            orderBy: { orden: 'asc' },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.itemInventario.groupBy({
        by: ['tipo_uniforme_id', 'talla'],
        where: { empresa_id: empresaId, estado: 'DISPONIBLE' },
        _count: { _all: true },
      }),
    ]);

    // Mapa "tipoId|talla" -> disponibles, para cruzar contra el catálogo.
    const dispMap = new Map<string, number>();
    for (const g of grupos) {
      dispMap.set(`${g.tipo_uniforme_id}|${g.talla}`, g._count._all);
    }

    let totalDisponibles = 0;
    let totalMinimo = 0;
    let totalFaltan = 0;

    const prendas = tipos
      .map((tipo) => {
        let prendaDisponibles = 0;
        let prendaFaltan = 0;
        const vistas = new Set<string>();

        // Tallas del catálogo, en su orden, con su mínimo.
        const tallas = tipo.tallas.map((t) => {
          const disponibles = dispMap.get(`${tipo.id}|${t.valor}`) ?? 0;
          const faltan = Math.max(0, t.stock_minimo - disponibles);
          vistas.add(t.valor);
          prendaDisponibles += disponibles;
          prendaFaltan += faltan;
          totalMinimo += t.stock_minimo;
          return {
            talla: t.valor,
            disponibles,
            minimo: t.stock_minimo,
            faltan,
          };
        });

        // Tallas con stock que ya no figuran en el catálogo (mínimo 0).
        for (const g of grupos) {
          if (g.tipo_uniforme_id !== tipo.id || vistas.has(g.talla)) continue;
          const disponibles = g._count._all;
          prendaDisponibles += disponibles;
          tallas.push({ talla: g.talla, disponibles, minimo: 0, faltan: 0 });
        }

        totalDisponibles += prendaDisponibles;
        totalFaltan += prendaFaltan;

        return {
          tipo_uniforme_id: tipo.id,
          nombre: tipo.nombre,
          disponibles: prendaDisponibles,
          faltan: prendaFaltan,
          tallas,
        };
      })
      // Omitimos prendas sin tallas ni stock: no aportan a la vista.
      .filter((p) => p.tallas.length > 0);

    return {
      totales: {
        disponibles: totalDisponibles,
        minimo: totalMinimo,
        faltan: totalFaltan,
      },
      prendas,
    };
  }

  async findOne(id: number, empresaId: number) {
    const item = await this.prisma.itemInventario.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        tipo_uniforme: { select: { id: true, nombre: true, genero: true } },
        proveedor: { select: { id: true, nombre: true } },
        ingreso: {
          select: { id: true, fecha_ingreso: true, numero_documento: true },
        },
        movimientos: {
          // Orden cronológico para leer la trazabilidad de arriba hacia abajo.
          orderBy: { fecha: 'asc' },
          select: {
            id: true,
            tipo_movimiento: true,
            motivo: true,
            fecha: true,
            empleado_id: true,
            usuario: { select: { id: true, nombre_completo: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    // MovimientoInventario.empleado_id es escalar (sin relación); resolvemos los
    // nombres de empleados de los movimientos en una sola consulta.
    const empleadoIds = [
      ...new Set(
        item.movimientos
          .map((m) => m.empleado_id)
          .filter((eid): eid is number => eid !== null),
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

    return {
      ...item,
      movimientos: item.movimientos.map((m) => ({
        id: m.id,
        tipo_movimiento: m.tipo_movimiento,
        motivo: m.motivo,
        fecha: m.fecha,
        usuario: m.usuario,
        empleado:
          m.empleado_id !== null
            ? (empleadoPorId.get(m.empleado_id) ?? null)
            : null,
      })),
    };
  }
}
