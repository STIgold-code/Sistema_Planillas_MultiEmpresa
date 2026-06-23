import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import {
  CreateSolicitudExtensionDto,
  ResponderExtensionDto,
  AccionExtension,
  FilterSolicitudesExtensionDto,
} from './dto';
import { EstadoSolicitudExtension, Prisma } from '@prisma/client';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
import { ahoraPeru } from '../../common/utils/datetime.util';

// Constantes por defecto
const TIEMPO_LIMITE_DEFAULT = 60;
const MAX_EXTENSIONES_DEFAULT = 3;

/**
 * Forma minima de una solicitud de extension usada por las notificaciones.
 * Cubre los campos que leen los generadores de email.
 */
interface SolicitudExtensionNotificable {
  motivo: string;
  tiempo_solicitado_min: number | null;
  usuario: {
    nombre_completo: string;
    email: string | null;
  };
  periodo: {
    anio: number;
    mes: number;
  };
}

@Injectable()
export class ExtensionTareoService {
  private readonly logger = new Logger(ExtensionTareoService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Crea una solicitud de extensión
   */
  async crearSolicitud(
    dto: CreateSolicitudExtensionDto,
    usuarioId: number,
    empresaId: number,
  ) {
    // Verificar que el período existe y pertenece a la empresa
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: dto.periodo_id, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    // Buscar la última sesión del usuario en el período (EXPIRADA o FINALIZADA)
    // El usuario puede solicitar extensión si ya no tiene sesión activa
    let sesionTerminada = await this.prisma.sesionTareo.findFirst({
      where: {
        periodo_id: dto.periodo_id,
        usuario_id: usuarioId,
        empresa_id: empresaId,
        estado: { in: ['EXPIRADA', 'FINALIZADA'] },
      },
      orderBy: { created_at: 'desc' },
    });

    // Si no hay sesión terminada, verificar si hay una ACTIVA cuyo tiempo ya pasó
    if (!sesionTerminada) {
      const sesionActiva = await this.prisma.sesionTareo.findFirst({
        where: {
          periodo_id: dto.periodo_id,
          usuario_id: usuarioId,
          empresa_id: empresaId,
          estado: 'ACTIVA',
        },
        orderBy: { created_at: 'desc' },
      });

      if (sesionActiva) {
        // Calcular si el tiempo ya expiró
        const fechaInicio = new Date(sesionActiva.fecha_inicio);
        const tiempoLimiteMs =
          (sesionActiva.tiempo_limite_minutos || 60) * 60 * 1000;
        const fechaExpiracion = new Date(
          fechaInicio.getTime() + tiempoLimiteMs,
        );
        const ahora = ahoraPeru().toJSDate();

        if (ahora > fechaExpiracion) {
          // El tiempo ya pasó, marcar como EXPIRADA y usarla
          sesionTerminada = await this.prisma.sesionTareo.update({
            where: { id: sesionActiva.id },
            data: { estado: 'EXPIRADA' },
          });
          this.logger.log(
            `Sesión ${sesionActiva.id} marcada como EXPIRADA automáticamente al solicitar extensión`,
          );
        }
      }
    }

    if (!sesionTerminada) {
      throw new BadRequestException(
        'No tienes una sesión finalizada para solicitar extensión. Inicia una sesión primero.',
      );
    }

    // Verificar que la sesión no tenga ya una solicitud
    const solicitudExistente = await this.prisma.solicitudExtension.findUnique({
      where: { sesion_tareo_id: sesionTerminada.id },
    });

    if (solicitudExistente) {
      throw new BadRequestException('Ya existe una solicitud para esta sesión');
    }

    // Verificar que no tenga solicitud pendiente para este período
    const solicitudPendiente = await this.prisma.solicitudExtension.findFirst({
      where: {
        usuario_id: usuarioId,
        periodo_id: dto.periodo_id,
        estado: 'PENDIENTE',
      },
    });

    if (solicitudPendiente) {
      throw new BadRequestException(
        'Ya tienes una solicitud de extensión pendiente para este período',
      );
    }

    // Obtener configuración
    const config = await this.prisma.configuracionTareo.findUnique({
      where: { empresa_id: empresaId },
    });

    const maxExtensiones =
      config?.max_extensiones_periodo ?? MAX_EXTENSIONES_DEFAULT;

    // Verificar límite de extensiones por período
    const extensionesAprobadas = await this.prisma.solicitudExtension.count({
      where: {
        usuario_id: usuarioId,
        periodo_id: dto.periodo_id,
        estado: 'APROBADA',
      },
    });

    if (extensionesAprobadas >= maxExtensiones) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${maxExtensiones} extensiones para este período`,
      );
    }

    // Crear solicitud
    const solicitud = await this.prisma.solicitudExtension.create({
      data: {
        empresa_id: empresaId,
        periodo_id: dto.periodo_id,
        usuario_id: usuarioId,
        sesion_tareo_id: sesionTerminada.id,
        motivo: dto.motivo,
        tiempo_solicitado_min: dto.tiempo_solicitado_min || 30,
      },
      include: {
        usuario: { select: { id: true, nombre_completo: true, email: true } },
        periodo: { select: { anio: true, mes: true } },
      },
    });

    // Notificar a correctores si está configurado
    if (config?.notificar_email !== false) {
      await this.notificarCorrectores(solicitud, empresaId);
    }

    this.logger.log(
      `Solicitud de extensión creada: ${solicitud.id} por usuario ${usuarioId}`,
    );

    return solicitud;
  }

  /**
   * Lista solicitudes de extensión (para corrector/admin)
   */
  async listarSolicitudes(
    empresaId: number,
    filters: FilterSolicitudesExtensionDto,
  ) {
    const { periodo_id, estado, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SolicitudExtensionWhereInput = {
      empresa_id: empresaId,
    };

    if (periodo_id) where.periodo_id = periodo_id;
    if (estado) where.estado = estado as EstadoSolicitudExtension;

    const [data, total] = await Promise.all([
      this.prisma.solicitudExtension.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_solicitud: 'desc' },
        include: {
          usuario: {
            select: { id: true, nombre_completo: true, email: true },
          },
          periodo: { select: { anio: true, mes: true } },
          aprobado_por: { select: { id: true, nombre_completo: true } },
        },
      }),
      this.prisma.solicitudExtension.count({ where }),
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

  /**
   * Lista solicitudes propias del usuario
   */
  async misSolicitudes(usuarioId: number, empresaId: number) {
    return this.prisma.solicitudExtension.findMany({
      where: {
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
      orderBy: { fecha_solicitud: 'desc' },
      include: {
        periodo: { select: { anio: true, mes: true } },
        aprobado_por: { select: { nombre_completo: true } },
      },
    });
  }

  /**
   * Obtiene una solicitud por ID
   */
  async obtenerSolicitud(solicitudId: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudExtension.findFirst({
      where: { id: solicitudId, empresa_id: empresaId },
      include: {
        usuario: { select: { id: true, nombre_completo: true, email: true } },
        periodo: { select: { anio: true, mes: true } },
        aprobado_por: { select: { id: true, nombre_completo: true } },
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    return solicitud;
  }

  /**
   * Responde a una solicitud (corrector/admin)
   */
  async responderSolicitud(
    solicitudId: number,
    dto: ResponderExtensionDto,
    aprobadorId: number,
    empresaId: number,
  ) {
    const solicitud = await this.prisma.solicitudExtension.findFirst({
      where: { id: solicitudId, empresa_id: empresaId },
      include: {
        usuario: { select: { id: true, nombre_completo: true, email: true } },
        sesion: true,
        periodo: { select: { id: true, anio: true, mes: true } },
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    const nuevoEstado =
      dto.accion === AccionExtension.APROBAR ? 'APROBADA' : 'RECHAZADA';

    // Obtener configuración para el tiempo de sesión
    const config = await this.prisma.configuracionTareo.findUnique({
      where: { empresa_id: empresaId },
    });

    const tiempoOtorgado =
      dto.tiempo_otorgado_min ||
      solicitud.tiempo_solicitado_min ||
      config?.tiempo_limite_minutos ||
      TIEMPO_LIMITE_DEFAULT;

    // Transacción para actualizar solicitud y crear nueva sesión si aplica
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      const solicitudActualizada = await tx.solicitudExtension.update({
        where: { id: solicitudId },
        data: {
          estado: nuevoEstado,
          aprobado_por_id: aprobadorId,
          fecha_respuesta: ahoraPeru().toJSDate(),
          comentario_respuesta: dto.comentario,
        },
        include: {
          usuario: { select: { id: true, nombre_completo: true, email: true } },
          periodo: { select: { anio: true, mes: true } },
          aprobado_por: { select: { id: true, nombre_completo: true } },
        },
      });

      // Si se aprueba, crear nueva sesión
      if (dto.accion === AccionExtension.APROBAR) {
        // ERR-003: Invalidar sesiones activas previas antes de crear la nueva
        await tx.sesionTareo.updateMany({
          where: {
            usuario_id: solicitud.usuario_id,
            periodo_id: solicitud.periodo_id,
            estado: 'ACTIVA',
          },
          data: { estado: 'EXPIRADA' },
        });

        await tx.sesionTareo.create({
          data: {
            empresa_id: empresaId,
            periodo_id: solicitud.periodo_id,
            usuario_id: solicitud.usuario_id,
            fecha: ahoraPeru().startOf('day').toJSDate(),
            tiempo_limite_minutos: tiempoOtorgado,
            estado: 'ACTIVA',
            ultimo_heartbeat: ahoraPeru().toJSDate(), // ERR-005: Inicializar heartbeat
          },
        });
      }

      return solicitudActualizada;
    });

    // Notificar al solicitante
    if (config?.notificar_email !== false && solicitud.usuario.email) {
      await this.notificarSolicitante(
        solicitud,
        nuevoEstado,
        dto.comentario,
        tiempoOtorgado,
      );
    }

    this.logger.log(
      `Solicitud ${solicitudId} ${nuevoEstado} por usuario ${aprobadorId}`,
    );

    return resultado;
  }

  /**
   * Obtiene el conteo de solicitudes pendientes (para badge)
   */
  async contarPendientes(empresaId: number): Promise<number> {
    return this.prisma.solicitudExtension.count({
      where: {
        empresa_id: empresaId,
        estado: 'PENDIENTE',
      },
    });
  }

  /**
   * Verifica si el usuario tiene solicitud pendiente para un período
   */
  async tieneSolicitudPendiente(
    usuarioId: number,
    periodoId: number,
    empresaId: number,
  ): Promise<boolean> {
    const count = await this.prisma.solicitudExtension.count({
      where: {
        usuario_id: usuarioId,
        periodo_id: periodoId,
        empresa_id: empresaId,
        estado: 'PENDIENTE',
      },
    });
    return count > 0;
  }

  /**
   * Notifica a los correctores sobre una nueva solicitud
   */
  private async notificarCorrectores(
    solicitud: SolicitudExtensionNotificable,
    empresaId: number,
  ) {
    try {
      // Buscar usuarios con permiso de corrector
      const correctores = await this.prisma.usuario.findMany({
        where: {
          empresa_id: empresaId,
          activo: true,
          rol: {
            permisos: {
              hasSome: ['*', 'tareo:*', 'tareo:corregir'],
            },
          },
        },
        select: { email: true, nombre_completo: true },
      });

      const emailPromises = correctores
        .filter((c) => c.email)
        .map((corrector) =>
          this.emailService.sendEmail({
            to: corrector.email,
            subject: `[Tareo] Nueva solicitud de extensión - ${solicitud.usuario.nombre_completo}`,
            html: this.generarEmailSolicitud(solicitud),
          }),
        );

      await Promise.allSettled(emailPromises);
    } catch (error) {
      this.logger.error('Error notificando a correctores:', error);
    }
  }

  /**
   * Notifica al solicitante sobre la respuesta
   */
  private async notificarSolicitante(
    solicitud: SolicitudExtensionNotificable,
    estado: string,
    comentario?: string,
    tiempoOtorgado?: number,
  ) {
    try {
      const esAprobada = estado === 'APROBADA';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${esAprobada ? '#22c55e' : '#ef4444'};">
            Solicitud de Extensión ${esAprobada ? 'Aprobada' : 'Rechazada'}
          </h2>
          <p>Estimado(a) <strong>${escapeHtml(solicitud.usuario.nombre_completo)}</strong>,</p>
          <p>Tu solicitud de extensión para el tareo del período
             <strong>${solicitud.periodo.mes}/${solicitud.periodo.anio}</strong>
             ha sido <strong>${estado.toLowerCase()}</strong>.
          </p>
          ${comentario ? `<p><strong>Comentario:</strong> ${escapeHtml(comentario)}</p>` : ''}
          ${esAprobada ? `<p><strong>Tiempo otorgado:</strong> ${tiempoOtorgado} minutos</p><p>Ya puedes continuar editando el tareo.</p>` : '<p>Si necesitas más información, contacta al corrector.</p>'}
          <br>
          <p style="color: #666; font-size: 12px;">
            Este es un correo automático, por favor no responda a este mensaje.
          </p>
        </div>
      `;

      if (!solicitud.usuario.email) {
        return;
      }

      await this.emailService.sendEmail({
        to: solicitud.usuario.email,
        subject: `[Tareo] Tu solicitud de extensión fue ${estado.toLowerCase()}`,
        html,
      });
    } catch (error) {
      this.logger.error('Error notificando al solicitante:', error);
    }
  }

  /**
   * Genera el HTML del email de solicitud
   */
  private generarEmailSolicitud(
    solicitud: SolicitudExtensionNotificable,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Nueva Solicitud de Extensión de Tareo</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Solicitante:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(solicitud.usuario.nombre_completo)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Período:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${solicitud.periodo.mes}/${solicitud.periodo.anio}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Tiempo solicitado:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${solicitud.tiempo_solicitado_min} minutos</td>
          </tr>
        </table>
        <p><strong>Motivo:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0;">
          ${escapeHtml(solicitud.motivo)}
        </div>
        <p style="margin-top: 20px;">
          Ingresa al sistema para aprobar o rechazar esta solicitud.
        </p>
        <br>
        <p style="color: #666; font-size: 12px;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `;
  }
}
