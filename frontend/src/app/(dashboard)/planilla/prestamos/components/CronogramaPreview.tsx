'use client';

import { CalendarClock, TriangleAlert } from 'lucide-react';
import {
  MAX_FILAS_PROYECTADAS,
  ProyeccionCronograma,
  leerPeriodo,
  nombrarPeriodo,
} from '../dominio/cronograma-prestamo';

interface Props {
  proyeccion: ProyeccionCronograma | null;
  /** Fecha de otorgamiento en formato AAAA-MM-DD, para explicar el arranque. */
  fechaOtorgado: string;
}

const soles = (valor: number): string =>
  valor.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function nombrarDesdePeriodo(periodo: string): string {
  const partes = leerPeriodo(`${periodo}-01`);
  return partes ? nombrarPeriodo(partes.anio, partes.mes) : periodo;
}

/**
 * Previsualización del calendario de descuentos, antes de guardar.
 *
 * Responde las dos preguntas que hoy solo se contestan corriendo la planilla:
 * en qué período entra la primera cuota y en cuál termina el préstamo.
 */
export function CronogramaPreview({ proyeccion, fechaOtorgado }: Props) {
  if (!proyeccion || proyeccion.filas.length === 0) return null;

  const { filas, truncado, totalProgramado, periodoFinal } = proyeccion;
  const primera = filas[0];
  const otorgado = leerPeriodo(fechaOtorgado);
  const arranqueDiferido =
    otorgado !== null &&
    (otorgado.anio !== primera.anio || otorgado.mes !== primera.mes);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <CalendarClock className="h-4 w-4 shrink-0" />
          Cronograma proyectado
        </span>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <div className="flex gap-1.5">
            <dt>Cuotas:</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              {truncado ? `más de ${MAX_FILAS_PROYECTADAS}` : filas.length}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Primera:</dt>
            <dd className="font-medium text-slate-900">
              {nombrarPeriodo(primera.anio, primera.mes)}
            </dd>
          </div>
          {!truncado && periodoFinal && (
            <div className="flex gap-1.5">
              <dt>Última:</dt>
              <dd className="font-medium text-slate-900">
                {nombrarDesdePeriodo(periodoFinal)}
              </dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt>Total:</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              S/ {soles(totalProgramado)}
            </dd>
          </div>
        </dl>
      </div>

      {arranqueDiferido && (
        <p className="border-b border-slate-200 px-4 py-2 text-xs text-slate-600">
          El adelanto de gratificación solo se descuenta en julio y diciembre,
          así que la primera cuota cae en{' '}
          {nombrarPeriodo(primera.anio, primera.mes)}.
        </p>
      )}

      {truncado && (
        <p className="flex items-start gap-2 border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Con esta cuota el préstamo pasa de {MAX_FILAS_PROYECTADAS} meses.
          Revisa el monto de la cuota antes de continuar.
        </p>
      )}

      <div className="max-h-56 overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  N.°
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  Período
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Cuota
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.numero} className="border-t border-slate-200">
                  <td className="px-4 py-1.5 tabular-nums text-slate-500">
                    {fila.numero}
                  </td>
                  <td className="px-4 py-1.5 text-slate-700">{fila.periodo}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-slate-900">
                    {soles(fila.cuota)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-slate-500">
                    {soles(fila.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        Proyección referencial. El descuento real se genera en cada cálculo de
        planilla y la última cuota se ajusta al saldo pendiente.
      </p>
    </div>
  );
}
