import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBajaDto, RechazarBajaDto } from './dto';
import { ahoraPeru } from '../../common/utils/datetime.util';

@Injectable()
export class InventarioBajasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valida que la prenda exista, sea de la empresa y esté DISPONIBLE (solo se
   * dan de baja por esta vía las prendas del almacén; las entregadas se manejan
   * con devolución/descuento), y que no tenga ya una solicitud de baja
   * PENDIENTE.
   */
  private async validarItemParaBaja(itemId: number, empresaId: number) {
    const item = await this.prisma.itemInventario.findFirst({
      where: { id: itemId, empresa_id: empresaId },
      select: { id: true, estado: true },
    });
    if (!item) throw new NotFoundException('Prenda no encontrada');
    if (item.estado === 'BAJA') {
      throw new BadRequestException('La prenda ya está dada de baja');
    }
    if (item.estado === 'ENTREGADO') {
      throw new BadRequestException(
        'La prenda está entregada; su baja se gestiona con la devolución o el descuento',
      );
    }
    const pendiente = await this.prisma.solicitudBajaItem.findFirst({
      where: { item_id: itemId, estado: 'PENDIENTE', empresa_id: empresaId },
      select: { id: true },
    });
    if (pendiente) {
      throw new BadRequestException(
        'La prenda ya tiene una solicitud de baja pendiente',
      );
    }
  }

  /** Operario: crea la solicitud PENDIENTE; la prenda sigue DISPONIBLE. */
  async solicitar(empresaId: number, usuarioId: number, dto: CreateBajaDto) {
    await this.validarItemParaBaja(dto.item_id, empresaId);
    return this.prisma.solicitudBajaItem.create({
      data: {
        item_id: dto.item_id,
        motivo: dto.motivo,
        solicitado_por_id: usuarioId,
        empresa_id: empresaId,
      },
      include: this.defaultInclude(),
    });
  }

  /** Admin: baja directa. La solicitud nace APROBADA y la prenda pasa a BAJA. */
  async bajaDirecta(empresaId: number, usuarioId: number, dto: CreateBajaDto) {
    await this.validarItemParaBaja(dto.item_id, empresaId);
    return this.prisma.$transaction(async (tx) => {
      // Update condicionado al estado DISPONIBLE (anti-carrera).
      const baja = await tx.itemInventario.updateMany({
        where: { id: dto.item_id, empresa_id: empresaId, estado: 'DISPONIBLE' },
        data: { estado: 'BAJA' },
      });
      if (baja.count !== 1) {
        throw new BadRequestException(
          'La prenda cambió de estado; reintenta la baja',
        );
      }
      await tx.movimientoInventario.create({
        data: {
          item_id: dto.item_id,
          tipo_movimiento: 'BAJA',
          motivo: dto.motivo,
          usuario_id: usuarioId,
          empresa_id: empresaId,
        },
      });
      return tx.solicitudBajaItem.create({
        data: {
          item_id: dto.item_id,
          motivo: dto.motivo,
          estado: 'APROBADA',
          solicitado_por_id: usuarioId,
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
          empresa_id: empresaId,
        },
        include: this.defaultInclude(),
      });
    });
  }

  /** Admin: aprueba una solicitud pendiente; la prenda pasa a BAJA. */
  async aprobar(id: number, empresaId: number, usuarioId: number) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes pendientes',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const baja = await tx.itemInventario.updateMany({
        where: {
          id: solicitud.item_id,
          empresa_id: empresaId,
          estado: 'DISPONIBLE',
        },
        data: { estado: 'BAJA' },
      });
      if (baja.count !== 1) {
        throw new BadRequestException(
          'La prenda ya no está disponible; pudo haberse entregado o dado de baja',
        );
      }
      await tx.movimientoInventario.create({
        data: {
          item_id: solicitud.item_id,
          tipo_movimiento: 'BAJA',
          motivo: solicitud.motivo,
          usuario_id: usuarioId,
          empresa_id: empresaId,
        },
      });
      return tx.solicitudBajaItem.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
        },
        include: this.defaultInclude(),
      });
    });
  }

  /** Admin: rechaza una solicitud pendiente; la prenda sigue DISPONIBLE. */
  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: RechazarBajaDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }
    return this.prisma.solicitudBajaItem.update({
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

  async findAll(empresaId: number, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.solicitudBajaItem.findMany({
        where: { empresa_id: empresaId },
        include: this.defaultInclude(),
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudBajaItem.count({ where: { empresa_id: empresaId } }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudBajaItem.findFirst({
      where: { id, empresa_id: empresaId },
      include: this.defaultInclude(),
    });
    if (!solicitud)
      throw new NotFoundException('Solicitud de baja no encontrada');
    return solicitud;
  }

  /** Solicitudes pendientes (para la card del dashboard). */
  async findPendientes(empresaId: number) {
    return this.prisma.solicitudBajaItem.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: this.defaultInclude(),
      orderBy: { created_at: 'asc' },
    });
  }

  private defaultInclude() {
    return {
      solicitado_por: { select: { id: true, nombre_completo: true } },
      resuelto_por: { select: { id: true, nombre_completo: true } },
      item: {
        select: {
          id: true,
          codigo: true,
          talla: true,
          estado: true,
          precio: true,
          tipo_uniforme: { select: { id: true, nombre: true } },
        },
      },
    };
  }
}
