import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanillaConsultaService } from './planilla-consulta.service';
import { PlanillaAuditoriaService } from './planilla-auditoria.service';
import { UpdatePlanillaDetalleDto } from './dto';
import { construirDataActualizacionDetalle } from './planilla-detalle-data';
import {
  ESSALUD_PORCENTAJE,
  ESSALUD_MINIMO,
  RMV,
  ONP_PORCENTAJE,
  round2,
  safeNumber,
} from './planillas.config';

@Injectable()
export class PlanillaDetalleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consulta: PlanillaConsultaService,
    private readonly auditoria: PlanillaAuditoriaService,
  ) {}

  async updateDetalle(
    planillaId: number,
    detalleId: number,
    empresaId: number,
    dto: UpdatePlanillaDetalleDto,
    usuarioId?: number,
  ) {
    // Usar versión simple para validación de estado
    const planilla = await this.consulta.findOneSimple(planillaId, empresaId);

    if (planilla.estado !== 'CALCULADA' && planilla.estado !== 'REVISADA') {
      throw new BadRequestException(
        'Solo se pueden editar planillas en estado CALCULADA o REVISADA',
      );
    }

    // Verificar que el detalle pertenece a la planilla Y la planilla a la empresa
    const detalle = await this.prisma.planillaDetalle.findFirst({
      where: {
        id: detalleId,
        planilla_id: planillaId,
        planilla: { empresa_id: empresaId }, // Doble verificación de seguridad
      },
      include: {
        empleado: {
          include: {
            regimen_pensionario: true,
          },
        },
      },
    });

    if (!detalle) {
      throw new NotFoundException('Detalle de planilla no encontrado');
    }

    // Helper para obtener valor actualizado o existente
    const getVal = (dtoVal: number | undefined, detalleVal: any): number => {
      return dtoVal !== undefined ? dtoVal : Number(detalleVal) || 0;
    };

    // =============================================
    // DÍAS DEL PERÍODO
    // =============================================
    const totalDias = getVal(dto.total_dias, detalle.total_dias);
    const diasCesadoNoLab = getVal(
      dto.dias_cesado_no_lab,
      detalle.dias_cesado_no_lab,
    );
    const diasNuevoNoLab = getVal(
      dto.dias_nuevo_no_lab,
      detalle.dias_nuevo_no_lab,
    );
    const diasSinCobertura = getVal(
      dto.dias_sin_cobertura,
      detalle.dias_sin_cobertura,
    );
    const diasFalta = getVal(dto.dias_falta, detalle.dias_falta);
    const diasSuspension = getVal(dto.dias_suspension, detalle.dias_suspension);
    const diasVacaciones = getVal(dto.dias_vacaciones, detalle.dias_vacaciones);
    const diasSubsidioIncapacidad = getVal(
      dto.dias_subsidio_incapacidad,
      detalle.dias_subsidio_incapacidad,
    );
    const diasSubsidioMaternidad = getVal(
      dto.dias_subsidio_maternidad,
      detalle.dias_subsidio_maternidad,
    );
    const diasDescansoMedico = getVal(
      dto.dias_descanso_medico,
      detalle.dias_descanso_medico,
    );
    const diasLicenciaSinGoce = getVal(
      dto.dias_licencia_sin_goce,
      detalle.dias_licencia_sin_goce,
    );
    const diasLicenciaFallecimiento = getVal(
      dto.dias_licencia_fallecimiento,
      detalle.dias_licencia_fallecimiento,
    );
    const diasLicenciaPaternidad = getVal(
      dto.dias_licencia_paternidad,
      detalle.dias_licencia_paternidad,
    );
    const diasLicenciaConGoce = getVal(
      dto.dias_licencia_con_goce,
      detalle.dias_licencia_con_goce,
    );
    const turnoDia = getVal(dto.turno_dia, detalle.turno_dia);
    const turnoNoche = getVal(dto.turno_noche, detalle.turno_noche);

    // Calcular días trabajados (con protección contra negativos)
    // NOTA: Esta fórmula debe coincidir con calcularEmpleado()
    // - Vacaciones NO reducen días trabajados (se pagan como remuneración vacacional)
    // - Licencias con goce NO reducen días trabajados (se pagan como licencia_goce_monto)
    // - Subsidios sí reducen días trabajados (son pagados por EsSalud)
    const diasNoTrabajados =
      diasCesadoNoLab +
      diasNuevoNoLab +
      diasSinCobertura +
      diasFalta +
      diasSuspension +
      diasLicenciaSinGoce;

    const diasSubsidio =
      diasSubsidioIncapacidad + diasSubsidioMaternidad + diasDescansoMedico;

    // Usar el valor existente del detalle (calculado correctamente desde tareo)
    // Fallback a 0 si no existe - tareo es la fuente de verdad
    const diasTrabajados =
      detalle.dias_trabajados != null ? Number(detalle.dias_trabajados) : 0;

    // =============================================
    // INGRESOS AFECTOS
    // =============================================
    const sueldoBase = Number(detalle.sueldo_base) || 0;
    const haberMensual = (sueldoBase / 30) * Math.max(0, diasTrabajados);

    const sueldoNocturno = getVal(dto.sueldo_nocturno, detalle.sueldo_nocturno);
    const pasajeEspecial = getVal(dto.pasaje_especial, detalle.pasaje_especial);
    const horasExtras25 = getVal(dto.horas_extras_25, detalle.horas_extras_25);
    const horasExtras35 = getVal(dto.horas_extras_35, detalle.horas_extras_35);
    const feriadoTrabajado = getVal(
      dto.feriado_trabajado,
      detalle.feriado_trabajado,
    );
    const descansoMedicoMonto = getVal(
      dto.descanso_medico_monto,
      detalle.descanso_medico_monto,
    );
    const subsidioIncapacidad = getVal(
      dto.subsidio_incapacidad,
      detalle.subsidio_incapacidad,
    );
    const subsidioMaternidad = getVal(
      dto.subsidio_maternidad,
      detalle.subsidio_maternidad,
    );
    const asignacionFamiliar = getVal(
      dto.asignacion_familiar,
      detalle.asignacion_familiar,
    );
    const licenciaGoceMonto = getVal(
      dto.licencia_goce_monto,
      detalle.licencia_goce_monto,
    );
    const bonificaciones = getVal(dto.bonificaciones, detalle.bonificaciones);
    const otrosIngresos = getVal(dto.otros_ingresos, detalle.otros_ingresos);

    const totalIngresosAfectos =
      haberMensual +
      sueldoNocturno +
      pasajeEspecial +
      horasExtras25 +
      horasExtras35 +
      feriadoTrabajado +
      descansoMedicoMonto +
      subsidioIncapacidad +
      subsidioMaternidad +
      asignacionFamiliar +
      licenciaGoceMonto +
      bonificaciones +
      otrosIngresos;

    // =============================================
    // INGRESOS NO AFECTOS
    // =============================================
    const remuneracionVacacional = getVal(
      dto.remuneracion_vacacional,
      detalle.remuneracion_vacacional,
    );
    const compensacionVacacional = getVal(
      dto.compensacion_vacacional,
      detalle.compensacion_vacacional,
    );
    const ctsMonto = getVal(dto.cts_monto, detalle.cts_monto);
    const gratificacionMonto = getVal(
      dto.gratificacion_monto,
      detalle.gratificacion_monto,
    );
    const movilidad = getVal(dto.movilidad, detalle.movilidad);
    const refrigerio = getVal(dto.refrigerio, detalle.refrigerio);
    const bonoDesempenoMonto = getVal(
      dto.bono_desempeno_monto,
      detalle.bono_desempeno_monto,
    );
    const asignacionCliente = getVal(
      dto.asignacion_cliente,
      detalle.asignacion_cliente,
    );
    const pegadaReenganche = getVal(
      dto.pegada_reenganche,
      detalle.pegada_reenganche,
    );
    const bonoProductividadMonto = getVal(
      dto.bono_productividad_monto,
      detalle.bono_productividad_monto,
    );
    const bonoArmadoMonto = getVal(
      dto.bono_armado_monto,
      detalle.bono_armado_monto,
    );
    const bonoReferido = getVal(dto.bono_referido, detalle.bono_referido);
    const reintegroDiasTrab = getVal(
      dto.reintegro_dias_trab,
      detalle.reintegro_dias_trab,
    );
    const reintegroInafecto = getVal(
      dto.reintegro_inafecto,
      detalle.reintegro_inafecto,
    );
    const ingresoSobregiro = getVal(
      dto.ingreso_sobregiro,
      detalle.ingreso_sobregiro,
    );
    const ventaVacaciones = getVal(
      dto.venta_vacaciones,
      detalle.venta_vacaciones,
    );

    const totalIngresosNoAfectos =
      remuneracionVacacional +
      compensacionVacacional +
      ctsMonto +
      gratificacionMonto +
      movilidad +
      refrigerio +
      bonoDesempenoMonto +
      asignacionCliente +
      pegadaReenganche +
      bonoProductividadMonto +
      bonoArmadoMonto +
      bonoReferido +
      reintegroDiasTrab +
      reintegroInafecto +
      ingresoSobregiro +
      ventaVacaciones;

    const totalIngresos = totalIngresosAfectos + totalIngresosNoAfectos;
    const remuneracionAfecta = totalIngresosAfectos;

    // =============================================
    // DESCUENTOS
    // =============================================
    // AFP/ONP se recalcula automáticamente basado en remuneración afecta
    const regimen = detalle.empleado?.regimen_pensionario;
    let afpAporte = 0;
    let afpPrima = 0;
    const afpComision = getVal(dto.afp_comision, detalle.afp_comision);
    let onp = 0;

    if (regimen?.tipo === 'AFP') {
      // Usar tasas dinámicas de la BD (actualizadas por scraping de SBS)
      const aporteObligatorio = safeNumber(regimen.aporte_obligatorio) / 100;
      const primaSeguro = safeNumber(regimen.prima_seguro) / 100;
      afpAporte = remuneracionAfecta * aporteObligatorio;
      afpPrima = remuneracionAfecta * primaSeguro;
      // afpComision ya viene del DTO o detalle existente
    } else if (regimen?.tipo === 'ONP') {
      const aporteOnp = safeNumber(regimen.aporte_obligatorio) / 100;
      onp = remuneracionAfecta * (aporteOnp || ONP_PORCENTAJE);
    }

    const adelantoQuincena = getVal(
      dto.adelanto_quincena,
      detalle.adelanto_quincena,
    );
    const adelantoVacacional = getVal(
      dto.adelanto_vacacional,
      detalle.adelanto_vacacional,
    );
    const otrosAdelantos = getVal(dto.otros_adelantos, detalle.otros_adelantos);
    const adelantoCts = getVal(dto.adelanto_cts, detalle.adelanto_cts);
    const adelantoGratificacion = getVal(
      dto.adelanto_gratificacion,
      detalle.adelanto_gratificacion,
    );
    const otrosDescuentos = getVal(
      dto.otros_descuentos,
      detalle.otros_descuentos,
    );
    const descuentoFaltas = getVal(
      dto.descuento_faltas,
      detalle.descuento_faltas,
    );
    const descuentoSobregiro = getVal(
      dto.descuento_sobregiro,
      detalle.descuento_sobregiro,
    );
    const descuentoReintegro = getVal(
      dto.descuento_reintegro,
      detalle.descuento_reintegro,
    );
    const prestamo = getVal(dto.prestamo, detalle.prestamo);
    const retencionJudicial = getVal(
      dto.retencion_judicial,
      detalle.retencion_judicial,
    );
    const renta5ta = getVal(dto.renta_5ta, detalle.renta_5ta);

    const totalDescuentos =
      afpAporte +
      afpPrima +
      afpComision +
      onp +
      adelantoQuincena +
      adelantoVacacional +
      otrosAdelantos +
      adelantoCts +
      adelantoGratificacion +
      otrosDescuentos +
      descuentoFaltas +
      descuentoSobregiro +
      descuentoReintegro +
      prestamo +
      retencionJudicial +
      renta5ta;

    // ESSALUD (aporte empleador - no se descuenta del trabajador)
    // Essalud = IF(Rem_Afecta < RMV, ESSALUD_MINIMO, Rem_Afecta × 9%)
    const essaludEmpleador =
      remuneracionAfecta < RMV
        ? ESSALUD_MINIMO
        : remuneracionAfecta * ESSALUD_PORCENTAJE;

    // Neto a pagar (con validación >= 0)
    let netoPagar = totalIngresos - totalDescuentos;
    let netoWarning: string | null = null;

    if (netoPagar < 0) {
      netoWarning = `El neto calculado era negativo (S/. ${netoPagar.toFixed(2)}). Se ajustó a 0.`;
      netoPagar = 0;
    }

    // round2 importado desde planillas.config.ts

    // Guardar datos anteriores para auditoría
    const datosAnteriores = {
      neto_pagar: Number(detalle.neto_pagar),
      total_ingresos: Number(detalle.total_ingresos),
      total_descuentos: Number(detalle.total_descuentos),
      dias_trabajados: detalle.dias_trabajados,
    };

    // Usar transacción para update + recalcular totales + cambio estado
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.planillaDetalle.update({
        where: { id: detalleId },
        data: construirDataActualizacionDetalle({
          totalDias,
          diasTrabajados,
          diasCesadoNoLab,
          diasNuevoNoLab,
          diasSinCobertura,
          diasFalta,
          diasSuspension,
          diasVacaciones,
          diasSubsidioIncapacidad,
          diasSubsidioMaternidad,
          diasDescansoMedico,
          diasLicenciaSinGoce,
          diasLicenciaFallecimiento,
          diasLicenciaPaternidad,
          diasLicenciaConGoce,
          turnoDia,
          turnoNoche,
          haberMensual,
          sueldoNocturno,
          pasajeEspecial,
          horasExtras25,
          horasExtras35,
          feriadoTrabajado,
          descansoMedicoMonto,
          subsidioIncapacidad,
          subsidioMaternidad,
          asignacionFamiliar,
          licenciaGoceMonto,
          bonificaciones,
          otrosIngresos,
          remuneracionVacacional,
          compensacionVacacional,
          ctsMonto,
          gratificacionMonto,
          movilidad,
          refrigerio,
          bonoDesempenoMonto,
          asignacionCliente,
          pegadaReenganche,
          bonoProductividadMonto,
          bonoArmadoMonto,
          bonoReferido,
          reintegroDiasTrab,
          reintegroInafecto,
          ingresoSobregiro,
          ventaVacaciones,
          afpAporte,
          afpPrima,
          afpComision,
          onp,
          adelantoQuincena,
          adelantoVacacional,
          otrosAdelantos,
          adelantoCts,
          adelantoGratificacion,
          otrosDescuentos,
          descuentoFaltas,
          descuentoSobregiro,
          descuentoReintegro,
          prestamo,
          retencionJudicial,
          renta5ta,
          totalIngresosAfectos,
          totalIngresosNoAfectos,
          totalIngresos,
          totalDescuentos,
          essaludEmpleador,
          remuneracionAfecta,
          netoPagar,
          observaciones: dto.observaciones ?? detalle.observaciones,
        }),
      });

      // Recalcular totales de planilla (dentro de transacción)
      const totales = await tx.planillaDetalle.aggregate({
        where: { planilla_id: planillaId },
        _sum: {
          total_ingresos: true,
          total_descuentos: true,
          neto_pagar: true,
        },
        _count: true,
      });

      // Actualizar planilla (totales y estado si es necesario)
      await tx.planilla.update({
        where: { id: planillaId },
        data: {
          total_bruto: totales._sum.total_ingresos || 0,
          total_descuentos: totales._sum.total_descuentos || 0,
          total_neto: totales._sum.neto_pagar || 0,
          total_empleados: totales._count,
          ...(planilla.estado === 'CALCULADA' ? { estado: 'REVISADA' } : {}),
        },
      });

      // Registrar auditoría
      await this.auditoria.registrar(tx, {
        tabla: 'planilla_detalles',
        registro_id: detalleId,
        accion: 'EDITAR',
        empresa_id: empresaId,
        usuario_id: usuarioId,
        datos_anteriores: datosAnteriores,
        datos_nuevos: {
          neto_pagar: round2(netoPagar),
          total_ingresos: round2(totalIngresos),
          total_descuentos: round2(totalDescuentos),
          dias_trabajados: diasTrabajados,
        },
      });

      return updated;
    });

    // Agregar advertencia si hubo neto negativo
    if (netoWarning) {
      return { ...result, _warning: netoWarning };
    }

    return result;
  }
}
