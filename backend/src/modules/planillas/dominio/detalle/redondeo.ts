/** Redondeo a 2 decimales seguro (NaN → 0). Idéntico a `round2` del legacy. */
export function redondear2(valor: number): number {
  const r = Math.round(valor * 100) / 100;
  return Number.isNaN(r) ? 0 : r;
}
