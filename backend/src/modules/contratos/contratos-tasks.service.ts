import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoEmpleado } from '@prisma/client';
import { ahoraPeru, sumarDiasPeru } from '../../common/utils/datetime.util';

@Injectable()
export class ContratosTasksService {
  private readonly logger = new Logger(ContratosTasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ejecuta diariamente a las 00:05 para actualizar contratos vencidos
   * Los contratos con fecha_fin menor a hoy y estado VIGENTE pasan a VENCIDO
   * Ademas, si el empleado no tiene otros contratos vigentes, pasa a SUSPENDIDO
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarContratosVencidos() {
    this.logger.log('Iniciando actualizacion de contratos vencidos...');

    // Usar zona horaria Peru para determinar "hoy"
    const hoy = ahoraPeru().startOf('day').toJSDate();

    try {
      // Primero obtenemos los contratos que van a vencer para identificar los empleados afectados
      const contratosAVencer = await this.prisma.contrato.findMany({
        where: {
          estado: 'ACTIVO',
          fecha_fin: {
            lt: hoy,
            not: null,
          },
        },
        select: {
          id: true,
          empleado_id: true,
        },
      });

      // Actualizar contratos a VENCIDO
      const resultado = await this.prisma.contrato.updateMany({
        where: {
          estado: 'ACTIVO',
          fecha_fin: {
            lt: hoy,
            not: null,
          },
        },
        data: {
          estado: 'PENDIENTE',
        },
      });

      if (resultado.count > 0) {
        this.logger.log(
          `Se actualizaron ${resultado.count} contratos a estado VENCIDO`,
        );

        // Obtener IDs unicos de empleados cuyos contratos vencieron
        const empleadoIds = [
          ...new Set(contratosAVencer.map((c) => c.empleado_id)),
        ];

        // Para cada empleado, verificar si tiene otros contratos vigentes
        let empleadosSuspendidos = 0;
        for (const empleadoId of empleadoIds) {
          const tieneContratoVigente = await this.prisma.contrato.findFirst({
            where: {
              empleado_id: empleadoId,
              estado: 'ACTIVO',
            },
          });

          // Si no tiene contrato vigente, verificar estado actual del empleado
          if (!tieneContratoVigente) {
            const empleado = await this.prisma.empleado.findUnique({
              where: { id: empleadoId },
              select: { id: true, estado: true },
            });

            // Solo pasar a PENDIENTE si está ACTIVO (no si está CESADO)
            if (empleado && empleado.estado === EstadoEmpleado.ACTIVO) {
              await this.prisma.empleado.update({
                where: { id: empleadoId },
                data: { estado: EstadoEmpleado.PENDIENTE },
              });

              // Registrar movimiento por contrato vencido
              await this.prisma.empleadoMovimiento.create({
                data: {
                  empleado_id: empleadoId,
                  tipo_movimiento: 'SUSPENSION',
                  fecha_movimiento: hoy,
                  motivo:
                    'Contrato vencido sin renovación - Empleado en estado PENDIENTE',
                },
              });

              empleadosSuspendidos++;
              this.logger.log(
                `Empleado ${empleadoId} en PENDIENTE por vencimiento de contrato`,
              );
            }
          }
        }

        if (empleadosSuspendidos > 0) {
          this.logger.log(
            `Se suspendieron ${empleadosSuspendidos} empleados por vencimiento de contrato`,
          );
        }
      } else {
        this.logger.log('No hay contratos por vencer hoy');
      }

      return resultado;
    } catch (error) {
      this.logger.error('Error al actualizar contratos vencidos:', error);
      throw error;
    }
  }

  /**
   * Método público para ejecutar manualmente la actualización
   */
  async ejecutarActualizacionManual() {
    return this.actualizarContratosVencidos();
  }

  /**
   * Obtiene contratos que vencerán en los próximos N días
   */
  async getContratosPorVencer(dias: number = 30) {
    // Usar zona horaria Peru para el calculo de fechas
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const fechaLimite = sumarDiasPeru(hoy, dias);

    return this.prisma.contrato.findMany({
      where: {
        estado: 'ACTIVO',
        fecha_fin: {
          gte: hoy,
          lte: fechaLimite,
        },
      },
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
        fecha_fin: 'asc',
      },
    });
  }
}
