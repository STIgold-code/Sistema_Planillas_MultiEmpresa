/**
 * Tipos compartidos del modulo de reportes.
 *
 * Extraidos para que ColumnConfig sea visible en ambos services
 * (reportes-data y reportes-detalle) y permitir generar .d.ts sin TS4053.
 */
export interface ColumnConfig {
  key: string;
  header: string;
  width: number;
}

export type ReporteData = {
  data: Record<string, unknown>[];
  columns: ColumnConfig[];
};
