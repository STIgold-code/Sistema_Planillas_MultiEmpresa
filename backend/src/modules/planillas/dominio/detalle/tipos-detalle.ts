/**
 * Pure domain types for the FULL planilla detail (DTO completo).
 *
 * Dependency Rule: imports NOTHING from `@prisma/client`, NestJS or luxon. The
 * domain receives plain primitives. Date-dependent day counts (ingreso/cese a
 * mitad de mes) are resolved at the aplicación edge and passed in already
 * computed, so the domain stays free of timezone/Prisma date concerns.
 *
 * This engine reproduces, en el dominio puro, los ~110 campos auxiliares que el
 * motor legacy `calcular-empleado.ts` producía (estructura salarial, días
 * detallados por nomenclatura, aportes del empleador, remuneraciones
 * computables, beneficios truncos), para poder retirar el legacy manteniendo
 * paridad al céntimo con los golden snapshots.
 *
 * Naming en español (dominio).
 */
import { AfiliacionPensionaria } from '../tipos';

/** Promedios históricos del semestre (alimentan grati y CTS). */
export interface PromediosDetalle {
  promedioHorasExtras: number;
  promedioComisiones: number;
  promedioBonificaciones: number;
  /** 1/6 de la última gratificación; 0 → se deriva del sueldo base. */
  ultimaGratificacion: number;
}

/**
 * Un día del tareo con la nomenclatura ya leída (subset puro de
 * `tipo_marcacion`). La clasificación por `codigo` vive en el dominio.
 */
export interface DiaTareoDetalle {
  codigo: string;
  esLaborable: boolean;
  esFeriadoTrabajado: boolean;
  horasDiurnas: number;
  horasNocturnas: number;
  /** Horas declaradas en el detalle del día (0 → se usa la nomenclatura). */
  horasDetalle: number;
  /** Horas por defecto de la nomenclatura (null → 8). */
  horasDefault: number | null;
}

/**
 * Entrada completa para el cálculo del detalle. Combina datos puros del tareo
 * con primitivas YA resueltas en el borde (días de ingreso/cese a mitad de mes,
 * si el empleado cesa, presencia de fecha de ingreso) para mantener el dominio
 * libre de aritmética de fechas con timezone.
 */
export interface EntradaDetalle {
  sueldoBase: number;
  mes: number;
  anio: number;
  dias: DiaTareoDetalle[];
  afiliacion: AfiliacionPensionaria | null;
  promedios: PromediosDetalle;
  acumuladoRenta: number;
  retencionesPreviasRenta: number;
  /** Días previos al ingreso (contrato/empleado inicia a mitad de mes). */
  diasNuevoNoLab: number;
  /** Días posteriores al cese (contrato/empleado termina a mitad de mes). */
  diasCesadoNoLab: number;
  /** True si el empleado cesa dentro del período (dispara beneficios truncos). */
  empleadoCesa: boolean;
  /** True si el empleado tiene fecha de ingreso (requisito vacaciones truncas). */
  tieneFechaIngreso: boolean;
  /** True si el empleado tiene asignación familiar (base vacaciones truncas). */
  tieneAsignacionFamiliar: boolean;
  /** True si el empleado tiene SCTR activo (aportes del empleador). */
  tieneSctr: boolean;
  /** Meses completos del semestre para gratificación (resuelto en el borde). */
  mesesGratificacion: number;
  /** Meses completos del semestre para CTS (resuelto en el borde). */
  mesesCts: number;
  /** Días sueltos del semestre para CTS (resuelto en el borde). */
  diasCts: number;
}

/**
 * DTO completo del detalle de planilla. Espejo EXACTO del objeto que el motor
 * legacy devolvía (mismas claves snake_case, mismo orden conceptual), de modo
 * que la paridad con los golden snapshots se mide campo por campo al céntimo.
 */
export interface DetalleCompleto {
  // Días del período
  total_dias: number;
  dias_trabajados: number;
  dias_no_laborados: number;
  dias_cesado_no_lab: number;
  dias_nuevo_no_lab: number;
  dias_sin_cobertura: number;
  dias_falta: number;
  dias_suspension: number;
  dias_vacaciones: number;
  dias_subsidio: number;
  dias_subsidio_incapacidad: number;
  dias_subsidio_maternidad: number;
  dias_descanso_medico: number;
  dias_licencia_sin_goce: number;
  dias_licencia_fallecimiento: number;
  dias_licencia_paternidad: number;
  dias_licencia_con_goce: number;
  turno_dia: number;
  turno_noche: number;
  horas_8: number;
  cantidad_feriados: number;
  dias_descanso_trabajado: number;
  dias_horas_extra: number;
  dias_falta_justificada: number;
  dias_permiso: number;
  dias_pegada: number;
  dias_retenido: number;
  minutos_tardanza: number;
  dias_feriado_no_trabajado: number;
  tiene_adelanto_quincenal: boolean;
  // Estructura
  rem_basica: number;
  bono_productividad_base: number;
  bono_desempeno_base: number;
  bono_movilidad_base: number;
  bono_refrigerio_base: number;
  asig_fam_cliente_base: number;
  he_25_estructura: number;
  he_35_estructura: number;
  bonif_nocturna_base: number;
  vac_base: number;
  grat_base: number;
  cts_base: number;
  bono_armado_base: number;
  total_sueldo_estructura: number;
  diferencia_estructura: number;
  por_dias_trab: number;
  sueldo_neto_estructura: number;
  // Ingresos afectos
  sueldo_base: number;
  sueldo_proporcional: number;
  haber_mensual: number;
  sueldo_nocturno: number;
  pasaje_especial: number;
  horas_extras: number;
  horas_extras_25: number;
  horas_extras_35: number;
  feriado_trabajado: number;
  descanso_trabajado_monto: number;
  descanso_medico_monto: number;
  subsidio_incapacidad: number;
  subsidio_maternidad: number;
  asignacion_familiar: number;
  licencia_goce_monto: number;
  bonificaciones: number;
  bonificacion_nocturna: number;
  vacaciones_ingreso: number;
  gratificacion_ingreso: number;
  cts_ingreso: number;
  bono_armado_ingreso: number;
  otros_ingresos: number;
  // Ingresos no afectos
  remuneracion_vacacional: number;
  compensacion_vacacional: number;
  cts_monto: number;
  gratificacion_monto: number;
  movilidad: number;
  refrigerio: number;
  bono_desempeno_monto: number;
  asignacion_cliente: number;
  pegada_reenganche: number;
  bono_productividad_monto: number;
  bono_armado_monto: number;
  bono_referido: number;
  bonos_modulo: number;
  reintegro_dias_trab: number;
  reintegro_inafecto: number;
  ingreso_sobregiro: number;
  venta_vacaciones: number;
  // Descuentos obligatorios
  afp_aporte: number;
  afp_comision: number;
  afp_seguro: number;
  afp_prima: number;
  onp: number;
  essalud: number;
  renta_5ta: number;
  // Adelantos
  adelantos: number;
  adelanto_quincena: number;
  adelanto_vacacional: number;
  otros_adelantos: number;
  adelanto_cts: number;
  adelanto_gratificacion: number;
  // Otros descuentos
  prestamos: number;
  prestamo: number;
  otros_descuentos: number;
  descuento_faltas: number;
  descuento_permisos: number;
  descuento_tardanzas: number;
  descuento_sobregiro: number;
  descuento_reintegro: number;
  retencion_judicial: number;
  descuento_feriado: number;
  sctr: number;
  quinta_categoria: number;
  // Totales
  total_ingresos_afectos: number;
  total_ingresos_no_afectos: number;
  total_ingresos: number;
  total_descuentos: number;
  total_descuentos_ley: number;
  total_descuentos_otros: number;
  remuneracion_afecta: number;
  neto_pagar: number;
  neto_mes: number;
  total_haberes: number;
  // Aportes empleador
  essalud_empleador: number;
  sctr_salud_empleador: number;
  sctr_pension_empleador: number;
  vida_ley_empleador: number;
  total_aportes_empleador: number;
  // Remuneración computable
  rem_computable_vacaciones: number;
  rem_computable_gratificacion: number;
  rem_computable_cts: number;
  rem_computable_afp: number;
  rem_computable_renta: number;
  promedio_horas_extras: number;
  promedio_comisiones: number;
  sexto_gratificacion: number;
  bonif_extraordinaria: number;
  treintavo_diario: number;
  meses_cts: number;
  dias_cts: number;
  cts_periodo: number;
  cts_trunca: number;
  grat_trunca: number;
  vac_truncas: number;
  total_beneficios_sociales: number;
  // Observaciones
  observaciones: string;
}
