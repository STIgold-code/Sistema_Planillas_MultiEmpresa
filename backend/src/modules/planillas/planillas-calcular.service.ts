import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, AccionAuditoria } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ahoraPeru } from '../../common/utils/datetime.util';
import {
  ESSALUD_PORCENTAJE,
  ESSALUD_MINIMO,
  RMV,
  ONP_PORCENTAJE,
  round2,
  safeNumber,
} from './planillas.config';
import {
  calcularEmpleado,
  EmpleadoParaCalculo,
  PromediosHistoricos,
} from './calculos/calcular-empleado';

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
 * Servicio dedicado al calculo de planilla (proceso pesado de ~450 LOC).
 * Extraido de PlanillasService para mantener el archivo principal por debajo
 * de 1.000 LOC. Mantiene comportamiento identico al original (cero transformacion).
 *
 * Tiene su propio findOneSimple y registrarAuditoria (duplicados del principal)
 * para evitar dependencias circulares.
 */
@Injectable()
export class PlanillasCalcularService {
  private readonly logger = new Logger(PlanillasCalcularService.name);

  constructor(private prisma: PrismaService) {}

  // Helper local: busca planilla por id+empresa, lanza NotFoundException si no existe.
  // Duplicado de PlanillasService.findOneSimple para evitar dep circular.
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

  private async getPromediosHistoricos(
    empleadoId: number,
    empresaId: number,
    mes: number,
    anio: number,
  ): Promise<PromediosHistoricos> {
    // Calcular rango de 6 meses anteriores
    const mesesAnteriores: { mes: number; anio: number }[] = [];
    let mesTemp = mes;
    let anioTemp = anio;

    for (let i = 0; i < 6; i++) {
      mesTemp--;
      if (mesTemp < 1) {
        mesTemp = 12;
        anioTemp--;
      }
      mesesAnteriores.push({ mes: mesTemp, anio: anioTemp });
    }

    // Buscar planillas anteriores del empleado
    const detallesAnteriores = await this.prisma.planillaDetalle.findMany({
      where: {
        empleado_id: empleadoId,
        planilla: {
          empresa_id: empresaId,
          estado: { in: ['CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA'] },
          OR: mesesAnteriores.map((m) => ({ mes: m.mes, anio: m.anio })),
        },
      },
      select: {
        horas_extras: true,
        horas_extras_25: true,
        horas_extras_35: true,
        bonificaciones: true,
        bonificacion_nocturna: true,
        gratificacion_monto: true,
        dias_trabajados: true,
        planilla: {
          select: { mes: true, anio: true },
        },
      },
      orderBy: {
        planilla: { created_at: 'desc' },
      },
    });

    // Calcular promedios
    let totalHorasExtras = 0;
    let totalBonificaciones = 0;
    let mesesConDatos = 0;
    let ultimaGratificacion = 0;

    for (const detalle of detallesAnteriores) {
      const he =
        safeNumber(detalle.horas_extras) ||
        safeNumber(detalle.horas_extras_25) +
          safeNumber(detalle.horas_extras_35);
      totalHorasExtras += he;
      totalBonificaciones +=
        safeNumber(detalle.bonificaciones) +
        safeNumber(detalle.bonificacion_nocturna);
      mesesConDatos++;

      // Guardar última gratificación (julio o diciembre anterior)
      if (
        (detalle.planilla.mes === 7 || detalle.planilla.mes === 12) &&
        safeNumber(detalle.gratificacion_monto) > 0
      ) {
        if (ultimaGratificacion === 0) {
          ultimaGratificacion = safeNumber(detalle.gratificacion_monto);
        }
      }
    }

    const promedioHorasExtras =
      mesesConDatos > 0 ? round2(totalHorasExtras / mesesConDatos) : 0;
    const promedioBonificaciones =
      mesesConDatos > 0 ? round2(totalBonificaciones / mesesConDatos) : 0;

    // Calcular meses trabajados en el semestre actual
    // Para gratificación julio: semestre enero-junio
    // Para gratificación diciembre: semestre julio-noviembre
    // Para CTS mayo: semestre noviembre-abril
    // Para CTS noviembre: semestre mayo-octubre
    const mesesTrabajadosSemestre = Math.min(mesesConDatos, 6);
    // Nota: diasTrabajadosSemestre no se usa en los cálculos actuales.
    // La lógica de días fracción se resuelve dentro de calcularCts con su propia variable diasCts.
    const diasTrabajadosSemestre = 0;

    return {
      promedioHorasExtras,
      promedioComisiones: 0, // TODO: Implementar si hay campo de comisiones
      promedioBonificaciones,
      mesesTrabajadosSemestre,
      diasTrabajadosSemestre,
      ultimaGratificacion,
    };
  }

  async calcular(id: number, empresaId: number, usuarioId?: number) {
    // Obtener planilla primero (fuera de transacción para validaciones)
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

    // ADVERTENCIA: Si la planilla está en REVISADA, tiene ediciones manuales que se perderán
    const tieneEdicionesManuales = planilla.estado === 'REVISADA';

    // Si no hay periodo_tareo_id, buscar el periodo correspondiente al mes/año
    let periodoTareoId = planilla.periodo_tareo_id;
    let periodoTareo = null;

    if (!periodoTareoId) {
      periodoTareo = await this.prisma.periodoTareo.findFirst({
        where: {
          empresa_id: empresaId,
          anio: planilla.anio,
          mes: planilla.mes,
        },
      });
      periodoTareoId = periodoTareo?.id || null;
    } else {
      periodoTareo = await this.prisma.periodoTareo.findUnique({
        where: { id: periodoTareoId },
      });
    }

    // VALIDACIÓN: El tareo debe estar CERRADO para calcular la planilla
    if (periodoTareo && periodoTareo.estado !== 'CERRADO') {
      throw new BadRequestException(
        `El período de tareo de ${planilla.mes}/${planilla.anio} debe estar CERRADO antes de calcular la planilla. Estado actual: ${periodoTareo.estado}`,
      );
    }

    // WARNING: Si no hay periodo de tareo, se calculará sin datos de asistencia
    const warningsPlanilla: string[] = [];
    if (!periodoTareo) {
      warningsPlanilla.push(
        `No existe período de tareo para ${planilla.mes}/${planilla.anio}. Los cálculos de días, horas extras y feriados pueden ser incorrectos.`,
      );
    }

    // Construir filtro de tareos - solo filtrar si hay periodo
    const tareoWhere = periodoTareoId ? { periodo_id: periodoTareoId } : {};

    // Calcular fechas del período para validar contratos
    const fechaInicioPeriodo = new Date(planilla.anio, planilla.mes - 1, 1);
    const fechaFinPeriodo = new Date(planilla.anio, planilla.mes, 0); // Último día del mes

    // Obtener empleados con contrato que cubra al menos parte del período (excluir solo los de tipo RECIBO)
    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresa_id: empresaId,
        estado: { in: ['ACTIVO', 'PENDIENTE', 'CESADO'] },
        NOT: {
          tipo_pago: 'RECIBO',
        },
        // VALIDACIÓN: Empleados con contrato (cualquier estado) que cubra al menos parte del período
        contratos: {
          some: {
            estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
            fecha_inicio: { lte: fechaFinPeriodo },
            OR: [
              { fecha_fin: null }, // Contrato indefinido
              { fecha_fin: { gte: fechaInicioPeriodo } }, // Contrato que termina después del inicio del período
            ],
          },
        },
      },
      include: {
        regimen_pensionario: true,
        banco_haberes: true,
        // Incluir contrato del período para calcular días de ingreso/cese
        contratos: {
          where: {
            estado: { in: ['ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO'] },
            fecha_inicio: { lte: fechaFinPeriodo },
            OR: [
              { fecha_fin: null },
              { fecha_fin: { gte: fechaInicioPeriodo } },
            ],
          },
          orderBy: { fecha_inicio: 'desc' },
          take: 1,
        },
        tareos: {
          where: tareoWhere,
          include: {
            detalles: {
              include: {
                tipo_marcacion: true,
              },
            },
          },
        },
      },
    });

    if (empleados.length === 0) {
      throw new BadRequestException(
        'No hay empleados con contrato vigente en este periodo',
      );
    }

    // Identificar empleados con y sin tareo para el reporte
    const empleadosConTareo = empleados.filter(
      (e) => e.tareos && e.tareos.length > 0,
    );
    const empleadosSinTareo = empleados.filter(
      (e) => !e.tareos || e.tareos.length === 0,
    );

    // Cargar acumulado de IR 5ta categoría de meses anteriores del mismo año
    // Esto es necesario para calcular correctamente la retención mensual
    const empleadoIds = empleados.map((e) => e.id);
    const acumuladosIR = await this.prisma.planillaDetalle.groupBy({
      by: ['empleado_id'],
      where: {
        empleado_id: { in: empleadoIds },
        planilla: {
          empresa_id: empresaId, // SEGURIDAD: Filtrar por empresa para evitar fuga de datos multi-tenant
          anio: planilla.anio,
          mes: { lt: planilla.mes },
          estado: { in: ['CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA'] },
        },
      },
      _sum: {
        remuneracion_afecta: true,
        renta_5ta: true,
      },
    });

    // Crear mapa de acumulados por empleado para acceso rápido
    const acumuladosPorEmpleado = new Map<
      number,
      { remuneracionAcumulada: number; retencionesAcumuladas: number }
    >();
    for (const acum of acumuladosIR) {
      acumuladosPorEmpleado.set(acum.empleado_id, {
        remuneracionAcumulada: Number(acum._sum.remuneracion_afecta) || 0,
        retencionesAcumuladas: Number(acum._sum.renta_5ta) || 0,
      });
    }

    // Calcular para cada empleado (fuera de transacción, es CPU-bound)
    const detalles: Prisma.PlanillaDetalleCreateManyInput[] = [];
    const warnings: CalculoWarning[] = [];
    let totalBruto = 0;
    let totalDescuentos = 0;
    let totalNeto = 0;

    for (const empleado of empleados) {
      try {
        // Verificar si el empleado tiene tareo CON DETALLES registrados
        // IMPORTANTE: Al generar el período, se crean registros de tareo vacíos para todos los empleados
        // Por lo tanto, debemos verificar si el tareo tiene detalles de marcación, no solo si existe
        const tareo = empleado.tareos?.[0];
        const detallesTareo = tareo?.detalles || [];
        const tieneTareoConDetalles = detallesTareo.length > 0;

        // Si no tiene detalles en el tareo, agregar fila vacía (solo datos del empleado, sin montos)
        if (!tieneTareoConDetalles) {
          detalles.push({
            planilla_id: planilla.id,
            empleado_id: empleado.id,
            // Todos los valores en 0 - el empleado aparece pero sin cálculos
            total_dias: 0,
            dias_trabajados: 0,
            dias_falta: 0,
            dias_vacaciones: 0,
            dias_licencia_sin_goce: 0,
            dias_licencia_con_goce: 0,
            dias_licencia_fallecimiento: 0,
            dias_licencia_paternidad: 0,
            dias_descanso_medico: 0,
            dias_subsidio_incapacidad: 0,
            dias_subsidio_maternidad: 0,
            dias_suspension: 0,
            turno_dia: 0,
            turno_noche: 0,
            horas_8: 0,
            cantidad_feriados: 0,
            rem_basica: 0,
            total_sueldo_estructura: 0,
            haber_mensual: 0,
            total_ingresos: 0,
            total_descuentos: 0,
            neto_pagar: 0,
            remuneracion_afecta: 0,
            observaciones: 'SIN TAREO REGISTRADO',
          });

          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'SIN_TAREO',
            mensaje: 'Empleado sin tareo registrado para este período',
          });

          continue; // Saltar al siguiente empleado
        }

        // Validaciones de advertencia
        if (!empleado.regimen_pensionario) {
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'SIN_REGIMEN',
            mensaje: 'Empleado sin régimen pensionario configurado',
          });
        }

        const sueldoBase = Number(empleado.sueldo_base) || 0;
        if (sueldoBase <= 0) {
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'SUELDO_CERO',
            mensaje: 'Empleado con sueldo base cero o no configurado',
          });
        }

        // =============================================
        // VALIDACIONES DE TAREO (Fase 1 - Críticas)
        // =============================================
        // NOTA: Si llegamos aquí, el empleado tiene tareo con detalles (verificado arriba con continue)
        const nombreEmpleado = `${empleado.nombres} ${empleado.apellido_paterno}`;
        const diasDelMesActual = new Date(
          planilla.anio,
          planilla.mes,
          0,
        ).getDate();
        const diasConDetalle = detallesTareo.length;

        // 1.2 Validar que el tareo tenga todos los días del mes
        if (diasConDetalle < diasDelMesActual) {
          const diasFaltantes = diasDelMesActual - diasConDetalle;
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: nombreEmpleado,
            tipo: 'TAREO_INCOMPLETO',
            mensaje: `Tareo incompleto: tiene ${diasConDetalle} días de ${diasDelMesActual}. Faltan ${diasFaltantes} días por marcar.`,
          });
        }

        // 1.3 Validar que no haya días sin tipo_marcacion
        const diasSinMarcacion = detallesTareo.filter(
          (d) => !d.tipo_marcacion_id && !d.tipo_marcacion,
        );
        if (diasSinMarcacion.length > 0) {
          const diasAfectados = diasSinMarcacion.map((d) => d.dia).join(', ');
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: nombreEmpleado,
            tipo: 'DIAS_SIN_MARCACION',
            mensaje: `${diasSinMarcacion.length} día(s) sin tipo de marcación: días ${diasAfectados}. Estos días serán ignorados en el cálculo.`,
          });
        }

        // 1.4 Validar días laborables con horas = 0 o null
        const diasLaborablesSinHoras = detallesTareo.filter(
          (d) =>
            d.tipo_marcacion?.es_laborable &&
            (d.horas === null || Number(d.horas) === 0),
        );
        if (diasLaborablesSinHoras.length > 0) {
          const diasAfectados = diasLaborablesSinHoras
            .map((d) => d.dia)
            .join(', ');
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: nombreEmpleado,
            tipo: 'HORAS_CERO',
            mensaje: `${diasLaborablesSinHoras.length} día(s) laborable(s) con horas = 0: días ${diasAfectados}. No se calcularán horas extras para estos días.`,
          });
        }

        // Obtener acumulado de meses anteriores para IR 5ta
        const acumuladoEmpleado = acumuladosPorEmpleado.get(empleado.id) || {
          remuneracionAcumulada: 0,
          retencionesAcumuladas: 0,
        };

        // Obtener promedios históricos (últimos 6 meses) para CTS y gratificación
        const promedios = await this.getPromediosHistoricos(
          empleado.id,
          empresaId,
          planilla.mes,
          planilla.anio,
        );

        const calculo = calcularEmpleado(
          empleado,
          planilla.mes,
          planilla.anio,
          acumuladoEmpleado.remuneracionAcumulada,
          acumuladoEmpleado.retencionesAcumuladas,
          promedios,
        );

        // Validar neto >= 0
        if (calculo.neto_pagar < 0) {
          const netoOriginal = calculo.neto_pagar;
          const deficit = Math.abs(netoOriginal);
          warnings.push({
            empleadoId: empleado.id,
            empleadoNombre: `${empleado.nombres} ${empleado.apellido_paterno}`,
            tipo: 'NETO_NEGATIVO',
            mensaje: `Neto negativo: S/. ${netoOriginal.toFixed(2)} (Ingresos: S/. ${calculo.total_ingresos.toFixed(2)}, Descuentos: S/. ${calculo.total_descuentos.toFixed(2)}). Déficit de S/. ${deficit.toFixed(2)} ajustado a 0.`,
          });
          // Guardar el valor original en observaciones para auditoría
          calculo.observaciones = `[NETO NEGATIVO AJUSTADO] Valor original: S/. ${netoOriginal.toFixed(2)}`;
          // Corregir a 0 para evitar problemas
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
        });

        totalBruto += calculo.total_ingresos;
        totalDescuentos += calculo.total_descuentos;
        totalNeto += Math.max(0, calculo.neto_pagar);
      } catch (error) {
        this.logger.error(
          `Error al calcular empleado ${empleado.id} (${empleado.nombres} ${empleado.apellido_paterno}): ${error.message}`,
        );
        throw new BadRequestException(
          `Error al calcular planilla del empleado ${empleado.nombres} ${empleado.apellido_paterno}: ${error.message}`,
        );
      }
    }

    // Usar transacción para las operaciones de BD (delete + insert + update)
    const result = await this.prisma.$transaction(
      async (tx) => {
        // IMPORTANTE: Eliminar boletas existentes antes de eliminar detalles
        // Las boletas están vinculadas a planilla_detalle_id
        await tx.boleta.deleteMany({
          where: {
            planilla_detalle: {
              planilla_id: id,
            },
          },
        });

        // Eliminar detalles existentes
        await tx.planillaDetalle.deleteMany({
          where: { planilla_id: id },
        });

        // Insertar detalles
        await tx.planillaDetalle.createMany({
          data: detalles,
        });

        // Actualizar totales de planilla
        const updated = await tx.planilla.update({
          where: { id },
          data: {
            estado: 'CALCULADA',
            fecha_generacion: ahoraPeru().toJSDate(),
            total_bruto: totalBruto,
            total_descuentos: totalDescuentos,
            total_neto: totalNeto,
            total_empleados: empleados.length,
            ...(periodoTareoId && !planilla.periodo_tareo_id
              ? { periodo_tareo_id: periodoTareoId }
              : {}),
          },
          include: {
            _count: { select: { detalles: true } },
          },
        });

        // Registrar auditoría
        await this.registrarAuditoria(tx, {
          tabla: 'planillas',
          registro_id: id,
          accion: 'CALCULAR',
          empresa_id: empresaId,
          usuario_id: usuarioId,
          datos_anteriores: { estado: planilla.estado },
          datos_nuevos: {
            estado: 'CALCULADA',
            total_empleados: empleados.length,
            total_bruto: totalBruto,
            total_neto: totalNeto,
          },
        });

        return updated;
      },
      {
        timeout: 60000, // 60 segundos para planillas grandes
      },
    );

    // Retornar resultado con advertencias si las hay
    const tieneWarnings =
      warnings.length > 0 ||
      warningsPlanilla.length > 0 ||
      tieneEdicionesManuales;

    if (tieneWarnings) {
      return {
        ...result,
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

    return result;
  }

  private async registrarAuditoria(
    tx: Prisma.TransactionClient,
    params: {
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
      datos_anteriores?: any;
      datos_nuevos?: any;
    },
  ) {
    try {
      // Mapear acciones personalizadas a las del enum AccionAuditoria
      const accionMap: Record<string, AccionAuditoria> = {
        CREAR: AccionAuditoria.CREATE,
        CALCULAR: AccionAuditoria.UPDATE,
        EDITAR: AccionAuditoria.UPDATE,
        APROBAR: AccionAuditoria.UPDATE,
        RECHAZAR: AccionAuditoria.UPDATE,
        PAGAR: AccionAuditoria.UPDATE,
        ANULAR: AccionAuditoria.UPDATE,
        ELIMINAR: AccionAuditoria.DELETE,
      };

      await tx.auditoria.create({
        data: {
          tabla_afectada: params.tabla,
          registro_id: params.registro_id,
          accion: accionMap[params.accion] || AccionAuditoria.UPDATE,
          usuario_id: params.usuario_id || null,
          datos_anteriores: params.datos_anteriores
            ? { ...params.datos_anteriores, _accion_detalle: params.accion }
            : null,
          datos_nuevos: params.datos_nuevos
            ? { ...params.datos_nuevos, _accion_detalle: params.accion }
            : null,
        },
      });
    } catch (error) {
      // Si falla la auditoría, solo loguear pero no fallar la operación principal
      this.logger.warn(`Error al registrar auditoría: ${error.message}`);
    }
  }
}
