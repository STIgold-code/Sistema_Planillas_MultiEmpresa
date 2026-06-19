import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoSesionTareo, EstadoPeriodoTareo } from '@prisma/client';
import { ahoraPeru } from '../../common/utils/datetime.util';
import {
  SesionTareoResponseDto,
  UpdateConfiguracionTareoDto,
  ConfiguracionTareoResponseDto,
} from './dto';

// Valores por defecto
const DEFAULTS = {
  TIEMPO_LIMITE_MINUTOS: 60,
  SESIONES_POR_DIA: 1,
  DIAS_POST_CIERRE: 5,
  MAX_EXTENSIONES_PERIODO: 3,
};

@Injectable()
export class SesionTareoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene la configuración de tareo de una empresa
   * Si no existe, retorna valores por defecto
   */
  async getConfiguracion(
    empresaId: number,
  ): Promise<ConfiguracionTareoResponseDto> {
    const config = await this.prisma.configuracionTareo.findUnique({
      where: { empresa_id: empresaId },
    });

    return {
      tiempo_limite_minutos:
        config?.tiempo_limite_minutos ?? DEFAULTS.TIEMPO_LIMITE_MINUTOS,
      requiere_corrector: config?.requiere_corrector ?? true,
      sesiones_por_dia: config?.sesiones_por_dia ?? DEFAULTS.SESIONES_POR_DIA,
      sesiones_por_periodo: config?.sesiones_por_periodo ?? null,
      dias_post_cierre: config?.dias_post_cierre ?? DEFAULTS.DIAS_POST_CIERRE,
      hora_limite_diaria: config?.hora_limite_diaria ?? null,
      requiere_aprobacion_extension:
        config?.requiere_aprobacion_extension ?? true,
      max_extensiones_periodo:
        config?.max_extensiones_periodo ?? DEFAULTS.MAX_EXTENSIONES_PERIODO,
      notificar_email: config?.notificar_email ?? true,
      notificar_sistema: config?.notificar_sistema ?? true,
    };
  }

  /**
   * Crea o actualiza la configuración de tareo de una empresa
   */
  async upsertConfiguracion(
    empresaId: number,
    data: UpdateConfiguracionTareoDto,
  ) {
    return this.prisma.configuracionTareo.upsert({
      where: { empresa_id: empresaId },
      create: {
        empresa_id: empresaId,
        tiempo_limite_minutos:
          data.tiempo_limite_minutos ?? DEFAULTS.TIEMPO_LIMITE_MINUTOS,
        requiere_corrector: data.requiere_corrector ?? true,
        sesiones_por_dia: data.sesiones_por_dia ?? DEFAULTS.SESIONES_POR_DIA,
        sesiones_por_periodo: data.sesiones_por_periodo,
        dias_post_cierre: data.dias_post_cierre ?? DEFAULTS.DIAS_POST_CIERRE,
        hora_limite_diaria: data.hora_limite_diaria,
        requiere_aprobacion_extension:
          data.requiere_aprobacion_extension ?? true,
        max_extensiones_periodo:
          data.max_extensiones_periodo ?? DEFAULTS.MAX_EXTENSIONES_PERIODO,
        notificar_email: data.notificar_email ?? true,
        notificar_sistema: data.notificar_sistema ?? true,
      },
      update: {
        ...(data.tiempo_limite_minutos !== undefined && {
          tiempo_limite_minutos: data.tiempo_limite_minutos,
        }),
        ...(data.requiere_corrector !== undefined && {
          requiere_corrector: data.requiere_corrector,
        }),
        ...(data.sesiones_por_dia !== undefined && {
          sesiones_por_dia: data.sesiones_por_dia,
        }),
        ...(data.sesiones_por_periodo !== undefined && {
          sesiones_por_periodo: data.sesiones_por_periodo,
        }),
        ...(data.dias_post_cierre !== undefined && {
          dias_post_cierre: data.dias_post_cierre,
        }),
        ...(data.hora_limite_diaria !== undefined && {
          hora_limite_diaria: data.hora_limite_diaria,
        }),
        ...(data.requiere_aprobacion_extension !== undefined && {
          requiere_aprobacion_extension: data.requiere_aprobacion_extension,
        }),
        ...(data.max_extensiones_periodo !== undefined && {
          max_extensiones_periodo: data.max_extensiones_periodo,
        }),
        ...(data.notificar_email !== undefined && {
          notificar_email: data.notificar_email,
        }),
        ...(data.notificar_sistema !== undefined && {
          notificar_sistema: data.notificar_sistema,
        }),
      },
    });
  }

  /**
   * Verifica si el usuario puede iniciar una nueva sesión
   */
  async verificarPuedeIniciarSesion(
    periodoId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<{ puede: boolean; motivo?: string }> {
    const config = await this.getConfiguracion(empresaId);
    const hoy = ahoraPeru().startOf('day').toJSDate();

    // Contar sesiones de hoy
    const sesionesHoy = await this.prisma.sesionTareo.count({
      where: {
        usuario_id: usuarioId,
        periodo_id: periodoId,
        fecha: hoy,
      },
    });

    if (sesionesHoy >= config.sesiones_por_dia) {
      return {
        puede: false,
        motivo: `Has alcanzado el límite de ${config.sesiones_por_dia} sesión(es) por día. Puedes solicitar una extensión.`,
      };
    }

    // Verificar hora límite
    if (config.hora_limite_diaria) {
      const [horas, minutos] = config.hora_limite_diaria.split(':').map(Number);
      const ahora = ahoraPeru();
      const limite = ahora.set({ hour: horas, minute: minutos, second: 0 });

      if (ahora > limite) {
        return {
          puede: false,
          motivo: `La hora límite para editar tareo es ${config.hora_limite_diaria}`,
        };
      }
    }

    // Verificar sesiones por período
    if (config.sesiones_por_periodo) {
      const sesionesPeriodo = await this.prisma.sesionTareo.count({
        where: {
          usuario_id: usuarioId,
          periodo_id: periodoId,
        },
      });

      if (sesionesPeriodo >= config.sesiones_por_periodo) {
        return {
          puede: false,
          motivo: `Has alcanzado el límite de ${config.sesiones_por_periodo} sesiones para este período`,
        };
      }
    }

    return { puede: true };
  }

  /**
   * Inicia una sesión de tareo para un usuario en un período
   */
  async iniciarSesion(
    periodoId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<SesionTareoResponseDto> {
    // Verificar que el período existe y pertenece a la empresa
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    // Verificar que el período no esté cerrado
    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException(
        'No se puede iniciar sesión en un período cerrado',
      );
    }

    if (periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException(
        'No se puede iniciar sesión en un período anulado',
      );
    }

    // Verificar si ya existe una sesión activa para este usuario y período
    const sesionExistente = await this.prisma.sesionTareo.findFirst({
      where: {
        periodo_id: periodoId,
        usuario_id: usuarioId,
        estado: EstadoSesionTareo.ACTIVA,
      },
    });

    if (sesionExistente) {
      // Verificar si la sesión existente ya expiró
      const tiempoRestante = this.calcularTiempoRestante(sesionExistente);

      if (tiempoRestante > 0) {
        // La sesión aún está activa, retornarla
        return this.mapToResponse(sesionExistente);
      }

      // La sesión expiró, marcarla como expirada
      await this.prisma.sesionTareo.update({
        where: { id: sesionExistente.id },
        data: { estado: EstadoSesionTareo.EXPIRADA },
      });
    }

    // Verificar si puede iniciar nueva sesión (límites diarios, hora límite, etc.)
    const verificacion = await this.verificarPuedeIniciarSesion(
      periodoId,
      usuarioId,
      empresaId,
    );

    if (!verificacion.puede) {
      throw new BadRequestException(verificacion.motivo);
    }

    // Obtener configuración de tiempo límite
    const config = await this.getConfiguracion(empresaId);
    const hoy = ahoraPeru().startOf('day').toJSDate();
    const ahora = ahoraPeru().toJSDate();

    // Crear nueva sesión
    const nuevaSesion = await this.prisma.sesionTareo.create({
      data: {
        empresa_id: empresaId,
        periodo_id: periodoId,
        usuario_id: usuarioId,
        fecha: hoy,
        tiempo_limite_minutos: config.tiempo_limite_minutos,
        estado: EstadoSesionTareo.ACTIVA,
        ultimo_heartbeat: ahora, // ERR-005: Inicializar heartbeat
      },
    });

    return this.mapToResponse(nuevaSesion);
  }

  /**
   * Finaliza una sesión de tareo
   */
  async finalizarSesion(
    sesionId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<SesionTareoResponseDto> {
    const sesion = await this.prisma.sesionTareo.findFirst({
      where: {
        id: sesionId,
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
    });

    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada');
    }

    if (sesion.estado !== EstadoSesionTareo.ACTIVA) {
      throw new BadRequestException('La sesión ya no está activa');
    }

    const sesionActualizada = await this.prisma.sesionTareo.update({
      where: { id: sesionId },
      data: {
        estado: EstadoSesionTareo.FINALIZADA,
        fecha_fin: ahoraPeru().toJSDate(),
      },
    });

    return this.mapToResponse(sesionActualizada);
  }

  /**
   * Marca una sesión como expirada.
   * Llamado por el frontend cuando el timer llega a cero.
   */
  async expirarSesion(
    sesionId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<SesionTareoResponseDto> {
    const sesion = await this.prisma.sesionTareo.findFirst({
      where: {
        id: sesionId,
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
    });

    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada');
    }

    // Solo se puede expirar si está activa
    if (sesion.estado !== EstadoSesionTareo.ACTIVA) {
      // Retornar el estado actual sin error (ya está expirada o finalizada)
      return this.mapToResponse(sesion);
    }

    const sesionActualizada = await this.prisma.sesionTareo.update({
      where: { id: sesionId },
      data: {
        estado: EstadoSesionTareo.EXPIRADA,
      },
    });

    return this.mapToResponse(sesionActualizada);
  }

  /**
   * Obtiene el estado de sesión de un usuario para un período
   */
  async obtenerEstadoSesion(
    periodoId: number,
    usuarioId: number,
    empresaId: number,
    tienePermisoCorregir: boolean,
  ): Promise<SesionTareoResponseDto | null> {
    // Si el usuario tiene permiso de corregir, siempre puede editar
    if (tienePermisoCorregir) {
      return {
        id: 0,
        periodo_id: periodoId,
        usuario_id: usuarioId,
        fecha_inicio: ahoraPeru().toJSDate(),
        fecha_fin: null,
        tiempo_limite_minutos: 0,
        estado: 'CORRECTOR',
        tiempo_restante_segundos: -1, // -1 indica sin límite
        puede_editar: true,
      };
    }

    // Buscar sesión activa o la última sesión del usuario
    const sesion = await this.prisma.sesionTareo.findFirst({
      where: {
        periodo_id: periodoId,
        usuario_id: usuarioId,
        empresa_id: empresaId,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!sesion) {
      // No hay sesión, el usuario debe iniciar una
      return null;
    }

    // Si la sesión está activa, verificar si expiró
    if (sesion.estado === EstadoSesionTareo.ACTIVA) {
      const tiempoRestante = this.calcularTiempoRestante(sesion);

      if (tiempoRestante <= 0) {
        // La sesión expiró, actualizarla
        await this.prisma.sesionTareo.update({
          where: { id: sesion.id },
          data: { estado: EstadoSesionTareo.EXPIRADA },
        });

        return {
          ...this.mapToResponse(sesion),
          estado: 'EXPIRADA',
          tiempo_restante_segundos: 0,
          puede_editar: false,
        };
      }
    }

    return this.mapToResponse(sesion);
  }

  /**
   * Verifica si un usuario puede editar el tareo de un período
   */
  async puedeEditarTareo(
    periodoId: number,
    usuarioId: number,
    empresaId: number,
    tienePermisoCorregir: boolean,
  ): Promise<{ puede: boolean; motivo?: string }> {
    // Los correctores siempre pueden editar
    if (tienePermisoCorregir) {
      return { puede: true };
    }

    // Verificar si hay sesión activa
    const sesion = await this.prisma.sesionTareo.findFirst({
      where: {
        periodo_id: periodoId,
        usuario_id: usuarioId,
        empresa_id: empresaId,
        estado: EstadoSesionTareo.ACTIVA,
      },
    });

    if (!sesion) {
      return {
        puede: false,
        motivo:
          'No tienes una sesión de tareo activa. Debes iniciar una sesión para editar.',
      };
    }

    // Verificar si la sesión expiró
    const tiempoRestante = this.calcularTiempoRestante(sesion);

    if (tiempoRestante <= 0) {
      // Marcar como expirada
      await this.prisma.sesionTareo.update({
        where: { id: sesion.id },
        data: { estado: EstadoSesionTareo.EXPIRADA },
      });

      return {
        puede: false,
        motivo:
          'Tu sesión de tareo ha expirado. Contacta al corrector para realizar modificaciones.',
      };
    }

    return { puede: true };
  }

  /**
   * Calcula el tiempo restante de una sesión en segundos
   */
  private calcularTiempoRestante(sesion: {
    fecha_inicio: Date;
    tiempo_limite_minutos: number;
  }): number {
    const ahora = ahoraPeru().toJSDate();
    const inicio = new Date(sesion.fecha_inicio);
    const finPrevisto = new Date(
      inicio.getTime() + sesion.tiempo_limite_minutos * 60 * 1000,
    );

    const restante = Math.floor(
      (finPrevisto.getTime() - ahora.getTime()) / 1000,
    );
    return Math.max(0, restante);
  }

  /**
   * Mapea una sesión a DTO de respuesta
   */
  private mapToResponse(sesion: {
    id: number;
    periodo_id: number;
    usuario_id: number;
    fecha_inicio: Date;
    fecha_fin: Date | null;
    tiempo_limite_minutos: number;
    estado: EstadoSesionTareo;
  }): SesionTareoResponseDto {
    const tiempoRestante = this.calcularTiempoRestante(sesion);
    const puedeEditar =
      sesion.estado === EstadoSesionTareo.ACTIVA && tiempoRestante > 0;

    return {
      id: sesion.id,
      periodo_id: sesion.periodo_id,
      usuario_id: sesion.usuario_id,
      fecha_inicio: sesion.fecha_inicio,
      fecha_fin: sesion.fecha_fin,
      tiempo_limite_minutos: sesion.tiempo_limite_minutos,
      estado: sesion.estado,
      tiempo_restante_segundos: tiempoRestante,
      puede_editar: puedeEditar,
    };
  }

  // =============================================
  // ERR-005: HEARTBEAT PARA DETECTAR SESIONES ABANDONADAS
  // =============================================

  /**
   * Actualiza el timestamp de heartbeat de una sesión activa.
   * El frontend debe llamar este endpoint cada 30 segundos.
   */
  async heartbeat(
    sesionId: number,
    usuarioId: number,
    empresaId: number,
  ): Promise<{ ok: boolean; tiempo_restante_segundos: number }> {
    const sesion = await this.prisma.sesionTareo.findFirst({
      where: {
        id: sesionId,
        usuario_id: usuarioId,
        empresa_id: empresaId,
        estado: EstadoSesionTareo.ACTIVA,
      },
    });

    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada o no activa');
    }

    // Verificar si la sesión ya expiró por tiempo
    const tiempoRestante = this.calcularTiempoRestante(sesion);
    if (tiempoRestante <= 0) {
      // Marcar como expirada
      await this.prisma.sesionTareo.update({
        where: { id: sesion.id },
        data: { estado: EstadoSesionTareo.EXPIRADA },
      });
      throw new BadRequestException('Sesión expirada');
    }

    // Actualizar heartbeat
    await this.prisma.sesionTareo.update({
      where: { id: sesion.id },
      data: { ultimo_heartbeat: ahoraPeru().toJSDate() },
    });

    return {
      ok: true,
      tiempo_restante_segundos: tiempoRestante,
    };
  }

  /**
   * Marca como EXPIRADA las sesiones que no han enviado heartbeat
   * en los últimos 2 minutos. Diseñado para ejecutarse como cron job.
   * @returns Número de sesiones marcadas como abandonadas
   */
  async limpiarSesionesAbandonadas(): Promise<number> {
    const umbral = new Date(Date.now() - 2 * 60 * 1000); // 2 minutos atrás

    const result = await this.prisma.sesionTareo.updateMany({
      where: {
        estado: EstadoSesionTareo.ACTIVA,
        ultimo_heartbeat: {
          not: null,
          lt: umbral,
        },
      },
      data: { estado: EstadoSesionTareo.EXPIRADA },
    });

    return result.count;
  }
}
