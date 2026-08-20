/**
 * Contrato de datos que devuelve `GET /planillas/:id/exportar`.
 * Extraido de planilla-export.ts para compartirlo con el export auditable
 * (con formulas) y mantener cada archivo por debajo de 1.000 lineas.
 */
export interface CabeceraExportacion {
  anio: number;
  mes: number;
  estado: string;
  fecha_proceso: string;
  total_bruto: number;
  total_neto: number;
  total_descuentos: number;
  empresa?: {
    razon_social: string;
    nombre_comercial?: string | null;
    ruc: string;
    /** Empresa industrial afecta al aporte SENATI (Ley 26272). */
    aporta_senati: boolean;
  };
}

export interface DetalleExportacion {
  documento: string;
  nombres_apellidos: string;
  situacion: string;
  cargo: string;
  cliente: string;
  sede: string;
  banco: string;
  cuenta: string;
  cci: string;
  cuspp: string;
  /** Modalidad de comision AFP: FLUJO, MIXTA o vacio si no se declaro. */
  tipo_comision_afp: string;
  fecha_ingreso: string;
  fecha_cese: string;
  sistema_pensionario: string;
  nombre_sistema_pensionario: string;
  total_dias: number;
  dias_trabajados: number;
  dias_vacaciones: number;
  turno_dia: number;
  turno_noche: number;
  horas_8: number;
  cant_feriados: number;
  suspension: number;
  faltas: number;
  licencia_con_goce: number;
  licencia_sin_goce: number;
  descanso_medico: number;
  subsidio_incapacidad: number;
  subsidio_maternidad: number;
  rem_basica: number;
  haber_mensual: number;
  sueldo_nocturno: number;
  he_25: number;
  he_25_monto: number;
  he_35: number;
  he_35_monto: number;
  feriado_trabajado: number;
  /** Descanso semanal trabajado (D.Leg. 713 art. 3). Integra los afectos. */
  descanso_trabajado_monto: number;
  bonif_nocturna: number;
  asig_familiar_monto: number;
  asig_cliente_monto: number;
  movilidad_monto: number;
  refrigerio_monto: number;
  bono_movilidad: number;
  bono_refrigerio: number;
  bono_productividad: number;
  bono_productividad_monto: number;
  bono_desempeno: number;
  bono_desempeno_monto: number;
  bono_armado: number;
  bono_armado_monto: number;
  bono_referido: number;
  compen_vacacional: number;
  remun_vacacional: number;
  vac: number;
  grat: number;
  gratificacion_monto: number;
  cts: number;
  cts_monto: number;
  descanso_medico_monto: number;
  subsidio_incapacidad_monto: number;
  subsidio_maternidad_monto: number;
  licencia_goce_monto: number;
  reintegro_dias_trab: number;
  reintegro_inafecto: number;
  venta_vacaciones: number;
  pasaje_especial: number;
  afp_aporte: number;
  afp_prima: number;
  afp_comision: number;
  snp_onp: number;
  adelanto_quincena: number;
  adelanto_vacacional: number;
  adelanto_cts: number;
  adelanto_gratificacion: number;
  otros_adelantos: number;
  otros_descuentos: number;
  prestamo: number;
  retencion_judicial: number;
  renta_5ta: number;
  faltas_monto: number;
  tardanzas_monto: number;
  permisos_monto: number;
  /** Dominical proporcional por ausencias sin goce (D.L. 713 art. 4). */
  dominical_monto: number;
  dcts_sobregiro: number;
  dcts_reintegro: number;
  rem_afecta: number;
  rem_computable_afp: number;
  bonif_extraordinaria: number;
  neto_pagar: number;
  total_sueldo: number;
  total_ingresos: number;
  total_ingresos_afectos: number;
  total_ingresos_no_afectos: number;
  total_descuentos: number;
  total_descuentos_ley: number;
  total_descuentos_otros: number;
  essalud: number;
  sctr_salud_empleador: number;
  sctr_pension_empleador: number;
  vida_ley_empleador: number;
  /** Aporte SENATI (Ley 26272). Solo aplica a empresas industriales afectas. */
  senati_empleador: number;
  total_aportes_empleador: number;
}

/** De donde salio el valor del parametro que uso el motor de calculo. */
export type OrigenParametro =
  | 'PARAMETRO_LEGAL'
  | 'PARAMETRO_EMPRESA'
  | 'REGIMEN_PENSIONARIO'
  | 'NO_DISPONIBLE';

/** Una tasa o monto legal efectivamente usado en el calculo del periodo. */
export interface TasaExportacion {
  codigo: string;
  etiqueta: string;
  valor: number;
  /** PORCENTAJE se muestra como 0.00%; MONTO como S/ 0.00. */
  formato: 'PORCENTAJE' | 'MONTO';
  base_legal: string;
  origen: OrigenParametro;
  vigente_desde: string | null;
}

/** Tasas de una AFP: aporte, prima y las dos modalidades de comision. */
export interface ComisionAfpExportacion {
  administradora: string;
  aporte: number;
  prima: number;
  comision_flujo: number;
  comision_mixta: number;
}

/** Bloque de parametros con los que el motor calculo esta planilla. */
export interface ParametrosExportacion {
  /** Fecha con la que se resolvieron los parametros versionados. */
  vigencia: string;
  tasas: TasaExportacion[];
  comisiones_afp: ComisionAfpExportacion[];
}

export interface PlanillaExportacion {
  cabecera: CabeceraExportacion;
  detalles: DetalleExportacion[];
  parametros: ParametrosExportacion;
}
