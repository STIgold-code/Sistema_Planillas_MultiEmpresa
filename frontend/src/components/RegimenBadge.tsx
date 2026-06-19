import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { obtenerRegimenInfo } from '@/lib/regimenes';

export interface RegimenBadgeProps {
  /** Valor del régimen (enum backend). Vacío/desconocido no renderiza nada. */
  regimen: string | null | undefined;
  className?: string;
}

/**
 * Badge presentacional para mostrar el régimen laboral de un contrato o
 * empresa. Los regímenes no certificados se resaltan con un matiz ámbar
 * y un icono de advertencia accesible.
 */
export function RegimenBadge({ regimen, className }: RegimenBadgeProps) {
  const info = obtenerRegimenInfo(regimen);
  if (!info) return null;

  return (
    <Badge
      variant={info.certificado ? 'secondary' : 'outline'}
      title={info.implicaciones}
      className={cn(
        'gap-1',
        !info.certificado &&
          'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-400',
        className,
      )}
    >
      {!info.certificado && (
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      )}
      <span>{info.labelCorto}</span>
      {!info.certificado && (
        <span className="sr-only">(régimen no certificado)</span>
      )}
    </Badge>
  );
}
