import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJustificacionDto,
  UpdateJustificacionDto,
  AddArchivoDto,
} from './dto';
import {
  Prisma,
  EstadoPeriodoTareo,
  TipoJustificacion,
} from '@prisma/client';
import { TareoJustificacionesMutationsService } from './tareo-justificaciones-mutations.service';

@Injectable()
export class TareoJustificacionesService {
  constructor(
    private prisma: PrismaService,
    private mutationsService: TareoJustificacionesMutationsService,
  ) {}

  // =============================================
  // JUSTIFICACIONES
  // =============================================

  // Listar todas las justificaciones con filtros y paginación
  async getAllJustificaciones(
    empresaId: number,
    filters: {
      empleado_id?: number;
      anio?: number;
      mes?: number;
      sede_id?: number;
      area_id?: number;
      tipo?: string;
      busqueda?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TareoJustificacionWhereInput = {
      empresa_id: empresaId,
    };

    // Filtro por tareo (empleado, periodo, sede, area)
    const tareoFilter: Prisma.TareoWhereInput = {};

    if (filters.empleado_id) {
      tareoFilter.empleado_id = filters.empleado_id;
    }

    if (filters.anio || filters.mes) {
      tareoFilter.periodo = {};
      if (filters.anio) tareoFilter.periodo.anio = filters.anio;
      if (filters.mes) tareoFilter.periodo.mes = filters.mes;
    }

    if (filters.sede_id) {
      tareoFilter.sede_id = filters.sede_id;
    }

    if (filters.area_id) {
      tareoFilter.area_id = filters.area_id;
    }

    // Búsqueda por nombre o documento del empleado
    if (filters.busqueda) {
      tareoFilter.empleado = {
        OR: [
          { nombres: { contains: filters.busqueda, mode: 'insensitive' } },
          {
            apellido_paterno: {
              contains: filters.busqueda,
              mode: 'insensitive',
            },
          },
          {
            apellido_materno: {
              contains: filters.busqueda,
              mode: 'insensitive',
            },
          },
          {
            numero_documento: {
              contains: filters.busqueda,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    if (Object.keys(tareoFilter).length > 0) {
      where.tareo = tareoFilter;
    }

    if (filters.tipo) {
      where.tipo = filters.tipo as TipoJustificacion;
    }

    const [justificaciones, total] = await Promise.all([
      this.prisma.tareoJustificacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          archivos: true,
          usuario: {
            select: { id: true, nombre_completo: true },
          },
          tareo: {
            include: {
              periodo: {
                select: { id: true, anio: true, mes: true },
              },
              empleado: {
                select: {
                  id: true,
                  numero_documento: true,
                  nombres: true,
                  apellido_paterno: true,
                  apellido_materno: true,
                  foto_url: true,
                },
              },
              sede: {
                select: { id: true, nombre: true },
              },
              area: {
                select: { id: true, nombre: true },
              },
            },
          },
        },
      }),
      this.prisma.tareoJustificacion.count({ where }),
    ]);

    return {
      data: justificaciones,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener justificaciones por empleado (historial completo)
  async getJustificacionesByEmpleado(
    empresaId: number,
    empleadoId: number,
    anio?: number,
  ) {
    const tareoFilter: Prisma.TareoWhereInput = {
      empleado_id: empleadoId,
    };

    if (anio) {
      tareoFilter.periodo = { anio };
    }

    const where: Prisma.TareoJustificacionWhereInput = {
      empresa_id: empresaId,
      tareo: tareoFilter,
    };

    const justificaciones = await this.prisma.tareoJustificacion.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        archivos: true,
        usuario: {
          select: { id: true, nombre_completo: true },
        },
        tareo: {
          include: {
            periodo: {
              select: { id: true, anio: true, mes: true },
            },
            empleado: {
              select: {
                id: true,
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
          },
        },
      },
    });

    return justificaciones;
  }

  // Obtener justificaciones de un tareo específico
  async getJustificacionesByTareo(tareoId: number, empresaId: number) {
    const tareo = await this.prisma.tareo.findFirst({
      where: { id: tareoId, periodo: { empresa_id: empresaId } },
    });

    if (!tareo) {
      throw new NotFoundException('Tareo no encontrado');
    }

    return this.prisma.tareoJustificacion.findMany({
      where: { tareo_id: tareoId },
      orderBy: { dia_inicio: 'asc' },
      include: {
        archivos: true,
        usuario: {
          select: { id: true, nombre_completo: true },
        },
      },
    });
  }

  // Obtener una justificación específica
  async getJustificacion(id: number, empresaId: number) {
    const justificacion = await this.prisma.tareoJustificacion.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        archivos: true,
        usuario: {
          select: { id: true, nombre_completo: true, email: true },
        },
        tareo: {
          include: {
            periodo: {
              select: { id: true, anio: true, mes: true },
            },
            empleado: {
              select: {
                id: true,
                numero_documento: true,
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
          },
        },
      },
    });

    if (!justificacion) {
      throw new NotFoundException('Justificación no encontrada');
    }

    return justificacion;
  }

  // Crear justificación

  // ==================== MUTATIONS + ALERTAS (delega a TareoJustificacionesMutationsService) ====================

  async createJustificacion(
    dto: CreateJustificacionDto,
    usuarioId: number,
    empresaId: number,
  ) {
    return this.mutationsService.createJustificacion(dto, usuarioId, empresaId);
  }

  async updateJustificacion(
    id: number,
    dto: UpdateJustificacionDto,
    empresaId: number,
  ) {
    return this.mutationsService.updateJustificacion(id, dto, empresaId);
  }

  async deleteJustificacion(id: number, empresaId: number, usuarioId?: number) {
    return this.mutationsService.deleteJustificacion(id, empresaId, usuarioId);
  }

  async addArchivoToJustificacion(
    justificacionId: number,
    archivo: AddArchivoDto,
    empresaId: number,
  ) {
    return this.mutationsService.addArchivoToJustificacion(
      justificacionId,
      archivo,
      empresaId,
    );
  }

  async removeArchivo(archivoId: number, empresaId: number) {
    return this.mutationsService.removeArchivo(archivoId, empresaId);
  }

  async getAlertasFaltas(
    empresaId: number,
    filters: {
      fecha_inicio: Date;
      fecha_fin: Date;
      sede_id?: number;
      area_id?: number;
      minimo_faltas?: number;
    },
  ) {
    return this.mutationsService.getAlertasFaltas(empresaId, filters);
  }

  async getDiasConJustificacion(periodoId: number, empresaId: number) {
    const justificaciones = await this.prisma.tareoJustificacion.findMany({
      where: {
        empresa_id: empresaId,
        tareo: { periodo_id: periodoId },
      },
      select: {
        tareo_id: true,
        dia_inicio: true,
        dia_fin: true,
        tipo: true,
      },
    });

    // Crear mapa de tareo_id -> días con justificación
    const diasPorTareo: Record<number, Set<number>> = {};

    for (const j of justificaciones) {
      if (!diasPorTareo[j.tareo_id]) {
        diasPorTareo[j.tareo_id] = new Set();
      }
      for (let dia = j.dia_inicio; dia <= j.dia_fin; dia++) {
        diasPorTareo[j.tareo_id].add(dia);
      }
    }

    // Convertir a formato serializable
    const resultado: Record<number, number[]> = {};
    for (const [tareoId, dias] of Object.entries(diasPorTareo)) {
      resultado[Number(tareoId)] = Array.from(dias).sort((a, b) => a - b);
    }

    return resultado;
  }

  /**
   * Obtiene el periodo_id de una justificación (para validar sesión antes de update/delete)
   */
  async getJustificacionPeriodoId(
    justificacionId: number,
    empresaId: number,
  ): Promise<number> {
    const justificacion = await this.prisma.tareoJustificacion.findFirst({
      where: { id: justificacionId, empresa_id: empresaId },
      select: { tareo: { select: { periodo_id: true } } },
    });

    if (!justificacion) {
      throw new NotFoundException('Justificación no encontrada');
    }

    return justificacion.tareo.periodo_id;
  }

  /**
   * Obtiene el periodo_id de un archivo de justificación (para validar sesión antes de delete)
   */
  async getArchivoPeriodoId(
    archivoId: number,
    empresaId: number,
  ): Promise<number> {
    const archivo = await this.prisma.tareoJustificacionArchivo.findFirst({
      where: { id: archivoId },
      select: {
        justificacion: {
          select: {
            empresa_id: true,
            tareo: { select: { periodo_id: true } },
          },
        },
      },
    });

    if (!archivo || archivo.justificacion.empresa_id !== empresaId) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return archivo.justificacion.tareo.periodo_id;
  }
}
