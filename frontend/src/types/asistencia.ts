// Asistencia (legacy)

import type { Empleado } from './empleados';
import type { TipoMarcacion } from './tareo';

export interface Asistencia {
  id: string;
  empleado_id: string;
  empleado?: Empleado;
  fecha: string;
  tipo_marcacion_id: string;
  tipo_marcacion?: TipoMarcacion;
  turno: 'DIA' | 'NOCHE';
  observaciones?: string;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}
