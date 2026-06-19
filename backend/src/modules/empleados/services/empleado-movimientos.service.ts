import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { parsearFechaISOenPeru } from '../../../common/utils/datetime.util';
import { EmpleadoDocumentosService } from './empleado-documentos.service';

/**
 * Servicio de movimientos del empleado: ALTA, BAJA, RENUNCIA, REINCORPORACION,
 * VACACIONES, SUSPENSION.
 *
 * Extraido de EmpleadosService para mantener el archivo principal por debajo
 * de 400 LOC. Maneja la creacion del registro de movimiento + actualizacion
 * del estado del empleado + cierre de contratos activos cuando aplica
 * (BAJA/RENUNCIA), todo en una sola transaccion.
 */
@Injectable()
export class EmpleadoMovimientosService {
  constructor(
    private prisma: PrismaService,
    private empleadoDocumentosService: EmpleadoDocumentosService,
  ) {}

  async registrar(
    empleadoId: number,
    empresaId: number,
    usuarioId: number,
    data: {
      tipo_movimiento:
        | 'ALTA'
        | 'BAJA'
        | 'RENUNCIA'
        | 'VACACIONES'
        | 'SUSPENSION'
        | 'REINCORPORACION';
      fecha_movimiento: string;
      motivo?: string;
      observaciones?: string;
    },
  ) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresa_id: empresaId },
    });

    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Validar documentación para movimientos que activan al empleado
    if (
      data.tipo_movimiento === 'REINCORPORACION' ||
      data.tipo_movimiento === 'ALTA'
    ) {
      await this.empleadoDocumentosService.validarPuedeEstarActivo(
        empleadoId,
        empresaId,
      );
    }

    // Actualizar estado del empleado según el movimiento
    let nuevoEstado = empleado.estado;
    if (
      data.tipo_movimiento === 'BAJA' ||
      data.tipo_movimiento === 'RENUNCIA'
    ) {
      nuevoEstado = 'CESADO';
    } else if (data.tipo_movimiento === 'REINCORPORACION') {
      nuevoEstado = 'ACTIVO';
    }

    const fechaMovimiento = parsearFechaISOenPeru(data.fecha_movimiento);
    const esBajaORenuncia =
      data.tipo_movimiento === 'BAJA' || data.tipo_movimiento === 'RENUNCIA';

    await this.prisma.$transaction(async (tx) => {
      // 1. Crear el movimiento
      await tx.empleadoMovimiento.create({
        data: {
          empleado_id: empleadoId,
          tipo_movimiento: data.tipo_movimiento,
          fecha_movimiento: fechaMovimiento,
          motivo: data.motivo,
          observaciones: data.observaciones,
          usuario_id: usuarioId,
        },
      });

      // 2. Actualizar estado del empleado
      await tx.empleado.update({
        where: { id: empleadoId },
        data: {
          estado: nuevoEstado,
          fecha_cese: esBajaORenuncia ? fechaMovimiento : undefined,
        },
      });

      // 3. Si es BAJA o RENUNCIA, terminar todos los contratos ACTIVOS y PENDIENTES del empleado
      if (esBajaORenuncia) {
        await tx.contrato.updateMany({
          where: {
            empleado_id: empleadoId,
            estado: { in: ['ACTIVO', 'PENDIENTE'] },
          },
          data: {
            estado: 'CESADO',
            fecha_cese: fechaMovimiento,
            motivo_cese: data.motivo || null,
          },
        });
      }
    });

    return { message: 'Movimiento registrado correctamente' };
  }

  /**
   * Devuelve los tipos de movimiento permitidos segun el estado actual del empleado.
   * Helper puro para validacion en UI / reglas de negocio.
   */
  getTiposPorEstado(estado: string): TipoMovimiento[] {
    const mapping: Record<string, TipoMovimiento[]> = {
      CESADO: ['BAJA', 'RENUNCIA'],
      ACTIVO: ['ALTA', 'REINCORPORACION'],
      SUSPENDIDO: ['SUSPENSION'],
      VACACIONES: ['VACACIONES'],
    };
    return mapping[estado] || ['ALTA'];
  }
}
