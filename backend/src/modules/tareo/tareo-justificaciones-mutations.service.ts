import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJustificacionDto,
  UpdateJustificacionDto,
  AddArchivoDto,
} from './dto';
import { Prisma, EstadoPeriodoTareo } from '@prisma/client';
import { UploadsService } from '../uploads/uploads.service';

/**
 * Servicio de mutaciones de justificaciones de tareo + alertas de faltas.
 * Extraido de TareoJustificacionesService para mantener archivos < 400 LOC.
 */
@Injectable()
export class TareoJustificacionesMutationsService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  /**
   * SEGURIDAD (mass assignment + IDOR): valida que cada archivo referenciado
   * por el cliente pertenezca a la empresa, devolviendo el dato con la key
   * validada. Lanza si el archivo pertenece a otra empresa.
   */
  private async validarArchivos<T extends { archivo_url: string }>(
    archivos: T[],
    empresaId: number,
  ): Promise<T[]> {
    return Promise.all(
      archivos.map(async (a) => ({
        ...a,
        archivo_url:
          (await this.uploadsService.resolverKeyPropia(
            a.archivo_url,
            empresaId,
          )) ?? a.archivo_url,
      })),
    );
  }

  async createJustificacion(
    dto: CreateJustificacionDto,
    usuarioId: number,
    empresaId: number,
  ) {
    // Verificar que el tareo existe y pertenece a la empresa
    const tareo = await this.prisma.tareo.findFirst({
      where: { id: dto.tareo_id, periodo: { empresa_id: empresaId } },
      include: { periodo: true },
    });

    if (!tareo) {
      throw new NotFoundException('Tareo no encontrado');
    }

    // Validar que el período no esté cerrado
    if (tareo.periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException(
        'No se pueden crear justificaciones en un período cerrado',
      );
    }

    if (tareo.periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException(
        'No se pueden crear justificaciones en un período anulado',
      );
    }

    // Validar rango de días
    if (dto.dia_fin < dto.dia_inicio) {
      throw new BadRequestException(
        'El día de fin debe ser mayor o igual al día de inicio',
      );
    }

    // Verificar días válidos para el mes
    const diasDelMes = new Date(
      tareo.periodo.anio,
      tareo.periodo.mes,
      0,
    ).getDate();
    if (dto.dia_inicio > diasDelMes || dto.dia_fin > diasDelMes) {
      throw new BadRequestException(
        `Los días deben estar entre 1 y ${diasDelMes}`,
      );
    }

    // SEGURIDAD: validar propiedad de los archivos referenciados.
    const archivosValidados =
      dto.archivos && dto.archivos.length > 0
        ? await this.validarArchivos(dto.archivos, empresaId)
        : [];

    // Usar transacción para evitar race condition en validación de solapamiento
    return this.prisma.$transaction(async (tx) => {
      // Verificar solapamiento con justificaciones existentes
      const justificacionSolapada = await tx.tareoJustificacion.findFirst({
        where: {
          tareo_id: dto.tareo_id,
          OR: [
            {
              // El día inicio de la nueva está dentro de una existente
              dia_inicio: { lte: dto.dia_inicio },
              dia_fin: { gte: dto.dia_inicio },
            },
            {
              // El día fin de la nueva está dentro de una existente
              dia_inicio: { lte: dto.dia_fin },
              dia_fin: { gte: dto.dia_fin },
            },
            {
              // La nueva engloba completamente a una existente
              dia_inicio: { gte: dto.dia_inicio },
              dia_fin: { lte: dto.dia_fin },
            },
          ],
        },
      });

      if (justificacionSolapada) {
        throw new BadRequestException(
          `Ya existe una justificación para los días ${justificacionSolapada.dia_inicio}-${justificacionSolapada.dia_fin}`,
        );
      }

      // Crear justificación con archivos
      const justificacion = await tx.tareoJustificacion.create({
        data: {
          tareo_id: dto.tareo_id,
          empresa_id: empresaId,
          dia_inicio: dto.dia_inicio,
          dia_fin: dto.dia_fin,
          tipo: dto.tipo,
          tipo_documento: dto.tipo_documento || 'OTROS',
          codigo_certificado: dto.codigo_certificado,
          descripcion: dto.descripcion,
          created_by: usuarioId,
          archivos:
            archivosValidados.length > 0
              ? {
                  create: archivosValidados.map((a) => ({
                    archivo_url: a.archivo_url,
                    archivo_nombre: a.archivo_nombre,
                    archivo_tipo: a.archivo_tipo,
                    archivo_size: a.archivo_size,
                  })),
                }
              : undefined,
        },
        include: {
          archivos: true,
          usuario: {
            select: { id: true, nombre_completo: true },
          },
        },
      });

      return justificacion;
    });
  }

  // Actualizar justificación
  async updateJustificacion(
    id: number,
    dto: UpdateJustificacionDto,
    empresaId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const justificacion = await tx.tareoJustificacion.findFirst({
        where: { id, empresa_id: empresaId },
        include: { tareo: { include: { periodo: true } } },
      });

      if (!justificacion) {
        throw new NotFoundException('Justificación no encontrada');
      }

      // Validar que el período no esté cerrado o anulado
      if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.CERRADO) {
        throw new BadRequestException(
          'No se pueden modificar justificaciones en un período cerrado',
        );
      }
      if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.ANULADO) {
        throw new BadRequestException(
          'No se pueden modificar justificaciones en un período anulado',
        );
      }

      // Validar que la justificación no esté vinculada a vacaciones
      if (justificacion.solicitud_vacaciones_id) {
        throw new BadRequestException(
          'Esta justificación está vinculada a una solicitud de vacaciones. Modifíquela desde el módulo de vacaciones.',
        );
      }

      // Usar valores existentes como fallback para validaciones
      const diaInicio = dto.dia_inicio ?? justificacion.dia_inicio;
      const diaFin = dto.dia_fin ?? justificacion.dia_fin;

      // Validar rango de días
      if (diaFin < diaInicio) {
        throw new BadRequestException(
          'El día de fin debe ser mayor o igual al día de inicio',
        );
      }

      // Verificar días válidos para el mes
      const diasDelMes = new Date(
        justificacion.tareo.periodo.anio,
        justificacion.tareo.periodo.mes,
        0,
      ).getDate();

      if (diaInicio > diasDelMes || diaFin > diasDelMes) {
        throw new BadRequestException(
          `Los días deben estar entre 1 y ${diasDelMes}`,
        );
      }

      // Verificar solapamiento con otras justificaciones (excluyendo la actual)
      if (dto.dia_inicio !== undefined || dto.dia_fin !== undefined) {
        const justificacionSolapada = await tx.tareoJustificacion.findFirst({
          where: {
            tareo_id: justificacion.tareo_id,
            id: { not: id },
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
          throw new BadRequestException(
            `Ya existe una justificación para los días ${justificacionSolapada.dia_inicio}-${justificacionSolapada.dia_fin}`,
          );
        }
      }

      const updated = await tx.tareoJustificacion.update({
        where: { id },
        data: {
          dia_inicio: dto.dia_inicio,
          dia_fin: dto.dia_fin,
          tipo: dto.tipo,
          tipo_documento: dto.tipo_documento,
          codigo_certificado: dto.codigo_certificado,
          descripcion: dto.descripcion,
        },
        include: {
          archivos: true,
          usuario: {
            select: { id: true, nombre_completo: true },
          },
        },
      });

      return updated;
    });
  }

  // Eliminar justificación
  async deleteJustificacion(id: number, empresaId: number, usuarioId?: number) {
    const justificacion = await this.prisma.tareoJustificacion.findFirst({
      where: { id, empresa_id: empresaId },
      include: { tareo: { include: { periodo: true } } },
    });

    if (!justificacion) {
      throw new NotFoundException('Justificación no encontrada');
    }

    // Validar que el período no esté cerrado o anulado
    if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException(
        'No se pueden eliminar justificaciones en un período cerrado',
      );
    }
    if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException(
        'No se pueden eliminar justificaciones en un período anulado',
      );
    }

    // Validar que la justificación no esté vinculada a vacaciones
    if (justificacion.solicitud_vacaciones_id) {
      throw new BadRequestException(
        'Esta justificación está vinculada a una solicitud de vacaciones. Elimínela desde el módulo de vacaciones.',
      );
    }

    await this.prisma.tareoJustificacion.deleteMany({
      where: { id, empresa_id: empresaId },
    });

    return { message: 'Justificación eliminada correctamente' };
  }

  // Agregar archivo a justificación existente
  async addArchivoToJustificacion(
    justificacionId: number,
    archivo: AddArchivoDto,
    empresaId: number,
  ) {
    const justificacion = await this.prisma.tareoJustificacion.findFirst({
      where: { id: justificacionId, empresa_id: empresaId },
      include: { tareo: { include: { periodo: true } } },
    });

    if (!justificacion) {
      throw new NotFoundException('Justificación no encontrada');
    }

    // Validar que el período no esté cerrado o anulado
    if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException(
        'No se pueden agregar archivos a justificaciones en un período cerrado',
      );
    }
    if (justificacion.tareo.periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException(
        'No se pueden agregar archivos a justificaciones en un período anulado',
      );
    }

    // Validar que la justificación no esté vinculada a vacaciones
    if (justificacion.solicitud_vacaciones_id) {
      throw new BadRequestException(
        'Esta justificación está vinculada a una solicitud de vacaciones. Modifíquela desde el módulo de vacaciones.',
      );
    }

    // SEGURIDAD: validar propiedad del archivo referenciado.
    const archivoUrl =
      (await this.uploadsService.resolverKeyPropia(
        archivo.archivo_url,
        empresaId,
      )) ?? archivo.archivo_url;

    return this.prisma.tareoJustificacionArchivo.create({
      data: {
        justificacion_id: justificacionId,
        archivo_url: archivoUrl,
        archivo_nombre: archivo.archivo_nombre,
        archivo_tipo: archivo.archivo_tipo,
        archivo_size: archivo.archivo_size,
      },
    });
  }

  // Eliminar archivo de justificación
  async removeArchivo(archivoId: number, empresaId: number) {
    const archivo = await this.prisma.tareoJustificacionArchivo.findFirst({
      where: {
        id: archivoId,
        justificacion: { empresa_id: empresaId },
      },
      include: {
        justificacion: {
          include: { tareo: { include: { periodo: true } } },
        },
      },
    });

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Validar que el período no esté cerrado o anulado
    if (
      archivo.justificacion.tareo.periodo.estado === EstadoPeriodoTareo.CERRADO
    ) {
      throw new BadRequestException(
        'No se pueden eliminar archivos de justificaciones en un período cerrado',
      );
    }
    if (
      archivo.justificacion.tareo.periodo.estado === EstadoPeriodoTareo.ANULADO
    ) {
      throw new BadRequestException(
        'No se pueden eliminar archivos de justificaciones en un período anulado',
      );
    }

    // Validar que la justificación no esté vinculada a vacaciones
    if (archivo.justificacion.solicitud_vacaciones_id) {
      throw new BadRequestException(
        'Esta justificación está vinculada a una solicitud de vacaciones. Modifíquela desde el módulo de vacaciones.',
      );
    }

    await this.prisma.tareoJustificacionArchivo.delete({
      where: { id: archivoId },
    });

    return { message: 'Archivo eliminado correctamente' };
  }

  // =============================================
  // ALERTAS DE FALTAS (>= 3 faltas = Pre-Aviso de Despido)
  // =============================================

  /**
   * Obtiene empleados con >= 3 faltas (código 'F') en un rango de fechas
   * Para generar carta de pre-aviso de despido
   */
  async getAlertasFaltas(
    empresaId: number,
    filters: {
      fecha_inicio: Date;
      fecha_fin: Date;
      sede_id?: number;
      area_id?: number;
      minimo_faltas?: number;
    },
  ) {
    const minimoFaltas = filters.minimo_faltas || 3;

    // Obtener el tipo de marcación 'F' (Falta)
    const tipoFalta = await this.prisma.tipoMarcacion.findFirst({
      where: { codigo: 'F', activo: true },
    });

    if (!tipoFalta) {
      return { empleados: [], total: 0, minimo_faltas: minimoFaltas };
    }

    // Calcular los periodos que caen dentro del rango de fechas
    const fechaInicio = new Date(filters.fecha_inicio);
    const fechaFin = new Date(filters.fecha_fin);

    // Obtener periodos en el rango
    const periodos = await this.prisma.periodoTareo.findMany({
      where: {
        empresa_id: empresaId,
        OR: [
          {
            // Periodo inicia dentro del rango
            anio: {
              gte: fechaInicio.getFullYear(),
              lte: fechaFin.getFullYear(),
            },
          },
        ],
      },
      select: { id: true, anio: true, mes: true },
    });

    // Filtrar periodos que realmente se solapan con el rango
    const periodosEnRango = periodos.filter((p) => {
      const inicioMes = new Date(p.anio, p.mes - 1, 1);
      const finMes = new Date(p.anio, p.mes, 0);
      return inicioMes <= fechaFin && finMes >= fechaInicio;
    });

    if (periodosEnRango.length === 0) {
      return { empleados: [], total: 0, minimo_faltas: minimoFaltas };
    }

    const periodoIds = periodosEnRango.map((p) => p.id);

    // Construir filtro de tareo
    const tareoWhere: Prisma.TareoWhereInput = {
      periodo_id: { in: periodoIds },
      periodo: { empresa_id: empresaId },
    };

    if (filters.sede_id) tareoWhere.sede_id = filters.sede_id;
    if (filters.area_id) tareoWhere.area_id = filters.area_id;

    // Contar faltas por empleado agrupando por empleado_id
    const faltasPorEmpleado = await this.prisma.tareoDetalle.groupBy({
      by: ['tareo_id'],
      where: {
        tipo_marcacion_id: tipoFalta.id,
        tareo: tareoWhere,
        // Filtrar por días dentro del rango de fechas
        // Esto requiere lógica adicional porque dia es 1-31 y depende del periodo
      },
      _count: { id: true },
    });

    // Obtener los tareo_ids con sus empleado_ids
    const tareoIds = faltasPorEmpleado.map((f) => f.tareo_id);
    const tareos = await this.prisma.tareo.findMany({
      where: { id: { in: tareoIds } },
      select: {
        id: true,
        empleado_id: true,
        periodo: { select: { anio: true, mes: true } },
      },
    });

    // Crear mapa tareo_id -> info
    const tareoMap = new Map(tareos.map((t) => [t.id, t]));

    // Agrupar faltas por empleado (sumando de todos los periodos)
    const faltasPorEmpleadoMap = new Map<number, number>();
    for (const f of faltasPorEmpleado) {
      const tareo = tareoMap.get(f.tareo_id);
      if (!tareo) continue;

      const empleadoId = tareo.empleado_id;
      const actual = faltasPorEmpleadoMap.get(empleadoId) || 0;
      faltasPorEmpleadoMap.set(empleadoId, actual + f._count.id);
    }

    // Filtrar empleados con >= minimoFaltas
    const empleadosConAlerta = Array.from(faltasPorEmpleadoMap.entries())
      .filter(([_, count]) => count >= minimoFaltas)
      .map(([empleadoId, count]) => ({ empleadoId, faltas: count }));

    if (empleadosConAlerta.length === 0) {
      return { empleados: [], total: 0, minimo_faltas: minimoFaltas };
    }

    // Obtener datos de los empleados
    const empleadoIds = empleadosConAlerta.map((e) => e.empleadoId);
    const empleados = await this.prisma.empleado.findMany({
      where: { id: { in: empleadoIds }, empresa_id: empresaId },
      select: {
        id: true,
        numero_documento: true,
        nombres: true,
        apellido_paterno: true,
        apellido_materno: true,
        foto_url: true,
        area: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        cargo: { select: { id: true, nombre: true } },
      },
    });

    // Combinar con conteo de faltas
    const resultado = empleados.map((emp) => {
      const alerta = empleadosConAlerta.find((a) => a.empleadoId === emp.id);
      return {
        empleado_id: emp.id,
        numero_documento: emp.numero_documento,
        nombre_completo: `${emp.apellido_paterno} ${emp.apellido_materno}, ${emp.nombres}`,
        foto_url: emp.foto_url,
        area: emp.area?.nombre || null,
        sede: emp.sede?.nombre || null,
        cargo: emp.cargo?.nombre || null,
        cantidad_faltas: alerta?.faltas || 0,
        requiere_pre_aviso: true,
      };
    });

    // Ordenar por cantidad de faltas (mayor primero)
    resultado.sort((a, b) => b.cantidad_faltas - a.cantidad_faltas);

    return {
      empleados: resultado,
      total: resultado.length,
      minimo_faltas: minimoFaltas,
      rango: {
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
      },
    };
  }

  // Obtener días con justificación para un periodo (indicadores en grilla)
}
