import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoPeriodoTareo, TipoJustificacion } from '@prisma/client';
import {
  diasDelPeriodo,
  fechaComoDbDate,
  rangoOrdinalEnPeriodo,
  ventanaDePeriodo,
} from '../tareo/ventana-periodo';

interface SolicitudVacacionesParaSync {
  id: number;
  empleado_id: number;
  empresa_id: number;
  fecha_inicio_aprobada: Date | null;
  fecha_fin_aprobada: Date | null;
  fecha_inicio_solicitada: Date;
  fecha_fin_solicitada: Date;
  dias_aprobados: number | null;
  dias_solicitados: number;
  empleado?: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  };
}

interface ResultadoSync {
  exito: boolean;
  periodosAfectados: number;
  diasMarcados: number;
  justificacionesCreadas: number;
  errores: string[];
  advertencias: string[];
}

@Injectable()
export class VacacionesTareoSyncService {
  private readonly logger = new Logger(VacacionesTareoSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sincroniza las vacaciones aprobadas con el tareo
   * - Marca los días como VAC en el tareo
   * - Crea justificaciones vinculadas a la solicitud
   */
  async sincronizarConTareo(
    solicitud: SolicitudVacacionesParaSync,
    usuarioId: number,
  ): Promise<ResultadoSync> {
    const resultado: ResultadoSync = {
      exito: true,
      periodosAfectados: 0,
      diasMarcados: 0,
      justificacionesCreadas: 0,
      errores: [],
      advertencias: [],
    };

    try {
      const fechaInicio =
        solicitud.fecha_inicio_aprobada || solicitud.fecha_inicio_solicitada;
      const fechaFin =
        solicitud.fecha_fin_aprobada || solicitud.fecha_fin_solicitada;

      // Obtener el tipo de marcación VAC
      const tipoVAC = await this.prisma.tipoMarcacion.findFirst({
        where: { codigo: 'VAC', activo: true },
      });

      if (!tipoVAC) {
        resultado.errores.push(
          'No se encontró el tipo de marcación VAC activo',
        );
        resultado.exito = false;
        return resultado;
      }

      // Obtener los períodos de tareo afectados (puede ser 1 o 2 meses)
      const periodosAfectados = await this.obtenerPeriodosAfectados(
        solicitud.empresa_id,
        fechaInicio,
        fechaFin,
      );

      if (periodosAfectados.length === 0) {
        resultado.advertencias.push(
          'No se encontraron períodos de tareo para las fechas de vacaciones',
        );
        return resultado;
      }

      resultado.periodosAfectados = periodosAfectados.length;

      // Procesar cada período
      for (const periodo of periodosAfectados) {
        // Verificar si el período está cerrado
        if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
          resultado.advertencias.push(
            `El período ${periodo.mes}/${periodo.anio} está cerrado. No se pueden modificar los días de vacaciones.`,
          );
          continue;
        }

        // Obtener o crear tareo del empleado para este período
        let tareo = await this.prisma.tareo.findFirst({
          where: {
            periodo_id: periodo.id,
            empleado_id: solicitud.empleado_id,
          },
        });

        if (!tareo) {
          // Crear tareo con todos los días de la VENTANA del período (igual que
          // generarTareos): N sale del rango persistido, no del mes calendario.
          const empleado = await this.prisma.empleado.findUnique({
            where: { id: solicitud.empleado_id },
            select: { area_id: true, sede_id: true, cargo_id: true },
          });

          const ventana = ventanaDePeriodo(periodo);
          const totalDias = diasDelPeriodo(
            ventana.fechaInicio,
            ventana.fechaFin,
          );

          tareo = await this.prisma.tareo.create({
            data: {
              periodo_id: periodo.id,
              empleado_id: solicitud.empleado_id,
              area_id: empleado?.area_id || null,
              sede_id: empleado?.sede_id || null,
              cargo_id: empleado?.cargo_id || null,
            },
          });

          // Crear TareoDetalle para todos los días ordinales del período
          const detalles = [];
          for (let dia = 1; dia <= totalDias; dia++) {
            detalles.push({ tareo_id: tareo.id, dia });
          }
          await this.prisma.tareoDetalle.createMany({ data: detalles });
        }

        // Días ordinales de este período que caen en el rango de vacaciones
        const diasVacacionesEnPeriodo = this.calcularDiasVacacionesEnPeriodo(
          periodo,
          fechaInicio,
          fechaFin,
        );

        if (diasVacacionesEnPeriodo.length === 0) continue;

        // Marcar cada día como VAC
        for (const dia of diasVacacionesEnPeriodo) {
          // Buscar o crear el detalle del día
          const detalle = await this.prisma.tareoDetalle.findFirst({
            where: {
              tareo_id: tareo.id,
              dia: dia,
            },
          });

          if (detalle) {
            // Actualizar si existe
            await this.prisma.tareoDetalle.update({
              where: { id: detalle.id },
              data: { tipo_marcacion_id: tipoVAC.id },
            });
          } else {
            // Crear si no existe
            await this.prisma.tareoDetalle.create({
              data: {
                tareo_id: tareo.id,
                dia: dia,
                tipo_marcacion_id: tipoVAC.id,
              },
            });
          }
          resultado.diasMarcados++;
        }

        // Crear justificación vinculada a la solicitud de vacaciones.
        // dia_inicio/dia_fin son ordinales del período, igual que TareoDetalle.dia.
        const diaInicio = Math.min(...diasVacacionesEnPeriodo);
        const diaFin = Math.max(...diasVacacionesEnPeriodo);

        // Evitar duplicados: si ya existe justificación para esta solicitud, no crear otra
        const justificacionExistente =
          await this.prisma.tareoJustificacion.findFirst({
            where: {
              tareo_id: tareo.id,
              solicitud_vacaciones_id: solicitud.id,
            },
          });

        if (justificacionExistente) {
          resultado.advertencias.push(
            `Ya existe justificación para la solicitud #${solicitud.id} en el período ${periodo.mes}/${periodo.anio}`,
          );
          continue;
        }

        // Verificar solapamiento con justificaciones existentes
        const justificacionSolapada =
          await this.prisma.tareoJustificacion.findFirst({
            where: {
              tareo_id: tareo.id,
              OR: [
                {
                  dia_inicio: { lte: diaInicio },
                  dia_fin: { gte: diaInicio },
                },
                {
                  dia_inicio: { lte: diaFin },
                  dia_fin: { gte: diaFin },
                },
                {
                  dia_inicio: { gte: diaInicio },
                  dia_fin: { lte: diaFin },
                },
              ],
            },
          });

        if (justificacionSolapada) {
          resultado.advertencias.push(
            `Solapamiento con justificación existente (días ${justificacionSolapada.dia_inicio}-${justificacionSolapada.dia_fin}, tipo: ${justificacionSolapada.tipo}) en período ${periodo.mes}/${periodo.anio}. Se creó la justificación de vacaciones de todas formas.`,
          );
        }

        const nombreEmpleado = solicitud.empleado
          ? `${solicitud.empleado.nombres} ${solicitud.empleado.apellido_paterno}`
          : `Empleado ID ${solicitud.empleado_id}`;

        await this.prisma.tareoJustificacion.create({
          data: {
            tareo_id: tareo.id,
            empresa_id: solicitud.empresa_id,
            dia_inicio: diaInicio,
            dia_fin: diaFin,
            tipo: TipoJustificacion.VACACIONES,
            descripcion: `Vacaciones aprobadas (Solicitud #${solicitud.id}) - ${nombreEmpleado}`,
            solicitud_vacaciones_id: solicitud.id,
            created_by: usuarioId,
          },
        });
        resultado.justificacionesCreadas++;
      }

      this.logger.log(
        `Vacaciones sincronizadas: Solicitud #${solicitud.id}, ` +
          `${resultado.periodosAfectados} períodos, ${resultado.diasMarcados} días marcados`,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error sincronizando vacaciones: ${mensaje}`, stack);
      resultado.errores.push(`Error interno: ${mensaje}`);
      resultado.exito = false;
    }

    return resultado;
  }

  /**
   * Revierte la sincronización cuando se cancela una solicitud de vacaciones
   * - Limpia las marcas VAC de los días
   * - Elimina las justificaciones vinculadas
   */
  async revertirSincronizacion(
    solicitud: SolicitudVacacionesParaSync,
  ): Promise<ResultadoSync> {
    const resultado: ResultadoSync = {
      exito: true,
      periodosAfectados: 0,
      diasMarcados: 0,
      justificacionesCreadas: 0,
      errores: [],
      advertencias: [],
    };

    try {
      const fechaInicio =
        solicitud.fecha_inicio_aprobada || solicitud.fecha_inicio_solicitada;
      const fechaFin =
        solicitud.fecha_fin_aprobada || solicitud.fecha_fin_solicitada;

      // Eliminar justificaciones vinculadas a esta solicitud
      const justificacionesEliminadas =
        await this.prisma.tareoJustificacion.deleteMany({
          where: { solicitud_vacaciones_id: solicitud.id },
        });

      resultado.justificacionesCreadas = justificacionesEliminadas.count;

      // Obtener los períodos afectados
      const periodosAfectados = await this.obtenerPeriodosAfectados(
        solicitud.empresa_id,
        fechaInicio,
        fechaFin,
      );

      for (const periodo of periodosAfectados) {
        // No modificar períodos cerrados
        if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
          resultado.advertencias.push(
            `El período ${periodo.mes}/${periodo.anio} está cerrado. Los días de vacaciones no se pueden revertir automáticamente.`,
          );
          continue;
        }

        resultado.periodosAfectados++;

        // Obtener tareo del empleado
        const tareo = await this.prisma.tareo.findFirst({
          where: {
            periodo_id: periodo.id,
            empleado_id: solicitud.empleado_id,
          },
        });

        if (!tareo) continue;

        // Calcular días ordinales que estaban marcados
        const diasVacacionesEnPeriodo = this.calcularDiasVacacionesEnPeriodo(
          periodo,
          fechaInicio,
          fechaFin,
        );

        // Limpiar marcación de cada día (poner null)
        for (const dia of diasVacacionesEnPeriodo) {
          await this.prisma.tareoDetalle.updateMany({
            where: {
              tareo_id: tareo.id,
              dia: dia,
            },
            data: { tipo_marcacion_id: null },
          });
          resultado.diasMarcados++;
        }
      }

      this.logger.log(
        `Vacaciones revertidas: Solicitud #${solicitud.id}, ` +
          `${resultado.periodosAfectados} períodos, ${resultado.diasMarcados} días limpiados`,
      );
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error revirtiendo vacaciones: ${mensaje}`, stack);
      resultado.errores.push(`Error interno: ${mensaje}`);
      resultado.exito = false;
    }

    return resultado;
  }

  /**
   * Obtiene los períodos de tareo cuya ventana real solapa con el rango de
   * vacaciones.
   *
   * REGLA DE ORO: el rango del período se lee de `fecha_inicio`/`fecha_fin`
   * persistidos, NUNCA se reconstruye desde anio/mes. Con día de corte, unas
   * vacaciones del 20 al 30 de julio tocan el período de julio (26-jun a 25-jul)
   * y el de agosto (26-jul a 25-ago); enumerar meses calendario perdía el
   * segundo.
   */
  private async obtenerPeriodosAfectados(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    return this.prisma.periodoTareo.findMany({
      where: {
        empresa_id: empresaId,
        fecha_inicio: { lte: fechaComoDbDate(fechaFin) },
        fecha_fin: { gte: fechaComoDbDate(fechaInicio) },
      },
      orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
    });
  }

  /**
   * Calcula qué días ORDINALES (1..N) del período están dentro del rango de
   * vacaciones. El ordinal es la posición dentro de la ventana del período, no
   * el día del mes: en períodos calendario ambos coinciden.
   */
  private calcularDiasVacacionesEnPeriodo(
    periodo: { fecha_inicio: Date; fecha_fin: Date },
    fechaInicio: Date,
    fechaFin: Date,
  ): number[] {
    const rango = rangoOrdinalEnPeriodo(
      ventanaDePeriodo(periodo),
      fechaInicio,
      fechaFin,
    );
    if (!rango) return [];

    const dias: number[] = [];
    for (let dia = rango.desde; dia <= rango.hasta; dia++) {
      dias.push(dia);
    }
    return dias;
  }

  /**
   * Verifica si hay períodos cerrados que serían afectados por las vacaciones
   * Útil para mostrar advertencias antes de aprobar
   */
  async verificarPeriodosCerrados(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<{ hayPeriodosCerrados: boolean; periodos: string[] }> {
    const periodos = await this.obtenerPeriodosAfectados(
      empresaId,
      fechaInicio,
      fechaFin,
    );

    const periodosCerrados = periodos.filter(
      (p) => p.estado === EstadoPeriodoTareo.CERRADO,
    );

    return {
      hayPeriodosCerrados: periodosCerrados.length > 0,
      periodos: periodosCerrados.map((p) => `${p.mes}/${p.anio}`),
    };
  }
}
