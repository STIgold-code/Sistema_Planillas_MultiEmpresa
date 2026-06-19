import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: number, dto: CreateClienteDto) {
    // Verificar si ya existe un cliente con el mismo RUC en la empresa
    const existe = await this.prisma.cliente.findUnique({
      where: {
        ruc_empresa_id: {
          ruc: dto.ruc,
          empresa_id: empresaId,
        },
      },
    });

    if (existe) {
      throw new ConflictException(`Ya existe un cliente con el RUC ${dto.ruc}`);
    }

    return this.prisma.cliente.create({
      data: {
        ...dto,
        empresa_id: empresaId,
      },
    });
  }

  async findAll(
    empresaId: number,
    options?: {
      buscar?: string;
      activo?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const { buscar, activo, page = 1, limit = 50 } = options || {};

    const where: any = {
      empresa_id: empresaId,
    };

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (buscar) {
      where.OR = [
        { ruc: { contains: buscar, mode: 'insensitive' } },
        { razon_social: { contains: buscar, mode: 'insensitive' } },
        { nombre_comercial: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        orderBy: { razon_social: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { contratos: true },
          },
        },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, empresaId: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        empresa_id: empresaId,
      },
      include: {
        _count: {
          select: { contratos: true },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  async findForSelect(empresaId: number) {
    return this.prisma.cliente.findMany({
      where: {
        empresa_id: empresaId,
        activo: true,
      },
      select: {
        id: true,
        ruc: true,
        razon_social: true,
        nombre_comercial: true,
      },
      orderBy: { razon_social: 'asc' },
    });
  }

  async update(id: number, empresaId: number, dto: UpdateClienteDto) {
    await this.findOne(id, empresaId);

    // Si se cambia el RUC, verificar que no exista otro con ese RUC
    if (dto.ruc) {
      const existe = await this.prisma.cliente.findFirst({
        where: {
          ruc: dto.ruc,
          empresa_id: empresaId,
          NOT: { id },
        },
      });

      if (existe) {
        throw new ConflictException(
          `Ya existe otro cliente con el RUC ${dto.ruc}`,
        );
      }
    }

    return this.prisma.cliente.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActivo(id: number, empresaId: number) {
    const cliente = await this.findOne(id, empresaId);
    const nuevoEstado = !cliente.activo;

    return this.prisma.cliente.update({
      where: { id },
      data: { activo: nuevoEstado },
    });
  }

  async remove(id: number, empresaId: number) {
    const cliente = await this.findOne(id, empresaId);

    // Verificar si tiene contratos asociados
    if (cliente._count.contratos > 0) {
      throw new ConflictException(
        `No se puede eliminar el cliente porque tiene ${cliente._count.contratos} contrato(s) asociado(s)`,
      );
    }

    await this.prisma.cliente.delete({
      where: { id },
    });

    return { message: 'Cliente eliminado correctamente' };
  }
}
