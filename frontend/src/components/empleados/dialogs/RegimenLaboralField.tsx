'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REGIMENES_LISTA,
  AVISO_REGIMEN_NO_CERTIFICADO,
  obtenerRegimenInfo,
} from '@/lib/regimenes';

/** Valor centinela para la opción "Heredar de la empresa". */
const HEREDAR = '__heredar__';

export interface RegimenLaboralFieldProps {
  /** Valor actual del régimen ('' = heredar de la empresa). */
  value: string;
  /** Notifica el nuevo valor ('' cuando se elige heredar). */
  onChange: (value: string) => void;
  /** id único para asociar label y control (accesibilidad). */
  id?: string;
}

/**
 * Selector de régimen laboral para el formulario de contrato.
 *
 * Incluye la opción "Heredar de la empresa" (valor vacío → no se envía
 * regimen_laboral y se hereda el default de la empresa) más los 6
 * regímenes. Los no certificados se marcan con ⚠ y muestran un aviso.
 * Debajo del selector se muestra la línea de implicaciones del régimen.
 */
export function RegimenLaboralField({
  value,
  onChange,
  id = 'regimen_laboral',
}: RegimenLaboralFieldProps) {
  const info = obtenerRegimenInfo(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Régimen laboral</Label>
      <Select
        value={value || HEREDAR}
        onValueChange={(v) => onChange(v === HEREDAR ? '' : v)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={HEREDAR}>Heredar de la empresa</SelectItem>
          {REGIMENES_LISTA.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              <span className="flex items-center gap-1.5">
                {!r.certificado && (
                  <AlertTriangle
                    className="h-3.5 w-3.5 text-amber-600"
                    aria-hidden="true"
                  />
                )}
                {r.label}
                {!r.certificado && (
                  <span className="sr-only">(no certificado)</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {info ? (
        <div className="space-y-1">
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>{info.implicaciones}</span>
          </p>
          {!info.certificado && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{AVISO_REGIMEN_NO_CERTIFICADO}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Se usará el régimen laboral configurado por defecto en la empresa.
          </span>
        </p>
      )}
    </div>
  );
}
