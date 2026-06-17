import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDescuentoDto,
  AprobarDescuentoDto,
  RechazarDescuentoDto,
  DescuentoMasivaDto,
  DescuentoCandidatosQueryDto,
  SolicitarTodosDescuentoDto,
} from './dto';
import {
  ahoraPeru,
  sumarDiasPeru,
  toDateOnly,
} from '../../common/utils/datetime.util';

/** Un empleado al que NO se le creó solicitud y por qué (descuento masivo). */
export interface OmitidoDescuentoMasivo {
  empleado_id: number;
  empleado_nombre: string;
  motivo: string;
}

/** Resultado del descuento masivo: cuántas solicitudes se crearon y omitidos. */
export interface ResultadoDescuentoMasivo {
  creadas: number;
  solicitud_ids: number[];
  total_items: number;
  omitidos: OmitidoDescuentoMasivo[];
}

@Injectable()
export class InventarioDescuentosService {
  constructor(private prisma: PrismaService) {}

  /**
   * RRHH crea una solicitud de descuento por uniformes no devueltos.
   * Los items deben estar ENTREGADOS y pertenecer al empleado. Se guarda un
   * snapshot del precio de cada item como referencia para el admin; el monto
   * a descontar lo define el admin al aprobar.
   */
  async create(empresaId: number, usuarioId: number, dto: CreateDescuentoDto) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      select: { id: true },
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    const items = await this.prisma.itemInventario.findMany({
      where: { id: { in: dto.item_ids }, empresa_id: empresaId },
      select: { id: true, estado: true, empleado_id: true, precio: true },
    });

    if (items.length !== dto.item_ids.length) {
      throw new BadRequestException('Uno o más items no existen');
    }
    const invalidos = items.filter(
      (i) => i.estado !== 'ENTREGADO' || i.empleado_id !== dto.empleado_id,
    );
    if (invalidos.length > 0) {
      throw new BadRequestException(
        'Todos los items deben estar ENTREGADOS y pertenecer al empleado',
      );
    }

    // Evita doble descuento: rechaza items que ya estén en una solicitud pendiente.
    const enSolicitudPendiente =
      await this.prisma.solicitudDescuentoUniformeItem.findMany({
        where: {
          item_id: { in: dto.item_ids },
          solicitud: { estado: 'PENDIENTE', empresa_id: empresaId },
        },
        select: { item_id: true },
      });
    if (enSolicitudPendiente.length > 0) {
      throw new BadRequestException(
        'Uno o más items ya tienen una solicitud de descuento pendiente',
      );
    }

    return this.prisma.solicitudDescuentoUniforme.create({
      data: {
        empleado_id: dto.empleado_id,
        motivo: dto.motivo,
        solicitado_por_id: usuarioId,
        empresa_id: empresaId,
        items: {
          create: items.map((i) => ({
            item_id: i.id,
            precio_referencia: i.precio,
          })),
        },
      },
      include: this.defaultInclude(),
    });
  }

  /**
   * Solicita descuentos a VARIOS empleados de una vez, en una sola transacción.
   *
   * A diferencia de la entrega/requerimiento, en descuentos NO existe "dotación
   * estándar": los items a descontar son exactamente los que cada empleado tiene
   * ENTREGADOS sin devolver y que aún no están en una solicitud de descuento
   * PENDIENTE. Por cada empleado con items elegibles se crea una
   * SolicitudDescuentoUniforme con ese conjunto.
   *
   * COMPORTAMIENTO ANTE EMPLEADO SIN ITEMS:
   * - Si un empleado no tiene items ENTREGADOS no-devueltos elegibles, NO se le
   *   crea solicitud (no se crean solicitudes vacías) y se reporta en `omitidos`
   *   con el motivo ("Sin items entregados para descontar").
   *
   * El monto a descontar lo define el admin al aprobar (no se toca aquí).
   */
  async crearMasiva(
    empresaId: number,
    usuarioId: number,
    dto: DescuentoMasivaDto,
  ): Promise<ResultadoDescuentoMasivo> {
    // Dedup: si llega el mismo empleado dos veces, se procesa una sola vez.
    const empleadoIds = [...new Set(dto.empleado_ids)];

    const empleados = await this.prisma.empleado.findMany({
      where: { id: { in: empleadoIds }, empresa_id: empresaId },
      select: {
        id: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
      },
    });
    if (empleados.length !== empleadoIds.length) {
      throw new BadRequestException(
        'Uno o más empleados no pertenecen a la empresa',
      );
    }
    const nombrePorEmpleado = new Map(
      empleados.map((e) => [
        e.id,
        `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
      ]),
    );

    return this.prisma.$transaction(async (tx) => {
      const omitidos: OmitidoDescuentoMasivo[] = [];
      const solicitudIds: number[] = [];
      let totalItems = 0;

      for (const empleadoId of empleadoIds) {
        // Items que el empleado tiene sin devolver (ENTREGADO) y que NO están ya
        // en una solicitud de descuento PENDIENTE (esos serían doble descuento).
        const items = await tx.itemInventario.findMany({
          where: {
            empresa_id: empresaId,
            empleado_id: empleadoId,
            estado: 'ENTREGADO',
            descuento_items: {
              none: { solicitud: { estado: 'PENDIENTE' } },
            },
          },
          select: { id: true, precio: true },
        });

        if (items.length === 0) {
          omitidos.push({
            empleado_id: empleadoId,
            empleado_nombre: nombrePorEmpleado.get(empleadoId) ?? '',
            motivo: 'Sin items entregados para descontar',
          });
          continue;
        }

        const solicitud = await tx.solicitudDescuentoUniforme.create({
          data: {
            empleado_id: empleadoId,
            motivo: dto.motivo,
            solicitado_por_id: usuarioId,
            empresa_id: empresaId,
            items: {
              create: items.map((i) => ({
                item_id: i.id,
                precio_referencia: i.precio,
              })),
            },
          },
          select: { id: true },
        });

        solicitudIds.push(solicitud.id);
        totalItems += items.length;
      }

      return {
        creadas: solicitudIds.length,
        solicitud_ids: solicitudIds,
        total_items: totalItems,
        omitidos,
      };
    });
  }

  /**
   * Lista paginada de empleados candidatos para el descuento masivo, con el
   * conteo de items ENTREGADOS no devueltos que aún NO están en una solicitud de
   * descuento PENDIENTE (los "descontables"). Resuelve el conteo por empleado en
   * una sola agregación (sin N+1).
   */
  async empleadosCandidatos(
    empresaId: number,
    query: DescuentoCandidatosQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Umbral "nuevo ingreso": últimos 30 días.
    const umbralNuevos = sumarDiasPeru(new Date(), -30);

    // Vigentes + estados terminales: en descuentos interesan también los CESADOS
    // (típicamente son quienes no devolvieron el uniforme al salir).
    const where: Prisma.EmpleadoWhereInput = { empresa_id: empresaId };
    if (query.buscar) {
      const palabras = query.buscar.trim().split(/\s+/).filter(Boolean);
      if (palabras.length > 0) {
        where.AND = palabras.map((palabra) => ({
          OR: [
            { numero_documento: { contains: palabra, mode: 'insensitive' } },
            { nombres: { contains: palabra, mode: 'insensitive' } },
            { apellido_paterno: { contains: palabra, mode: 'insensitive' } },
            { apellido_materno: { contains: palabra, mode: 'insensitive' } },
            { cargo: { nombre: { contains: palabra, mode: 'insensitive' } } },
          ],
        }));
      }
    }
    if (query.solo_nuevos) {
      where.fecha_ingreso = { gte: umbralNuevos };
    }
    if (query.sede) {
      const sedeId = Number(query.sede);
      where.sede = Number.isInteger(sedeId)
        ? { id: sedeId }
        : { nombre: { contains: query.sede, mode: 'insensitive' } };
    }

    const [total, empleados] = await Promise.all([
      this.prisma.empleado.count({ where }),
      this.prisma.empleado.findMany({
        where,
        select: {
          id: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          numero_documento: true,
          estado: true,
          fecha_ingreso: true,
          sede: { select: { nombre: true } },
          cargo: { select: { nombre: true } },
        },
        orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const empleadoIds = empleados.map((e) => e.id);

    // Conteo de items descontables por empleado en una sola agregación: items
    // ENTREGADOS que no están en ninguna solicitud de descuento PENDIENTE.
    const grupos =
      empleadoIds.length > 0
        ? await this.prisma.itemInventario.groupBy({
            by: ['empleado_id'],
            where: {
              empresa_id: empresaId,
              empleado_id: { in: empleadoIds },
              estado: 'ENTREGADO',
              descuento_items: {
                none: { solicitud: { estado: 'PENDIENTE' } },
              },
            },
            _count: { _all: true },
          })
        : [];

    const descontablesPorEmpleado = new Map<number, number>();
    for (const g of grupos) {
      if (g.empleado_id != null) {
        descontablesPorEmpleado.set(g.empleado_id, g._count._all);
      }
    }

    const data = empleados.map((e) => {
      const esNuevo =
        e.fecha_ingreso != null &&
        e.fecha_ingreso.getTime() >= umbralNuevos.getTime();
      return {
        id: e.id,
        nombres: e.nombres,
        apellido_paterno: e.apellido_paterno,
        apellido_materno: e.apellido_materno,
        numero_documento: e.numero_documento,
        estado: e.estado,
        sede: e.sede?.nombre ?? null,
        cargo: e.cargo?.nombre ?? null,
        fecha_ingreso: toDateOnly(e.fecha_ingreso),
        es_nuevo: esNuevo,
        items_descontables: descontablesPorEmpleado.get(e.id) ?? 0,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  /**
   * Endpoint server-side: resuelve TODOS los empleados con items descontables
   * que matcheen los filtros opcionales y crea las solicitudes en una transacción.
   * Evita que el frontend tenga que paginar candidatos y enviar empleado_ids.
   *
   * Filtros soportados: buscar (texto libre), sede_id (int), solo_nuevos (bool).
   * Devuelve { creadas, total_items, omitidos }.
   */
  async solicitarTodos(
    empresaId: number,
    usuarioId: number,
    dto: SolicitarTodosDescuentoDto,
  ): Promise<Omit<ResultadoDescuentoMasivo, 'solicitud_ids'>> {
    const f = dto.filtros ?? {};
    const umbralNuevos = sumarDiasPeru(new Date(), -30);

    // Construir where de empleados con la misma lógica del endpoint candidatos.
    const where: Prisma.EmpleadoWhereInput = { empresa_id: empresaId };

    if (f.buscar) {
      const palabras = f.buscar.trim().split(/\s+/).filter(Boolean);
      if (palabras.length > 0) {
        where.AND = palabras.map((palabra) => ({
          OR: [
            { numero_documento: { contains: palabra, mode: 'insensitive' } },
            { nombres: { contains: palabra, mode: 'insensitive' } },
            { apellido_paterno: { contains: palabra, mode: 'insensitive' } },
            { apellido_materno: { contains: palabra, mode: 'insensitive' } },
            { cargo: { nombre: { contains: palabra, mode: 'insensitive' } } },
          ],
        }));
      }
    }
    if (f.solo_nuevos) {
      where.fecha_ingreso = { gte: umbralNuevos };
    }
    if (f.sede_id != null) {
      where.sede = { id: f.sede_id };
    }

    // Cargar todos los empleados que matcheen (sin paginación: es un proceso batch).
    const empleados = await this.prisma.empleado.findMany({
      where,
      select: {
        id: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
      },
      orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }],
    });

    if (empleados.length === 0) {
      return { creadas: 0, total_items: 0, omitidos: [] };
    }

    const empleadoIds = empleados.map((e) => e.id);
    const nombrePorEmpleado = new Map(
      empleados.map((e) => [
        e.id,
        `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
      ]),
    );

    return this.prisma.$transaction(async (tx) => {
      const omitidos: OmitidoDescuentoMasivo[] = [];
      let creadas = 0;
      let totalItems = 0;

      for (const empleadoId of empleadoIds) {
        const items = await tx.itemInventario.findMany({
          where: {
            empresa_id: empresaId,
            empleado_id: empleadoId,
            estado: 'ENTREGADO',
            descuento_items: {
              none: { solicitud: { estado: 'PENDIENTE' } },
            },
          },
          select: { id: true, precio: true },
        });

        if (items.length === 0) {
          omitidos.push({
            empleado_id: empleadoId,
            empleado_nombre: nombrePorEmpleado.get(empleadoId) ?? '',
            motivo: 'Sin items entregados para descontar',
          });
          continue;
        }

        await tx.solicitudDescuentoUniforme.create({
          data: {
            empleado_id: empleadoId,
            motivo: dto.motivo,
            solicitado_por_id: usuarioId,
            empresa_id: empresaId,
            items: {
              create: items.map((i) => ({
                item_id: i.id,
                precio_referencia: i.precio,
              })),
            },
          },
          select: { id: true },
        });

        creadas += 1;
        totalItems += items.length;
      }

      return { creadas, total_items: totalItems, omitidos };
    });
  }

  async findAll(empresaId: number, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.solicitudDescuentoUniforme.findMany({
        where: { empresa_id: empresaId },
        include: this.defaultInclude(),
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudDescuentoUniforme.count({
        where: { empresa_id: empresaId },
      }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudDescuentoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      include: this.defaultInclude(),
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return solicitud;
  }

  async findPendientes(empresaId: number) {
    return this.prisma.solicitudDescuentoUniforme.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: this.defaultInclude(),
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * El admin aprueba definiendo el monto a descontar por cada item. Los items
   * pasan a BAJA (el empleado se los quedó) con un movimiento que registra que
   * no fueron devueltos. Se calcula el monto total. No toca planilla: solo
   * deja el descuento registrado para que RRHH lo gestione en la liquidación.
   */
  async aprobar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: AprobarDescuentoDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes pendientes',
      );
    }

    const itemIdsSolicitud = new Set(solicitud.items.map((i) => i.item_id));
    for (const m of dto.montos) {
      if (!itemIdsSolicitud.has(m.item_id)) {
        throw new BadRequestException(
          `El item ${m.item_id} no pertenece a esta solicitud`,
        );
      }
    }
    const montoPorItem = new Map(
      dto.montos.map((m) => [m.item_id, m.monto_descuento]),
    );
    // Exigir monto para TODOS los items: si falta alguno, no se puede dar de
    // baja "en 0" silenciosamente (el empleado se quedó la prenda).
    const sinMonto = solicitud.items.filter(
      (i) => !montoPorItem.has(i.item_id),
    );
    if (sinMonto.length > 0) {
      throw new BadRequestException(
        'Debe indicar el monto de descuento de todos los items de la solicitud',
      );
    }

    // Tope: el monto a descontar no puede superar el precio de referencia del item.
    const precioRefPorItem = new Map(
      solicitud.items.map((i) => [
        i.item_id,
        new Prisma.Decimal(i.precio_referencia),
      ]),
    );
    for (const m of dto.montos) {
      const precioRef = precioRefPorItem.get(m.item_id);
      if (precioRef === undefined) continue; // ya validado arriba
      const montoDecimal = new Prisma.Decimal(m.monto_descuento);
      if (montoDecimal.greaterThan(precioRef)) {
        throw new BadRequestException(
          `El monto a descontar (S/ ${montoDecimal.toFixed(2)}) no puede superar el precio de referencia de la prenda (S/ ${precioRef.toFixed(2)}).`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Revalida dentro de la transacción: los items deben seguir ENTREGADOS.
      // Protege contra una segunda solicitud sobre items ya dados de baja.
      const itemIds = solicitud.items.map((i) => i.item_id);
      const itemsActuales = await tx.itemInventario.findMany({
        where: { id: { in: itemIds }, empresa_id: empresaId },
        select: { id: true, estado: true },
      });
      if (itemsActuales.some((i) => i.estado !== 'ENTREGADO')) {
        throw new BadRequestException(
          'Uno o más items ya no están ENTREGADOS; el descuento pudo haberse procesado en otra solicitud',
        );
      }

      let total = new Prisma.Decimal(0);

      for (const detalle of solicitud.items) {
        const monto = montoPorItem.get(detalle.item_id) ?? 0;
        total = total.add(new Prisma.Decimal(monto));

        await tx.solicitudDescuentoUniformeItem.update({
          where: { id: detalle.id },
          data: { monto_descuento: new Prisma.Decimal(monto) },
        });

        // El item pasa a BAJA: el empleado se lo quedó (no devuelto). Update
        // condicionado al estado ENTREGADO y empresa_id (anti-carrera + defensa
        // en profundidad: si cambió de estado o empresa, no baja).
        const baja = await tx.itemInventario.updateMany({
          where: {
            id: detalle.item_id,
            empresa_id: empresaId,
            estado: 'ENTREGADO',
          },
          data: { estado: 'BAJA' },
        });
        if (baja.count !== 1) {
          throw new BadRequestException(
            `El item ${detalle.item_id} cambió de estado; reintenta la aprobación`,
          );
        }
        await tx.movimientoInventario.create({
          data: {
            item_id: detalle.item_id,
            tipo_movimiento: 'BAJA',
            empleado_id: solicitud.empleado_id,
            motivo: `No devuelto - descuento aprobado (solicitud #${id})`,
            usuario_id: usuarioId,
            empresa_id: empresaId,
          },
        });
      }

      return tx.solicitudDescuentoUniforme.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          monto_total: total,
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
          observaciones_admin: dto.observaciones_admin,
        },
        include: this.defaultInclude(),
      });
    });
  }

  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: RechazarDescuentoDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }
    return this.prisma.solicitudDescuentoUniforme.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        resuelto_por_id: usuarioId,
        fecha_resolucion: ahoraPeru().toJSDate(),
        observaciones_admin: dto.observaciones_admin,
      },
      include: this.defaultInclude(),
    });
  }

  private defaultInclude() {
    return {
      empleado: {
        select: {
          id: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          numero_documento: true,
        },
      },
      solicitado_por: { select: { id: true, nombre_completo: true } },
      resuelto_por: { select: { id: true, nombre_completo: true } },
      items: {
        select: {
          id: true,
          item_id: true,
          precio_referencia: true,
          monto_descuento: true,
          item: {
            select: {
              id: true,
              codigo: true,
              talla: true,
              estado: true,
              tipo_uniforme: { select: { id: true, nombre: true } },
            },
          },
        },
      },
    };
  }
}
