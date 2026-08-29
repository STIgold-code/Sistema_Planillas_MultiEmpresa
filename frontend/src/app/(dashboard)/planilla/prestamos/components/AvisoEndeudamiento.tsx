'use client';

import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cuotaEfectiva } from '../dominio/cronograma-prestamo';
import {
  Prestamo,
  TIPO_ETIQUETA,
  UMBRAL_CUOTA_SOBRE_SUELDO,
} from '../usePrestamos';

interface Props {
  sueldoBase: number | null;
  cuotaNueva: number;
  /** Préstamos ACTIVOS que el trabajador ya tiene, sin contar el que se registra. */
  prestamosActivos: Prestamo[];
  cargandoActivos: boolean;
}

const soles = (valor: number): string =>
  valor.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Aviso de carga de descuentos sobre la remuneración.
 *
 * Suma la cuota que se está registrando a la de TODOS los préstamos activos del
 * trabajador: dos préstamos del 25% no disparan una alerta que mire solo uno,
 * y entre los dos se llevan medio sueldo.
 *
 * No bloquea nunca. No existe en la ley peruana un tope porcentual expreso para
 * los descuentos autorizados por convenio, así que la empresa decide y el
 * sistema informa.
 */
export function AvisoEndeudamiento({
  sueldoBase,
  cuotaNueva,
  prestamosActivos,
  cargandoActivos,
}: Props) {
  if (cargandoActivos) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Revisando los préstamos vigentes del trabajador...
      </p>
    );
  }

  const cuotasVigentes = prestamosActivos.map((prestamo) => ({
    id: prestamo.id,
    tipo: prestamo.tipo,
    monto: cuotaEfectiva(
      Number(prestamo.cuota_mensual) || 0,
      prestamo.saldo === null
        ? Number(prestamo.cuota_mensual) || 0
        : Number(prestamo.saldo) || 0,
    ),
  }));

  const totalVigente = cuotasVigentes.reduce(
    (suma, cuota) => suma + cuota.monto,
    0,
  );
  const cuota = Number.isFinite(cuotaNueva) && cuotaNueva > 0 ? cuotaNueva : 0;
  const totalDescuento = totalVigente + cuota;

  if (totalDescuento <= 0) return null;

  const tieneSueldo = sueldoBase !== null && sueldoBase > 0;
  const porcentaje = tieneSueldo ? totalDescuento / sueldoBase : null;
  const excedeUmbral =
    porcentaje !== null && porcentaje > UMBRAL_CUOTA_SOBRE_SUELDO;
  const restante = tieneSueldo ? sueldoBase - totalDescuento : null;

  // Sin préstamos previos y sin exceder el umbral no hay nada que advertir.
  if (!excedeUmbral && cuotasVigentes.length === 0) return null;

  const alerta = excedeUmbral;

  return (
    <div
      role="status"
      className={
        alerta
          ? 'flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900'
          : 'flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700'
      }
    >
      {alerta ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
      )}

      <div className="space-y-2">
        {cuotasVigentes.length > 0 && (
          <p>
            Este trabajador ya tiene {cuotasVigentes.length}{' '}
            {cuotasVigentes.length === 1
              ? 'préstamo vigente'
              : 'préstamos vigentes'}{' '}
            por S/ {soles(totalVigente)} al mes:{' '}
            {cuotasVigentes
              .map(
                (vigente) =>
                  `${TIPO_ETIQUETA[vigente.tipo]} S/ ${soles(vigente.monto)}`,
              )
              .join(', ')}
            .
          </p>
        )}

        <p>
          Con esta cuota, el descuento mensual por préstamos sube a{' '}
          <strong>S/ {soles(totalDescuento)}</strong>
          {porcentaje !== null && tieneSueldo && (
            <>
              , el <strong>{(porcentaje * 100).toFixed(1)}%</strong> de la
              remuneración de S/ {soles(sueldoBase)}
              {restante !== null && (
                <>
                  , y le quedarían S/ {soles(restante)} antes de aportes y otros
                  descuentos
                </>
              )}
            </>
          )}
          .
        </p>

        {alerta && (
          <p>
            Supera el {UMBRAL_CUOTA_SOBRE_SUELDO * 100}% de la remuneración.
            Puedes continuar: es un aviso para que lo revises con el trabajador.
            El cálculo no incluye AFP u ONP, quinta categoría ni otros descuentos,
            así que el líquido real será menor.
          </p>
        )}
      </div>
    </div>
  );
}
