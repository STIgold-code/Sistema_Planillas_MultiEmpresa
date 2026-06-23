import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSolicitudCeseDto,
  ResolverSolicitudCeseDto,
  FilterSolicitudCeseDto,
} from './dto';
import {
  ahoraPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';
import {
  MIN_OPERATIONAL_YEAR,
  MAX_OPERATIONAL_YEAR,
} from '../../common/validators/is-realistic-date.validator';
import { archivarArchivosEnBancoEmpleado } from '../banco-documentos/helpers/archivar-en-banco.helper';

@Injectable()
export class SolicitudesCeseService {
  constructor(private prisma: PrismaService) {}

  async create(
    empresaId: number,
    dto: CreateSolicitudCeseDto,
    usuarioId: number,
    archivos: Array<{
      archivo_url: string;
      archivo_nombre: string;
      archivo_tipo?: string;
      archivo_tamano?: number;
    }>,
  ) {
    if (!archivos || archivos.length === 0) {
      throw new BadRequestException(
        'Debe adjuntar al menos un documento que respalde el cese',
      );
    }

    // Validar que el empleado existe y está ACTIVO
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: dto.empleado_id, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (empleado.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se puede solicitar cese de empleados activos',
      );
    }

    // Buscar contrato ACTIVO o PENDIENTE (vencido) del empleado
    const contrato = await this.prisma.contrato.findFirst({
      where: {
        empleado_id: dto.empleado_id,
        estado: { in: ['ACTIVO', 'PENDIENTE'] },
      },
      orderBy: { fecha_inicio: 'desc' },
    });

    if (!contrato) {
      throw new BadRequestException(
        'El empleado no tiene un contrato activo o pendiente',
      );
    }

    // Verificar que no exista solicitud PENDIENTE para este empleado
    const solicitudPendiente = await this.prisma.solicitudCese.findFirst({
      where: {
        empleado_id: dto.empleado_id,
        estado: 'PENDIENTE',
      },
    });

    if (solicitudPendiente) {
      throw new BadRequestException(
        'Ya existe una solicitud de cese pendiente para este empleado',
      );
    }

    // Por compatibilidad temporal, escribimos el primer archivo tambien en los
    // campos legacy archivo_url/archivo_nombre. El frontend nuevo debe leer
    // de "archivos" (array). Los campos legacy se eliminaran en una migracion
    // futura cuando todos los consumidores esten migrados.
    const primerArchivo = archivos[0];

    return this.prisma.solicitudCese.create({
      data: {
        empleado_id: dto.empleado_id,
        contrato_id: contrato.id,
        empresa_id: empresaId,
        tipo_cese_id: dto.tipo_cese_id,
        motivo: dto.motivo || null,
        archivo_url: primerArchivo.archivo_url,
        archivo_nombre: primerArchivo.archivo_nombre,
        fecha_efectiva: parsearFechaISOenPeru(dto.fecha_efectiva),
        solicitado_por_id: usuarioId,
        archivos: {
          create: archivos.map((a) => ({
            archivo_url: a.archivo_url,
            archivo_nombre: a.archivo_nombre,
            archivo_tipo: a.archivo_tipo ?? null,
            archivo_tamano: a.archivo_tamano ?? null,
          })),
        },
      },
      include: {
        archivos: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            archivo_tipo: true,
            archivo_tamano: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
          },
        },
        tipo_cese: { select: { id: true, nombre: true } },
      },
    });
  }

  async findAll(empresaId: number, filters: FilterSolicitudCeseDto) {
    const {
      buscar,
      estado,
      tipo_cese_id,
      empleado_id,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.SolicitudCeseWhereInput = { empresa_id: empresaId };

    if (estado) where.estado = estado;
    if (tipo_cese_id) where.tipo_cese_id = tipo_cese_id;
    if (empleado_id) where.empleado_id = empleado_id;

    if (buscar) {
      where.OR = [
        { motivo: { contains: buscar, mode: 'insensitive' } },
        { tipo_cese: { nombre: { contains: buscar, mode: 'insensitive' } } },
        {
          empleado: {
            OR: [
              { nombres: { contains: buscar, mode: 'insensitive' } },
              { apellido_paterno: { contains: buscar, mode: 'insensitive' } },
              { apellido_materno: { contains: buscar, mode: 'insensitive' } },
              { numero_documento: { contains: buscar, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.solicitudCese.findMany({
        where,
        include: {
          archivos: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              archivo_url: true,
              archivo_nombre: true,
              archivo_tipo: true,
              archivo_tamano: true,
            },
          },
          empleado: {
            select: {
              id: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              numero_documento: true,
              cargo: { select: { nombre: true } },
              area: { select: { nombre: true } },
            },
          },
          tipo_cese: { select: { id: true, nombre: true } },
          solicitado_por: {
            select: { id: true, nombre_completo: true, email: true },
          },
          resuelto_por: {
            select: { id: true, nombre_completo: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudCese.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudCese.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        archivos: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            archivo_tipo: true,
            archivo_tamano: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            cargo: { select: { nombre: true } },
            area: { select: { nombre: true } },
            sede: { select: { nombre: true } },
          },
        },
        contrato: {
          select: {
            id: true,
            tipo_contrato: true,
            fecha_inicio: true,
            fecha_fin: true,
            estado: true,
          },
        },
        tipo_cese: { select: { id: true, nombre: true } },
        solicitado_por: {
          select: { id: true, nombre_completo: true, email: true },
        },
        resuelto_por: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de cese no encontrada');
    }

    return solicitud;
  }

  async aprobar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudCeseDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes pendientes',
      );
    }

    // Defensa contra data corrupta (ej: fecha_efectiva con año 0026 por typo
    // en formularios antiguos sin validación). Bloquea propagación a contrato,
    // vinculo, empleado y movimientos.
    const yearFecha = solicitud.fecha_efectiva.getUTCFullYear();
    if (yearFecha < MIN_OPERATIONAL_YEAR || yearFecha > MAX_OPERATIONAL_YEAR) {
      throw new BadRequestException(
        `La solicitud tiene fecha_efectiva con año inválido (${yearFecha}). ` +
          `Corregir el registro en BD antes de aprobar.`,
      );
    }

    const tipoCeseNombre = solicitud.tipo_cese?.nombre || 'N/A';

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar solicitud a APROBADA
      const solicitudAprobada = await tx.solicitudCese.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
          observaciones_admin: dto?.observaciones_admin,
        },
      });

      // 2. Terminar contrato (propaga fecha_cese y motivo_cese desnormalizados)
      const motivoCese = solicitud.motivo ?? tipoCeseNombre;
      const contratoActualizado = await tx.contrato.update({
        where: { id: solicitud.contrato_id },
        data: {
          estado: 'CESADO',
          fecha_cese: solicitud.fecha_efectiva,
          motivo_cese: motivoCese,
          observaciones: `Cese aprobado - Tipo: ${tipoCeseNombre} - Motivo: ${solicitud.motivo || 'N/A'}`,
        },
        select: { vinculo_laboral_id: true },
      });

      // 3. Verificar si tiene otros contratos vigentes
      const otrosContratosVigentes = await tx.contrato.count({
        where: {
          empleado_id: solicitud.empleado_id,
          estado: 'ACTIVO',
          id: { not: solicitud.contrato_id },
        },
      });

      // 4. Si no tiene otros vigentes, pasar empleado a CESADO
      if (otrosContratosVigentes === 0) {
        await tx.empleado.update({
          where: { id: solicitud.empleado_id },
          data: {
            estado: 'CESADO',
            fecha_cese: solicitud.fecha_efectiva,
          },
        });

        // 4.1 Cesar también todos los contratos PENDIENTE (vencidos) del empleado
        await tx.contrato.updateMany({
          where: {
            empleado_id: solicitud.empleado_id,
            estado: 'PENDIENTE',
          },
          data: {
            estado: 'CESADO',
            fecha_cese: solicitud.fecha_efectiva,
            motivo_cese: motivoCese,
            observaciones: `Cese automático - Empleado cesado (Solicitud #${id})`,
          },
        });

        // 4.2 Cerrar el vínculo laboral asociado al contrato cesado
        //     (propaga estado, fecha_fin y motivo_cierre desnormalizados)
        if (contratoActualizado.vinculo_laboral_id) {
          await tx.vinculoLaboral.update({
            where: { id: contratoActualizado.vinculo_laboral_id },
            data: {
              estado: 'CERRADO',
              fecha_fin: solicitud.fecha_efectiva,
              motivo_cierre: motivoCese,
            },
          });
        }

        // 5. Crear movimiento de BAJA (tipo_movimiento se mantiene)
        const nombreLower = tipoCeseNombre.toLowerCase();
        const tipoMovimiento = nombreLower.includes('renuncia')
          ? 'RENUNCIA'
          : 'BAJA';

        await tx.empleadoMovimiento.create({
          data: {
            empleado_id: solicitud.empleado_id,
            tipo_movimiento: tipoMovimiento,
            fecha_movimiento: solicitud.fecha_efectiva,
            motivo: `${tipoCeseNombre}${solicitud.motivo ? ` - ${solicitud.motivo}` : ''}`,
            observaciones: `Solicitud de cese #${id} aprobada`,
            usuario_id: usuarioId,
          },
        });
      }

      // 6. Archivar copias de los documentos en el banco del empleado.
      // Trazabilidad: los archivos quedan visibles en el tab Documentos
      // del empleado para auditoria.
      await archivarArchivosEnBancoEmpleado(tx, {
        empleadoId: solicitud.empleado_id,
        empresaId,
        tipoCodigo: 'CARTA_RENUNCIA',
        archivos: (solicitud.archivos ?? []).map((a) => ({
          archivo_url: a.archivo_url,
          archivo_nombre: a.archivo_nombre,
          archivo_tipo: a.archivo_tipo,
          archivo_tamano: a.archivo_tamano,
        })),
        subidoPorUsuarioId: usuarioId,
        descripcion: `Cese aprobado - Solicitud #${id} (${tipoCeseNombre})`,
      });

      return solicitudAprobada;
    });
  }

  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudCeseDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }

    return this.prisma.solicitudCese.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        resuelto_por_id: usuarioId,
        fecha_resolucion: ahoraPeru().toJSDate(),
        observaciones_admin: dto?.observaciones_admin,
      },
    });
  }

  // Para Dashboard: contar pendientes
  async countPendientes(empresaId: number) {
    return this.prisma.solicitudCese.count({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
    });
  }

  // Para Dashboard: listar pendientes
  async findPendientes(empresaId: number) {
    return this.prisma.solicitudCese.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: {
        archivos: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            archivo_url: true,
            archivo_nombre: true,
            archivo_tipo: true,
            archivo_tamano: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            numero_documento: true,
            cargo: { select: { nombre: true } },
          },
        },
        tipo_cese: { select: { id: true, nombre: true } },
        solicitado_por: {
          select: { id: true, nombre_completo: true, email: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }
}
