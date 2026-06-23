import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSedeDto,
  UpdateSedeDto,
  FilterSedeDto,
  CreateSedeContactoDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SedesService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number, filters: FilterSedeDto) {
    const { buscar, cliente_id, activo, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SedeWhereInput = {
      empresa_id: empresaId,
    };

    if (buscar) {
      where.OR = [
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { direccion: { contains: buscar, mode: 'insensitive' } },
        {
          cliente: { razon_social: { contains: buscar, mode: 'insensitive' } },
        },
      ];
    }

    if (cliente_id) {
      where.cliente_id = cliente_id;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const [data, total] = await Promise.all([
      this.prisma.sede.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        include: {
          cliente: {
            select: { id: true, razon_social: true, nombre_comercial: true },
          },
          contactos: {
            where: { activo: true },
            orderBy: { es_principal: 'desc' },
          },
          _count: {
            select: {
              empleados: true,
              tareos: true,
              vacantes: true,
            },
          },
        },
      }),
      this.prisma.sede.count({ where }),
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
    const sede = await this.prisma.sede.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        cliente: {
          select: { id: true, razon_social: true, nombre_comercial: true },
        },
        contactos: {
          orderBy: [{ es_principal: 'desc' }, { nombre: 'asc' }],
        },
        _count: {
          select: {
            empleados: true,
            tareos: true,
            vacantes: true,
          },
        },
      },
    });

    if (!sede) {
      throw new NotFoundException('Sede no encontrada');
    }

    return sede;
  }

  async create(empresaId: number, dto: CreateSedeDto) {
    // Verificar que el cliente pertenece a la empresa
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id: dto.cliente_id,
        empresa_id: empresaId,
      },
    });

    if (!cliente) {
      throw new NotFoundException(
        'El cliente no existe o no pertenece a esta empresa',
      );
    }

    // Verificar que el nombre sea único para el cliente en la empresa
    const exists = await this.prisma.sede.findFirst({
      where: {
        nombre: dto.nombre,
        cliente_id: dto.cliente_id,
        empresa_id: empresaId,
      },
    });

    if (exists) {
      throw new ConflictException(
        'Ya existe una sede con este nombre para este cliente',
      );
    }

    const { contactos, ...sedeData } = dto;

    return this.prisma.sede.create({
      data: {
        nombre: sedeData.nombre,
        direccion: sedeData.direccion,
        cliente_id: sedeData.cliente_id,
        empresa_id: empresaId,
        activo: sedeData.activo ?? true,
        contactos: contactos?.length
          ? {
              create: contactos.map((c) => ({
                nombre: c.nombre,
                cargo: c.cargo,
                telefono: c.telefono,
                email: c.email,
                es_principal: c.es_principal ?? false,
              })),
            }
          : undefined,
      },
      include: {
        cliente: {
          select: { id: true, razon_social: true, nombre_comercial: true },
        },
        contactos: true,
      },
    });
  }

  async update(id: number, empresaId: number, dto: UpdateSedeDto) {
    const sedeExistente = await this.findOne(id, empresaId);

    // Si cambia el nombre o cliente, verificar unicidad
    if (
      (dto.nombre && dto.nombre !== sedeExistente.nombre) ||
      (dto.cliente_id && dto.cliente_id !== sedeExistente.cliente_id)
    ) {
      const checkClienteId = dto.cliente_id ?? sedeExistente.cliente_id;
      const checkNombre = dto.nombre ?? sedeExistente.nombre;

      const exists = await this.prisma.sede.findFirst({
        where: {
          nombre: checkNombre,
          cliente_id: checkClienteId,
          empresa_id: empresaId,
          id: { not: id },
        },
      });

      if (exists) {
        throw new ConflictException(
          'Ya existe una sede con este nombre para este cliente',
        );
      }
    }

    // Si cambia el cliente, verificar que el nuevo cliente pertenece a la empresa
    if (dto.cliente_id && dto.cliente_id !== sedeExistente.cliente_id) {
      const cliente = await this.prisma.cliente.findFirst({
        where: {
          id: dto.cliente_id,
          empresa_id: empresaId,
        },
      });

      if (!cliente) {
        throw new NotFoundException(
          'El cliente no existe o no pertenece a esta empresa',
        );
      }
    }

    const sedeActualizada = await this.prisma.sede.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        direccion: dto.direccion,
        cliente_id: dto.cliente_id,
        activo: dto.activo,
      },
      include: {
        cliente: {
          select: { id: true, razon_social: true, nombre_comercial: true },
        },
        contactos: true,
      },
    });

    return sedeActualizada;
  }

  async remove(id: number, empresaId: number) {
    const sede = await this.findOne(id, empresaId);

    // Verificar si tiene empleados, tareos o vacantes asociadas
    if (
      sede._count.empleados > 0 ||
      sede._count.tareos > 0 ||
      sede._count.vacantes > 0
    ) {
      throw new ConflictException(
        'No se puede eliminar la sede porque tiene empleados, tareos o vacantes asociadas. Desactívela en su lugar.',
      );
    }

    await this.prisma.sede.delete({
      where: { id },
    });

    return { message: 'Sede eliminada correctamente' };
  }

  // Cambiar estado activo/inactivo
  async toggleActivo(id: number, empresaId: number) {
    const sede = await this.findOne(id, empresaId);
    const nuevoEstado = !sede.activo;

    return this.prisma.sede.update({
      where: { id },
      data: { activo: nuevoEstado },
      include: {
        cliente: {
          select: { id: true, razon_social: true, nombre_comercial: true },
        },
        contactos: true,
      },
    });
  }

  // Obtener sedes para selectores (solo activas)
  async findForSelect(empresaId: number, clienteId?: number) {
    const where: Prisma.SedeWhereInput = {
      empresa_id: empresaId,
      activo: true,
    };

    if (clienteId) {
      where.cliente_id = clienteId;
    }

    return this.prisma.sede.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        cliente_id: true,
        cliente: {
          select: { razon_social: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // ==================== CONTACTOS ====================

  async addContacto(
    sedeId: number,
    empresaId: number,
    dto: CreateSedeContactoDto,
  ) {
    // Verificar que la sede existe y pertenece a la empresa
    await this.findOne(sedeId, empresaId);

    // Si es principal, quitar el flag de otros contactos
    if (dto.es_principal) {
      await this.prisma.sedeContacto.updateMany({
        where: { sede_id: sedeId, es_principal: true },
        data: { es_principal: false },
      });
    }

    return this.prisma.sedeContacto.create({
      data: {
        sede_id: sedeId,
        nombre: dto.nombre,
        cargo: dto.cargo,
        telefono: dto.telefono,
        email: dto.email,
        es_principal: dto.es_principal ?? false,
      },
    });
  }

  async updateContacto(
    contactoId: number,
    empresaId: number,
    dto: Partial<CreateSedeContactoDto>,
  ) {
    const contacto = await this.prisma.sedeContacto.findFirst({
      where: { id: contactoId },
      include: { sede: true },
    });

    if (!contacto || contacto.sede.empresa_id !== empresaId) {
      throw new NotFoundException('Contacto no encontrado');
    }

    // Si se marca como principal, quitar el flag de otros
    if (dto.es_principal) {
      await this.prisma.sedeContacto.updateMany({
        where: {
          sede_id: contacto.sede_id,
          es_principal: true,
          id: { not: contactoId },
        },
        data: { es_principal: false },
      });
    }

    return this.prisma.sedeContacto.update({
      where: { id: contactoId },
      data: dto,
    });
  }

  async removeContacto(contactoId: number, empresaId: number) {
    const contacto = await this.prisma.sedeContacto.findFirst({
      where: { id: contactoId },
      include: { sede: true },
    });

    if (!contacto || contacto.sede.empresa_id !== empresaId) {
      throw new NotFoundException('Contacto no encontrado');
    }

    await this.prisma.sedeContacto.delete({
      where: { id: contactoId },
    });

    return { message: 'Contacto eliminado correctamente' };
  }
}
