import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSolicitudAnulacionDto,
  ResolverSolicitudAnulacionDto,
  FilterSolicitudAnulacionDto,
} from './dto';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { archivarArchivosEnBancoEmpleado } from '../banco-documentos/helpers/archivar-en-banco.helper';

@Injectable()
export class SolicitudesAnulacionService {
  constructor(private prisma: PrismaService) {}

  async create(
    empresaId: number,
    dto: CreateSolicitudAnulacionDto,
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
        'Debe adjuntar al menos un documento que respalde la anulación',
      );
    }

    // Validar contrato existe en la empresa y obtener empleado_id
    const contrato = await this.prisma.contrato.findFirst({
      where: { id: dto.contrato_id },
      select: {
        id: true,
        empleado_id: true,
        estado: true,
        empleado: { select: { empresa_id: true } },
      },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    if (contrato.empleado.empresa_id !== empresaId) {
      throw new NotFoundException('Contrato no encontrado');
    }

    if (contrato.estado === 'ANULADO') {
      throw new BadRequestException('Este contrato ya está anulado');
    }

    return this.prisma.solicitudAnulacionContrato.create({
      data: {
        contrato_id: contrato.id,
        empleado_id: contrato.empleado_id,
        empresa_id: empresaId,
        motivo: dto.motivo,
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
      include: this.defaultInclude(),
    });
  }

  async findAll(empresaId: number, filters: FilterSolicitudAnulacionDto) {
    const { buscar, estado, empleado_id, page = 1, limit = 20 } = filters;

    const where: Prisma.SolicitudAnulacionContratoWhereInput = {
      empresa_id: empresaId,
    };
    if (estado) where.estado = estado;
    if (empleado_id) where.empleado_id = empleado_id;

    if (buscar) {
      where.OR = [
        { motivo: { contains: buscar, mode: 'insensitive' } },
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
      this.prisma.solicitudAnulacionContrato.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.solicitudAnulacionContrato.count({ where }),
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
    const solicitud = await this.prisma.solicitudAnulacionContrato.findFirst({
      where: { id, empresa_id: empresaId },
      include: this.defaultInclude(),
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud de anulación no encontrada');
    }
    return solicitud;
  }

  async aprobar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudAnulacionDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes pendientes',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Marcar solicitud como APROBADA
      const solicitudAprobada = await tx.solicitudAnulacionContrato.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          resuelto_por_id: usuarioId,
          fecha_resolucion: ahoraPeru().toJSDate(),
          observaciones_admin: dto?.observaciones_admin,
        },
      });

      // 2. Leer estado actual del contrato (puede haber cambiado entre create y aprobar)
      const contrato = await tx.contrato.findUnique({
        where: { id: solicitud.contrato_id },
        select: {
          id: true,
          empleado_id: true,
          estado: true,
          vinculo_laboral_id: true,
        },
      });
      if (!contrato) throw new NotFoundException('Contrato no encontrado');
      if (contrato.estado === 'ANULADO') {
        throw new BadRequestException(
          'El contrato ya está anulado (posible doble aprobación)',
        );
      }

      const estadoPrevio = contrato.estado;

      // 3. Anular el contrato
      await tx.contrato.update({
        where: { id: contrato.id },
        data: { estado: 'ANULADO' },
      });

      // 4. Logica de reversion segun el estado previo
      if (estadoPrevio === 'CESADO') {
        // El contrato estaba CESADO: revertir TODO el cese.
        // Empleado vuelve a ACTIVO y vinculo asociado vuelve a ACTIVO.
        await tx.empleado.update({
          where: { id: contrato.empleado_id },
          data: { estado: 'ACTIVO', fecha_cese: null },
        });
        if (contrato.vinculo_laboral_id) {
          await tx.vinculoLaboral.update({
            where: { id: contrato.vinculo_laboral_id },
            data: { estado: 'ACTIVO', fecha_fin: null, motivo_cierre: null },
          });
        }
      } else if (estadoPrevio === 'ACTIVO') {
        // Era el contrato vigente. Empleado pasa a estado anterior del vinculo:
        // si tenia contratos previos en PENDIENTE/CESADO, lo dejamos en PENDIENTE.
        // Si era el unico contrato del vinculo, depende del contexto del vinculo.
        const otroVigente = await tx.contrato.findFirst({
          where: {
            empleado_id: contrato.empleado_id,
            estado: 'ACTIVO',
            id: { not: contrato.id },
          },
        });
        if (!otroVigente) {
          await tx.empleado.update({
            where: { id: contrato.empleado_id },
            data: { estado: 'PENDIENTE' },
          });
        }
      }
      // Si era PENDIENTE o RENOVADO: no se toca el empleado.
      // (Caso ROSALES #277 PENDIENTE -> empleado ya estaba PENDIENTE, no cambia.)

      // 5. Archivar copias de los documentos en el banco del empleado
      await archivarArchivosEnBancoEmpleado(tx, {
        empleadoId: contrato.empleado_id,
        empresaId,
        tipoCodigo: 'CARTA_RENUNCIA',
        archivos: solicitud.archivos.map((a) => ({
          archivo_url: a.archivo_url,
          archivo_nombre: a.archivo_nombre,
          archivo_tipo: a.archivo_tipo,
          archivo_tamano: a.archivo_tamano,
        })),
        subidoPorUsuarioId: usuarioId,
        descripcion: `Anulación de contrato #${contrato.id} aprobada — solicitud #${id}`,
      });

      // 6. Registrar movimiento
      await tx.empleadoMovimiento.create({
        data: {
          empleado_id: contrato.empleado_id,
          tipo_movimiento: 'ANULACION_CONTRATO',
          fecha_movimiento: ahoraPeru().toJSDate(),
          motivo: `Anulación de contrato #${contrato.id} aprobada`,
          observaciones: `Solicitud de anulación #${id} aprobada. Estado previo del contrato: ${estadoPrevio}.`,
          usuario_id: usuarioId,
        },
      });

      return solicitudAprobada;
    });
  }

  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto?: ResolverSolicitudAnulacionDto,
  ) {
    const solicitud = await this.findOne(id, empresaId);
    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes pendientes',
      );
    }
    return this.prisma.solicitudAnulacionContrato.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        resuelto_por_id: usuarioId,
        fecha_resolucion: ahoraPeru().toJSDate(),
        observaciones_admin: dto?.observaciones_admin,
      },
    });
  }

  // Dashboard
  async countPendientes(empresaId: number) {
    return this.prisma.solicitudAnulacionContrato.count({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
    });
  }

  async findPendientes(empresaId: number) {
    return this.prisma.solicitudAnulacionContrato.findMany({
      where: { empresa_id: empresaId, estado: 'PENDIENTE' },
      include: this.defaultInclude(),
      orderBy: { created_at: 'asc' },
    });
  }

  private defaultInclude() {
    return {
      archivos: {
        orderBy: { id: 'asc' as const },
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
      contrato: {
        select: {
          id: true,
          tipo_contrato: true,
          fecha_inicio: true,
          fecha_fin: true,
          estado: true,
          numero_renovacion: true,
        },
      },
      solicitado_por: {
        select: { id: true, nombre_completo: true, email: true },
      },
      resuelto_por: {
        select: { id: true, nombre_completo: true, email: true },
      },
    };
  }
}
