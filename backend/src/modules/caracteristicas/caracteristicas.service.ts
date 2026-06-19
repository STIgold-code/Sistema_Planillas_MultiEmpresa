import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCaracteristicaDto } from './dto/create-caracteristica.dto';
import { UpdateCaracteristicaDto } from './dto/update-caracteristica.dto';

interface FindAllOptions {
  buscar?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class CaracteristicasService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: number, dto: CreateCaracteristicaDto) {
    await this.ensureNombreDisponible(empresaId, dto.nombre);
    return this.prisma.caracteristica.create({
      data: { ...dto, empresa_id: empresaId },
    });
  }

  async findAll(empresaId: number, options: FindAllOptions = {}) {
    const { buscar, activo, page = 1, limit = 50 } = options;

    const where: Prisma.CaracteristicaWhereInput = { empresa_id: empresaId };
    if (activo !== undefined) where.activo = activo;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { descripcion: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.caracteristica.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { tipos_uniforme: true } },
        },
      }),
      this.prisma.caracteristica.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Listado liviano para combos/multi-select (solo activas). */
  async findForSelect(empresaId: number) {
    return this.prisma.caracteristica.findMany({
      where: { empresa_id: empresaId, activo: true },
      select: { id: true, nombre: true, descripcion: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const caracteristica = await this.prisma.caracteristica.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        tipos_uniforme: {
          select: { id: true, nombre: true },
          orderBy: { nombre: 'asc' },
        },
      },
    });
    if (!caracteristica) {
      throw new NotFoundException(`Característica con ID ${id} no encontrada`);
    }
    return caracteristica;
  }

  async update(id: number, empresaId: number, dto: UpdateCaracteristicaDto) {
    await this.findOne(id, empresaId);
    if (dto.nombre) {
      await this.ensureNombreDisponible(empresaId, dto.nombre, id);
    }
    return this.prisma.caracteristica.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActivo(id: number, empresaId: number) {
    const caracteristica = await this.findOne(id, empresaId);
    return this.prisma.caracteristica.update({
      where: { id },
      data: { activo: !caracteristica.activo },
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    // El delete físico está permitido: la relación M:N usa pivote implícito con
    // ON DELETE CASCADE, así que simplemente se quitan las asociaciones a los
    // tipos de uniforme — no se borra ningún tipo. El requerimiento PDF lee la
    // lista de características en tiempo real, así que dejar de aparecer es el
    // comportamiento esperado tras eliminar.
    await this.prisma.caracteristica.delete({ where: { id } });
    return { message: 'Característica eliminada correctamente' };
  }

  private async ensureNombreDisponible(
    empresaId: number,
    nombre: string,
    excluirId?: number,
  ) {
    const existe = await this.prisma.caracteristica.findFirst({
      where: {
        nombre,
        empresa_id: empresaId,
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe una característica con el nombre "${nombre}"`,
      );
    }
  }
}
