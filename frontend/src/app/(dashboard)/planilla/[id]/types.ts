import { EstadoPlanilla } from '@/types';

export const estadoBadgeVariant: Record<EstadoPlanilla, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BORRADOR: 'outline',
  CALCULADA: 'secondary',
  REVISADA: 'secondary',
  APROBADA: 'default',
  PAGADA: 'default',
  ANULADA: 'destructive',
};

export const estadoLabels: Record<EstadoPlanilla, string> = {
  BORRADOR: 'Borrador',
  CALCULADA: 'Calculada',
  REVISADA: 'Revisada',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

export const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface EditForm {
  // Horas extras
  horas_extras_25: number;
  horas_extras_35: number;
  // Ingresos manuales
  pasaje_especial: number;
  bonificaciones: number;
  otros_ingresos: number;
  compensacion_vacacional: number;
  pegada_reenganche: number;
  bono_referido: number;
  reintegro_dias_trab: number;
  reintegro_inafecto: number;
  ingreso_sobregiro: number;
  venta_vacaciones: number;
  // Descuentos manuales
  adelanto_quincena: number;
  adelanto_vacacional: number;
  otros_adelantos: number;
  adelanto_cts: number;
  adelanto_gratificacion: number;
  otros_descuentos: number;
  descuento_sobregiro: number;
  descuento_reintegro: number;
  prestamo: number;
  retencion_judicial: number;
  renta_5ta: number;
  // Observaciones
  observaciones: string;
}

export type ConfirmAction = 'aprobar' | 'pagar' | 'anular' | null;
