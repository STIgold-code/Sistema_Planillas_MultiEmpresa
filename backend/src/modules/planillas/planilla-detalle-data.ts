import { Prisma } from '@prisma/client';
import { round2 } from './planillas.config';

/**
 * Valores ya calculados de un detalle de planilla, previos al redondeo final.
 * Se usan para armar el objeto `data` del update de Prisma. Extraído de
 * PlanillaDetalleService (SRP / tamaño de archivo) sin alterar el cálculo.
 */
export interface ValoresDetalleCalculado {
  // Días
  totalDias: number;
  diasTrabajados: number;
  diasCesadoNoLab: number;
  diasNuevoNoLab: number;
  diasSinCobertura: number;
  diasFalta: number;
  diasSuspension: number;
  diasVacaciones: number;
  diasSubsidioIncapacidad: number;
  diasSubsidioMaternidad: number;
  diasDescansoMedico: number;
  diasLicenciaSinGoce: number;
  diasLicenciaFallecimiento: number;
  diasLicenciaPaternidad: number;
  diasLicenciaConGoce: number;
  turnoDia: number;
  turnoNoche: number;
  // Ingresos afectos
  haberMensual: number;
  sueldoNocturno: number;
  pasajeEspecial: number;
  horasExtras25: number;
  horasExtras35: number;
  feriadoTrabajado: number;
  descansoMedicoMonto: number;
  subsidioIncapacidad: number;
  subsidioMaternidad: number;
  asignacionFamiliar: number;
  licenciaGoceMonto: number;
  bonificaciones: number;
  otrosIngresos: number;
  // Ingresos no afectos
  remuneracionVacacional: number;
  compensacionVacacional: number;
  ctsMonto: number;
  gratificacionMonto: number;
  movilidad: number;
  refrigerio: number;
  bonoDesempenoMonto: number;
  asignacionCliente: number;
  pegadaReenganche: number;
  bonoProductividadMonto: number;
  bonoArmadoMonto: number;
  bonoReferido: number;
  reintegroDiasTrab: number;
  reintegroInafecto: number;
  ingresoSobregiro: number;
  ventaVacaciones: number;
  // Descuentos
  afpAporte: number;
  afpPrima: number;
  afpComision: number;
  onp: number;
  adelantoQuincena: number;
  adelantoVacacional: number;
  otrosAdelantos: number;
  adelantoCts: number;
  adelantoGratificacion: number;
  otrosDescuentos: number;
  descuentoFaltas: number;
  descuentoSobregiro: number;
  descuentoReintegro: number;
  prestamo: number;
  retencionJudicial: number;
  renta5ta: number;
  // Totales
  totalIngresosAfectos: number;
  totalIngresosNoAfectos: number;
  totalIngresos: number;
  totalDescuentos: number;
  essaludEmpleador: number;
  remuneracionAfecta: number;
  netoPagar: number;
  // Otros
  observaciones?: string | null;
}

/**
 * Arma el objeto `data` para actualizar un PlanillaDetalle, aplicando round2 a
 * los montos. Función pura: misma salida que el literal inline original.
 */
export function construirDataActualizacionDetalle(
  v: ValoresDetalleCalculado,
): Prisma.PlanillaDetalleUpdateInput {
  return {
    // Días
    total_dias: v.totalDias,
    dias_trabajados: v.diasTrabajados,
    dias_cesado_no_lab: v.diasCesadoNoLab,
    dias_nuevo_no_lab: v.diasNuevoNoLab,
    dias_sin_cobertura: v.diasSinCobertura,
    dias_falta: v.diasFalta,
    dias_suspension: v.diasSuspension,
    dias_vacaciones: v.diasVacaciones,
    dias_subsidio_incapacidad: v.diasSubsidioIncapacidad,
    dias_subsidio_maternidad: v.diasSubsidioMaternidad,
    dias_descanso_medico: v.diasDescansoMedico,
    dias_licencia_sin_goce: v.diasLicenciaSinGoce,
    dias_licencia_fallecimiento: v.diasLicenciaFallecimiento,
    dias_licencia_paternidad: v.diasLicenciaPaternidad,
    dias_licencia_con_goce: v.diasLicenciaConGoce,
    turno_dia: v.turnoDia,
    turno_noche: v.turnoNoche,

    // Ingresos afectos
    haber_mensual: round2(v.haberMensual),
    sueldo_nocturno: round2(v.sueldoNocturno),
    pasaje_especial: round2(v.pasajeEspecial),
    horas_extras_25: round2(v.horasExtras25),
    horas_extras_35: round2(v.horasExtras35),
    feriado_trabajado: round2(v.feriadoTrabajado),
    descanso_medico_monto: round2(v.descansoMedicoMonto),
    subsidio_incapacidad: round2(v.subsidioIncapacidad),
    subsidio_maternidad: round2(v.subsidioMaternidad),
    asignacion_familiar: round2(v.asignacionFamiliar),
    licencia_goce_monto: round2(v.licenciaGoceMonto),
    bonificaciones: round2(v.bonificaciones),
    otros_ingresos: round2(v.otrosIngresos),

    // Ingresos no afectos
    remuneracion_vacacional: round2(v.remuneracionVacacional),
    compensacion_vacacional: round2(v.compensacionVacacional),
    cts_monto: round2(v.ctsMonto),
    gratificacion_monto: round2(v.gratificacionMonto),
    movilidad: round2(v.movilidad),
    refrigerio: round2(v.refrigerio),
    bono_desempeno_monto: round2(v.bonoDesempenoMonto),
    asignacion_cliente: round2(v.asignacionCliente),
    pegada_reenganche: round2(v.pegadaReenganche),
    bono_productividad_monto: round2(v.bonoProductividadMonto),
    bono_armado_monto: round2(v.bonoArmadoMonto),
    bono_referido: round2(v.bonoReferido),
    reintegro_dias_trab: round2(v.reintegroDiasTrab),
    reintegro_inafecto: round2(v.reintegroInafecto),
    ingreso_sobregiro: round2(v.ingresoSobregiro),
    venta_vacaciones: round2(v.ventaVacaciones),

    // Descuentos
    afp_aporte: round2(v.afpAporte),
    afp_prima: round2(v.afpPrima),
    afp_comision: round2(v.afpComision),
    onp: round2(v.onp),
    adelanto_quincena: round2(v.adelantoQuincena),
    adelanto_vacacional: round2(v.adelantoVacacional),
    otros_adelantos: round2(v.otrosAdelantos),
    adelanto_cts: round2(v.adelantoCts),
    adelanto_gratificacion: round2(v.adelantoGratificacion),
    otros_descuentos: round2(v.otrosDescuentos),
    descuento_faltas: round2(v.descuentoFaltas),
    descuento_sobregiro: round2(v.descuentoSobregiro),
    descuento_reintegro: round2(v.descuentoReintegro),
    prestamo: round2(v.prestamo),
    retencion_judicial: round2(v.retencionJudicial),
    renta_5ta: round2(v.renta5ta),

    // Totales
    total_ingresos_afectos: round2(v.totalIngresosAfectos),
    total_ingresos_no_afectos: round2(v.totalIngresosNoAfectos),
    total_ingresos: round2(v.totalIngresos),
    total_descuentos: round2(v.totalDescuentos),
    essalud_empleador: round2(v.essaludEmpleador),
    remuneracion_afecta: round2(v.remuneracionAfecta),
    neto_pagar: round2(v.netoPagar),

    // Otros
    observaciones: v.observaciones,
  };
}
