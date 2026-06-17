import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdatePlanillaDetalleDto {
  // =============================================
  // DÍAS DEL PERÍODO
  // =============================================
  @IsOptional()
  @IsInt()
  @Min(0)
  total_dias?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_cesado_no_lab?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_nuevo_no_lab?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_sin_cobertura?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_falta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_suspension?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_vacaciones?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_subsidio_incapacidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_subsidio_maternidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_descanso_medico?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_licencia_sin_goce?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_licencia_fallecimiento?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_licencia_paternidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dias_licencia_con_goce?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  turno_dia?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  turno_noche?: number;

  // =============================================
  // INGRESOS AFECTOS
  // =============================================
  @IsOptional()
  @IsNumber()
  @Min(0)
  sueldo_nocturno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pasaje_especial?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  horas_extras_25?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  horas_extras_35?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feriado_trabajado?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descanso_medico_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subsidio_incapacidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subsidio_maternidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  asignacion_familiar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  licencia_goce_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonificaciones?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otros_ingresos?: number;

  // =============================================
  // INGRESOS NO AFECTOS
  // =============================================
  @IsOptional()
  @IsNumber()
  @Min(0)
  remuneracion_vacacional?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensacion_vacacional?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cts_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gratificacion_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  movilidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refrigerio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bono_desempeno_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  asignacion_cliente?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pegada_reenganche?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bono_productividad_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bono_armado_monto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bono_referido?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reintegro_dias_trab?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reintegro_inafecto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ingreso_sobregiro?: number;

  // =============================================
  // DESCUENTOS
  // =============================================
  @IsOptional()
  @IsNumber()
  @Min(0)
  adelanto_quincena?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adelanto_vacacional?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  afp_comision?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otros_adelantos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adelanto_cts?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  adelanto_gratificacion?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otros_descuentos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento_faltas?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento_sobregiro?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento_reintegro?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prestamo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retencion_judicial?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  renta_5ta?: number;

  // =============================================
  // OTROS
  // =============================================
  @IsOptional()
  @IsNumber()
  @Min(0)
  venta_vacaciones?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
