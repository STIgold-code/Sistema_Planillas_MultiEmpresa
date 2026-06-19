/**
 * `calcularDetalleCompleto` — motor PURO del DTO completo de planilla.
 *
 * Reproduce, en el dominio puro, los ~110 campos auxiliares que el motor legacy
 * `calcular-empleado.ts` producía (estructura salarial, días detallados, ingresos
 * afectos/no afectos, descuentos, aportes del empleador, remuneraciones
 * computables, beneficios truncos), MANTENIENDO paridad al céntimo con los
 * golden snapshots GENERAL.
 *
 * Puro: no importa Prisma, Nest ni luxon. Todos los factores legales provienen
 * del puerto `ParametrosLegales`; las primitivas dependientes de fecha
 * (días de ingreso/cese, meses del semestre) se resuelven en el borde y se
 * inyectan vía `EntradaDetalle`.
 *
 * NOTA DE PARIDAD (brecha legal heredada conscientemente): el legacy fija
 * `asignacion_familiar = 0` ("no viene del tareo") y, en consecuencia, las bases
 * de gratificación/CTS/vacaciones NO incluyen asignación familiar. Se hereda esa
 * brecha A PROPÓSITO para no mover el cálculo. Habilitarla es un cambio de
 * comportamiento separado que actualizará los golden conscientemente.
 */
import { ParametrosLegales } from '../parametros/parametros-legales';
import { DetalleCompleto, EntradaDetalle } from './tipos-detalle';
import { redondear2 } from './redondeo';
import { clasificarDiasTareo } from './clasificar-dias-tareo';
import { calcularHorasExtrasDetalle } from './horas-extras-detalle';
import { calcularDeduccionesPensionDetalle } from './deducciones-pension-detalle';
import { calcularRentaQuintaDetalle } from './renta-quinta-detalle';
import {
  calcularGratificacionDetalle,
  calcularCtsDetalle,
  calcularBeneficiosTruncosDetalle,
} from './beneficios-periodicos';

/** Sobretasa nocturna legal (D.S. 007-2002-TR). No es un parámetro versionado. */
const SOBRETASA_NOCTURNA = 0.35;
const TOTAL_DIAS_MES = 30;

export function calcularDetalleCompleto(
  entrada: EntradaDetalle,
  params: ParametrosLegales,
): DetalleCompleto {
  const { sueldoBase, mes } = entrada;
  const fecha = new Date(entrada.anio, mes, 0);

  const c = clasificarDiasTareo(entrada.dias);
  const diasTrabajados = c.diasLaborables;
  const hayDiasTrabajados = diasTrabajados > 0;

  // --- Días no trabajados / subsidios ---
  const diasSinCobertura = 0;
  const diasNoTrabajados =
    entrada.diasCesadoNoLab +
    entrada.diasNuevoNoLab +
    diasSinCobertura +
    c.diasFalta +
    c.diasSuspension +
    c.diasLicenciaSinGoce;
  const diasSubsidio =
    c.diasSubsidioIncapacidad + c.diasSubsidioMaternidad + c.diasDescansoMedico;

  // --- Estructura salarial (bases) ---
  const remBasica = hayDiasTrabajados ? sueldoBase : 0;
  const he25Estructura = hayDiasTrabajados
    ? redondear2((sueldoBase / 30 / 8) * 1.25)
    : 0;
  const he35Estructura = hayDiasTrabajados
    ? redondear2((sueldoBase / 30 / 8) * 1.35)
    : 0;
  const bonifNocturnaBase =
    c.turnoNoche > 0 ? redondear2((sueldoBase * SOBRETASA_NOCTURNA) / 30) : 0;
  const vacBase = hayDiasTrabajados ? sueldoBase : 0;
  const gratBase = hayDiasTrabajados ? sueldoBase : 0;
  const ctsBase = hayDiasTrabajados ? sueldoBase : 0;
  const porDiasTrab = redondear2((remBasica / 30) * diasTrabajados);
  const diferenciaEstructura = redondear2(remBasica - porDiasTrab);

  // --- Ingresos afectos ---
  const sueldoProporcional = redondear2((sueldoBase / 30) * diasTrabajados);
  const haberMensual = sueldoProporcional;
  const sueldoNocturno =
    c.turnoNoche > 0 ? redondear2(bonifNocturnaBase * c.turnoNoche) : 0;
  const he = calcularHorasExtrasDetalle(sueldoBase, c, SOBRETASA_NOCTURNA);
  const valorDiaNormal = redondear2(sueldoBase / 30);
  const feriadoTrabajado =
    c.cantidadFeriados > 0
      ? redondear2(valorDiaNormal * 2 * c.cantidadFeriados)
      : 0;
  const descansoTrabajadoMonto =
    c.diasDescansoTrabajado > 0
      ? redondear2(valorDiaNormal * 2 * c.diasDescansoTrabajado)
      : 0;
  const descansoMedicoMonto =
    c.diasDescansoMedico > 0
      ? redondear2((sueldoBase / 30) * c.diasDescansoMedico)
      : 0;
  const subsidioIncapacidadMonto =
    c.diasSubsidioIncapacidad > 0
      ? redondear2((sueldoBase / 30) * c.diasSubsidioIncapacidad)
      : 0;
  const subsidioMaternidadMonto =
    c.diasSubsidioMaternidad > 0
      ? redondear2((sueldoBase / 30) * c.diasSubsidioMaternidad)
      : 0;
  // PARIDAD: el legacy fija asignación familiar = 0.
  const asignacionFamiliar = 0;
  const licenciaGoceMonto = redondear2(
    (sueldoBase / 30) *
      (c.diasLicenciaFallecimiento +
        c.diasLicenciaPaternidad +
        c.diasLicenciaConGoce),
  );

  const totalIngresosAfectos = redondear2(
    haberMensual +
      sueldoNocturno +
      he.horasExtras25 +
      he.horasExtras35 +
      feriadoTrabajado +
      descansoTrabajadoMonto +
      descansoMedicoMonto +
      subsidioIncapacidadMonto +
      subsidioMaternidadMonto +
      asignacionFamiliar +
      licenciaGoceMonto,
  );
  const remuneracionAfecta = totalIngresosAfectos;

  // --- Beneficios periódicos (grati, CTS) ---
  const remComputableGratificacion =
    gratBase +
    entrada.promedios.promedioHorasExtras +
    entrada.promedios.promedioComisiones +
    entrada.promedios.promedioBonificaciones;
  const grat = calcularGratificacionDetalle(
    mes,
    remComputableGratificacion,
    entrada.mesesGratificacion,
    params.essaludTasa(fecha),
  );

  const sextoGratificacion =
    entrada.promedios.ultimaGratificacion > 0
      ? redondear2(entrada.promedios.ultimaGratificacion / 6)
      : redondear2(gratBase / 6);
  const remComputableCts =
    ctsBase +
    sextoGratificacion +
    entrada.promedios.promedioHorasExtras +
    entrada.promedios.promedioComisiones;
  const ctsMonto = calcularCtsDetalle(
    mes,
    remComputableCts,
    entrada.mesesCts,
    entrada.diasCts,
  );

  // --- Ingresos no afectos ---
  const remuneracionVacacional = redondear2(
    (sueldoBase / 30) * c.diasVacaciones,
  );
  const pegadaReenganche =
    c.diasPegada > 0 ? redondear2(valorDiaNormal * c.diasPegada) : 0;
  const gratificacionIngreso =
    grat.gratificacionMonto + grat.bonifExtraordinariaMonto;

  const totalIngresosNoAfectos = redondear2(
    remuneracionVacacional +
      ctsMonto +
      grat.gratificacionMonto +
      grat.bonifExtraordinariaMonto +
      pegadaReenganche,
  );

  const totalIngresos = redondear2(
    totalIngresosAfectos + totalIngresosNoAfectos,
  );

  // --- Descuentos ---
  const ded = calcularDeduccionesPensionDetalle(
    remuneracionAfecta,
    entrada.afiliacion,
  );
  const renta5ta = calcularRentaQuintaDetalle(
    remuneracionAfecta,
    mes,
    params.uit(fecha),
    params.tramosIR(fecha),
    entrada.acumuladoRenta,
    entrada.retencionesPreviasRenta,
  );
  const valorMinuto = hayDiasTrabajados
    ? redondear2(sueldoBase / 30 / 8 / 60)
    : 0;
  const descuentoFaltas = hayDiasTrabajados
    ? redondear2((sueldoBase / 30) * c.diasFalta)
    : 0;
  const descuentoPermisos = hayDiasTrabajados
    ? redondear2((sueldoBase / 30) * c.diasPermiso)
    : 0;
  const descuentoTardanzas = hayDiasTrabajados
    ? redondear2(valorMinuto * c.minutosTardanza)
    : 0;

  const totalDescuentosLey = redondear2(
    ded.afpAporte + ded.afpPrima + ded.afpComision + ded.onp + renta5ta,
  );
  const totalDescuentosOtros = redondear2(
    descuentoFaltas + descuentoPermisos + descuentoTardanzas,
  );
  const totalDescuentos = redondear2(totalDescuentosLey + totalDescuentosOtros);

  // --- Aportes del empleador ---
  const essaludEmpleador =
    remuneracionAfecta < params.rmv(fecha)
      ? params.essaludMinimo(fecha)
      : redondear2(remuneracionAfecta * params.essaludTasa(fecha));
  const sctrSaludEmpleador = entrada.tieneSctr
    ? redondear2(remuneracionAfecta * params.sctrSalud(fecha))
    : 0;
  const sctrPensionEmpleador = entrada.tieneSctr
    ? redondear2(remuneracionAfecta * params.sctrPension(fecha))
    : 0;
  const vidaLeyEmpleador = redondear2(
    remuneracionAfecta * params.vidaLeyTasa(fecha),
  );
  const totalAportesEmpleador = redondear2(
    essaludEmpleador +
      sctrSaludEmpleador +
      sctrPensionEmpleador +
      vidaLeyEmpleador,
  );

  // --- Remuneraciones computables ---
  const bonifExtraordinaria =
    grat.bonifExtraordinariaMonto > 0
      ? grat.bonifExtraordinariaMonto
      : redondear2(gratBase * params.essaludTasa(fecha));
  const treintavoDiario = redondear2(sueldoBase / 30);

  // --- Beneficios truncos ---
  const truncos = calcularBeneficiosTruncosDetalle(
    entrada.empleadoCesa,
    mes,
    diasTrabajados,
    remComputableCts,
    remComputableGratificacion,
    sueldoBase,
    entrada.tieneAsignacionFamiliar,
    entrada.tieneFechaIngreso,
    params.asignacionFamiliar(fecha),
  );

  const netoPagar = redondear2(totalIngresos - totalDescuentos);

  return {
    total_dias: TOTAL_DIAS_MES,
    dias_trabajados: diasTrabajados,
    dias_no_laborados: diasNoTrabajados,
    dias_cesado_no_lab: entrada.diasCesadoNoLab,
    dias_nuevo_no_lab: entrada.diasNuevoNoLab,
    dias_sin_cobertura: diasSinCobertura,
    dias_falta: c.diasFalta,
    dias_suspension: c.diasSuspension,
    dias_vacaciones: c.diasVacaciones,
    dias_subsidio: diasSubsidio,
    dias_subsidio_incapacidad: c.diasSubsidioIncapacidad,
    dias_subsidio_maternidad: c.diasSubsidioMaternidad,
    dias_descanso_medico: c.diasDescansoMedico,
    dias_licencia_sin_goce: c.diasLicenciaSinGoce,
    dias_licencia_fallecimiento: c.diasLicenciaFallecimiento,
    dias_licencia_paternidad: c.diasLicenciaPaternidad,
    dias_licencia_con_goce: c.diasLicenciaConGoce,
    turno_dia: c.turnoDia,
    turno_noche: c.turnoNoche,
    horas_8: c.horas8,
    cantidad_feriados: c.cantidadFeriados,
    dias_descanso_trabajado: c.diasDescansoTrabajado,
    dias_horas_extra: c.diasHorasExtra,
    dias_falta_justificada: c.diasFaltaJustificada,
    dias_permiso: c.diasPermiso,
    dias_pegada: c.diasPegada,
    dias_retenido: c.diasRetenido,
    minutos_tardanza: c.minutosTardanza,
    dias_feriado_no_trabajado: c.diasFeriadoNoTrabajado,
    tiene_adelanto_quincenal: c.tieneAdelantoQuincenal,

    rem_basica: redondear2(remBasica),
    bono_productividad_base: 0,
    bono_desempeno_base: 0,
    bono_movilidad_base: 0,
    bono_refrigerio_base: 0,
    asig_fam_cliente_base: 0,
    he_25_estructura: redondear2(he25Estructura),
    he_35_estructura: redondear2(he35Estructura),
    bonif_nocturna_base: redondear2(bonifNocturnaBase),
    vac_base: redondear2(vacBase),
    grat_base: redondear2(gratBase),
    cts_base: redondear2(ctsBase),
    bono_armado_base: 0,
    total_sueldo_estructura: redondear2(remBasica),
    diferencia_estructura: redondear2(diferenciaEstructura),
    por_dias_trab: redondear2(porDiasTrab),
    sueldo_neto_estructura: redondear2(porDiasTrab),

    sueldo_base: redondear2(sueldoBase),
    sueldo_proporcional: redondear2(sueldoProporcional),
    haber_mensual: redondear2(haberMensual),
    sueldo_nocturno: redondear2(sueldoNocturno),
    pasaje_especial: 0,
    horas_extras: redondear2(he.horasExtras),
    horas_extras_25: redondear2(he.horasExtras25),
    horas_extras_35: redondear2(he.horasExtras35),
    feriado_trabajado: redondear2(feriadoTrabajado),
    descanso_trabajado_monto: redondear2(descansoTrabajadoMonto),
    descanso_medico_monto: redondear2(descansoMedicoMonto),
    subsidio_incapacidad: redondear2(subsidioIncapacidadMonto),
    subsidio_maternidad: redondear2(subsidioMaternidadMonto),
    asignacion_familiar: redondear2(asignacionFamiliar),
    licencia_goce_monto: redondear2(licenciaGoceMonto),
    bonificaciones: 0,
    bonificacion_nocturna: redondear2(sueldoNocturno),
    vacaciones_ingreso: redondear2(remuneracionVacacional),
    gratificacion_ingreso: redondear2(gratificacionIngreso),
    cts_ingreso: redondear2(ctsMonto),
    bono_armado_ingreso: 0,
    otros_ingresos: 0,

    remuneracion_vacacional: redondear2(remuneracionVacacional),
    compensacion_vacacional: 0,
    cts_monto: redondear2(ctsMonto),
    gratificacion_monto: redondear2(grat.gratificacionMonto),
    movilidad: 0,
    refrigerio: 0,
    bono_desempeno_monto: 0,
    asignacion_cliente: 0,
    pegada_reenganche: redondear2(pegadaReenganche),
    bono_productividad_monto: 0,
    bono_armado_monto: 0,
    bono_referido: 0,
    bonos_modulo: 0,
    reintegro_dias_trab: 0,
    reintegro_inafecto: 0,
    ingreso_sobregiro: 0,
    venta_vacaciones: 0,

    afp_aporte: redondear2(ded.afpAporte),
    afp_comision: redondear2(ded.afpComision),
    afp_seguro: redondear2(ded.afpSeguro),
    afp_prima: redondear2(ded.afpPrima),
    onp: redondear2(ded.onp),
    essalud: 0,
    renta_5ta: redondear2(renta5ta),

    adelantos: 0,
    adelanto_quincena: 0,
    adelanto_vacacional: 0,
    otros_adelantos: 0,
    adelanto_cts: 0,
    adelanto_gratificacion: 0,

    prestamos: 0,
    prestamo: 0,
    otros_descuentos: 0,
    descuento_faltas: redondear2(descuentoFaltas),
    descuento_permisos: redondear2(descuentoPermisos),
    descuento_tardanzas: redondear2(descuentoTardanzas),
    descuento_sobregiro: 0,
    descuento_reintegro: 0,
    retencion_judicial: 0,
    descuento_feriado: 0,
    sctr: 0,
    quinta_categoria: redondear2(renta5ta),

    total_ingresos_afectos: redondear2(totalIngresosAfectos),
    total_ingresos_no_afectos: redondear2(totalIngresosNoAfectos),
    total_ingresos: redondear2(totalIngresos),
    total_descuentos: redondear2(totalDescuentos),
    total_descuentos_ley: redondear2(totalDescuentosLey),
    total_descuentos_otros: redondear2(totalDescuentosOtros),
    remuneracion_afecta: redondear2(remuneracionAfecta),
    neto_pagar: redondear2(netoPagar),
    neto_mes: redondear2(netoPagar),
    total_haberes: redondear2(totalIngresos),

    essalud_empleador: redondear2(essaludEmpleador),
    sctr_salud_empleador: redondear2(sctrSaludEmpleador),
    sctr_pension_empleador: redondear2(sctrPensionEmpleador),
    vida_ley_empleador: redondear2(vidaLeyEmpleador),
    total_aportes_empleador: redondear2(totalAportesEmpleador),

    rem_computable_vacaciones: redondear2(sueldoBase),
    rem_computable_gratificacion: redondear2(remComputableGratificacion),
    rem_computable_cts: redondear2(remComputableCts),
    rem_computable_afp: redondear2(remuneracionAfecta),
    rem_computable_renta: redondear2(remuneracionAfecta),
    promedio_horas_extras: redondear2(entrada.promedios.promedioHorasExtras),
    promedio_comisiones: redondear2(entrada.promedios.promedioComisiones),
    sexto_gratificacion: redondear2(sextoGratificacion),
    bonif_extraordinaria: redondear2(bonifExtraordinaria),
    treintavo_diario: redondear2(treintavoDiario),
    meses_cts: mes === 5 || mes === 11 ? entrada.mesesCts : 0,
    dias_cts: mes === 5 || mes === 11 ? entrada.diasCts : 0,
    cts_periodo: redondear2(ctsMonto),
    cts_trunca: redondear2(truncos.ctsTrunca),
    grat_trunca: redondear2(truncos.gratTrunca),
    vac_truncas: redondear2(truncos.vacTruncas),
    total_beneficios_sociales: redondear2(truncos.totalBeneficiosSociales),

    observaciones: '',
  };
}
