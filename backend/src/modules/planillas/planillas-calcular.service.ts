import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ahoraPeru } from '../../common/utils/datetime.util';
import { calcularEmpleado } from './calculos/calcular-empleado';
import { RegimenNoCertificadoError } from './aplicacion/guardia-certificacion';
import {
  calcularDetalleEmpleado,
  DetalleLegacy,
} from './aplicacion/calcular-detalle-empleado';
import { EmpleadoParaMapeo } from './aplicacion/mapear-entrada-calculo';
import { PlanillaPromediosService } from './planilla-promedios.service';
import { PlanillaParametrosService } from './planilla-parametros.service';
import { PlanillaAuditoriaService } from './planilla-auditoria.service';
import { PlanillaCargaService } from './planilla-carga.service';

// Tipo de advertencia (duplicado del principal para autocontener)
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

/**
 * Servicio de cálculo de planilla.
 *
 * Orquesta la carga Prisma (empleados, tareo, acumulados IR), delega el cálculo
 * por empleado al CAMINO REAL del motor régimen-parametrizado
 * (`aplicacion/calcular-detalle-empleado`: mapper → factory → guardia → motor →
 * overlay sobre el DTO auxiliar legacy) y persiste en una transacción.
 *
 * Los promedios históricos, la carga de parámetros legales y la auditoría se
 * extrajeron a servicios dedicados (SRP / tamaño de archivo < 500 LOC).
 */
@Injectable()
export class PlanillasCalcularService {
  private readonly logger = new Logger(PlanillasCalcularService.name);

  constructor(
    private prisma: PrismaService,
    private promedios: PlanillaPromediosService,
    private parametros: PlanillaParametrosService,
    private auditoria: PlanillaAuditoriaService,
    private carga: PlanillaCargaService,
  ) {}

  private async findOneSimple(id: number, empresaId: number) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id, empresa_id: empresaId },
      select: {
        id: true,
        empresa_id: true,
        periodo_tareo_id: true,
        anio: true,
        mes: true,
        estado: true,
        fecha_generacion: true,
        total_bruto: true,
        total_descuentos: true,
        total_neto: true,
        total_empleados: true,
      },
    });

    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }

    return planilla;
  }

  async calcular(id: number, empresaId: number, usuarioId?: number) {
    const planilla = await this.findOneSimple(id, empresaId);

    if (
      planilla.estado !== 'BORRADOR' &&
      planilla.estado !== 'CALCULADA' &&
      planilla.estado !== 'REVISADA'
    ) {
      throw new BadRequestException(
        'Solo se pueden calcular planillas en estado BORRADOR, CALCULADA o REVISADA',
      );
    }

    const tieneEdicionesManuales = planilla.estado === 'REVISADA';

    const { periodoTareoId, warningsPlanilla } =
      await this.carga.resolverPeriodoTareo(planilla, empresaId);

    const fechaInicioPeriodo = new Date(planilla.anio, planilla.mes - 1, 1);
    const fechaFinPeriodo = new Date(planilla.anio, planilla.mes, 0);

    const empleados = await this.carga.cargarEmpleados(
      empresaId,
      periodoTareoId,
      fechaInicioPeriodo,
      fechaFinPeriodo,
    );

    if (empleados.length === 0) {
      throw new BadRequestException(
        'No hay empleados con contrato vigente en este periodo',
      );
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { regimen_laboral_default: true },
    });
    const empresaParaRegimen = {
      regimen_laboral_default: empresa?.regimen_laboral_default ?? 'GENERAL',
    } as const;

    // Parámetros legales: adapter Prisma (tabla parametros_legales) con fallback
    // in-memory para las claves estructuradas. El dominio solo ve el puerto.
    const parametrosLegales = await this.parametros.cargar();

    const acumuladosPorEmpleado = await this.carga.cargarAcumuladosIR(
      empleados.map((e) => e.id),
      empresaId,
      planilla.anio,
      planilla.mes,
    );

    const detalles: Prisma.PlanillaDetalleCreateManyInput[] = [];
    const warnings: CalculoWarning[] = [];
    let totalBruto = 0;
    let totalDescuentos = 0;
    let totalNeto = 0;

    for (const empleado of empleados) {
      try {
        const tareo = empleado.tareos?.[0];
        const detallesTareo = tareo?.detalles || [];

        if (detallesTareo.length === 0) {
          detalles.push(this.carga.detalleSinTareo(planilla.id, empleado.id));
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'SIN_TAREO',
            mensaje: 'Empleado sin tareo registrado para este período',
          });
          continue;
        }

        this.carga.recolectarWarnings(
          empleado,
          detallesTareo,
          planilla,
          warnings,
        );

        const acumulado = acumuladosPorEmpleado.get(empleado.id) || {
          remuneracionAcumulada: 0,
          retencionesAcumuladas: 0,
        };

        const promedios = await this.promedios.obtener(
          empleado.id,
          empresaId,
          planilla.mes,
          planilla.anio,
        );

        // Paso auxiliar legacy: estructura/días/aportes empleador/computables.
        const detalleLegacy = calcularEmpleado(
          empleado,
          planilla.mes,
          planilla.anio,
          acumulado.remuneracionAcumulada,
          acumulado.retencionesAcumuladas,
          promedios,
        ) as unknown as DetalleLegacy;

        // CAMINO REAL: el motor nuevo calcula y sobreescribe los montos
        // load-bearing del régimen sobre el DTO auxiliar. La guardia de
        // certificación bloquea régimenes no certificados ANTES de calcular.
        const calculo = calcularDetalleEmpleado({
          empleado: empleado as unknown as EmpleadoParaMapeo,
          empresa: empresaParaRegimen,
          mes: planilla.mes,
          anio: planilla.anio,
          acumuladoRenta: acumulado.remuneracionAcumulada,
          retencionesPreviasRenta: acumulado.retencionesAcumuladas,
          detalleLegacy,
          parametros: parametrosLegales,
        }) as Record<string, number | string | boolean>;

        const netoPagar = Number(calculo.neto_pagar) || 0;
        if (netoPagar < 0) {
          const deficit = Math.abs(netoPagar);
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'NETO_NEGATIVO',
            mensaje: `Neto negativo: S/. ${netoPagar.toFixed(2)}. Déficit de S/. ${deficit.toFixed(2)} ajustado a 0.`,
          });
          calculo.observaciones = `[NETO NEGATIVO AJUSTADO] Valor original: S/. ${netoPagar.toFixed(2)}`;
          calculo.neto_pagar = 0;
          calculo.neto_mes = 0;
        }

        detalles.push({
          planilla_id: id,
          empleado_id: empleado.id,
          ...calculo,
          regimen_pensionario: empleado.regimen_pensionario?.nombre || null,
          banco_nombre: empleado.banco_haberes?.nombre || null,
          cuenta_numero: empleado.nro_cuenta_haberes || null,
          cci: empleado.cci_haberes || null,
        } as Prisma.PlanillaDetalleCreateManyInput);

        totalBruto += Number(calculo.total_ingresos) || 0;
        totalDescuentos += Number(calculo.total_descuentos) || 0;
        totalNeto += Math.max(0, Number(calculo.neto_pagar) || 0);
      } catch (error) {
        if (error instanceof RegimenNoCertificadoError) {
          this.logger.warn(
            `Planilla bloqueada: empleado ${empleado.id} en régimen no certificado "${error.regimen}".`,
          );
          throw new BadRequestException(
            `No se puede calcular la planilla del empleado ${empleado.nombres} ${empleado.apellido_paterno}: ${error.message}`,
          );
        }
        this.logger.error(
          `Error al calcular empleado ${empleado.id} (${empleado.nombres} ${empleado.apellido_paterno}): ${(error as Error).message}`,
        );
        throw new BadRequestException(
          `Error al calcular planilla del empleado ${empleado.nombres} ${empleado.apellido_paterno}: ${(error as Error).message}`,
        );
      }
    }

    const result = await this.persistir({
      id,
      empresaId,
      usuarioId,
      planilla,
      detalles,
      periodoTareoId,
      totalBruto,
      totalDescuentos,
      totalNeto,
      totalEmpleados: empleados.length,
    });

    return this.armarRespuesta(
      result,
      warnings,
      warningsPlanilla,
      tieneEdicionesManuales,
    );
  }

  private async persistir(args: {
    id: number;
    empresaId: number;
    usuarioId?: number;
    planilla: { estado: string; periodo_tareo_id: number | null };
    detalles: Prisma.PlanillaDetalleCreateManyInput[];
    periodoTareoId: number | null;
    totalBruto: number;
    totalDescuentos: number;
    totalNeto: number;
    totalEmpleados: number;
  }) {
    const {
      id,
      empresaId,
      usuarioId,
      planilla,
      detalles,
      periodoTareoId,
      totalBruto,
      totalDescuentos,
      totalNeto,
      totalEmpleados,
    } = args;

    return this.prisma.$transaction(
      async (tx) => {
        await tx.boleta.deleteMany({
          where: { planilla_detalle: { planilla_id: id } },
        });
        await tx.planillaDetalle.deleteMany({ where: { planilla_id: id } });
        await tx.planillaDetalle.createMany({ data: detalles });

        const updated = await tx.planilla.update({
          where: { id },
          data: {
            estado: 'CALCULADA',
            fecha_generacion: ahoraPeru().toJSDate(),
            total_bruto: totalBruto,
            total_descuentos: totalDescuentos,
            total_neto: totalNeto,
            total_empleados: totalEmpleados,
            ...(periodoTareoId && !planilla.periodo_tareo_id
              ? { periodo_tareo_id: periodoTareoId }
              : {}),
          },
          include: { _count: { select: { detalles: true } } },
        });

        await this.auditoria.registrar(tx, {
          tabla: 'planillas',
          registro_id: id,
          accion: 'CALCULAR',
          empresa_id: empresaId,
          usuario_id: usuarioId,
          datos_anteriores: { estado: planilla.estado },
          datos_nuevos: {
            estado: 'CALCULADA',
            total_empleados: totalEmpleados,
            total_bruto: totalBruto,
            total_neto: totalNeto,
          },
        });

        return updated;
      },
      { timeout: 60000 },
    );
  }

  private armarRespuesta(
    result: unknown,
    warnings: CalculoWarning[],
    warningsPlanilla: string[],
    tieneEdicionesManuales: boolean,
  ) {
    const tieneWarnings =
      warnings.length > 0 ||
      warningsPlanilla.length > 0 ||
      tieneEdicionesManuales;

    if (!tieneWarnings) return result;

    return {
      ...(result as object),
      _warnings: warnings,
      _warningCount: warnings.length,
      ...(warningsPlanilla.length > 0 && {
        _warningsPlanilla: warningsPlanilla,
      }),
      ...(tieneEdicionesManuales && {
        _edicionesPerdidas: true,
        _mensajeEdiciones:
          'La planilla estaba en estado REVISADA. Las ediciones manuales previas han sido sobrescritas por el recálculo.',
      }),
    };
  }
}
