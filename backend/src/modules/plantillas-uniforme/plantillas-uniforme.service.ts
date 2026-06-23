import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlantillaUniformeDto } from './dto/plantilla-uniforme.dto';

@Injectable()
export class PlantillasUniformeService {
  constructor(private prisma: PrismaService) {}

  private readonly includeItems = {
    items: {
      select: {
        tipo_uniforme_id: true,
        cantidad: true,
        tipo_uniforme: { select: { nombre: true, genero: true, activo: true } },
      },
      orderBy: { tipo_uniforme: { nombre: 'asc' as const } },
    },
  };

  /** Valida que los tipos referenciados pertenezcan a la empresa y estén activos. */
  private async validarTipos(tipoIds: number[], empresaId: number) {
    const unicos = [...new Set(tipoIds)];
    const ok = await this.prisma.tipoUniforme.count({
      where: { id: { in: unicos }, empresa_id: empresaId, activo: true },
    });
    if (ok !== unicos.length) {
      throw new BadRequestException(
        'Uno o más artículos no existen, no pertenecen a la empresa o están inactivos',
      );
    }
  }

  async findAll(empresaId: number) {
    return this.prisma.plantillaUniforme.findMany({
      where: { empresa_id: empresaId, activo: true },
      include: this.includeItems,
      orderBy: [{ predeterminada: 'desc' }, { nombre: 'asc' }],
    });
  }

  async findOne(id: number, empresaId: number) {
    const plantilla = await this.prisma.plantillaUniforme.findFirst({
      where: { id, empresa_id: empresaId },
      include: this.includeItems,
    });
    if (!plantilla) throw new NotFoundException('Plantilla no encontrada');
    return plantilla;
  }

  async create(empresaId: number, dto: PlantillaUniformeDto) {
    await this.validarTipos(
      dto.items.map((i) => i.tipo_uniforme_id),
      empresaId,
    );
    return this.prisma.$transaction(async (tx) => {
      // Solo una predeterminada por empresa.
      if (dto.predeterminada) {
        await tx.plantillaUniforme.updateMany({
          where: { empresa_id: empresaId, predeterminada: true },
          data: { predeterminada: false },
        });
      }
      return tx.plantillaUniforme.create({
        data: {
          nombre: dto.nombre.trim(),
          predeterminada: dto.predeterminada ?? false,
          empresa_id: empresaId,
          items: {
            create: dto.items.map((i) => ({
              tipo_uniforme_id: i.tipo_uniforme_id,
              cantidad: i.cantidad,
            })),
          },
        },
        include: this.includeItems,
      });
    });
  }

  async update(id: number, empresaId: number, dto: PlantillaUniformeDto) {
    await this.findOne(id, empresaId);
    await this.validarTipos(
      dto.items.map((i) => i.tipo_uniforme_id),
      empresaId,
    );
    return this.prisma.$transaction(async (tx) => {
      if (dto.predeterminada) {
        await tx.plantillaUniforme.updateMany({
          where: {
            empresa_id: empresaId,
            predeterminada: true,
            id: { not: id },
          },
          data: { predeterminada: false },
        });
      }
      // Reemplaza los items (más simple y predecible que diffear).
      await tx.plantillaUniformeItem.deleteMany({
        where: { plantilla_id: id },
      });
      return tx.plantillaUniforme.update({
        where: { id },
        data: {
          nombre: dto.nombre.trim(),
          predeterminada: dto.predeterminada ?? false,
          items: {
            create: dto.items.map((i) => ({
              tipo_uniforme_id: i.tipo_uniforme_id,
              cantidad: i.cantidad,
            })),
          },
        },
        include: this.includeItems,
      });
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);
    // Soft delete para no romper trazabilidad ni el unique de nombre con re-uso.
    await this.prisma.plantillaUniforme.update({
      where: { id },
      data: { activo: false, predeterminada: false },
    });
    return { ok: true };
  }
}
