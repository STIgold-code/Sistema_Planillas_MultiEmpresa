import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  EstadoSolicitudVacaciones,
  EstadoPeriodoVacacional,
  TipoMovimientoVacacional,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccionAprobacion } from './dto/aprobar-solicitud.dto';
import { AprobarJefeDto, AprobarRrhhDto, CancelarSolicitudDto } from './dto';
import { VacacionesTareoSyncService } from './vacaciones-tareo-sync.service';
import {
  ahoraPeru,
  formatearFechaPeru,
  parsearFechaISOenPeru,
} from '../../common/utils/datetime.util';

/**
 * Servicio de aprobacion/rechazo/cancelacion de solicitudes de vacaciones.
 * Extraido de VacacionesSolicitudesService para mantener archivos < 400 LOC.
 */
@Injectable()
export class VacacionesAprobacionService {
  private readonly logger = new Logger(VacacionesAprobacionService.name);

  constructor(
    private prisma: PrismaService,
    private tareoSyncService: VacacionesTareoSyncService,
  ) {}

  // Finder local para evitar dep circular con el principal.
  private async findOneSolicitud(id: number, empresaId: number) {
    const solicitud = await this.prisma.solicitudVacaciones.findFirst({
      where: { id, empresa_id: empresaId },
      include: {
        empleado: {
          select: {
            id: true,
            numero_documento: true,
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
          },
        },
        periodo_vacacional: true,
      },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
  }

  async aprobarPorJefe(
    id: number,
    empresaId: number,
    dto: AprobarJefeDto,
    usuarioId: number,
  ) {
    const solicitud = await this.findOneSolicitud(id, empresaId);

    if (solicitud.estado !== EstadoSolicitudVacaciones.PENDIENTE_JEFE) {
      throw new BadRequestException(
        'Esta solicitud no está pendiente de aprobación del jefe',
      );
    }

    if (dto.accion === AccionAprobacion.RECHAZAR) {
      if (!dto.motivo_rechazo) {
        throw new BadRequestException('Debe indicar el motivo del rechazo');
      }

      const resultado = await this.prisma.solicitudVacaciones.update({
        where: { id },
        data: {
          estado: EstadoSolicitudVacaciones.RECHAZADA,
          motivo_rechazo: dto.motivo_rechazo,
          rechazado_por_id: usuarioId,
          fecha_respuesta_jefe: ahoraPeru().toJSDate(),
        },
      });

      return resultado;
    }

    if (dto.accion === AccionAprobacion.MODIFICAR) {
      if (!dto.fecha_inicio_aprobada || !dto.fecha_fin_aprobada) {
        throw new BadRequestException(
          'Debe indicar las nuevas fechas aprobadas',
        );
      }

      const resultado = await this.prisma.solicitudVacaciones.update({
        where: { id },
        data: {
          estado: EstadoSolicitudVacaciones.PENDIENTE_RRHH,
          fecha_inicio_aprobada: parsearFechaISOenPeru(
            dto.fecha_inicio_aprobada,
          ),
          fecha_fin_aprobada: parsearFechaISOenPeru(dto.fecha_fin_aprobada),
          dias_aprobados: dto.dias_aprobados ?? solicitud.dias_solicitados,
          motivo_modificacion: dto.motivo_modificacion,
          observacion_jefe: dto.observacion,
          aprobado_por_jefe_id: usuarioId,
          fecha_respuesta_jefe: ahoraPeru().toJSDate(),
        },
      });

      return resultado;
    }

    // APROBAR sin cambios
    const resultado = await this.prisma.solicitudVacaciones.update({
      where: { id },
      data: {
        estado: EstadoSolicitudVacaciones.PENDIENTE_RRHH,
        fecha_inicio_aprobada: solicitud.fecha_inicio_solicitada,
        fecha_fin_aprobada: solicitud.fecha_fin_solicitada,
        dias_aprobados: solicitud.dias_solicitados,
        observacion_jefe: dto.observacion,
        aprobado_por_jefe_id: usuarioId,
        fecha_respuesta_jefe: ahoraPeru().toJSDate(),
      },
    });

    return resultado;
  }

  async aprobarPorRrhh(
    id: number,
    empresaId: number,
    dto: AprobarRrhhDto,
    usuarioId: number,
  ) {
    const solicitud = await this.findOneSolicitud(id, empresaId);

    if (solicitud.estado !== EstadoSolicitudVacaciones.PENDIENTE_RRHH) {
      throw new BadRequestException(
        'Esta solicitud no está pendiente de aprobación de RRHH',
      );
    }

    if (dto.accion === AccionAprobacion.RECHAZAR) {
      if (!dto.motivo_rechazo) {
        throw new BadRequestException('Debe indicar el motivo del rechazo');
      }

      const resultado = await this.prisma.solicitudVacaciones.update({
        where: { id },
        data: {
          estado: EstadoSolicitudVacaciones.RECHAZADA,
          motivo_rechazo: dto.motivo_rechazo,
          rechazado_por_id: usuarioId,
          fecha_respuesta_rrhh: ahoraPeru().toJSDate(),
        },
      });

      return resultado;
    }

    // APROBAR - actualizar período y crear movimiento
    const diasAprobados =
      solicitud.dias_aprobados ?? solicitud.dias_solicitados;

    await this.prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      await tx.solicitudVacaciones.update({
        where: { id },
        data: {
          estado: EstadoSolicitudVacaciones.APROBADA,
          observacion_rrhh: dto.observacion,
          aprobado_por_rrhh_id: usuarioId,
          fecha_respuesta_rrhh: ahoraPeru().toJSDate(),
        },
      });

      // Crear movimiento de goce - usando zona horaria Peru para formateo
      await tx.movimientoVacacional.create({
        data: {
          periodo_vacacional_id: solicitud.periodo_vacacional_id,
          empleado_id: solicitud.empleado_id,
          empresa_id: empresaId,
          tipo: TipoMovimientoVacacional.GOCE,
          dias: diasAprobados,
          fecha_movimiento:
            solicitud.fecha_inicio_aprobada ||
            solicitud.fecha_inicio_solicitada,
          solicitud_id: id,
          concepto: `Goce de vacaciones del ${formatearFechaPeru(solicitud.fecha_inicio_aprobada || solicitud.fecha_inicio_solicitada)} al ${formatearFechaPeru(solicitud.fecha_fin_aprobada || solicitud.fecha_fin_solicitada)}`,
          usuario_id: usuarioId,
        },
      });

      // Si incluye venta, crear movimiento adicional
      if (solicitud.incluye_venta && solicitud.dias_venta > 0) {
        await tx.movimientoVacacional.create({
          data: {
            periodo_vacacional_id: solicitud.periodo_vacacional_id,
            empleado_id: solicitud.empleado_id,
            empresa_id: empresaId,
            tipo: TipoMovimientoVacacional.VENTA,
            dias: solicitud.dias_venta,
            fecha_movimiento: ahoraPeru().toJSDate(),
            solicitud_id: id,
            concepto: `Venta de ${solicitud.dias_venta} días de vacaciones`,
            usuario_id: usuarioId,
          },
        });
      }

      // Re-leer período DENTRO de la transacción para evitar race conditions
      const periodoActual = await tx.periodoVacacional.findUnique({
        where: { id: solicitud.periodo_vacacional_id },
        select: { dias_pendientes: true },
      });

      if (!periodoActual) {
        throw new BadRequestException('Período vacacional no encontrado');
      }

      // Actualizar período vacacional con datos frescos
      const totalDias = diasAprobados + (solicitud.dias_venta || 0);
      const nuevosDiasPendientes = periodoActual.dias_pendientes - totalDias;

      await tx.periodoVacacional.update({
        where: { id: solicitud.periodo_vacacional_id },
        data: {
          dias_gozados: { increment: diasAprobados },
          dias_vendidos: { increment: solicitud.dias_venta || 0 },
          dias_pendientes: { decrement: totalDias },
          estado:
            nuevosDiasPendientes <= 0
              ? EstadoPeriodoVacacional.AGOTADO
              : EstadoPeriodoVacacional.PARCIAL,
        },
      });
    });

    // Sincronizar con Tareo - marcar días como VAC
    try {
      const resultadoSync = await this.tareoSyncService.sincronizarConTareo(
        {
          id: solicitud.id,
          empleado_id: solicitud.empleado_id,
          empresa_id: empresaId,
          fecha_inicio_aprobada: solicitud.fecha_inicio_aprobada,
          fecha_fin_aprobada: solicitud.fecha_fin_aprobada,
          fecha_inicio_solicitada: solicitud.fecha_inicio_solicitada,
          fecha_fin_solicitada: solicitud.fecha_fin_solicitada,
          dias_aprobados: diasAprobados,
          dias_solicitados: solicitud.dias_solicitados,
          empleado: solicitud.empleado
            ? {
                nombres: solicitud.empleado.nombres,
                apellido_paterno: solicitud.empleado.apellido_paterno,
                apellido_materno: solicitud.empleado.apellido_materno || '',
              }
            : undefined,
        },
        usuarioId,
      );

      if (resultadoSync.advertencias.length > 0) {
        this.logger.warn(
          `Advertencias al sincronizar vacaciones #${id}: ${resultadoSync.advertencias.join(', ')}`,
        );
      }

      if (!resultadoSync.exito) {
        this.logger.error(
          `Error al sincronizar vacaciones #${id} con tareo: ${resultadoSync.errores.join(', ')}`,
        );
      }
    } catch (error) {
      // No fallar la aprobación si la sincronización falla, solo loguear
      this.logger.error(
        `Error inesperado al sincronizar vacaciones #${id} con tareo: ${error.message}`,
      );
    }

    return this.findOneSolicitud(id, empresaId);
  }

  async cancelarSolicitud(
    id: number,
    empresaId: number,
    dto: CancelarSolicitudDto,
    usuarioId: number,
  ) {
    const solicitud = await this.findOneSolicitud(id, empresaId);

    // C2: Permitir cancelar solicitudes EN_GOCE (retorno anticipado)
    const estadosCancelables: EstadoSolicitudVacaciones[] = [
      EstadoSolicitudVacaciones.APROBADA,
      EstadoSolicitudVacaciones.PENDIENTE_JEFE,
      EstadoSolicitudVacaciones.PENDIENTE_RRHH,
      EstadoSolicitudVacaciones.EN_GOCE, // Retorno anticipado
    ];
    if (!estadosCancelables.includes(solicitud.estado)) {
      throw new BadRequestException(
        'Solo se pueden cancelar solicitudes pendientes, aprobadas o en goce',
      );
    }

    // Si estaba aprobada o en goce, revertir/ajustar los días
    if (
      solicitud.estado === EstadoSolicitudVacaciones.APROBADA ||
      solicitud.estado === EstadoSolicitudVacaciones.EN_GOCE
    ) {
      const diasAprobados =
        solicitud.dias_aprobados ?? solicitud.dias_solicitados;
      // Usar zona horaria Peru para calcular días gozados
      const hoy = ahoraPeru().toJSDate();

      // C2: Calcular días realmente gozados si está EN_GOCE
      let diasRealmenteGozados = 0;
      let diasADevolver = diasAprobados;

      if (solicitud.estado === EstadoSolicitudVacaciones.EN_GOCE) {
        const fechaInicio =
          solicitud.fecha_inicio_aprobada || solicitud.fecha_inicio_solicitada;
        // Calcular días transcurridos desde inicio hasta hoy
        const diffTime = hoy.getTime() - fechaInicio.getTime();
        diasRealmenteGozados = Math.max(
          0,
          Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        );
        diasADevolver = Math.max(0, diasAprobados - diasRealmenteGozados);
      }

      const totalDiasADevolver = diasADevolver + (solicitud.dias_venta || 0);

      await this.prisma.$transaction(async (tx) => {
        await tx.solicitudVacaciones.update({
          where: { id },
          data: {
            estado: EstadoSolicitudVacaciones.CANCELADA,
            motivo_cancelacion: dto.motivo_cancelacion,
            cancelado_por_id: usuarioId,
            fecha_cancelacion: ahoraPeru().toJSDate(),
          },
        });

        // Obtener período actual para H1: determinar estado correcto
        const periodoActual = await tx.periodoVacacional.findUnique({
          where: { id: solicitud.periodo_vacacional_id },
        });

        // Calcular nuevos valores
        const nuevosDiasGozados = Math.max(
          0,
          (periodoActual?.dias_gozados || 0) - diasADevolver,
        );
        const nuevosDiasVendidos = Math.max(
          0,
          (periodoActual?.dias_vendidos || 0) - (solicitud.dias_venta || 0),
        );
        const nuevosDiasPendientes =
          (periodoActual?.dias_pendientes || 0) + totalDiasADevolver;

        // H1: Determinar estado correcto del período
        let nuevoEstadoPeriodo: EstadoPeriodoVacacional;
        if (
          nuevosDiasPendientes >= (periodoActual?.dias_correspondientes || 30)
        ) {
          nuevoEstadoPeriodo = EstadoPeriodoVacacional.DISPONIBLE;
        } else if (nuevosDiasPendientes > 0) {
          nuevoEstadoPeriodo = EstadoPeriodoVacacional.PARCIAL;
        } else {
          nuevoEstadoPeriodo = EstadoPeriodoVacacional.AGOTADO;
        }

        // Revertir período con estado correcto
        await tx.periodoVacacional.update({
          where: { id: solicitud.periodo_vacacional_id },
          data: {
            dias_gozados: nuevosDiasGozados,
            dias_vendidos: nuevosDiasVendidos,
            dias_pendientes: nuevosDiasPendientes,
            estado: nuevoEstadoPeriodo,
          },
        });

        // Crear movimiento de ajuste
        const conceptoAjuste =
          solicitud.estado === EstadoSolicitudVacaciones.EN_GOCE
            ? `Retorno anticipado (${diasRealmenteGozados} días gozados, ${diasADevolver} días devueltos): ${dto.motivo_cancelacion}`
            : `Cancelación de solicitud: ${dto.motivo_cancelacion}`;

        await tx.movimientoVacacional.create({
          data: {
            periodo_vacacional_id: solicitud.periodo_vacacional_id,
            empleado_id: solicitud.empleado_id,
            empresa_id: empresaId,
            tipo: TipoMovimientoVacacional.AJUSTE,
            dias: totalDiasADevolver,
            fecha_movimiento: ahoraPeru().toJSDate(),
            solicitud_id: id,
            concepto: conceptoAjuste,
            usuario_id: usuarioId,
          },
        });
      });

      // Revertir sincronización con Tareo - quitar marcas VAC
      try {
        const resultadoSync =
          await this.tareoSyncService.revertirSincronizacion({
            id: solicitud.id,
            empleado_id: solicitud.empleado_id,
            empresa_id: empresaId,
            fecha_inicio_aprobada: solicitud.fecha_inicio_aprobada,
            fecha_fin_aprobada: solicitud.fecha_fin_aprobada,
            fecha_inicio_solicitada: solicitud.fecha_inicio_solicitada,
            fecha_fin_solicitada: solicitud.fecha_fin_solicitada,
            dias_aprobados: solicitud.dias_aprobados,
            dias_solicitados: solicitud.dias_solicitados,
          });

        if (resultadoSync.advertencias.length > 0) {
          this.logger.warn(
            `Advertencias al revertir vacaciones #${id}: ${resultadoSync.advertencias.join(', ')}`,
          );
        }

        if (!resultadoSync.exito) {
          this.logger.error(
            `Error al revertir vacaciones #${id} en tareo: ${resultadoSync.errores.join(', ')}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error inesperado al revertir vacaciones #${id} en tareo: ${error.message}`,
        );
      }
    } else {
      // Solo actualizar estado
      await this.prisma.solicitudVacaciones.update({
        where: { id },
        data: {
          estado: EstadoSolicitudVacaciones.CANCELADA,
          motivo_cancelacion: dto.motivo_cancelacion,
          cancelado_por_id: usuarioId,
          fecha_cancelacion: ahoraPeru().toJSDate(),
        },
      });
    }

    return this.findOneSolicitud(id, empresaId);
  }
}
