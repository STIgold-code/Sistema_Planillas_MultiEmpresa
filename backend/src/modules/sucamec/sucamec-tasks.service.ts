import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ahoraPeru, sumarDiasPeru } from '../../common/utils/datetime.util';

@Injectable()
export class SucamecTasksService {
  private readonly logger = new Logger(SucamecTasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Ejecuta diariamente a las 00:05 para actualizar carnets SUCAMEC vencidos
   * Los carnets con fecha_vencimiento menor a hoy y estado VIGENTE pasan a VENCIDO
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarCarnetesVencidos() {
    this.logger.log('Iniciando actualización de carnets SUCAMEC vencidos...');

    // Usar zona horaria Perú para determinar "hoy"
    const hoy = ahoraPeru().startOf('day').toJSDate();

    try {
      // Actualizar carnets a VENCIDO
      const resultado = await this.prisma.carnetSucamec.updateMany({
        where: {
          estado: 'VIGENTE',
          fecha_vencimiento: {
            lt: hoy,
          },
        },
        data: {
          estado: 'VENCIDO',
        },
      });

      if (resultado.count > 0) {
        this.logger.log(
          `Se actualizaron ${resultado.count} carnets SUCAMEC a estado VENCIDO`,
        );
      } else {
        this.logger.log('No hay carnets SUCAMEC por vencer hoy');
      }

      return resultado;
    } catch (error) {
      this.logger.error('Error al actualizar carnets SUCAMEC vencidos:', error);
      throw error;
    }
  }

  /**
   * Método público para ejecutar manualmente la actualización
   */
  async ejecutarActualizacionManual() {
    return this.actualizarCarnetesVencidos();
  }

  /**
   * Obtiene carnets SUCAMEC que vencerán en los próximos N días
   */
  async getCarnetsPorVencer(dias: number = 30) {
    // Usar zona horaria Perú para el cálculo de fechas
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const fechaLimite = sumarDiasPeru(hoy, dias);

    return this.prisma.carnetSucamec.findMany({
      where: {
        estado: 'VIGENTE',
        fecha_vencimiento: {
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
        fecha_vencimiento: 'asc',
      },
    });
  }

  /**
   * Obtiene estadísticas de carnets por vencer agrupadas por empresa
   */
  async getEstadisticasPorVencer(dias: number = 30) {
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const fechaLimite = sumarDiasPeru(hoy, dias);

    const result = await this.prisma.carnetSucamec.groupBy({
      by: ['categoria'],
      where: {
        estado: 'VIGENTE',
        fecha_vencimiento: {
          gte: hoy,
          lte: fechaLimite,
        },
      },
      _count: {
        id: true,
      },
    });

    return result.map((r) => ({
      categoria: r.categoria,
      cantidad: r._count.id,
    }));
  }
}
