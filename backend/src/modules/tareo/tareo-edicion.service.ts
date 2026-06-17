import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, EstadoPeriodoTareo, EstadoSesionTareo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { UpdateTareoDetalleDto, BulkUpdateTareoDto } from './dto';
import {
  isDiaEnContrato,
  isCodigoPermitidoFueraContrato,
} from './tareo-excel-helpers';

// Limite maximo de celdas por actualizacion masiva (previene DoS)
const MAX_BULK_UPDATE_CELLS = 1000;

/**
 * Servicio de edicion de tareo: updateDetalle (1 marcacion) y bulkUpdate
 * (varias marcaciones en transaccion). Ambos validan dias dentro del contrato
 * y codigos permitidos.
 *
 * Extraido de TareoService para mantener el archivo principal por debajo
 * de 400 LOC.
 */
@Injectable()
export class TareoEdicionService {
  constructor(private prisma: PrismaService) {}

  async updateDetalle(
    detalleId: number,
    empresaId: number,
    usuarioId: number,
    dto: UpdateTareoDetalleDto,
    ipAddress?: string,
    sinRestriccionSesion = false,
  ) {
    // Obtener detalle con periodo y contrato del empleado
    const detalle = await this.prisma.tareoDetalle.findUnique({
      where: { id: detalleId },
      include: {
        tareo: {
          include: {
            periodo: true,
            empleado: {
              include: {
                contratos: {
                  orderBy: { fecha_inicio: 'desc' },
                },
              },
            },
          },
        },
        tipo_marcacion: true,
      },
    });

    if (!detalle || detalle.tareo.periodo.empresa_id !== empresaId) {
      throw new NotFoundException('Detalle no encontrado');
    }

    if (detalle.tareo.periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('No se puede modificar un periodo cerrado');
    }

    if (detalle.tareo.periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException('No se puede modificar un periodo anulado');
    }

    // Obtener código anterior para auditoría
    const codigoAnterior = detalle.tipo_marcacion?.codigo || null;

    // Obtener tipo de marcación nuevo (completo para calculo de horas)
    let codigoNuevo: string | null = null;
    let tipoMarcacionNuevo: {
      codigo: string;
      horas_diurnas: number;
      horas_nocturnas: number;
      requiere_calculo: boolean;
    } | null = null;
    if (dto.tipo_marcacion_id) {
      const tipoMarcacion = await this.prisma.tipoMarcacion.findUnique({
        where: { id: dto.tipo_marcacion_id },
      });
      codigoNuevo = tipoMarcacion?.codigo || null;
      tipoMarcacionNuevo = tipoMarcacion;
    }

    // Buscar contrato que aplica al periodo (por fechas, no por estado)
    const periodoDetalle = detalle.tareo.periodo;
    const fechaInicioP = new Date(
      periodoDetalle.anio,
      periodoDetalle.mes - 1,
      1,
    );
    const fechaFinP = new Date(periodoDetalle.anio, periodoDetalle.mes, 0);
    const contratoVigente =
      detalle.tareo.empleado.contratos.find((c) => {
        const inicio = new Date(c.fecha_inicio);
        inicio.setHours(0, 0, 0, 0);
        if (inicio > fechaFinP) return false;
        if (c.fecha_fin) {
          const fin = new Date(c.fecha_fin);
          fin.setHours(23, 59, 59, 999);
          if (fin < fechaInicioP) return false;
        }
        return true;
      }) || null;
    const diaEnContrato = isDiaEnContrato(
      detalle.dia,
      detalle.tareo.periodo.mes,
      detalle.tareo.periodo.anio,
      contratoVigente?.fecha_inicio || null,
      contratoVigente?.fecha_fin || null,
    );

    // Si el día está fuera del contrato, solo permitir null o SC
    if (!diaEnContrato && !isCodigoPermitidoFueraContrato(codigoNuevo)) {
      throw new BadRequestException(
        `El día ${detalle.dia} está fuera del período de contrato del empleado. Solo se permite vacío o "SC" (Sin Contrato).`,
      );
    }

    // Actualizar en transacción
    return this.prisma.$transaction(async (tx) => {
      // ERR-001: Re-validar sesión DENTRO de transacción para prevenir race conditions
      if (!sinRestriccionSesion) {
        const sesion = await tx.sesionTareo.findFirst({
          where: {
            periodo_id: detalle.tareo.periodo_id,
            usuario_id: usuarioId,
            empresa_id: empresaId,
            estado: EstadoSesionTareo.ACTIVA,
          },
        });

        if (!sesion) {
          throw new ForbiddenException(
            'Sesión expirada durante la operación. Los cambios no fueron guardados.',
          );
        }

        // Calcular tiempo restante
        const ahora = ahoraPeru().toJSDate();
        const inicio = new Date(sesion.fecha_inicio);
        const finPrevisto = new Date(
          inicio.getTime() + sesion.tiempo_limite_minutos * 60 * 1000,
        );
        const tiempoRestante = Math.floor(
          (finPrevisto.getTime() - ahora.getTime()) / 1000,
        );

        if (tiempoRestante <= 0) {
          await tx.sesionTareo.update({
            where: { id: sesion.id },
            data: { estado: EstadoSesionTareo.EXPIRADA },
          });
          throw new ForbiddenException(
            'Sesión expirada durante la operación. Los cambios no fueron guardados.',
          );
        }
      }

      // Actualizar detalle
      const updated = await tx.tareoDetalle.update({
        where: { id: detalleId },
        data: {
          tipo_marcacion_id: dto.tipo_marcacion_id,
          horas:
            dto.horas ??
            (tipoMarcacionNuevo?.requiere_calculo
              ? (tipoMarcacionNuevo.horas_diurnas ?? 0) +
                (tipoMarcacionNuevo.horas_nocturnas ?? 0)
              : undefined),
          observacion: dto.observacion,
        },
        include: {
          tipo_marcacion: {
            select: { id: true, codigo: true, color: true },
          },
        },
      });

      // Registrar auditoría
      await tx.tareoDetalleAudit.create({
        data: {
          tareo_detalle_id: detalleId,
          valor_anterior: codigoAnterior,
          valor_nuevo: codigoNuevo,
          usuario_id: usuarioId,
          ip_address: ipAddress,
        },
      });

      return updated;
    });
  }

  // Actualización masiva de celdas - OPTIMIZADO con batch transactional
  async bulkUpdate(
    periodoId: number,
    empresaId: number,
    usuarioId: number,
    dto: BulkUpdateTareoDto,
    ipAddress?: string,
    sinRestriccionSesion = false,
  ) {
    // SEGURIDAD: Limitar cantidad de celdas para prevenir DoS
    if (dto.celdas.length > MAX_BULK_UPDATE_CELLS) {
      throw new BadRequestException(
        `Máximo ${MAX_BULK_UPDATE_CELLS} celdas por solicitud. Recibidas: ${dto.celdas.length}`,
      );
    }

    // Verificar periodo
    const periodo = await this.prisma.periodoTareo.findFirst({
      where: { id: periodoId, empresa_id: empresaId },
    });

    if (!periodo) {
      throw new NotFoundException('Periodo no encontrado');
    }

    if (periodo.estado === EstadoPeriodoTareo.CERRADO) {
      throw new BadRequestException('No se puede modificar un periodo cerrado');
    }

    if (periodo.estado === EstadoPeriodoTareo.ANULADO) {
      throw new BadRequestException('No se puede modificar un periodo anulado');
    }

    // Obtener mapa de códigos a IDs
    const tiposMarcacion = await this.prisma.tipoMarcacion.findMany({
      where: { activo: true },
    });
    const codigoToId = new Map(tiposMarcacion.map((t) => [t.codigo, t.id]));
    const idToCodigo = new Map(tiposMarcacion.map((t) => [t.id, t.codigo]));
    const codigoToTipo = new Map(tiposMarcacion.map((t) => [t.codigo, t]));

    // Obtener todos los empleado_ids únicos de las celdas
    const empleadoIds = [...new Set(dto.celdas.map((c) => c.empleado_id))];

    // SEGURIDAD: Validar que todos los empleados pertenecen a la empresa
    const empleadosValidos = await this.prisma.empleado.findMany({
      where: {
        id: { in: empleadoIds },
        empresa_id: empresaId,
      },
      select: { id: true },
    });
    const empleadoIdsValidos = new Set(empleadosValidos.map((e) => e.id));

    // Filtrar solo empleados válidos de la empresa
    const empleadoIdsSeguro = empleadoIds.filter((id) =>
      empleadoIdsValidos.has(id),
    );

    if (empleadoIdsSeguro.length === 0) {
      throw new BadRequestException(
        'Ningún empleado válido encontrado para actualizar',
      );
    }

    // Cargar todos los tareos necesarios en UNA query (solo empleados validados)
    const tareos = await this.prisma.tareo.findMany({
      where: {
        periodo_id: periodoId,
        empleado_id: { in: empleadoIdsSeguro },
      },
      select: { id: true, empleado_id: true },
    });
    const empleadoToTareo = new Map(tareos.map((t) => [t.empleado_id, t.id]));

    // Cargar contratos que se solapan con el periodo (por fechas, no por estado)
    const fechaInicioPeriodo = new Date(periodo.anio, periodo.mes - 1, 1);
    const fechaFinPeriodo = new Date(periodo.anio, periodo.mes, 0);
    const contratos = await this.prisma.contrato.findMany({
      where: {
        empleado_id: { in: empleadoIds },
        fecha_inicio: { lte: fechaFinPeriodo },
        OR: [{ fecha_fin: null }, { fecha_fin: { gte: fechaInicioPeriodo } }],
      },
      orderBy: { fecha_inicio: 'desc' },
    });
    // Crear mapa de empleado_id -> contrato más reciente
    const empleadoToContrato = new Map<
      number,
      { fecha_inicio: Date; fecha_fin: Date | null }
    >();
    for (const contrato of contratos) {
      if (!empleadoToContrato.has(contrato.empleado_id)) {
        empleadoToContrato.set(contrato.empleado_id, {
          fecha_inicio: contrato.fecha_inicio,
          fecha_fin: contrato.fecha_fin,
        });
      }
    }

    // Obtener todos los tareo_ids
    const tareoIds = tareos.map((t) => t.id);

    // Cargar todos los detalles necesarios en UNA query
    const diasRequeridos = dto.celdas.map((c) => c.dia);
    const detalles = await this.prisma.tareoDetalle.findMany({
      where: {
        tareo_id: { in: tareoIds },
        dia: { in: diasRequeridos },
      },
      select: { id: true, tareo_id: true, dia: true, tipo_marcacion_id: true },
    });

    // Crear mapa para búsqueda rápida: "tareo_id-dia" -> detalle
    const detalleMap = new Map(
      detalles.map((d) => [`${d.tareo_id}-${d.dia}`, d]),
    );

    // Preparar operaciones batch
    const updates: Array<{
      id: number;
      tipo_marcacion_id: number | null;
      horas?: number;
      observacion?: string;
    }> = [];
    const audits: Array<{
      tareo_detalle_id: number;
      valor_anterior: string | null;
      valor_nuevo: string | null;
      usuario_id: number;
      ip_address: string | null;
    }> = [];
    const resultados: Array<{
      empleado_id: number;
      dia: number;
      success: boolean;
      error?: string;
    }> = [];

    // Procesar celdas sin queries adicionales
    for (const celda of dto.celdas) {
      const tareoId = empleadoToTareo.get(celda.empleado_id);
      if (!tareoId) {
        resultados.push({
          empleado_id: celda.empleado_id,
          dia: celda.dia,
          success: false,
          error: 'Tareo no encontrado',
        });
        continue;
      }

      const detalle = detalleMap.get(`${tareoId}-${celda.dia}`);
      if (!detalle) {
        resultados.push({
          empleado_id: celda.empleado_id,
          dia: celda.dia,
          success: false,
          error: 'Detalle no encontrado',
        });
        continue;
      }

      // Validar si el día está dentro del contrato
      const contrato = empleadoToContrato.get(celda.empleado_id);
      const diaEnContrato = isDiaEnContrato(
        celda.dia,
        periodo.mes,
        periodo.anio,
        contrato?.fecha_inicio || null,
        contrato?.fecha_fin || null,
      );

      // Si el día está fuera del contrato, validar código permitido
      if (
        !diaEnContrato &&
        !isCodigoPermitidoFueraContrato(celda.codigo || null)
      ) {
        resultados.push({
          empleado_id: celda.empleado_id,
          dia: celda.dia,
          success: false,
          error: `Día ${celda.dia} fuera de contrato. Solo se permite vacío o SC.`,
        });
        continue;
      }

      const tipoMarcacionId = celda.codigo
        ? codigoToId.get(celda.codigo) || null
        : null;
      const valorAnterior = detalle.tipo_marcacion_id
        ? idToCodigo.get(detalle.tipo_marcacion_id) || null
        : null;

      const tipo = celda.codigo ? codigoToTipo.get(celda.codigo) : null;
      const horasCalc = tipo?.requiere_calculo
        ? (tipo.horas_diurnas ?? 0) + (tipo.horas_nocturnas ?? 0)
        : undefined;

      updates.push({
        id: detalle.id,
        tipo_marcacion_id: tipoMarcacionId,
        horas: horasCalc,
        observacion: celda.observacion,
      });

      audits.push({
        tareo_detalle_id: detalle.id,
        valor_anterior: valorAnterior,
        valor_nuevo: celda.codigo || null,
        usuario_id: usuarioId,
        ip_address: ipAddress || null,
      });

      resultados.push({
        empleado_id: celda.empleado_id,
        dia: celda.dia,
        success: true,
      });
    }

    // Ejecutar todo en UNA transacción
    if (updates.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        // ERR-002: Re-validar sesión DENTRO de la transacción para prevenir race conditions
        if (!sinRestriccionSesion) {
          const sesion = await tx.sesionTareo.findFirst({
            where: {
              periodo_id: periodoId,
              usuario_id: usuarioId,
              empresa_id: empresaId,
              estado: EstadoSesionTareo.ACTIVA,
            },
          });

          if (!sesion) {
            throw new ForbiddenException(
              'Sesión expirada durante la operación. Los cambios no fueron guardados.',
            );
          }

          // Calcular tiempo restante
          const ahora = ahoraPeru().toJSDate();
          const inicio = new Date(sesion.fecha_inicio);
          const finPrevisto = new Date(
            inicio.getTime() + sesion.tiempo_limite_minutos * 60 * 1000,
          );
          const tiempoRestante = Math.floor(
            (finPrevisto.getTime() - ahora.getTime()) / 1000,
          );

          if (tiempoRestante <= 0) {
            // Marcar sesión como expirada
            await tx.sesionTareo.update({
              where: { id: sesion.id },
              data: { estado: EstadoSesionTareo.EXPIRADA },
            });
            throw new ForbiddenException(
              'Sesión expirada durante la operación. Los cambios no fueron guardados.',
            );
          }
        }

        // Batch updates usando raw SQL para máximo rendimiento
        for (const update of updates) {
          await tx.tareoDetalle.update({
            where: { id: update.id },
            data: {
              tipo_marcacion_id: update.tipo_marcacion_id,
              horas: update.horas,
              observacion: update.observacion,
            },
          });
        }

        // Batch create audits
        await tx.tareoDetalleAudit.createMany({
          data: audits,
        });
      });
    }

    return {
      total: dto.celdas.length,
      exitosos: resultados.filter((r) => r.success).length,
      fallidos: resultados.filter((r) => !r.success).length,
      detalles: resultados,
    };
  }

  // Obtener historial de cambios de un detalle
}
