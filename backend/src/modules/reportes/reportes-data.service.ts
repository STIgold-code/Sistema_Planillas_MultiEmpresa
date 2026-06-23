import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FiltrosReporteDto } from './dto/reportes.dto';
import { ReporteConfig } from './reportes.constants';
import { ReportesDetalleService } from './reportes-detalle.service';
import { ColumnConfig, ReporteData } from './reportes.types';
import {
  fechaHoyPeruDate,
  sumarDiasPeru,
} from '../../common/utils/datetime.util';

@Injectable()
export class ReportesDataService {
  constructor(
    private prisma: PrismaService,
    private reportesDetalleService: ReportesDetalleService,
  ) {}

  // ==================== HELPERS DE FILTROS ====================

  parseFiltros(raw: Record<string, string | number | null>): FiltrosReporteDto {
    const filtros: FiltrosReporteDto = {};
    if (raw.area_id) filtros.area_id = Number(raw.area_id);
    if (raw.sede_id) filtros.sede_id = Number(raw.sede_id);
    if (raw.estado) filtros.estado = String(raw.estado);
    if (raw.fecha_desde) filtros.fecha_desde = String(raw.fecha_desde);
    if (raw.fecha_hasta) filtros.fecha_hasta = String(raw.fecha_hasta);
    if (raw.mes) filtros.mes = Number(raw.mes);
    if (raw.anio) filtros.anio = Number(raw.anio);
    if (raw.dias_vencer) filtros.dias_vencer = Number(raw.dias_vencer);
    return filtros;
  }

  /**
   * Valida que los filtros requeridos estén presentes según la configuración del reporte
   */
  validarFiltrosRequeridos(
    reporte: ReporteConfig,
    filtros: FiltrosReporteDto,
  ): void {
    const filtrosRequeridos = reporte.filtros.filter((f) => f.requerido);

    for (const filtroConfig of filtrosRequeridos) {
      const valorFiltro = filtros[filtroConfig.id as keyof FiltrosReporteDto];

      if (
        valorFiltro === undefined ||
        valorFiltro === null ||
        valorFiltro === ''
      ) {
        throw new BadRequestException(
          `El filtro '${filtroConfig.label}' es requerido para el reporte '${reporte.nombre}'`,
        );
      }
    }
  }

  async getReporteCount(
    empresaId: number,
    codigoReporte: string,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    switch (codigoReporte) {
      case 'emp-general':
      case 'emp-cumple':
      case 'emp-docs':
      case 'emp-altas-bajas':
        return this.countEmpleados(empresaId, filtros);
      case 'pla-mensual':
      case 'pla-aportes':
      case 'pla-banco':
      case 'pla-boletas':
        return this.countPlanilla(empresaId, filtros);
      case 'tar-resumen':
      case 'tar-alertas':
      case 'tar-horas-extra':
        return this.countTareo(empresaId, filtros);
      case 'tar-descansos-medicos':
        return this.countDescansosMedicos(empresaId, filtros);
      case 'con-vencer':
      case 'con-vigentes':
      case 'con-historico':
        return this.countContratos(empresaId, filtros);
      case 'vac-saldos':
      case 'vac-tomadas':
      case 'vac-programadas':
        return this.countVacaciones(empresaId, filtros);
      default:
        return 0;
    }
  }

  async getReporteData(
    empresaId: number,
    codigoReporte: string,
    filtros: FiltrosReporteDto,
  ): Promise<{ data: Record<string, unknown>[]; columns: ColumnConfig[] }> {
    switch (codigoReporte) {
      case 'emp-general':
        return this.getEmpleadosGeneral(empresaId, filtros);
      case 'emp-cumple':
        return this.getEmpleadosCumpleanos(empresaId, filtros);
      case 'con-vencer':
        return this.getContratosVencer(empresaId, filtros);
      case 'con-vigentes':
        return this.getContratosVigentes(empresaId, filtros);
      case 'vac-saldos':
        return this.getVacacionesSaldos(empresaId, filtros);
      case 'tar-resumen':
        return this.getTareoResumen(empresaId, filtros);
      case 'tar-descansos-medicos':
        return this.getDescansosMedicos(empresaId, filtros);
      case 'pla-mensual':
        return this.getPlanillaMensual(empresaId, filtros);
      case 'pla-aportes':
        return this.getPlanillaAportes(empresaId, filtros);
      case 'pla-banco':
        return this.getPlanillaBanco(empresaId, filtros);
      case 'tar-alertas':
        return this.getTareoAlertas(empresaId, filtros);
      case 'emp-altas-bajas':
        return this.getEmpleadosAltasBajas(empresaId, filtros);
      default:
        // Este caso no debería alcanzarse si se valida antes, pero por seguridad
        throw new BadRequestException(
          `El reporte '${codigoReporte}' no está implementado. ` +
            `Contacte al administrador del sistema.`,
        );
    }
  }

  // ==================== CONTADORES ====================

  async countEmpleados(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    const where: Prisma.EmpleadoWhereInput = { empresa_id: empresaId };
    if (filtros.area_id) where.area_id = filtros.area_id;
    if (filtros.sede_id) where.sede_id = filtros.sede_id;
    if (filtros.estado)
      where.estado = filtros.estado as Prisma.EnumEstadoEmpleadoFilter;
    return this.prisma.empleado.count({ where });
  }

  async countPlanilla(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    if (!filtros.mes || !filtros.anio) return 0;
    return this.prisma.planillaDetalle.count({
      where: {
        planilla: {
          empresa_id: empresaId,
          mes: filtros.mes,
          anio: filtros.anio,
        },
      },
    });
  }

  async countTareo(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      estado: 'ACTIVO',
    };
    if (filtros.area_id) where.area_id = filtros.area_id;
    if (filtros.sede_id) where.sede_id = filtros.sede_id;
    return this.prisma.empleado.count({ where });
  }

  async countContratos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    const where: Prisma.ContratoWhereInput = {
      empleado: { empresa_id: empresaId },
    };
    if (filtros.dias_vencer) {
      const fechaLimite = sumarDiasPeru(
        fechaHoyPeruDate(),
        filtros.dias_vencer,
      );
      where.fecha_fin = { lte: fechaLimite };
      where.estado = 'ACTIVO';
    }
    return this.prisma.contrato.count({ where });
  }

  async countVacaciones(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    const where: Prisma.EmpleadoWhereInput = {
      empresa_id: empresaId,
      estado: 'ACTIVO',
    };
    if (filtros.area_id) where.area_id = filtros.area_id;
    if (filtros.sede_id) where.sede_id = filtros.sede_id;
    return this.prisma.empleado.count({ where });
  }

  // ==================== GENERADORES DE DATOS ====================

  // ==================== DETALLE (delega a ReportesDetalleService) ====================

  async getEmpleadosGeneral(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getEmpleadosGeneral(empresaId, filtros);
  }

  async getEmpleadosCumpleanos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getEmpleadosCumpleanos(
      empresaId,
      filtros,
    );
  }

  async getContratosVencer(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getContratosVencer(empresaId, filtros);
  }

  async getContratosVigentes(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getContratosVigentes(empresaId, filtros);
  }

  async getVacacionesSaldos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getVacacionesSaldos(empresaId, filtros);
  }

  async getTareoResumen(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getTareoResumen(empresaId, filtros);
  }

  async getPlanillaMensual(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getPlanillaMensual(empresaId, filtros);
  }

  async getPlanillaAportes(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getPlanillaAportes(empresaId, filtros);
  }

  async getPlanillaBanco(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getPlanillaBanco(empresaId, filtros);
  }

  async getTareoAlertas(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getTareoAlertas(empresaId, filtros);
  }

  async getEmpleadosAltasBajas(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getEmpleadosAltasBajas(
      empresaId,
      filtros,
    );
  }

  async countDescansosMedicos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<number> {
    const where: Prisma.TareoJustificacionWhereInput = {
      tareo: { periodo: { empresa_id: empresaId } },
      tipo: { in: ['DESCANSO_MEDICO', 'CERTIFICADO_MEDICO'] },
    };

    if (filtros.fecha_desde || filtros.fecha_hasta) {
      // Las justificaciones tienen dia_inicio y dia_fin (1-31), necesitamos filtrar por periodo
      // Por ahora filtramos por created_at como aproximación
      if (filtros.fecha_desde) {
        where.created_at = { gte: new Date(filtros.fecha_desde) };
      }
      if (filtros.fecha_hasta) {
        where.created_at = {
          ...(where.created_at as Prisma.DateTimeFilter),
          lte: new Date(filtros.fecha_hasta + 'T23:59:59'),
        };
      }
    }

    if (filtros.area_id) {
      where.tareo = {
        ...(where.tareo as Prisma.TareoWhereInput),
        area_id: filtros.area_id,
      };
    }
    if (filtros.sede_id) {
      where.tareo = {
        ...(where.tareo as Prisma.TareoWhereInput),
        sede_id: filtros.sede_id,
      };
    }

    return this.prisma.tareoJustificacion.count({ where });
  }

  async getDescansosMedicos(
    empresaId: number,
    filtros: FiltrosReporteDto,
  ): Promise<ReporteData> {
    return this.reportesDetalleService.getDescansosMedicos(empresaId, filtros);
  }
}
