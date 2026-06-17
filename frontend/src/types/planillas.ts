// Planillas (cabecera, detalle, resumen)

export type EstadoPlanilla = 'BORRADOR' | 'CALCULADA' | 'REVISADA' | 'APROBADA' | 'PAGADA' | 'ANULADA';

export interface Planilla {
  id: number;
  empresa_id: number;
  periodo_tareo_id?: number;
  periodo_tareo?: { id: number; estado: string };
  anio: number;
  mes: number;
  estado: EstadoPlanilla;
  fecha_generacion?: string;
  fecha_aprobacion?: string;
  fecha_pago?: string;
  aprobado_por?: number;
  aprobador?: { id: number; nombre_completo: string };
  total_bruto: number;
  total_descuentos: number;
  total_neto: number;
  total_empleados: number;
  observaciones?: string;
  detalles?: PlanillaDetalle[];
  _count?: { detalles: number };
  created_at: string;
  updated_at: string;
}

export interface PlanillaDetalle {
  id: number;
  planilla_id: number;
  empleado_id: number;
  empleado?: {
    id: number;
    estado?: string;
    numero_documento: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_ingreso?: string;
    fecha_cese?: string;
    fecha_nacimiento?: string;
    cuspp?: string;
    turno?: string;
    nro_cuenta_haberes?: string;
    cci_haberes?: string;
    area?: { nombre: string };
    cargo?: { nombre: string };
    sede?: {
      nombre: string;
      cliente?: {
        razon_social?: string;
        nombre_comercial?: string;
      };
    };
    regimen_pensionario?: {
      tipo: string;
      nombre: string;
    };
    banco_haberes?: {
      nombre: string;
    };
  };

  // =============================================
  // DÍAS DEL PERÍODO
  // =============================================
  total_dias: number;
  dias_trabajados: number;
  dias_cesado_no_lab: number;
  dias_nuevo_no_lab: number;
  dias_sin_cobertura: number;
  dias_falta: number;
  dias_suspension: number;
  dias_vacaciones: number;
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

  // =============================================
  // ESTRUCTURA SALARIAL (datos maestros)
  // =============================================
  rem_basica: number;
  sueldo_base: number;
  bono_productividad_base: number;
  bono_desempeno_base: number;
  bono_movilidad_base: number;
  bono_refrigerio_base: number;
  asig_fam_cliente_base: number;
  bono_armado_base: number;
  he_25_estructura: number;
  he_35_estructura: number;
  bonif_nocturna_base: number;
  vac_base: number;
  grat_base: number;
  cts_base: number;
  total_sueldo_estructura: number;

  // =============================================
  // INGRESOS AFECTOS
  // =============================================
  haber_mensual: number;
  sueldo_nocturno: number;
  pasaje_especial: number;
  horas_extras_25: number;
  horas_extras_35: number;
  feriado_trabajado: number;
  descanso_medico_monto: number;
  subsidio_incapacidad: number;
  subsidio_maternidad: number;
  asignacion_familiar: number;
  licencia_goce_monto: number;
  bonificaciones: number;
  otros_ingresos: number;

  // =============================================
  // INGRESOS NO AFECTOS
  // =============================================
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
  reintegro_dias_trab: number;
  reintegro_inafecto: number;
  ingreso_sobregiro: number;
  venta_vacaciones: number;

  // =============================================
  // DESCUENTOS
  // =============================================
  afp_aporte: number;
  afp_prima: number;
  afp_comision: number;
  onp: number;
  adelanto_quincena: number;
  adelanto_vacacional: number;
  otros_adelantos: number;
  adelanto_cts: number;
  adelanto_gratificacion: number;
  otros_descuentos: number;
  descuento_faltas: number;
  descuento_sobregiro: number;
  descuento_reintegro: number;
  prestamo: number;
  retencion_judicial: number;
  renta_5ta: number;

  // =============================================
  // TOTALES
  // =============================================
  total_ingresos_afectos: number;
  total_ingresos_no_afectos: number;
  total_ingresos: number;
  total_descuentos: number;
  total_descuentos_ley: number;
  total_descuentos_otros: number;

  // =============================================
  // APORTES EMPLEADOR
  // =============================================
  essalud_empleador: number;
  sctr_salud_empleador: number;
  sctr_pension_empleador: number;
  vida_ley_empleador: number;
  total_aportes_empleador: number;

  // =============================================
  // RESULTADO
  // =============================================
  remuneracion_afecta: number;
  rem_computable_afp: number;
  bonif_extraordinaria: number;
  neto_pagar: number;

  // =============================================
  // DATOS PAGO
  // =============================================
  regimen_pensionario?: string;
  banco_nombre?: string;
  cuenta_numero?: string;
  cci?: string;

  observaciones?: string;
}

export interface PlanillaResumen {
  planillas_anio: {
    mes: number;
    total_neto: number;
    total_empleados: number;
    estado: EstadoPlanilla;
  }[];
  total_anual: number;
  ultima_planilla?: {
    anio: number;
    mes: number;
    total_neto: number;
    total_empleados: number;
    estado: EstadoPlanilla;
  };
  anio: number;
}
