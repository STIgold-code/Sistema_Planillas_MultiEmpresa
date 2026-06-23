import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanillaConsultaService } from './planilla-consulta.service';
import { PlanillaDetalleService } from './planilla-detalle.service';
import { PlanillasCalcularService } from './planillas-calcular.service';
import { PlanillaAuditoriaService } from './planilla-auditoria.service';
import {
  CreatePlanillaDto,
  UpdatePlanillaDetalleDto,
  FilterPlanillaDto,
} from './dto';
import {
  ahoraPeru,
  formatearFechaPeru,
} from '../../common/utils/datetime.util';

// Interfaz para advertencias de validación (exportada para tipado en controller)
export interface CalculoWarning {
  empleadoId: number;
  empleadoNombre: string;
  tipo:
    | 'SIN_REGIMEN'
    | 'SUELDO_CERO'
    | 'NETO_NEGATIVO'
    | 'SIN_TAREO'
    | 'TAREO_INCOMPLETO'
    | 'DIAS_SIN_MARCACION'
    | 'TURNO_INCONSISTENTE'
    | 'HORAS_CERO';
  mensaje: string;
}

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);

  constructor(
    private prisma: PrismaService,
    private readonly consulta: PlanillaConsultaService,
    private readonly planillaDetalleService: PlanillaDetalleService,
    private readonly planillasCalcularService: PlanillasCalcularService,
    private readonly auditoria: PlanillaAuditoriaService,
  ) {}

  // =============================================
  // LECTURA (delegada a PlanillaConsultaService)
  // =============================================
  async findAll(empresaId: number, filters: FilterPlanillaDto) {
    return this.consulta.findAll(empresaId, filters);
  }

  async findOne(
    id: number,
    empresaId: number,
    includeDetalles: boolean = true,
  ) {
    return this.consulta.findOne(id, empresaId, includeDetalles);
  }

  async findOneDetalles(
    id: number,
    empresaId: number,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ) {
    return this.consulta.findOneDetalles(id, empresaId, page, limit, search);
  }

  async getResumen(empresaId: number) {
    return this.consulta.getResumen(empresaId);
  }

  async exportar(id: number, empresaId: number) {
    return this.consulta.exportar(id, empresaId);
  }

  async create(empresaId: number, dto: CreatePlanillaDto, usuarioId?: number) {
    // Usar transacción para evitar race conditions (planillas duplicadas)
    return this.prisma
      .$transaction(async (tx) => {
        // Verificar si ya existe planilla para ese periodo (dentro de transacción)
        const exists = await tx.planilla.findUnique({
          where: {
            empresa_id_anio_mes: {
              empresa_id: empresaId,
              anio: dto.anio,
              mes: dto.mes,
            },
          },
          select: { id: true, estado: true },
        });

        if (exists) {
          // Si la planilla existente está ANULADA, eliminarla para permitir crear una nueva
          if (exists.estado === 'ANULADA') {
            // Eliminar boletas asociadas
            await tx.boleta.deleteMany({
              where: { planilla_detalle: { planilla_id: exists.id } },
            });
            // Eliminar detalles
            await tx.planillaDetalle.deleteMany({
              where: { planilla_id: exists.id },
            });
            // Eliminar planilla anulada
            await tx.planilla.delete({ where: { id: exists.id } });
          } else {
            throw new ConflictException(
              `Ya existe una planilla para ${dto.mes}/${dto.anio} en estado ${exists.estado}`,
            );
          }
        }

        // Buscar periodo de tareo si no se proporciona
        let periodoTareoId = dto.periodo_tareo_id;
        if (periodoTareoId) {
          // SEGURIDAD: Validar que el periodo_tareo_id pertenece a la empresa
          const periodoExistente = await tx.periodoTareo.findFirst({
            where: {
              id: periodoTareoId,
              empresa_id: empresaId,
            },
          });
          if (!periodoExistente) {
            throw new BadRequestException(
              'El período de tareo especificado no existe o no pertenece a esta empresa',
            );
          }
        } else {
          // Buscar periodo de tareo correspondiente al mes/año
          const periodo = await tx.periodoTareo.findFirst({
            where: {
              empresa_id: empresaId,
              anio: dto.anio,
              mes: dto.mes,
            },
          });
          periodoTareoId = periodo?.id;
        }

        const planilla = await tx.planilla.create({
          data: {
            empresa_id: empresaId,
            anio: dto.anio,
            mes: dto.mes,
            periodo_tareo_id: periodoTareoId,
            observaciones: dto.observaciones,
            estado: 'BORRADOR',
          },
        });

        // Registrar auditoría de creación
        await this.auditoria.registrar(tx, {
          tabla: 'planillas',
          registro_id: planilla.id,
          accion: 'CREAR',
          empresa_id: empresaId,
          usuario_id: usuarioId,
          datos_nuevos: { anio: dto.anio, mes: dto.mes, estado: 'BORRADOR' },
        });

        return planilla;
      })
      .then(async (planilla) => {
        // Calcular automáticamente al crear (fuera de la transacción de creación)
        try {
          return await this.calcular(planilla.id, empresaId, usuarioId);
        } catch (error) {
          // Si falla el cálculo, devolver la planilla con advertencia
          const mensajeError =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `No se pudo calcular automáticamente: ${mensajeError}`,
          );
          return {
            ...planilla,
            _warning: `Planilla creada pero el cálculo automático falló: ${mensajeError}`,
            _requiresManualCalculation: true,
          };
        }
      });
  }

  async calcular(id: number, empresaId: number, usuarioId?: number) {
    return this.planillasCalcularService.calcular(id, empresaId, usuarioId);
  }

  async updateDetalle(
    planillaId: number,
    detalleId: number,
    empresaId: number,
    dto: UpdatePlanillaDetalleDto,
    usuarioId?: number,
  ) {
    return this.planillaDetalleService.updateDetalle(
      planillaId,
      detalleId,
      empresaId,
      dto,
      usuarioId,
    );
  }

  async aprobar(id: number, empresaId: number, usuarioId: number) {
    // Verificar que existe (fuera de transacción para fail fast)
    await this.consulta.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'CALCULADA' && planilla.estado !== 'REVISADA') {
        throw new BadRequestException(
          'Solo se pueden aprobar planillas en estado CALCULADA o REVISADA',
        );
      }

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          fecha_aprobacion: ahoraPeru().toJSDate(),
          aprobado_por: usuarioId,
        },
      });

      await this.auditoria.registrar(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'APROBAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: planilla.estado },
        datos_nuevos: { estado: 'APROBADA' },
      });

      return updated;
    });
  }

  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    motivo?: string,
  ) {
    // Verificar que existe (fuera de transacción para fail fast)
    await this.consulta.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, observaciones: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'CALCULADA' && planilla.estado !== 'REVISADA') {
        throw new BadRequestException(
          'Solo se pueden rechazar planillas en estado CALCULADA o REVISADA',
        );
      }

      const nuevaObservacion = motivo
        ? `[RECHAZADA ${formatearFechaPeru(ahoraPeru().toJSDate(), 'yyyy-MM-dd')}]: ${motivo}${planilla.observaciones ? '\n' + planilla.observaciones : ''}`
        : planilla.observaciones;

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'BORRADOR',
          observaciones: nuevaObservacion,
          fecha_aprobacion: null,
          aprobado_por: null,
        },
      });

      await this.auditoria.registrar(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'RECHAZAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: planilla.estado },
        datos_nuevos: { estado: 'BORRADOR', motivo_rechazo: motivo },
      });

      return updated;
    });
  }

  async marcarPagada(id: number, empresaId: number, usuarioId?: number) {
    // Verificación inicial (fail-fast)
    await this.consulta.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, mes: true, anio: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'APROBADA') {
        throw new BadRequestException(
          'Solo se pueden marcar como pagadas las planillas aprobadas',
        );
      }

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'PAGADA',
          fecha_pago: ahoraPeru().toJSDate(),
        },
      });

      await this.auditoria.registrar(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'PAGAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: 'APROBADA' },
        datos_nuevos: { estado: 'PAGADA', fecha_pago: updated.fecha_pago },
      });

      return updated;
    });
  }

  async anular(
    id: number,
    empresaId: number,
    usuarioId?: number,
    motivo?: string,
  ) {
    // Verificación inicial (fail-fast)
    await this.consulta.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción para evitar race conditions
      // SEGURIDAD: Usar findFirst con empresa_id para prevenir acceso cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: { estado: true, observaciones: true },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado === 'PAGADA') {
        throw new BadRequestException('No se pueden anular planillas pagadas');
      }

      const estadoAnterior = planilla.estado;
      const nuevaObservacion = motivo
        ? `[ANULADA ${formatearFechaPeru(ahoraPeru().toJSDate(), 'yyyy-MM-dd')}]: ${motivo}${planilla.observaciones ? '\n' + planilla.observaciones : ''}`
        : planilla.observaciones;

      const updated = await tx.planilla.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          observaciones: nuevaObservacion,
        },
      });

      await this.auditoria.registrar(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'ANULAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: { estado: estadoAnterior },
        datos_nuevos: { estado: 'ANULADA', motivo_anulacion: motivo },
      });

      return updated;
    });
  }

  async remove(id: number, empresaId: number, usuarioId?: number) {
    // Verificación inicial (fail-fast)
    await this.consulta.findOneSimple(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      // Re-verificar estado DENTRO de la transacción con empresa_id para evitar race conditions y cross-tenant
      const planilla = await tx.planilla.findFirst({
        where: { id, empresa_id: empresaId },
        select: {
          id: true,
          estado: true,
          anio: true,
          mes: true,
          total_empleados: true,
        },
      });

      if (!planilla) {
        throw new NotFoundException('Planilla no encontrada');
      }

      if (planilla.estado !== 'BORRADOR' && planilla.estado !== 'ANULADA') {
        throw new BadRequestException(
          'Solo se pueden eliminar planillas en estado BORRADOR o ANULADA',
        );
      }

      // IMPORTANTE: Eliminar boletas existentes antes de eliminar detalles
      // Las boletas están vinculadas a planilla_detalle_id (relación 1:1)
      await tx.boleta.deleteMany({
        where: {
          planilla_detalle: {
            planilla_id: id,
          },
        },
      });

      // Eliminar detalles (después de eliminar boletas)
      await tx.planillaDetalle.deleteMany({ where: { planilla_id: id } });

      // Registrar auditoría antes de eliminar
      await this.auditoria.registrar(tx, {
        tabla: 'planillas',
        registro_id: id,
        accion: 'ELIMINAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: {
          anio: planilla.anio,
          mes: planilla.mes,
          estado: planilla.estado,
          total_empleados: planilla.total_empleados,
        },
        datos_nuevos: null,
      });

      await tx.planilla.delete({ where: { id } });

      return { message: 'Planilla eliminada correctamente' };
    });
  }
}
