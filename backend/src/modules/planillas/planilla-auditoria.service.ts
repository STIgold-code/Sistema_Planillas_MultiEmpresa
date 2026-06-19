import { Injectable, Logger } from '@nestjs/common';
import { Prisma, AccionAuditoria } from '@prisma/client';

export interface ParametrosAuditoria {
  tabla: string;
  registro_id: number;
  accion:
    | 'CREAR'
    | 'CALCULAR'
    | 'EDITAR'
    | 'APROBAR'
    | 'RECHAZAR'
    | 'PAGAR'
    | 'ANULAR'
    | 'ELIMINAR';
  empresa_id: number;
  usuario_id?: number;
  datos_anteriores?: unknown;
  datos_nuevos?: unknown;
}

/**
 * Registro de auditoría para operaciones de planilla. Extraído de
 * PlanillasCalcularService (SRP / tamaño de archivo). Best-effort: si falla la
 * auditoría, solo se loguea y no se aborta la operación principal.
 */
@Injectable()
export class PlanillaAuditoriaService {
  private readonly logger = new Logger(PlanillaAuditoriaService.name);

  private readonly accionMap: Record<string, AccionAuditoria> = {
    CREAR: AccionAuditoria.CREATE,
    CALCULAR: AccionAuditoria.UPDATE,
    EDITAR: AccionAuditoria.UPDATE,
    APROBAR: AccionAuditoria.UPDATE,
    RECHAZAR: AccionAuditoria.UPDATE,
    PAGAR: AccionAuditoria.UPDATE,
    ANULAR: AccionAuditoria.UPDATE,
    ELIMINAR: AccionAuditoria.DELETE,
  };

  async registrar(
    tx: Prisma.TransactionClient,
    params: ParametrosAuditoria,
  ): Promise<void> {
    try {
      await tx.auditoria.create({
        data: {
          tabla_afectada: params.tabla,
          registro_id: params.registro_id,
          accion: this.accionMap[params.accion] || AccionAuditoria.UPDATE,
          usuario_id: params.usuario_id || null,
          datos_anteriores: params.datos_anteriores
            ? ({
                ...(params.datos_anteriores as object),
                _accion_detalle: params.accion,
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          datos_nuevos: params.datos_nuevos
            ? ({
                ...(params.datos_nuevos as object),
                _accion_detalle: params.accion,
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Error al registrar auditoría: ${(error as Error).message}`,
      );
    }
  }
}
