import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVacanteDto, UpdateVacanteDto, FilterVacanteDto } from './dto';
import { EstadoVacante, Prisma } from '@prisma/client';
import {
  ahoraPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';

@Injectable()
export class VacantesService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number, filters: FilterVacanteDto) {
    const {
      buscar,
      estado,
      area_id,
      cargo_id,
      sede_id,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.VacanteWhereInput = { empresa_id: empresaId };

    if (buscar) {
      where.OR = [
        { codigo: { contains: buscar, mode: 'insensitive' } },
        { titulo: { contains: buscar, mode: 'insensitive' } },
      ];
    }
    if (estado) where.estado = estado;
    if (area_id) where.area_id = area_id;
    if (cargo_id) where.cargo_id = cargo_id;
    if (sede_id) where.sede_id = sede_id;

    const [vacantes, total] = await Promise.all([
      this.prisma.vacante.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          cargo: { select: { id: true, nombre: true } },
          area: { select: { id: true, nombre: true } },
          sede: { select: { id: true, nombre: true } },
          _count: { select: { postulantes: true } },
        },
      }),
      this.prisma.vacante.count({ where }),
    ]);

    // Obtener conteo de aprobados por vacante
    const vacanteIds = vacantes.map((v) => v.id);
    const aprobadosCounts = await this.prisma.postulante.groupBy({
      by: ['vacante_id'],
      where: {
        vacante_id: { in: vacanteIds },
        estado: 'APROBADO',
        empresa_id: empresaId,
      },
      _count: true,
    });

    const aprobadosMap = aprobadosCounts.reduce(
      (acc, item) => {
        acc[item.vacante_id] = item._count;
        return acc;
      },
      {} as Record<number, number>,
    );

    const data = vacantes.map((v) => ({
      ...v,
      _count: {
        ...v._count,
        aprobados: aprobadosMap[v.id] || 0,
      },
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, empresaId: number) {
    const vacante = await this.prisma.vacante.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        _count: { select: { postulantes: true } },
      },
    });

    if (!vacante) {
      throw new NotFoundException('Vacante no encontrada');
    }

    return vacante;
  }

  async create(empresaId: number, dto: CreateVacanteDto) {
    return this.prisma.$transaction(async (tx) => {
      const year = ahoraPeru().year;
      const lastVacante = await tx.vacante.findFirst({
        where: { empresa_id: empresaId, codigo: { startsWith: `VAC-${year}` } },
        orderBy: { codigo: 'desc' },
      });

      let sequence = 1;
      if (lastVacante) {
        const lastNum = parseInt(lastVacante.codigo.split('-')[2]);
        sequence = lastNum + 1;
      }
      const codigo = `VAC-${year}-${sequence.toString().padStart(3, '0')}`;

      return tx.vacante.create({
        data: {
          codigo,
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          cargo_id: dto.cargo_id,
          area_id: dto.area_id,
          sede_id: dto.sede_id,
          cantidad_puestos: dto.cantidad_puestos || 1,
          sueldo_ofrecido: dto.sueldo_ofrecido,
          tipo_contrato: dto.tipo_contrato,
          modalidad: dto.modalidad,
          requisitos:
            dto.requisitos?.map((r) => ({
              tipo: r.tipo,
              descripcion: r.descripcion,
              obligatorio: r.obligatorio,
            })) || [],
          fecha_publicacion: dto.fecha_publicacion
            ? parsearFechaISOenPeru(dto.fecha_publicacion)
            : null,
          fecha_cierre: dto.fecha_cierre
            ? parsearFechaISOenPeru(dto.fecha_cierre)
            : null,
          empresa_id: empresaId,
        },
        include: {
          cargo: { select: { id: true, nombre: true } },
          area: { select: { id: true, nombre: true } },
          sede: { select: { id: true, nombre: true } },
        },
      });
    });
  }

  async update(id: number, empresaId: number, dto: UpdateVacanteDto) {
    const vacante = await this.findOne(id, empresaId);

    if (vacante.estado === 'CERRADA' || vacante.estado === 'CANCELADA') {
      throw new ConflictException(
        `No se puede editar una vacante en estado ${vacante.estado}. Reactívela primero.`,
      );
    }

    const updateData: Prisma.VacanteUpdateInput = {};

    // Campos siempre editables (cuando el estado lo permite)
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.sueldo_ofrecido !== undefined)
      updateData.sueldo_ofrecido = dto.sueldo_ofrecido;
    if (dto.fecha_cierre !== undefined) {
      updateData.fecha_cierre = parsearFechaISOenPeru(dto.fecha_cierre);
    }
    if (dto.requisitos !== undefined)
      updateData.requisitos = dto.requisitos.map((r) => ({
        tipo: r.tipo,
        descripcion: r.descripcion,
        obligatorio: r.obligatorio,
      }));

    // Campos solo editables en BORRADOR
    if (vacante.estado === 'BORRADOR') {
      if (dto.titulo !== undefined) updateData.titulo = dto.titulo;
      if (dto.cargo_id !== undefined)
        updateData.cargo = { connect: { id: dto.cargo_id } };
      if (dto.area_id !== undefined)
        updateData.area = { connect: { id: dto.area_id } };
      if (dto.sede_id !== undefined)
        updateData.sede = { connect: { id: dto.sede_id } };
      if (dto.cantidad_puestos !== undefined)
        updateData.cantidad_puestos = dto.cantidad_puestos;
      if (dto.tipo_contrato !== undefined)
        updateData.tipo_contrato = dto.tipo_contrato;
      if (dto.modalidad !== undefined) updateData.modalidad = dto.modalidad;
      if (dto.fecha_publicacion !== undefined) {
        updateData.fecha_publicacion = parsearFechaISOenPeru(
          dto.fecha_publicacion,
        );
      }
    } else {
      // PUBLICADA o EN_PROCESO: rechazar campos restringidos
      const camposRestringidos: string[] = [];
      if (dto.titulo !== undefined) camposRestringidos.push('titulo');
      if (dto.area_id !== undefined) camposRestringidos.push('area');
      if (dto.cargo_id !== undefined) camposRestringidos.push('cargo');
      if (dto.sede_id !== undefined) camposRestringidos.push('sede');
      if (dto.cantidad_puestos !== undefined)
        camposRestringidos.push('cantidad_puestos');
      if (dto.tipo_contrato !== undefined)
        camposRestringidos.push('tipo_contrato');
      if (dto.modalidad !== undefined) camposRestringidos.push('modalidad');

      if (camposRestringidos.length > 0) {
        throw new ConflictException(
          `No se pueden modificar los campos [${camposRestringidos.join(', ')}] en estado ${vacante.estado}. Solo se permite editar: descripcion, sueldo, fecha de cierre, requisitos.`,
        );
      }
    }

    return this.prisma.vacante.update({
      where: { id },
      data: updateData,
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
      },
    });
  }

  async cambiarEstado(
    id: number,
    empresaId: number,
    nuevoEstado: EstadoVacante,
  ) {
    const vacante = await this.findOne(id, empresaId);

    const transicionesValidas: Record<EstadoVacante, EstadoVacante[]> = {
      BORRADOR: ['PUBLICADA', 'CANCELADA'],
      PUBLICADA: ['EN_PROCESO', 'CERRADA', 'CANCELADA'],
      EN_PROCESO: ['CERRADA', 'CANCELADA'],
      CERRADA: ['BORRADOR'], // Permite reactivar vacante cerrada
      CANCELADA: ['BORRADOR'], // Permite reactivar vacante cancelada
    };

    if (!transicionesValidas[vacante.estado].includes(nuevoEstado)) {
      throw new ConflictException(
        `No se puede cambiar de ${vacante.estado} a ${nuevoEstado}`,
      );
    }

    const updateData: Prisma.VacanteUpdateInput = { estado: nuevoEstado };
    if (nuevoEstado === 'PUBLICADA' && !vacante.fecha_publicacion) {
      updateData.fecha_publicacion = ahoraPeru().toJSDate();
    }

    return this.prisma.vacante.update({
      where: { id },
      data: updateData,
      include: {
        cargo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: number, empresaId: number) {
    const vacante = await this.findOne(id, empresaId);

    if (vacante.estado !== 'BORRADOR') {
      throw new ConflictException(
        'Solo se pueden eliminar vacantes en estado BORRADOR',
      );
    }

    await this.prisma.vacante.delete({ where: { id } });
    return { message: 'Vacante eliminada correctamente' };
  }

  async getResumen(empresaId: number) {
    const [total, porEstado] = await Promise.all([
      this.prisma.vacante.count({ where: { empresa_id: empresaId } }),
      this.prisma.vacante.groupBy({
        by: ['estado'],
        where: { empresa_id: empresaId },
        _count: true,
      }),
    ]);

    const estados = porEstado.reduce(
      (acc, e) => {
        acc[e.estado] = e._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      publicadas: (estados['PUBLICADA'] || 0) + (estados['EN_PROCESO'] || 0),
      por_estado: estados,
    };
  }

  async getEstadisticas(id: number, empresaId: number) {
    await this.findOne(id, empresaId);

    const estadisticas = await this.prisma.postulante.groupBy({
      by: ['estado'],
      where: { vacante_id: id, empresa_id: empresaId },
      _count: true,
    });

    const porEstado = estadisticas.reduce(
      (acc, e) => {
        acc[e.estado] = e._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: estadisticas.reduce((sum, e) => sum + e._count, 0),
      por_estado: porEstado,
    };
  }
}
