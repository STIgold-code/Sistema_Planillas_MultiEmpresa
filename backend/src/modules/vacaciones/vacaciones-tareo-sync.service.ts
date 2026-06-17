import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoPeriodoTareo, TipoJustificacion } from '@prisma/client';

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
          // Crear tareo con todos los días del mes (igual que generarTareos)
          const empleado = await this.prisma.empleado.findUnique({
            where: { id: solicitud.empleado_id },
            select: { area_id: true, sede_id: true, cargo_id: true },
          });

          const diasDelMes = new Date(periodo.anio, periodo.mes, 0).getDate();

          tareo = await this.prisma.tareo.create({
            data: {
              periodo_id: periodo.id,
              empleado_id: solicitud.empleado_id,
              area_id: empleado?.area_id || null,
              sede_id: empleado?.sede_id || null,
              cargo_id: empleado?.cargo_id || null,
            },
          });

          // Crear TareoDetalle para todos los días del mes
          const detalles = [];
          for (let dia = 1; dia <= diasDelMes; dia++) {
            detalles.push({ tareo_id: tareo.id, dia });
          }
          await this.prisma.tareoDetalle.createMany({ data: detalles });
        }

        // Calcular qué días de este mes están en el rango de vacaciones
        const diasVacacionesEnMes = this.calcularDiasVacacionesEnMes(
          fechaInicio,
          fechaFin,
          periodo.mes,
          periodo.anio,
        );

        if (diasVacacionesEnMes.length === 0) continue;

        // Marcar cada día como VAC
        for (const dia of diasVacacionesEnMes) {
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

        // Crear justificación vinculada a la solicitud de vacaciones
        const diaInicio = Math.min(...diasVacacionesEnMes);
        const diaFin = Math.max(...diasVacacionesEnMes);

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
      this.logger.error(
        `Error sincronizando vacaciones: ${error.message}`,
        error.stack,
      );
      resultado.errores.push(`Error interno: ${error.message}`);
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

        // Calcular días que estaban marcados
        const diasVacacionesEnMes = this.calcularDiasVacacionesEnMes(
          fechaInicio,
          fechaFin,
          periodo.mes,
          periodo.anio,
        );

        // Limpiar marcación de cada día (poner null)
        for (const dia of diasVacacionesEnMes) {
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
      this.logger.error(
        `Error revirtiendo vacaciones: ${error.message}`,
        error.stack,
      );
      resultado.errores.push(`Error interno: ${error.message}`);
      resultado.exito = false;
    }

    return resultado;
  }

  /**
   * Obtiene los períodos de tareo que caen dentro del rango de fechas
   */
  private async obtenerPeriodosAfectados(
    empresaId: number,
    fechaInicio: Date,
    fechaFin: Date,
  ) {
    // Calcular qué meses están involucrados
    const mesesInvolucrados: Array<{ mes: number; anio: number }> = [];

    const fechaActual = new Date(fechaInicio);
    while (fechaActual <= fechaFin) {
      const mes = fechaActual.getMonth() + 1;
      const anio = fechaActual.getFullYear();

      if (!mesesInvolucrados.some((m) => m.mes === mes && m.anio === anio)) {
        mesesInvolucrados.push({ mes, anio });
      }

      // Avanzar al siguiente mes
      fechaActual.setMonth(fechaActual.getMonth() + 1);
      fechaActual.setDate(1);
    }

    // Buscar períodos de tareo para esos meses
    const periodos = await this.prisma.periodoTareo.findMany({
      where: {
        empresa_id: empresaId,
        OR: mesesInvolucrados.map((m) => ({
          mes: m.mes,
          anio: m.anio,
        })),
      },
    });

    return periodos;
  }

  /**
   * Calcula qué días de un mes específico están dentro del rango de vacaciones
   */
  private calcularDiasVacacionesEnMes(
    fechaInicio: Date,
    fechaFin: Date,
    mes: number,
    anio: number,
  ): number[] {
    const dias: number[] = [];
    const diasEnMes = new Date(anio, mes, 0).getDate();

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaDia = new Date(anio, mes - 1, dia);
      fechaDia.setHours(12, 0, 0, 0); // Mediodía para evitar problemas de zona horaria

      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      if (fechaDia >= inicio && fechaDia <= fin) {
        dias.push(dia);
      }
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
