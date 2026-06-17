import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateIngresoDto, CreateIngresoFacturaDto } from './dto';
import { parsearFechaISOenPeru } from '../../common/utils/datetime.util';
import {
  derivarPrefijo,
  crearAsignadorCodigos,
} from './helpers/codigo-generator';

/** Línea (prenda + talla + cantidad) que se expande en items serializados. */
interface LineaExpandible {
  tipo_uniforme_id: number;
  talla: string;
  cantidad: number;
  precio_unitario: number;
}

/** Una fila de la comparativa pedido-vs-recibido por prenda + talla. */
export interface ComparativaLinea {
  tipo_uniforme_id: number;
  tipo_nombre: string;
  talla: string;
  /** Cantidad pedida en el requerimiento (consolidado por prenda + talla). */
  pedido: number;
  /** Cantidad que trae la factura (lo realmente recibido). */
  recibido: number;
  /** recibido − pedido. Negativo = falta; positivo = sobra. */
  delta: number;
}

@Injectable()
export class IngresosInventarioService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  /**
   * Registra una compra y EXPANDE cada línea en items serializados con código
   * auto-generado. Todo en una transacción: el ingreso, los N items y sus
   * movimientos de ENTRADA se crean atómicamente.
   *
   * La compra simple CIERRA el requerimiento (FINALIZADO) para evitar compras
   * duplicadas. El flujo de factura (createFactura) NO lo cierra, porque un
   * requerimiento puede recibir varias facturas.
   */
  async create(empresaId: number, usuarioId: number, dto: CreateIngresoDto) {
    await this.validarProveedor(empresaId, dto.proveedor_id);

    if (dto.requerimiento_id) {
      await this.validarRequerimientoAbierto(empresaId, dto.requerimiento_id);
    }

    const tipoPorId = await this.cargarTipos(empresaId, dto.lineas);

    return this.prisma.$transaction(async (tx) => {
      const ingreso = await tx.ingresoInventario.create({
        data: {
          proveedor_id: dto.proveedor_id,
          requerimiento_id: dto.requerimiento_id ?? null,
          fecha_ingreso: parsearFechaISOenPeru(dto.fecha_ingreso),
          numero_documento: dto.numero_documento ?? null,
          observaciones: dto.observaciones ?? null,
          usuario_id: usuarioId,
          empresa_id: empresaId,
        },
      });

      const total = await this.expandirLineasEnStock(
        tx,
        empresaId,
        usuarioId,
        ingreso.id,
        dto.proveedor_id,
        dto.lineas,
        tipoPorId,
      );

      // La compra cierra el requerimiento: pasa a FINALIZADO para que no se
      // pueda volver a generar compra (evita compras duplicadas).
      if (dto.requerimiento_id) {
        await tx.requerimientoUniforme.update({
          where: { id: dto.requerimiento_id },
          data: { estado: 'FINALIZADO' },
        });
      }

      return { ...ingreso, total_items: total };
    });
  }

  /**
   * Digitaliza la factura del proveedor: guarda la cabecera (número, fecha,
   * monto, archivo adjunto), expande las líneas en stock y deja el
   * requerimiento ABIERTO (un requerimiento puede tener varias facturas).
   *
   * La factura es la realidad: NO se bloquea si difiere del pedido. La
   * comparativa pedido-vs-recibido es solo informativa (ver `comparativa`).
   */
  async createFactura(
    empresaId: number,
    usuarioId: number,
    dto: CreateIngresoFacturaDto,
  ) {
    await this.validarProveedor(empresaId, dto.proveedor_id);

    if (dto.requerimiento_id) {
      await this.validarRequerimientoAbierto(empresaId, dto.requerimiento_id);
    }

    const tipoPorId = await this.cargarTipos(empresaId, dto.lineas);

    // Mass assignment: no se confía en el archivo_url del cliente. Se valida
    // que el archivo de la factura pertenezca a esta empresa y se reconstruye
    // la URL canónica. La factura es PRIVADA (se sirve con autenticación).
    let archivoUrl: string | null = null;
    if (dto.archivo_url) {
      const key = await this.uploads.resolverKeyPropia(
        dto.archivo_url,
        empresaId,
      );
      archivoUrl = key ? this.uploads.getFileUrl(key) : null;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ingreso = await tx.ingresoInventario.create({
          data: {
            proveedor_id: dto.proveedor_id,
            requerimiento_id: dto.requerimiento_id ?? null,
            fecha_ingreso: parsearFechaISOenPeru(dto.fecha_factura),
            numero_documento: dto.numero_factura,
            numero_factura: dto.numero_factura,
            fecha_factura: parsearFechaISOenPeru(dto.fecha_factura),
            monto_total:
              dto.monto_total != null
                ? new Prisma.Decimal(dto.monto_total)
                : null,
            archivo_url: archivoUrl,
            archivo_nombre: dto.archivo_nombre ?? null,
            observaciones: dto.observaciones ?? null,
            usuario_id: usuarioId,
            empresa_id: empresaId,
          },
        });

        const total = await this.expandirLineasEnStock(
          tx,
          empresaId,
          usuarioId,
          ingreso.id,
          dto.proveedor_id,
          dto.lineas,
          tipoPorId,
        );

        // El requerimiento NO se finaliza aquí: puede recibir más facturas.

        return { ...ingreso, total_items: total };
      });
    } catch (err) {
      // Violación del índice único (empresa_id, proveedor_id, numero_factura).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta factura ya fue registrada para este proveedor.',
        );
      }
      throw err;
    }
  }

  /**
   * Comparativa pedido-vs-recibido de un requerimiento APROBADO.
   * `pedido` sale del consolidado del requerimiento (detalles por tipo+talla);
   * `recibido` es lo que ya cargaron las facturas/ingresos vinculados.
   * Solo informativa: el delta no bloquea nada.
   */
  async comparativa(
    requerimientoId: number,
    empresaId: number,
  ): Promise<ComparativaLinea[]> {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id: requerimientoId, empresa_id: empresaId },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');

    // Pedido: detalles del requerimiento agrupados por tipo + talla.
    const detalles = await this.prisma.requerimientoUniformeDetalle.findMany({
      where: { requerimiento_id: requerimientoId },
      select: {
        tipo_uniforme_id: true,
        talla: true,
        cantidad: true,
        tipo_uniforme: { select: { nombre: true } },
      },
    });

    // Recibido: items ya creados por las facturas/ingresos de este requerimiento.
    const recibidoGrupos = await this.prisma.itemInventario.groupBy({
      by: ['tipo_uniforme_id', 'talla'],
      where: {
        empresa_id: empresaId,
        ingreso: { requerimiento_id: requerimientoId },
      },
      _count: { _all: true },
    });

    const claveDe = (tipoId: number, talla: string) =>
      `${tipoId}|${talla.trim().toUpperCase()}`;

    const mapa = new Map<string, ComparativaLinea>();
    const obtener = (
      tipoId: number,
      tallaCruda: string,
      tipoNombre: string,
    ): ComparativaLinea => {
      const talla = tallaCruda.trim().toUpperCase();
      const key = claveDe(tipoId, talla);
      let linea = mapa.get(key);
      if (!linea) {
        linea = {
          tipo_uniforme_id: tipoId,
          tipo_nombre: tipoNombre,
          talla,
          pedido: 0,
          recibido: 0,
          delta: 0,
        };
        mapa.set(key, linea);
      }
      return linea;
    };

    for (const d of detalles) {
      const linea = obtener(
        d.tipo_uniforme_id,
        d.talla,
        d.tipo_uniforme.nombre,
      );
      linea.pedido += d.cantidad;
    }

    // Nombres de tipos que aparecen solo en lo recibido (no estaban en el pedido).
    const tipoIdsRecibido = [
      ...new Set(recibidoGrupos.map((g) => g.tipo_uniforme_id)),
    ];
    const nombres = await this.prisma.tipoUniforme.findMany({
      where: { id: { in: tipoIdsRecibido } },
      select: { id: true, nombre: true },
    });
    const nombrePorId = new Map(nombres.map((t) => [t.id, t.nombre]));

    for (const g of recibidoGrupos) {
      const linea = obtener(
        g.tipo_uniforme_id,
        g.talla,
        nombrePorId.get(g.tipo_uniforme_id) ?? `Tipo #${g.tipo_uniforme_id}`,
      );
      linea.recibido += g._count._all;
    }

    return [...mapa.values()]
      .map((l) => ({ ...l, delta: l.recibido - l.pedido }))
      .sort(
        (a, b) =>
          a.tipo_nombre.localeCompare(b.tipo_nombre) ||
          a.talla.localeCompare(b.talla),
      );
  }

  // ── Helpers privados compartidos ──────────────────────────────────────────

  private async validarProveedor(empresaId: number, proveedorId: number) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: proveedorId, empresa_id: empresaId },
      select: { id: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
  }

  /**
   * Valida que el requerimiento exista, sea de la empresa y esté APROBADO
   * (ni en BORRADOR ni FINALIZADO). La compra parte de un cargo autorizado.
   */
  private async validarRequerimientoAbierto(
    empresaId: number,
    requerimientoId: number,
  ) {
    const req = await this.prisma.requerimientoUniforme.findFirst({
      where: { id: requerimientoId, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!req) throw new NotFoundException('Requerimiento no encontrado');
    if (req.estado !== 'APROBADO') {
      throw new BadRequestException(
        req.estado === 'FINALIZADO'
          ? 'Este requerimiento ya está finalizado'
          : 'El requerimiento debe estar aprobado antes de registrar la compra',
      );
    }
  }

  /**
   * Valida y carga los tipos de uniforme de todas las líneas en un único query.
   * Devuelve un mapa id → { nombre, codigo_prefijo } para la generación de códigos.
   */
  private async cargarTipos(
    empresaId: number,
    lineas: LineaExpandible[],
  ): Promise<
    Map<number, { id: number; nombre: string; codigo_prefijo: string | null }>
  > {
    const tipoIds = [...new Set(lineas.map((l) => l.tipo_uniforme_id))];
    const tipos = await this.prisma.tipoUniforme.findMany({
      where: { id: { in: tipoIds }, empresa_id: empresaId },
      select: { id: true, nombre: true, codigo_prefijo: true },
    });
    if (tipos.length !== tipoIds.length) {
      throw new BadRequestException(
        'Una o más líneas referencian un tipo de uniforme inexistente',
      );
    }
    return new Map(tipos.map((t) => [t.id, t]));
  }

  /**
   * Valida en batch que cada talla enviada exista en el catálogo del tipo de
   * uniforme correspondiente. Una sola query carga todas las tallas válidas de
   * los tipos involucrados; luego se cruza contra las líneas en memoria.
   * Lanza BadRequestException si alguna talla no pertenece al catálogo.
   */
  private async validarTallasEnCatalogo(
    tx: Prisma.TransactionClient,
    lineas: LineaExpandible[],
    tipoPorId: Map<
      number,
      { id: number; nombre: string; codigo_prefijo: string | null }
    >,
  ): Promise<void> {
    const tipoIds = [...new Set(lineas.map((l) => l.tipo_uniforme_id))];

    // Una sola query: todos los valores de talla válidos para estos tipos.
    const tallasDelCatalogo = await tx.tallaTipoUniforme.findMany({
      where: { tipo_uniforme_id: { in: tipoIds } },
      select: { tipo_uniforme_id: true, valor: true },
    });

    // Mapa "tipoId|TALLA" -> true para lookup O(1).
    const tallaValida = new Set<string>(
      tallasDelCatalogo.map(
        (t) => `${t.tipo_uniforme_id}|${t.valor.trim().toUpperCase()}`,
      ),
    );

    for (const linea of lineas) {
      const tallaNormalizada = linea.talla.trim().toUpperCase();
      if (!tallaValida.has(`${linea.tipo_uniforme_id}|${tallaNormalizada}`)) {
        const nombreTipo =
          tipoPorId.get(linea.tipo_uniforme_id)?.nombre ??
          `Tipo #${linea.tipo_uniforme_id}`;
        throw new BadRequestException(
          `La talla "${tallaNormalizada}" no está registrada en el catálogo de "${nombreTipo}".`,
        );
      }
    }
  }

  /**
   * Expande las líneas en items serializados con código auto-generado, los
   * inserta en batch y crea sus movimientos de ENTRADA. Valida tallas contra
   * el catálogo antes de crear nada. Devuelve el total de items creados.
   * Debe ejecutarse dentro de una transacción.
   */
  private async expandirLineasEnStock(
    tx: Prisma.TransactionClient,
    empresaId: number,
    usuarioId: number,
    ingresoId: number,
    proveedorId: number,
    lineas: LineaExpandible[],
    tipoPorId: Map<
      number,
      { id: number; nombre: string; codigo_prefijo: string | null }
    >,
  ): Promise<number> {
    // Validar tallas contra el catálogo antes de generar códigos o insertar items.
    await this.validarTallasEnCatalogo(tx, lineas, tipoPorId);

    // El asignador mantiene el correlativo por prefijo en memoria dentro de la
    // transacción, así varias líneas que comparten prefijo no generan códigos
    // duplicados (los items aún no están persistidos entre líneas).
    const asignarCodigos = crearAsignadorCodigos(tx, empresaId);
    const itemsData: Prisma.ItemInventarioCreateManyInput[] = [];
    for (const linea of lineas) {
      const tipo = tipoPorId.get(linea.tipo_uniforme_id);
      const prefijo = tipo.codigo_prefijo?.trim()
        ? tipo.codigo_prefijo.trim().toUpperCase()
        : derivarPrefijo(tipo.nombre);

      const codigos = await asignarCodigos(prefijo, linea.cantidad);

      for (const codigo of codigos) {
        itemsData.push({
          codigo,
          tipo_uniforme_id: linea.tipo_uniforme_id,
          ingreso_id: ingresoId,
          proveedor_id: proveedorId,
          talla: linea.talla.trim().toUpperCase(),
          precio: new Prisma.Decimal(linea.precio_unitario),
          estado: 'DISPONIBLE',
          empresa_id: empresaId,
        });
      }
    }

    // Inserción batch de items recuperando sus IDs (createManyAndReturn,
    // disponible desde Prisma 5.14). Luego un solo createMany de movimientos
    // ENTRADA, uno por item. Dos INSERTs masivos en lugar de ~2N individuales.
    const items = await tx.itemInventario.createManyAndReturn({
      data: itemsData,
      select: { id: true },
    });

    if (items.length > 0) {
      await tx.movimientoInventario.createMany({
        data: items.map((item) => ({
          item_id: item.id,
          tipo_movimiento: 'ENTRADA' as const,
          motivo: `Ingreso por compra #${ingresoId}`,
          usuario_id: usuarioId,
          empresa_id: empresaId,
        })),
      });
    }

    return items.length;
  }

  async findAll(empresaId: number, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.ingresoInventario.findMany({
        where: { empresa_id: empresaId },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre_completo: true } },
          _count: { select: { items: true } },
        },
        orderBy: { fecha_ingreso: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ingresoInventario.count({ where: { empresa_id: empresaId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, empresaId: number) {
    const ingreso = await this.prisma.ingresoInventario.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        proveedor: { select: { id: true, nombre: true, ruc: true } },
        usuario: { select: { id: true, nombre_completo: true } },
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
    if (!ingreso) throw new NotFoundException('Ingreso no encontrado');
    return ingreso;
  }
}
