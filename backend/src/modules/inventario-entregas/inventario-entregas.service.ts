import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, EstadoEmpleado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEntregaDto,
  DevolverItemsDto,
  EntregaMasivaDto,
  EntregaCandidatosQueryDto,
  EntregarTodosDto,
} from './dto';
import {
  parsearFechaISOenPeru,
  sumarDiasPeru,
  toDateOnly,
} from '../../common/utils/datetime.util';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { asignarItemsDisponibles } from './asignacion-stock.helper';

/** Faltante de una línea: lo que se pidió no se pudo cubrir completo con stock. */
export interface FaltanteEntregaMasiva {
  empleado_id: number;
  empleado_nombre: string;
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  solicitado: number;
  entregado: number;
  faltante: number;
}

/** Resultado de la entrega masiva: lo que se entregó y lo que faltó. */
export interface ResultadoEntregaMasiva {
  empleados_con_entrega: number;
  empleados_sin_stock: number;
  total_entregado: number;
  total_faltante: number;
  entrega_ids: number[];
  faltantes: FaltanteEntregaMasiva[];
}

const ESTADOS_BLOQUEADOS = ['CESADO', 'CESE', 'BAJA'];

/**
 * Construye el `Prisma.EmpleadoWhereInput` equivalente al de empleadosCandidatos,
 * para reutilizarlo en el endpoint server-side `entregaTodos`.
 */
function buildCandidatosWhere(
  empresaId: number,
  filtros: EntregarTodosDto['filtros'],
): Prisma.EmpleadoWhereInput {
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

  if (filtros.buscar) {
    const palabras = filtros.buscar.trim().split(/\s+/).filter(Boolean);
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

  if (filtros.solo_nuevos) {
    where.fecha_ingreso = { gte: sumarDiasPeru(new Date(), -30) };
  }

  if (filtros.sede_id) {
    const sedeId = Number(filtros.sede_id);
    where.sede = Number.isInteger(sedeId)
      ? { id: sedeId }
      : { nombre: { contains: filtros.sede_id, mode: 'insensitive' } };
  }

  return where;
}

@Injectable()
export class InventarioEntregasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Entrega uniformes a un empleado. Por cada línea (tipo + talla + cantidad)
   * el sistema auto-asigna items DISPONIBLES, los marca ENTREGADO, los vincula
   * al empleado y a la entrega, y registra un movimiento ENTREGA. Todo atómico.
   * Falla si no hay stock suficiente de alguna línea.
   *
   * Validaciones adicionales respecto a entregarMasiva (mismo criterio):
   * - El tipo_uniforme_id debe pertenecer a la empresa y estar activo.
   * - La talla debe existir en el catálogo TallaTipoUniforme del tipo.
   */
  async crearEntrega(
    empresaId: number,
    usuarioId: number,
    dto: CreateEntregaDto,
  ) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    // No se entregan uniformes a empleados que están saliendo o ya salieron.
    if (ESTADOS_BLOQUEADOS.includes(empleado.estado)) {
      throw new BadRequestException(
        `No se puede entregar uniformes a un empleado en estado ${empleado.estado}`,
      );
    }

    // --- Validación de tipos (igual que entregarMasiva) ---
    const tipoIds = [...new Set(dto.lineas.map((l) => l.tipo_uniforme_id))];
    const tipos = await this.prisma.tipoUniforme.findMany({
      where: { id: { in: tipoIds }, empresa_id: empresaId, activo: true },
      select: { id: true, nombre: true },
    });
    if (tipos.length !== tipoIds.length) {
      throw new BadRequestException(
        'Uno o más tipos de uniforme no existen, no pertenecen a la empresa o están inactivos',
      );
    }
    const nombrePorTipo = new Map(tipos.map((t) => [t.id, t.nombre]));

    // --- Validación de tallas contra catálogo (batch, sin loop) ---
    // Cada línea que tiene una talla debe tenerla en TallaTipoUniforme del tipo.
    const clavesLineas = dto.lineas.map((l) => ({
      tipo_uniforme_id: l.tipo_uniforme_id,
      talla: l.talla.trim().toUpperCase(),
    }));
    await this.validarTallasEnCatalogo(empresaId, clavesLineas, nombrePorTipo);

    return this.prisma.$transaction(async (tx) => {
      const entrega = await tx.entregaUniforme.create({
        data: {
          empleado_id: dto.empleado_id,
          fecha_entrega: parsearFechaISOenPeru(dto.fecha_entrega),
          entregado_por_id: usuarioId,
          observaciones: dto.observaciones ?? null,
          empresa_id: empresaId,
        },
      });

      for (const linea of dto.lineas) {
        const talla = linea.talla.trim().toUpperCase();
        // Verificación de stock previa: la entrega individual exige cubrir la
        // línea completa o falla (contrato distinto al flujo masivo, que reparte
        // lo disponible). La asignación real es el helper compartido sobre `tx`.
        const disponibles = await tx.itemInventario.count({
          where: {
            empresa_id: empresaId,
            tipo_uniforme_id: linea.tipo_uniforme_id,
            talla,
            estado: 'DISPONIBLE',
          },
        });

        if (disponibles < linea.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente de ${nombrePorTipo.get(linea.tipo_uniforme_id) ?? 'tipo'} talla ${talla}: ` +
              `disponibles ${disponibles}, solicitados ${linea.cantidad}`,
          );
        }

        const asignados = await asignarItemsDisponibles(tx, {
          empresaId,
          usuarioId,
          empleadoId: dto.empleado_id,
          entregaId: entrega.id,
          tipoUniformeId: linea.tipo_uniforme_id,
          talla,
          cantidad: linea.cantidad,
        });
        // Si entre el conteo y la asignación el stock cambió (concurrencia) o
        // hay líneas duplicadas del mismo tipo+talla, abortamos toda la entrega.
        if (asignados < linea.cantidad) {
          throw new BadRequestException(
            `No se pudo asignar el stock completo de la talla ${talla} ` +
              `(asignados ${asignados} de ${linea.cantidad}). Reintenta.`,
          );
        }
      }

      return this.findOne(entrega.id, empresaId, tx);
    });
  }

  /**
   * Valida en batch que cada par (tipo_uniforme_id, talla) exista en el catálogo
   * TallaTipoUniforme de la empresa. Hace UNA sola query; no itera con N+1.
   * Lanza BadRequestException con el primer par inválido encontrado.
   */
  private async validarTallasEnCatalogo(
    empresaId: number,
    claves: { tipo_uniforme_id: number; talla: string }[],
    nombrePorTipo: Map<number, string>,
  ): Promise<void> {
    if (claves.length === 0) return;

    const tipoIds = [...new Set(claves.map((c) => c.tipo_uniforme_id))];

    // Carga todas las tallas válidas de los tipos involucrados en una sola query.
    const tallasValidas = await this.prisma.tallaTipoUniforme.findMany({
      where: { tipo_uniforme_id: { in: tipoIds } },
      select: { tipo_uniforme_id: true, valor: true },
    });

    // Mapa: "tipoId|TALLA" -> true, para lookup O(1).
    const setValido = new Set(
      tallasValidas.map(
        (t) => `${t.tipo_uniforme_id}|${t.valor.trim().toUpperCase()}`,
      ),
    );

    for (const clave of claves) {
      const key = `${clave.tipo_uniforme_id}|${clave.talla}`;
      if (!setValido.has(key)) {
        const nombre =
          nombrePorTipo.get(clave.tipo_uniforme_id) ??
          `tipo ${clave.tipo_uniforme_id}`;
        throw new BadRequestException(
          `La talla "${clave.talla}" no es válida para la prenda "${nombre}"`,
        );
      }
    }
  }

  /**
   * Entrega masiva: distribuye dotación a VARIOS empleados en una sola
   * transacción. Por cada empleado crea una entrega y, por cada línea, toma del
   * stock DISPONIBLE los items que alcance (helper compartido), los marca
   * ENTREGADO y registra el movimiento.
   *
   * COMPORTAMIENTO ANTE STOCK INSUFICIENTE (entrega parcial, no all-or-nothing):
   * - Se entrega TODO lo disponible de cada línea; lo que no alcanza se reporta
   *   como faltante (`solicitado`, `entregado`, `faltante`). No se bloquea al
   *   resto de empleados/líneas por una talla puntual sin stock.
   * - Si un empleado no recibe NI UNA prenda, no se le crea entrega vacía y se
   *   reportan todas sus líneas como faltantes.
   * - El reparto es atómico dentro de la transacción: el helper toma items
   *   DISPONIBLE leídos dentro del mismo `tx`, así un item nunca se asigna dos
   *   veces, y el update condicionado (anti-carrera) aborta todo si el stock
   *   cambió por una operación concurrente.
   *
   * Las tallas se validan contra el catálogo TallaTipoUniforme (batch, sin N+1).
   */
  async entregarMasiva(
    empresaId: number,
    usuarioId: number,
    dto: EntregaMasivaDto,
  ): Promise<ResultadoEntregaMasiva> {
    // Dedup de empleados: si llega el mismo empleado dos veces, fusionamos sus
    // líneas para no crearle dos entregas en el mismo lote.
    const empleadoIds = [...new Set(dto.empleados.map((e) => e.empleado_id))];

    const empleados = await this.prisma.empleado.findMany({
      where: { id: { in: empleadoIds }, empresa_id: empresaId },
      select: {
        id: true,
        estado: true,
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
    const bloqueado = empleados.find((e) =>
      ESTADOS_BLOQUEADOS.includes(e.estado),
    );
    if (bloqueado) {
      throw new BadRequestException(
        `No se puede entregar uniformes a un empleado en estado ${bloqueado.estado}`,
      );
    }
    const nombrePorEmpleado = new Map(
      empleados.map((e) => [
        e.id,
        `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
      ]),
    );

    // Aislamiento multi-tenant: todos los tipos deben ser de la empresa y activos.
    const tipoIds = [
      ...new Set(
        dto.empleados.flatMap((e) => e.lineas.map((l) => l.tipo_uniforme_id)),
      ),
    ];
    const tipos = await this.prisma.tipoUniforme.findMany({
      where: { id: { in: tipoIds }, empresa_id: empresaId, activo: true },
      select: { id: true, nombre: true },
    });
    if (tipos.length !== tipoIds.length) {
      throw new BadRequestException(
        'Uno o más tipos de uniforme no existen, no pertenecen a la empresa o están inactivos',
      );
    }
    const nombrePorTipo = new Map(tipos.map((t) => [t.id, t.nombre]));

    // Validación de tallas contra catálogo (batch, sin N+1).
    const clavesLineas = dto.empleados
      .flatMap((e) => e.lineas)
      .map((l) => ({
        tipo_uniforme_id: l.tipo_uniforme_id,
        talla: l.talla.trim().toUpperCase(),
      }));
    await this.validarTallasEnCatalogo(empresaId, clavesLineas, nombrePorTipo);

    const fecha = parsearFechaISOenPeru(dto.fecha_entrega);

    return this.prisma.$transaction(async (tx) => {
      const faltantes: FaltanteEntregaMasiva[] = [];
      const entregaIds: number[] = [];
      let totalEntregado = 0;
      let totalFaltante = 0;
      let empleadosSinStock = 0;

      for (const empleadoId of empleadoIds) {
        // Líneas del empleado (fusionando duplicados del mismo empleado).
        const lineas = dto.empleados
          .filter((e) => e.empleado_id === empleadoId)
          .flatMap((e) => e.lineas);

        // La entrega se crea de forma diferida: solo si al menos una línea
        // logra asignar algún item. Evita entregas vacías cuando no hay stock.
        let entregaId: number | null = null;
        let entregadoEmpleado = 0;

        for (const linea of lineas) {
          const talla = linea.talla.trim().toUpperCase();
          if (entregaId === null) {
            const entrega = await tx.entregaUniforme.create({
              data: {
                empleado_id: empleadoId,
                fecha_entrega: fecha,
                entregado_por_id: usuarioId,
                observaciones: dto.observaciones ?? null,
                empresa_id: empresaId,
              },
            });
            entregaId = entrega.id;
          }

          const asignados = await asignarItemsDisponibles(tx, {
            empresaId,
            usuarioId,
            empleadoId,
            entregaId,
            tipoUniformeId: linea.tipo_uniforme_id,
            talla,
            cantidad: linea.cantidad,
          });

          entregadoEmpleado += asignados;
          totalEntregado += asignados;

          if (asignados < linea.cantidad) {
            const faltante = linea.cantidad - asignados;
            totalFaltante += faltante;
            faltantes.push({
              empleado_id: empleadoId,
              empleado_nombre: nombrePorEmpleado.get(empleadoId) ?? '',
              tipo_uniforme_id: linea.tipo_uniforme_id,
              tipo_nombre: nombrePorTipo.get(linea.tipo_uniforme_id) ?? '',
              talla,
              solicitado: linea.cantidad,
              entregado: asignados,
              faltante,
            });
          }
        }

        if (entregaId !== null && entregadoEmpleado > 0) {
          entregaIds.push(entregaId);
        } else {
          // No se asignó nada: si llegamos a crear la cabecera (todas las líneas
          // sin stock), la borramos para no dejar entregas vacías.
          if (entregaId !== null) {
            await tx.entregaUniforme.delete({ where: { id: entregaId } });
          }
          empleadosSinStock++;
        }
      }

      return {
        empleados_con_entrega: entregaIds.length,
        empleados_sin_stock: empleadosSinStock,
        total_entregado: totalEntregado,
        total_faltante: totalFaltante,
        entrega_ids: entregaIds,
        faltantes,
      };
    });
  }

  /**
   * Endpoint server-side: resuelve TODOS los empleados que matcheen los filtros
   * (mismo criterio que empleadosCandidatos, sin paginación), construye las
   * líneas de dotación a partir de las tallas guardadas (EmpleadoTalla) y la
   * cantidad estándar de cada tipo activo, y delega en entregarMasiva.
   *
   * Si `dotacion_completa` es true, se incluyen todos los tipos activos del
   * empleado que tengan talla guardada. Empleados sin ninguna talla guardada
   * son omitidos (no generan entrega vacía).
   */
  async entregaTodos(
    empresaId: number,
    usuarioId: number,
    dto: EntregarTodosDto,
  ): Promise<ResultadoEntregaMasiva> {
    const where = buildCandidatosWhere(empresaId, dto.filtros);

    const [empleados, tiposActivos] = await Promise.all([
      this.prisma.empleado.findMany({
        where,
        select: { id: true },
        orderBy: [{ apellido_paterno: 'asc' }, { apellido_materno: 'asc' }],
      }),
      this.prisma.tipoUniforme.findMany({
        where: { empresa_id: empresaId, activo: true },
        select: { id: true, nombre: true, cantidad_estandar: true },
      }),
    ]);

    if (empleados.length === 0) {
      return {
        empleados_con_entrega: 0,
        empleados_sin_stock: 0,
        total_entregado: 0,
        total_faltante: 0,
        entrega_ids: [],
        faltantes: [],
      };
    }

    const empleadoIds = empleados.map((e) => e.id);
    const tiposActivosIds = new Set(tiposActivos.map((t) => t.id));
    const cantidadPorTipo = new Map(
      tiposActivos.map((t) => [t.id, t.cantidad_estandar]),
    );

    // Tallas guardadas de todos los empleados del lote en una sola query.
    const tallasGuardadas = await this.prisma.empleadoTalla.findMany({
      where: { empresa_id: empresaId, empleado_id: { in: empleadoIds } },
      select: { empleado_id: true, tipo_uniforme_id: true, talla: true },
    });

    // Construye el arreglo de empleados con sus líneas.
    // Solo se incluyen prendas con tipo activo y talla guardada no vacía.
    const empleadoMap = new Map<
      number,
      {
        empleado_id: number;
        lineas: { tipo_uniforme_id: number; talla: string; cantidad: number }[];
      }
    >();

    for (const t of tallasGuardadas) {
      if (t.empleado_id === null) continue;
      if (!tiposActivosIds.has(t.tipo_uniforme_id)) continue;
      if (!t.talla.trim()) continue;

      let entry = empleadoMap.get(t.empleado_id);
      if (!entry) {
        entry = { empleado_id: t.empleado_id, lineas: [] };
        empleadoMap.set(t.empleado_id, entry);
      }
      entry.lineas.push({
        tipo_uniforme_id: t.tipo_uniforme_id,
        talla: t.talla.trim().toUpperCase(),
        cantidad: cantidadPorTipo.get(t.tipo_uniforme_id) ?? 1,
      });
    }

    const empleadosConLineas = [...empleadoMap.values()];

    if (empleadosConLineas.length === 0) {
      // Ningún empleado del lote tiene tallas guardadas; nada que entregar.
      return {
        empleados_con_entrega: 0,
        empleados_sin_stock: 0,
        total_entregado: 0,
        total_faltante: 0,
        entrega_ids: [],
        faltantes: [],
      };
    }

    // Reutiliza entregarMasiva con el DTO construido internamente.
    const masivaDto: EntregaMasivaDto = {
      fecha_entrega: dto.fecha,
      observaciones: dto.observaciones,
      empleados: empleadosConLineas,
    };

    return this.entregarMasiva(empresaId, usuarioId, masivaDto);
  }

  /**
   * Stock DISPONIBLE actual por prenda + talla, en una sola agregación.
   * Devuelve una lista `{ tipo_uniforme_id, talla, disponibles }` que el panel
   * de entrega masiva usa para validar que el reparto no exceda el stock real.
   */
  async disponibilidadStock(empresaId: number) {
    const grupos = await this.prisma.itemInventario.groupBy({
      by: ['tipo_uniforme_id', 'talla'],
      where: { empresa_id: empresaId, estado: 'DISPONIBLE' },
      _count: { _all: true },
    });
    return grupos.map((g) => ({
      tipo_uniforme_id: g.tipo_uniforme_id,
      talla: g.talla,
      disponibles: g._count._all,
    }));
  }

  /**
   * Lista paginada de empleados candidatos para la entrega masiva. Resuelve
   * las tallas guardadas de cada empleado (EmpleadoTalla) y los tipos activos
   * con su cantidad estándar, sin N+1. A diferencia del candidato de
   * requerimientos, aquí NO se excluye a nadie (la entrega no es por lote único)
   * y la disponibilidad de stock se consulta aparte (`disponibilidadStock`).
   */
  async empleadosCandidatos(
    empresaId: number,
    query: EntregaCandidatosQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Umbral "nuevo ingreso": últimos 30 días.
    const umbralNuevos = sumarDiasPeru(new Date(), -30);

    // Vigentes: se excluyen solo los estados terminales (CESADO/CESE/BAJA).
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

    const tallasGuardadas =
      empleadoIds.length > 0
        ? await this.prisma.empleadoTalla.findMany({
            where: { empresa_id: empresaId, empleado_id: { in: empleadoIds } },
            select: { empleado_id: true, tipo_uniforme_id: true, talla: true },
          })
        : [];

    // empleado -> (tipo -> talla guardada)
    const tallaPorEmpleado = new Map<number, Map<number, string>>();
    for (const t of tallasGuardadas) {
      let mapaTipo = tallaPorEmpleado.get(t.empleado_id);
      if (!mapaTipo) {
        mapaTipo = new Map<number, string>();
        tallaPorEmpleado.set(t.empleado_id, mapaTipo);
      }
      mapaTipo.set(t.tipo_uniforme_id, t.talla);
    }

    const data = empleados.map((e) => {
      const tallasEmp = tallaPorEmpleado.get(e.id);
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
        tallas: tiposActivos.map((t) => ({
          tipo_uniforme_id: t.id,
          tipo_nombre: t.nombre,
          talla: tallasEmp?.get(t.id) ?? '',
          cantidad_estandar: t.cantidad_estandar,
        })),
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
   * Devuelve items entregados. Según la condición en que vuelven:
   * - BUENA (default): regresan al stock como DISPONIBLE + USADO (reutilizables),
   *   con movimiento DEVOLUCION.
   * - DANADA: se dan de BAJA (salen del inventario), con movimiento BAJA.
   *   Adicionalmente se registra un SolicitudBajaItem con estado APROBADA
   *   para que la devolución quede trazada en el listado de bajas.
   * En ambos casos se desvinculan del empleado y de la entrega.
   */
  async devolver(empresaId: number, usuarioId: number, dto: DevolverItemsDto) {
    const items = await this.prisma.itemInventario.findMany({
      where: { id: { in: dto.item_ids }, empresa_id: empresaId },
      select: { id: true, estado: true, empleado_id: true },
    });

    if (items.length !== dto.item_ids.length) {
      throw new BadRequestException('Uno o más items no existen');
    }
    const noEntregados = items.filter((i) => i.estado !== 'ENTREGADO');
    if (noEntregados.length > 0) {
      throw new BadRequestException(
        'Solo se pueden devolver items en estado ENTREGADO',
      );
    }

    const danada = dto.condicion === 'DANADA';
    // De quién venía cada item, para registrarlo en el Kardex ANTES de desvincular.
    const empleadoPorItem = new Map(items.map((i) => [i.id, i.empleado_id]));
    const itemIds = items.map((i) => i.id);
    const motivo =
      dto.motivo ??
      (danada ? 'Devuelto dañado — baja' : 'Devolución al stock (usado)');
    const fechaResolucion = ahoraPeru().toJSDate();

    return this.prisma.$transaction(async (tx) => {
      // Update condicionado al estado ENTREGADO: si otra operación cambió el
      // estado en paralelo, count no coincide y se aborta (anti-carrera).
      const upd = await tx.itemInventario.updateMany({
        where: {
          id: { in: itemIds },
          empresa_id: empresaId,
          estado: 'ENTREGADO',
        },
        data: {
          // Una prenda devuelta siempre fue usada. Si está dañada sale de
          // circulación (BAJA); si está buena vuelve a estar DISPONIBLE.
          estado: danada ? 'BAJA' : 'DISPONIBLE',
          condicion: 'USADO',
          empleado_id: null,
          entrega_id: null,
        },
      });
      if (upd.count !== itemIds.length) {
        throw new BadRequestException(
          'El estado de uno o más items cambió; reintenta la devolución',
        );
      }

      await tx.movimientoInventario.createMany({
        data: itemIds.map((itemId) => ({
          item_id: itemId,
          tipo_movimiento: danada ? ('BAJA' as const) : ('DEVOLUCION' as const),
          empleado_id: empleadoPorItem.get(itemId) ?? null,
          motivo,
          usuario_id: usuarioId,
          empresa_id: empresaId,
        })),
      });

      // Si la prenda vuelve dañada, registrar en SolicitudBajaItem para que
      // aparezca en el historial/auditoría de bajas del módulo correspondiente.
      if (danada) {
        await tx.solicitudBajaItem.createMany({
          data: itemIds.map((itemId) => ({
            item_id: itemId,
            motivo: motivo,
            estado: 'APROBADA' as const,
            solicitado_por_id: usuarioId,
            resuelto_por_id: usuarioId,
            fecha_resolucion: fechaResolucion,
            empresa_id: empresaId,
          })),
        });
      }

      return { devueltos: itemIds.length, baja: danada };
    });
  }

  async findAll(empresaId: number, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.entregaUniforme.findMany({
        where: { empresa_id: empresaId },
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
          entregado_por: { select: { id: true, nombre_completo: true } },
          _count: { select: { items: true } },
        },
        orderBy: { fecha_entrega: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.entregaUniforme.count({ where: { empresa_id: empresaId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(
    id: number,
    empresaId: number,
    client: Pick<PrismaService, 'entregaUniforme'> = this.prisma,
  ) {
    const entrega = await client.entregaUniforme.findFirst({
      where: { id, empresa_id: empresaId },
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
        entregado_por: { select: { id: true, nombre_completo: true } },
        items: {
          select: {
            id: true,
            codigo: true,
            talla: true,
            precio: true,
            estado: true,
            tipo_uniforme: { select: { id: true, nombre: true } },
          },
          orderBy: { codigo: 'asc' },
        },
      },
    });
    if (!entrega) throw new NotFoundException('Entrega no encontrada');
    return entrega;
  }

  /**
   * Items que el empleado tiene actualmente sin devolver (estado ENTREGADO).
   * Usado para la alerta en el flujo de cese.
   */
  async itemsPendientesEmpleado(empleadoId: number, empresaId: number) {
    const items = await this.prisma.itemInventario.findMany({
      where: {
        empresa_id: empresaId,
        empleado_id: empleadoId,
        estado: 'ENTREGADO',
      },
      select: {
        id: true,
        codigo: true,
        talla: true,
        precio: true,
        tipo_uniforme: { select: { id: true, nombre: true } },
      },
      orderBy: { codigo: 'asc' },
    });
    return { total: items.length, items };
  }
}
