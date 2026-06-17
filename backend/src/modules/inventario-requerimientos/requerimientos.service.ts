import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, EstadoEmpleado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRequerimientoDto,
  GuardarEmpleadoDto,
  EmpleadosLoteDto,
  EmpleadosCandidatosQueryDto,
  GuardarItemsDto,
} from './dto';
import {
  parsearFechaISOenPeru,
  sumarDiasPeru,
  toDateOnly,
} from '../../common/utils/datetime.util';

interface LineaPersistible {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
}

export interface ConsolidadoCaracteristica {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface ConsolidadoLinea {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  cantidad: number;
  /**
   * Características asociadas al tipo de uniforme (M:N). Es el mismo array
   * para todas las tallas de la misma prenda; lo replicamos por línea para
   * simplicidad del consumidor (PDF/UI deciden si lo muestran una vez).
   */
  caracteristicas: ConsolidadoCaracteristica[];
}

export interface PlanificacionLinea {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  requerido: number;
  disponible: number;
  faltante: number;
}

@Injectable()
export class RequerimientosService {
  constructor(private prisma: PrismaService) {}

  async create(
    empresaId: number,
    usuarioId: number,
    dto: CreateRequerimientoDto,
  ) {
    // Aislamiento multi-tenant: el proveedor (si viene) debe ser de la empresa.
    if (dto.proveedor_id) {
      const prov = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedor_id, empresa_id: empresaId },
        select: { id: true },
      });
      if (!prov) throw new BadRequestException('Proveedor no encontrado');
    }
    return this.prisma.requerimientoUniforme.create({
      data: {
        nombre: dto.nombre,
        fecha: parsearFechaISOenPeru(dto.fecha),
        usuario_id: usuarioId,
        proveedor_id: dto.proveedor_id ?? null,
        empresa_id: empresaId,
      },
    });
  }

  async findAll(
    empresaId: number,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { empresa_id: empresaId };
    const include = {
      usuario: { select: { id: true, nombre_completo: true } },
      proveedor: { select: { id: true, nombre: true } },
      _count: { select: { detalles: true } },
    };

    const [data, total] = await Promise.all([
      this.prisma.requerimientoUniforme.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.requerimientoUniforme.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async remove(id: number, empresaId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'BORRADOR') {
      throw new ConflictException(
        'Solo se pueden eliminar requerimientos en borrador.',
      );
    }
    // Los detalles se borran en cascada (onDelete: Cascade en el schema).
    await this.prisma.requerimientoUniforme.delete({ where: { id } });
    return { ok: true };
  }

  async findOne(id: number, empresaId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        usuario: { select: { id: true, nombre_completo: true } },
        proveedor: { select: { id: true, nombre: true } },
        detalles: {
          include: {
            empleado: {
              select: {
                id: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
                numero_documento: true,
              },
            },
            tipo_uniforme: { select: { id: true, nombre: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');

    // aprobado_por_id es escalar (sin relación): resolvemos el nombre aparte
    // para el sello del cargo.
    let aprobado_por: { id: number; nombre_completo: string } | null = null;
    if (req.aprobado_por_id) {
      aprobado_por = await this.prisma.usuario.findUnique({
        where: { id: req.aprobado_por_id },
        select: { id: true, nombre_completo: true },
      });
    }
    return { ...req, aprobado_por };
  }

  /**
   * Consolidado por tipo + talla: cuántas unidades comprar en total.
   * Usa groupBy en BD (una query) + un único findMany para resolver nombres,
   * en lugar de cargar todos los detalles en memoria y agrupar en JS.
   * El shape de salida es idéntico al anterior para no romper export y planificacion.
   */
  async consolidado(
    id: number,
    empresaId: number,
  ): Promise<ConsolidadoLinea[]> {
    // Valida pertenencia multi-tenant antes de continuar.
    await this.findOne(id, empresaId);

    // RequerimientoUniformeDetalle no tiene empresa_id: el filtro por
    // requerimiento_id es suficiente porque findOne ya validó el tenant.
    const grupos = await this.prisma.requerimientoUniformeDetalle.groupBy({
      by: ['tipo_uniforme_id', 'talla'],
      where: { requerimiento_id: id },
      _sum: { cantidad: true },
    });

    if (grupos.length === 0) return [];

    const tipoIds = [...new Set(grupos.map((g) => g.tipo_uniforme_id))];
    const tipos = await this.prisma.tipoUniforme.findMany({
      where: { id: { in: tipoIds } },
      select: {
        id: true,
        nombre: true,
        caracteristicas: {
          select: { id: true, nombre: true, descripcion: true },
          orderBy: { nombre: 'asc' },
        },
      },
    });
    const tipoPorId = new Map(tipos.map((t) => [t.id, t]));

    return grupos
      .map((g) => {
        const tipo = tipoPorId.get(g.tipo_uniforme_id);
        return {
          tipo_uniforme_id: g.tipo_uniforme_id,
          tipo_nombre: tipo?.nombre ?? '',
          talla: g.talla,
          cantidad: g._sum.cantidad ?? 0,
          caracteristicas: tipo?.caracteristicas ?? [],
        };
      })
      .sort(
        (a, b) =>
          a.tipo_nombre.localeCompare(b.tipo_nombre) ||
          a.talla.localeCompare(b.talla),
      );
  }

  /**
   * Planificación de compra: cruza lo requerido (consolidado del requerimiento)
   * contra el stock DISPONIBLE actual por tipo + talla, y calcula el faltante.
   * El stock se obtiene con un único groupBy, no N consultas por talla.
   */
  async planificacion(
    id: number,
    empresaId: number,
  ): Promise<PlanificacionLinea[]> {
    const requerido = await this.consolidado(id, empresaId);

    // Stock disponible por (tipo_uniforme_id, talla) en una sola agregación.
    const stock = await this.prisma.itemInventario.groupBy({
      by: ['tipo_uniforme_id', 'talla'],
      where: { empresa_id: empresaId, estado: 'DISPONIBLE' },
      _count: { _all: true },
    });
    const disponiblePorClave = new Map(
      stock.map((s) => [`${s.tipo_uniforme_id}|${s.talla}`, s._count._all]),
    );

    return requerido
      .map((linea) => {
        const disponible =
          disponiblePorClave.get(`${linea.tipo_uniforme_id}|${linea.talla}`) ??
          0;
        return {
          tipo_uniforme_id: linea.tipo_uniforme_id,
          tipo_nombre: linea.tipo_nombre,
          talla: linea.talla,
          requerido: linea.cantidad,
          disponible,
          faltante: Math.max(0, linea.cantidad - disponible),
        };
      })
      .sort(
        (a, b) =>
          a.tipo_nombre.localeCompare(b.tipo_nombre) ||
          a.talla.localeCompare(b.talla),
      );
  }

  /**
   * Devuelve las prendas (tipos activos) con la talla guardada del empleado
   * pre-llenada y la cantidad estándar. Para armar la pantalla por empleado.
   */
  async tallasEmpleado(empleadoId: number, empresaId: number) {
    const [tipos, tallasGuardadas] = await Promise.all([
      this.prisma.tipoUniforme.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true, cantidad_estandar: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.empleadoTalla.findMany({
        where: { empleado_id: empleadoId, empresa_id: empresaId },
        select: { tipo_uniforme_id: true, talla: true },
      }),
    ]);
    const tallaPorTipo = new Map(
      tallasGuardadas.map((t) => [t.tipo_uniforme_id, t.talla]),
    );
    return tipos.map((t) => ({
      tipo_uniforme_id: t.id,
      tipo_nombre: t.nombre,
      cantidad_estandar: t.cantidad_estandar,
      talla: tallaPorTipo.get(t.id) ?? '',
    }));
  }

  /**
   * Guarda las líneas de un empleado en el requerimiento. Reemplaza las líneas
   * previas de ese empleado y persiste las tallas en EmpleadoTalla para
   * reutilizarlas en futuros requerimientos (decisión 2A).
   */
  async guardarEmpleado(
    id: number,
    empresaId: number,
    dto: GuardarEmpleadoDto,
  ) {
    const req = await this.findOne(id, empresaId);
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede modificar un requerimiento en borrador',
      );
    }

    // Aislamiento multi-tenant: el empleado debe pertenecer a la empresa.
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      select: { id: true },
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    const lineasValidas = dto.lineas.filter(
      (l) => l.talla.trim() && l.cantidad >= 1,
    );

    // Aislamiento multi-tenant: todos los tipos deben pertenecer a la empresa.
    await this.validarTiposEmpresa(
      lineasValidas.map((l) => l.tipo_uniforme_id),
      empresaId,
    );

    return this.prisma.$transaction(async (tx) => {
      const lineas = await this.persistirEmpleado(
        tx,
        id,
        empresaId,
        dto.empleado_id,
        lineasValidas,
      );
      return { ok: true, lineas };
    });
  }

  /**
   * Carga masiva: guarda las líneas de varios empleados en una sola
   * transacción. Reutiliza la misma lógica de persistencia que guardarEmpleado
   * (reemplazo de detalles + upsert de EmpleadoTalla por empleado).
   */
  async guardarEmpleadosLote(
    id: number,
    empresaId: number,
    dto: EmpleadosLoteDto,
  ) {
    const req = await this.findOne(id, empresaId);
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede modificar un requerimiento en borrador',
      );
    }

    // Aislamiento multi-tenant: todos los empleados deben pertenecer a la empresa.
    const empleadoIds = [...new Set(dto.empleados.map((e) => e.empleado_id))];
    const empleadosValidos = await this.prisma.empleado.count({
      where: { id: { in: empleadoIds }, empresa_id: empresaId },
    });
    if (empleadosValidos !== empleadoIds.length) {
      throw new BadRequestException(
        'Uno o más empleados no pertenecen a la empresa',
      );
    }

    // Aislamiento multi-tenant: todos los tipos (de todas las líneas) deben pertenecer a la empresa.
    const tipoIds = dto.empleados.flatMap((e) =>
      e.lineas.map((l) => l.tipo_uniforme_id),
    );
    await this.validarTiposEmpresa(tipoIds, empresaId);

    return this.prisma.$transaction(async (tx) => {
      const empleados = dto.empleados.map((emp) => ({
        empleadoId: emp.empleado_id,
        lineas: emp.lineas.filter((l) => l.talla.trim() && l.cantidad >= 1),
      }));
      const res = await this.persistirLote(tx, id, empresaId, empleados);
      return { ok: true, empleados: dto.empleados.length, lineas: res.lineas };
    });
  }

  /**
   * Valida que todos los tipos de uniforme pertenezcan a la empresa y estén
   * ACTIVOS. Lanza BadRequest si alguno no pertenece o está desactivado.
   */
  /**
   * Guarda los ítems sueltos (sin empleado) de un requerimiento = lista de
   * compra. Reemplaza SOLO las líneas sin empleado; no toca las cargadas por
   * el asistente de empleados. Solo en estado BORRADOR.
   */
  async guardarItems(id: number, empresaId: number, dto: GuardarItemsDto) {
    const req = await this.findOne(id, empresaId);
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede modificar un requerimiento en borrador',
      );
    }

    const lineasValidas = dto.lineas.filter(
      (l) => l.talla.trim() && l.cantidad >= 1,
    );
    await this.validarTiposEmpresa(
      lineasValidas.map((l) => l.tipo_uniforme_id),
      empresaId,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.requerimientoUniformeDetalle.deleteMany({
        where: { requerimiento_id: id, empleado_id: null },
      });
      if (lineasValidas.length > 0) {
        await tx.requerimientoUniformeDetalle.createMany({
          data: lineasValidas.map((l) => ({
            requerimiento_id: id,
            empleado_id: null,
            tipo_uniforme_id: l.tipo_uniforme_id,
            talla: l.talla.trim().toUpperCase(),
            cantidad: l.cantidad,
          })),
        });
      }
      return { lineas: lineasValidas.length };
    });
  }

  private async validarTiposEmpresa(
    tipoUniformeIds: number[],
    empresaId: number,
  ) {
    const tipoIds = [...new Set(tipoUniformeIds)];
    if (tipoIds.length === 0) return;
    const tiposValidos = await this.prisma.tipoUniforme.count({
      where: { id: { in: tipoIds }, empresa_id: empresaId, activo: true },
    });
    if (tiposValidos !== tipoIds.length) {
      throw new BadRequestException(
        'Uno o más tipos de uniforme no existen, no pertenecen a la empresa o están inactivos',
      );
    }
  }

  /**
   * Persiste las líneas de VARIOS empleados en LOTE dentro de una transacción.
   * Reemplaza los detalles previos y hace upsert de las tallas (EmpleadoTalla)
   * para reuso. Usa ~3 queries en total (deleteMany + createMany + un único
   * INSERT ... ON CONFLICT) sin importar cuántos empleados, para evitar
   * transacciones larguísimas y timeouts a escala (ej. "Agregar todos").
   * Devuelve cuántos empleados quedaron con líneas y el total de líneas.
   */
  private async persistirLote(
    tx: Prisma.TransactionClient,
    requerimientoId: number,
    empresaId: number,
    empleados: { empleadoId: number; lineas: LineaPersistible[] }[],
  ): Promise<{ empleados: number; lineas: number }> {
    const empleadoIds = empleados.map((e) => e.empleadoId);
    if (empleadoIds.length > 0) {
      await tx.requerimientoUniformeDetalle.deleteMany({
        where: {
          requerimiento_id: requerimientoId,
          empleado_id: { in: empleadoIds },
        },
      });
    }

    const detalles = empleados.flatMap((e) =>
      e.lineas.map((l) => ({
        requerimiento_id: requerimientoId,
        empleado_id: e.empleadoId,
        tipo_uniforme_id: l.tipo_uniforme_id,
        talla: l.talla.trim().toUpperCase(),
        cantidad: l.cantidad,
      })),
    );
    if (detalles.length === 0) return { empleados: 0, lineas: 0 };

    await tx.requerimientoUniformeDetalle.createMany({ data: detalles });

    // Upsert de tallas en un solo INSERT ... ON CONFLICT. Deduplicamos por
    // (empleado, tipo) para no violar el ON CONFLICT con la misma fila dos veces.
    const tallaUnica = new Map<
      string,
      { emp: number; tipo: number; talla: string }
    >();
    for (const d of detalles) {
      tallaUnica.set(`${d.empleado_id}-${d.tipo_uniforme_id}`, {
        emp: d.empleado_id,
        tipo: d.tipo_uniforme_id,
        talla: d.talla,
      });
    }
    const valores = Prisma.join(
      [...tallaUnica.values()].map(
        (t) =>
          Prisma.sql`(${t.emp}, ${t.tipo}, ${t.talla}, ${empresaId}, NOW())`,
      ),
    );
    await tx.$executeRaw`
      INSERT INTO empleados_tallas (empleado_id, tipo_uniforme_id, talla, empresa_id, updated_at)
      VALUES ${valores}
      ON CONFLICT (empleado_id, tipo_uniforme_id)
      DO UPDATE SET talla = EXCLUDED.talla, updated_at = NOW()
    `;

    const empleadosConLineas = new Set(detalles.map((d) => d.empleado_id)).size;
    return { empleados: empleadosConLineas, lineas: detalles.length };
  }

  /** Carga individual: persiste un solo empleado (delega en el lote). */
  private async persistirEmpleado(
    tx: Prisma.TransactionClient,
    requerimientoId: number,
    empresaId: number,
    empleadoId: number,
    lineasValidas: LineaPersistible[],
  ): Promise<number> {
    const res = await this.persistirLote(tx, requerimientoId, empresaId, [
      { empleadoId, lineas: lineasValidas },
    ]);
    return res.lineas;
  }

  /**
   * Lista paginada de empleados candidatos para la carga masiva del
   * requerimiento. Excluye a los que ya tienen detalle en ESTE requerimiento.
   * Resuelve tallas guardadas, tipos activos y lo recibido (ENTREGADO) en
   * consultas agregadas para evitar N+1.
   */
  async empleadosCandidatos(
    id: number,
    empresaId: number,
    query: EmpleadosCandidatosQueryDto,
  ) {
    await this.findOne(id, empresaId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Umbral "nuevo ingreso": últimos 30 días.
    const umbralNuevos = sumarDiasPeru(new Date(), -30);

    // Empleados que ya tienen detalle en este requerimiento (se excluyen).
    const yaEnReq = await this.prisma.requerimientoUniformeDetalle.findMany({
      where: { requerimiento_id: id },
      select: { empleado_id: true },
      distinct: ['empleado_id'],
    });
    // Filtra null: las líneas de ítems sueltos no tienen empleado.
    const excluidos = yaEnReq
      .map((d) => d.empleado_id)
      .filter((eid): eid is number => eid !== null);

    // Vigentes: se excluyen solo los estados terminales (CESADO/CESE/BAJA).
    // Vacaciones y suspendidos siguen vinculados y pueden requerir dotación.
    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      estado: {
        in: [
          EstadoEmpleado.ACTIVO,
          EstadoEmpleado.VACACIONES,
          EstadoEmpleado.SUSPENDIDO,
        ],
      },
    };
    if (excluidos.length > 0) where.id = { notIn: excluidos };
    if (query.buscar) {
      // Búsqueda por palabras: cada palabra debe aparecer en algún campo
      // (documento, nombres, apellidos o cargo). Así "perez juan" o "juan perez"
      // encuentran al empleado sin importar el orden.
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

    const [total, empleados, tiposActivos] = await Promise.all([
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
      this.prisma.tipoUniforme.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true, cantidad_estandar: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    const empleadoIds = empleados.map((e) => e.id);

    // Consultas agregadas (sin N+1) solo para los empleados de la página.
    const [tallasGuardadas, recibidos] =
      empleadoIds.length > 0
        ? await Promise.all([
            this.prisma.empleadoTalla.findMany({
              where: {
                empresa_id: empresaId,
                empleado_id: { in: empleadoIds },
              },
              select: {
                empleado_id: true,
                tipo_uniforme_id: true,
                talla: true,
              },
            }),
            this.prisma.itemInventario.findMany({
              where: {
                empresa_id: empresaId,
                estado: 'ENTREGADO',
                empleado_id: { in: empleadoIds },
              },
              select: {
                empleado_id: true,
                tipo_uniforme_id: true,
                entrega: { select: { fecha_entrega: true } },
              },
            }),
          ])
        : [[], []];

    // tallas guardadas: empleado -> (tipo -> talla)
    const tallaPorEmpleado = new Map<number, Map<number, string>>();
    for (const t of tallasGuardadas) {
      if (t.empleado_id === null) continue;
      let mapaTipo = tallaPorEmpleado.get(t.empleado_id);
      if (!mapaTipo) {
        mapaTipo = new Map<number, string>();
        tallaPorEmpleado.set(t.empleado_id, mapaTipo);
      }
      mapaTipo.set(t.tipo_uniforme_id, t.talla);
    }

    // recibido: empleado -> (tipo -> fecha de entrega más reciente)
    const recibidoPorEmpleado = new Map<number, Map<number, string | null>>();
    for (const r of recibidos) {
      if (r.empleado_id === null) continue;
      let mapaTipo = recibidoPorEmpleado.get(r.empleado_id);
      if (!mapaTipo) {
        mapaTipo = new Map<number, string | null>();
        recibidoPorEmpleado.set(r.empleado_id, mapaTipo);
      }
      const fecha = r.entrega ? toDateOnly(r.entrega.fecha_entrega) : null;
      const previa = mapaTipo.get(r.tipo_uniforme_id);
      // Conserva la fecha más reciente por tipo.
      if (previa === undefined || (fecha && (!previa || fecha > previa))) {
        mapaTipo.set(r.tipo_uniforme_id, fecha);
      }
    }

    const data = empleados.map((e) => {
      const tallasEmp = tallaPorEmpleado.get(e.id);
      const recibidoEmp = recibidoPorEmpleado.get(e.id);
      const fechaIngreso = e.fecha_ingreso;
      const esNuevo =
        fechaIngreso != null &&
        fechaIngreso.getTime() >= umbralNuevos.getTime();

      return {
        id: e.id,
        nombres: e.nombres,
        apellido_paterno: e.apellido_paterno,
        apellido_materno: e.apellido_materno,
        numero_documento: e.numero_documento,
        estado: e.estado,
        sede: e.sede?.nombre ?? null,
        cargo: e.cargo?.nombre ?? null,
        fecha_ingreso: toDateOnly(fechaIngreso),
        es_nuevo: esNuevo,
        tallas: tiposActivos.map((t) => ({
          tipo_uniforme_id: t.id,
          tipo_nombre: t.nombre,
          talla: tallasEmp?.get(t.id) ?? '',
          cantidad_estandar: t.cantidad_estandar,
        })),
        recibido: recibidoEmp
          ? [...recibidoEmp.entries()].map(([tipoId, fecha]) => ({
              tipo_uniforme_id: tipoId,
              fecha,
            }))
          : [],
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
   * Agrega en lote, al requerimiento, la dotación estándar de TODOS los
   * empleados que matchean el filtro (sede/búsqueda/solo nuevos) y que aún no
   * están en el requerimiento. Por cada empleado solicita las prendas de las
   * que ya tiene talla guardada (su dotación), con la cantidad estándar del
   * tipo. Pensado para renovar a muchos empleados en un paso, sin cargarlos
   * uno a uno. (Solicita, no asigna: la entrega es otro paso.)
   */
  async agregarTodos(
    id: number,
    empresaId: number,
    query: EmpleadosCandidatosQueryDto,
  ) {
    const req = await this.findOne(id, empresaId);
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede modificar un requerimiento en borrador',
      );
    }

    const yaEnReq = await this.prisma.requerimientoUniformeDetalle.findMany({
      where: { requerimiento_id: id },
      select: { empleado_id: true },
      distinct: ['empleado_id'],
    });
    // Filtra null: las líneas de ítems sueltos no tienen empleado.
    const excluidos = yaEnReq
      .map((d) => d.empleado_id)
      .filter((eid): eid is number => eid !== null);

    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      estado: {
        in: [
          EstadoEmpleado.ACTIVO,
          EstadoEmpleado.VACACIONES,
          EstadoEmpleado.SUSPENDIDO,
        ],
      },
    };
    if (excluidos.length > 0) where.id = { notIn: excluidos };
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
      where.fecha_ingreso = { gte: sumarDiasPeru(new Date(), -30) };
    }
    if (query.sede) {
      const sedeId = Number(query.sede);
      where.sede = Number.isInteger(sedeId)
        ? { id: sedeId }
        : { nombre: { contains: query.sede, mode: 'insensitive' } };
    }

    const [empleados, tiposActivos] = await Promise.all([
      this.prisma.empleado.findMany({ where, select: { id: true } }),
      this.prisma.tipoUniforme.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, cantidad_estandar: true },
      }),
    ]);
    if (empleados.length === 0) return { empleados: 0, lineas: 0 };

    const tiposActivosIds = new Set(tiposActivos.map((t) => t.id));
    const cantidadPorTipo = new Map(
      tiposActivos.map((t) => [t.id, t.cantidad_estandar]),
    );

    const empleadoIds = empleados.map((e) => e.id);
    const tallasGuardadas = await this.prisma.empleadoTalla.findMany({
      where: { empresa_id: empresaId, empleado_id: { in: empleadoIds } },
      select: { empleado_id: true, tipo_uniforme_id: true, talla: true },
    });

    // empleado -> líneas (solo prendas con talla guardada y tipo activo).
    const lineasPorEmpleado = new Map<number, LineaPersistible[]>();
    for (const t of tallasGuardadas) {
      if (t.empleado_id === null) continue;
      if (!tiposActivosIds.has(t.tipo_uniforme_id)) continue;
      if (!t.talla.trim()) continue;
      const arr = lineasPorEmpleado.get(t.empleado_id) ?? [];
      arr.push({
        tipo_uniforme_id: t.tipo_uniforme_id,
        talla: t.talla,
        cantidad: cantidadPorTipo.get(t.tipo_uniforme_id) ?? 1,
      });
      lineasPorEmpleado.set(t.empleado_id, arr);
    }

    const empleadosLote = [...lineasPorEmpleado.entries()].map(
      ([empleadoId, lineas]) => ({ empleadoId, lineas }),
    );
    return this.prisma.$transaction((tx) =>
      this.persistirLote(tx, id, empresaId, empleadosLote),
    );
  }

  /**
   * Devuelve los requerimientos en estado BORRADOR de la empresa,
   * para mostrarse en el dashboard como "pendientes de aprobación".
   * Scoped por empresa_id; incluye creador y conteo de líneas.
   */
  async pendientesAprobacion(empresaId: number) {
    return this.prisma.requerimientoUniforme.findMany({
      where: { empresa_id: empresaId, estado: 'BORRADOR' },
      select: {
        id: true,
        nombre: true,
        fecha: true,
        created_at: true,
        usuario: { select: { id: true, nombre_completo: true } },
        _count: { select: { detalles: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * El admin aprueba el requerimiento: BORRADOR → APROBADO. Registra quién y
   * cuándo. Recién aprobado, el cargo (PDF) lleva sello y el operario va a
   * comprar; se habilita "Generar compra" y se bloquea la edición.
   */
  async aprobar(id: number, empresaId: number, usuarioId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      select: {
        id: true,
        estado: true,
        proveedor_id: true,
        _count: { select: { detalles: true } },
      },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede aprobar un requerimiento en borrador',
      );
    }
    if (req._count.detalles === 0) {
      throw new BadRequestException(
        'No se puede aprobar un requerimiento sin empleados cargados',
      );
    }
    // El cargo aprobado se dirige a un proveedor: es obligatorio asignarlo
    // antes de aprobar (el PDF del cargo lleva el nombre del proveedor).
    if (!req.proveedor_id) {
      throw new BadRequestException(
        'Asigna un proveedor antes de aprobar el requerimiento',
      );
    }
    return this.prisma.requerimientoUniforme.update({
      where: { id },
      data: {
        estado: 'APROBADO',
        aprobado_por_id: usuarioId,
        fecha_aprobacion: new Date(),
      },
    });
  }

  /**
   * Asigna o cambia el proveedor de un requerimiento en BORRADOR. El proveedor
   * debe pertenecer a la empresa. El cargo (PDF) que se envía al proveedor lleva
   * su nombre, por eso debe estar asignado antes de aprobar.
   */
  async asignarProveedor(id: number, empresaId: number, proveedorId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se puede cambiar el proveedor de un requerimiento en borrador',
      );
    }
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: proveedorId, empresa_id: empresaId },
      select: { id: true },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return this.prisma.requerimientoUniforme.update({
      where: { id },
      data: { proveedor_id: proveedorId },
      include: {
        usuario: { select: { id: true, nombre_completo: true } },
        proveedor: { select: { id: true, nombre: true } },
        _count: { select: { detalles: true } },
      },
    });
  }

  /** Devuelve un requerimiento aprobado a BORRADOR para corregirlo. */
  async rechazar(id: number, empresaId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'APROBADO') {
      throw new BadRequestException(
        'Solo se puede devolver a borrador un requerimiento aprobado',
      );
    }
    return this.prisma.requerimientoUniforme.update({
      where: { id },
      data: {
        estado: 'BORRADOR',
        aprobado_por_id: null,
        fecha_aprobacion: null,
      },
    });
  }

  /** Cierra un requerimiento aprobado sin registrar compra (ej. ya hay stock). */
  async finalizar(id: number, empresaId: number) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'APROBADO') {
      throw new BadRequestException(
        'Solo se puede finalizar un requerimiento aprobado',
      );
    }
    return this.prisma.requerimientoUniforme.update({
      where: { id },
      data: { estado: 'FINALIZADO' },
    });
  }
}
