import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EstadoSolicitudVacaciones,
  EstadoEmpleado,
  Prisma,
} from '@prisma/client';
import { ahoraPeru, sumarDiasPeru } from '../../common/utils/datetime.util';

@Injectable()
export class VacacionesTasksService {
  private readonly logger = new Logger(VacacionesTasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ejecuta diariamente a las 00:10 para actualizar estados de vacaciones
   * - Marca solicitudes APROBADAS como EN_GOCE cuando inicia el periodo
   * - Marca solicitudes EN_GOCE como GOZADA cuando termina el periodo
   * - Retorna empleados con estado VACACIONES a ACTIVO cuando terminan sus vacaciones
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarEstadosVacaciones() {
    this.logger.log('Iniciando actualizacion de estados de vacaciones...');

    const hoy = ahoraPeru().startOf('day').toJSDate();

    try {
      // 1. Marcar solicitudes aprobadas que inician hoy como EN_GOCE
      // y actualizar estado del empleado a VACACIONES
      const solicitudesIniciando =
        await this.prisma.solicitudVacaciones.findMany({
          where: {
            estado: EstadoSolicitudVacaciones.APROBADA,
            OR: [
              { fecha_inicio_aprobada: { lte: hoy } },
              {
                fecha_inicio_aprobada: null,
                fecha_inicio_solicitada: { lte: hoy },
              },
            ],
          },
          select: {
            id: true,
            empleado_id: true,
            fecha_fin_aprobada: true,
            fecha_fin_solicitada: true,
          },
        });

      if (solicitudesIniciando.length > 0) {
        // Actualizar solicitudes a EN_GOCE
        await this.prisma.solicitudVacaciones.updateMany({
          where: {
            id: { in: solicitudesIniciando.map((s) => s.id) },
          },
          data: {
            estado: EstadoSolicitudVacaciones.EN_GOCE,
          },
        });

        // Actualizar empleados a estado VACACIONES
        // Nota: Los empleados mantienen estado ACTIVO durante vacaciones
        // El estado de la solicitud (EN_GOCE) indica que están en vacaciones
        const empleadoIds = [
          ...new Set(solicitudesIniciando.map((s) => s.empleado_id)),
        ];

        this.logger.log(
          `Se marcaron ${solicitudesIniciando.length} solicitudes como EN_GOCE (${empleadoIds.length} empleados)`,
        );
      }

      // 2. Marcar solicitudes EN_GOCE que terminaron ayer como GOZADA
      // y retornar empleados a estado ACTIVO
      const solicitudesTerminadas =
        await this.prisma.solicitudVacaciones.findMany({
          where: {
            estado: EstadoSolicitudVacaciones.EN_GOCE,
            OR: [
              { fecha_fin_aprobada: { lt: hoy } },
              {
                fecha_fin_aprobada: null,
                fecha_fin_solicitada: { lt: hoy },
              },
            ],
          },
          select: {
            id: true,
            empleado_id: true,
          },
        });

      if (solicitudesTerminadas.length > 0) {
        // Actualizar solicitudes a GOZADA
        await this.prisma.solicitudVacaciones.updateMany({
          where: {
            id: { in: solicitudesTerminadas.map((s) => s.id) },
          },
          data: {
            estado: EstadoSolicitudVacaciones.GOZADA,
          },
        });

        // Obtener IDs unicos de empleados que terminaron vacaciones
        const empleadoIdsTerminados = [
          ...new Set(solicitudesTerminadas.map((s) => s.empleado_id)),
        ];

        // Verificar que no tengan OTRAS solicitudes EN_GOCE activas
        for (const empleadoId of empleadoIdsTerminados) {
          const tieneOtrasVacacionesActivas =
            await this.prisma.solicitudVacaciones.findFirst({
              where: {
                empleado_id: empleadoId,
                estado: EstadoSolicitudVacaciones.EN_GOCE,
              },
            });

          // Solo retornar a ACTIVO si no tiene otras vacaciones activas
          if (!tieneOtrasVacacionesActivas) {
            // Verificar que el empleado tenga contrato vigente antes de marcarlo ACTIVO
            const tieneContratoVigente = await this.prisma.contrato.findFirst({
              where: {
                empleado_id: empleadoId,
                estado: 'ACTIVO',
              },
            });

            const nuevoEstado = tieneContratoVigente
              ? EstadoEmpleado.ACTIVO
              : EstadoEmpleado.PENDIENTE;

            await this.prisma.empleado.update({
              where: { id: empleadoId },
              data: { estado: nuevoEstado },
            });

            this.logger.log(
              `Empleado ${empleadoId} actualizado a estado ${nuevoEstado} tras finalizar vacaciones`,
            );
          }
        }

        this.logger.log(
          `Se marcaron ${solicitudesTerminadas.length} solicitudes como GOZADA`,
        );
      }

      if (
        solicitudesIniciando.length === 0 &&
        solicitudesTerminadas.length === 0
      ) {
        this.logger.log('No hay cambios de estado de vacaciones hoy');
      }

      return {
        solicitudes_iniciando: solicitudesIniciando.length,
        solicitudes_terminadas: solicitudesTerminadas.length,
      };
    } catch (error) {
      this.logger.error('Error al actualizar estados de vacaciones:', error);
      throw error;
    }
  }

  /**
   * Metodo publico para ejecutar manualmente la actualizacion
   */
  async ejecutarActualizacionManual() {
    return this.actualizarEstadosVacaciones();
  }

  /**
   * Obtiene empleados actualmente de vacaciones
   */
  async getEmpleadosEnVacaciones(empresaId?: number) {
    const where: Prisma.SolicitudVacacionesWhereInput = {
      estado: EstadoSolicitudVacaciones.EN_GOCE,
    };

    if (empresaId) {
      where.empresa_id = empresaId;
    }

    return this.prisma.solicitudVacaciones.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            email: true,
            empresa_id: true,
            estado: true,
          },
        },
      },
      orderBy: {
        fecha_fin_aprobada: 'asc',
      },
    });
  }

  /**
   * Obtiene solicitudes de vacaciones que terminan en los proximos N dias
   */
  async getVacacionesPorTerminar(dias: number = 7, empresaId?: number) {
    const hoy = ahoraPeru().toJSDate();
    const fechaLimite = sumarDiasPeru(hoy, dias);

    const where: Prisma.SolicitudVacacionesWhereInput = {
      estado: EstadoSolicitudVacaciones.EN_GOCE,
      OR: [
        {
          fecha_fin_aprobada: {
            gte: hoy,
            lte: fechaLimite,
          },
        },
        {
          fecha_fin_aprobada: null,
          fecha_fin_solicitada: {
            gte: hoy,
            lte: fechaLimite,
          },
        },
      ],
    };

    if (empresaId) {
      where.empresa_id = empresaId;
    }

    return this.prisma.solicitudVacaciones.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            email: true,
            empresa_id: true,
          },
        },
      },
      orderBy: {
        fecha_fin_aprobada: 'asc',
      },
    });
  }
}
