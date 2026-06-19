/**
 * Helpers de presentación para el régimen laboral dentro de una planilla.
 *
 * Cuenta los regímenes presentes en las filas de detalle y arma un resumen
 * legible ("3 General · 2 Pequeña empresa") usando los labels cortos de
 * `regimenes.ts`. Mantiene la lógica fuera de los componentes (testeable y
 * reutilizable).
 */
import { obtenerRegimenInfo } from '@/lib/regimenes';

/** Subconjunto de una fila de detalle que aporta el régimen. */
export interface FilaConRegimen {
  regimen_laboral?: string | null;
}

export interface RegimenConteo {
  /** Valor del enum, o null para filas sin régimen. */
  value: string | null;
  /** Label corto para mostrar; "Sin régimen" cuando es null. */
  label: string;
  cantidad: number;
}

/**
 * Cuenta cuántas filas hay por régimen, preservando un orden estable
 * (por aparición). Las filas sin régimen se agrupan bajo `null`.
 */
export function contarRegimenes(filas: readonly FilaConRegimen[]): RegimenConteo[] {
  const orden: Array<string | null> = [];
  const conteo = new Map<string | null, number>();

  for (const fila of filas) {
    const value = fila.regimen_laboral ?? null;
    if (!conteo.has(value)) {
      conteo.set(value, 0);
      orden.push(value);
    }
    conteo.set(value, (conteo.get(value) ?? 0) + 1);
  }

  return orden.map((value) => ({
    value,
    label: value ? (obtenerRegimenInfo(value)?.labelCorto ?? value) : 'Sin régimen',
    cantidad: conteo.get(value) ?? 0,
  }));
}

/** true si las filas mezclan más de un régimen distinto (incluye el "sin régimen"). */
export function tieneVariosRegimenes(filas: readonly FilaConRegimen[]): boolean {
  return contarRegimenes(filas).length > 1;
}

/** Texto compacto: "3 General · 2 Pequeña empresa". */
export function resumirRegimenes(filas: readonly FilaConRegimen[]): string {
  return contarRegimenes(filas)
    .map((c) => `${c.cantidad} ${c.label}`)
    .join(' · ');
}
