import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

interface FindAllOptions {
  buscar?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProveedoresService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: number, dto: CreateProveedorDto) {
    return this.prisma.proveedor.create({
      data: { ...dto, empresa_id: empresaId },
    });
  }

  async findAll(empresaId: number, options: FindAllOptions = {}) {
    const { buscar, activo, page = 1, limit = 50 } = options;

    const where: Prisma.ProveedorWhereInput = { empresa_id: empresaId };
    if (activo !== undefined) where.activo = activo;
    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { ruc: { contains: buscar, mode: 'insensitive' } },
        { contacto: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proveedor.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findForSelect(empresaId: number) {
    return this.prisma.proveedor.findMany({
      where: { empresa_id: empresaId, activo: true },
      select: { id: true, nombre: true, ruc: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number, empresaId: number) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, empresa_id: empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: number, empresaId: number, dto: UpdateProveedorDto) {
    await this.findOne(id, empresaId);
    return this.prisma.proveedor.update({ where: { id }, data: dto });
  }

  async toggleActivo(id: number, empresaId: number) {
    const proveedor = await this.findOne(id, empresaId);
    return this.prisma.proveedor.update({
      where: { id },
      data: { activo: !proveedor.activo },
    });
  }

  async remove(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    // No se borra un proveedor con historial: rompería la trazabilidad del
    // origen del stock. Se sugiere desactivarlo (toggleActivo).
    const [ingresos, items] = await Promise.all([
      this.prisma.ingresoInventario.count({ where: { proveedor_id: id } }),
      this.prisma.itemInventario.count({ where: { proveedor_id: id } }),
    ]);
    if (ingresos > 0 || items > 0) {
      throw new ConflictException(
        'El proveedor tiene ingresos o items asociados y no se puede eliminar. Desactívalo en su lugar.',
      );
    }

    await this.prisma.proveedor.delete({ where: { id } });
    return { message: 'Proveedor eliminado correctamente' };
  }
}
