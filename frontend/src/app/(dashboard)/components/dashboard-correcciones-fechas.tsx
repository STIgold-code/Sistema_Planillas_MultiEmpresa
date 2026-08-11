'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  CalendarClock,
  Check,
  X,
  ArrowRight,
  Paperclip,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { SolicitudCorreccionFecha } from '@/types/solicitudes-correccion-fecha';

interface Props {
  solicitudes: SolicitudCorreccionFecha[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
  puedeAprobar: boolean;
}

interface CampoComparado {
  label: string;
  actual: string;
  propuesto: string;
}

function camposComparados(sol: SolicitudCorreccionFecha): CampoComparado[] {
  return [
    {
      label: 'F. Inicio',
      actual: formatDateSafe(sol.fecha_inicio_actual),
      propuesto: formatDateSafe(sol.fecha_inicio_propuesta),
    },
    {
      label: 'F. Fin',
      actual: sol.fecha_fin_actual
        ? formatDateSafe(sol.fecha_fin_actual)
        : 'Indefinido',
      propuesto: sol.fecha_fin_propuesta
        ? formatDateSafe(sol.fecha_fin_propuesta)
        : 'Indefinido',
    },
  ];
}

export function DashboardCorreccionesFechas({
  solicitudes,
  expanded,
  onExpandChange,
  onAprobar,
  onRechazar,
  puedeAprobar,
}: Props) {
  if (solicitudes.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-indigo-200 bg-indigo-50/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-indigo-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-indigo-800 text-base md:text-lg">
                <CalendarClock className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="hidden sm:inline">
                  Correcciones de Fechas Pendientes
                </span>
                <span className="sm:hidden">Correcciones de Fechas</span>
                <Badge className="ml-1 text-xs tabular-nums bg-indigo-500 hover:bg-indigo-600">
                  {solicitudes.length}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-indigo-400 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-2">
            <p className="text-indigo-700 text-xs md:text-sm">
              Correcciones de fechas de contrato pendientes de revisión del
              administrador. Las fechas no cambian hasta que se apruebe.
            </p>
          </div>
          <CardContent className="px-4 md:px-6 space-y-3">
            {solicitudes.map((sol) => {
              const nombreEmpleado = `${sol.empleado.apellido_paterno} ${sol.empleado.apellido_materno}, ${sol.empleado.nombres}`;

              return (
                <div
                  key={sol.id}
                  className="rounded-lg border bg-background p-3 md:p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {nombreEmpleado}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        DNI {sol.empleado.numero_documento}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contrato #{sol.contrato.id} · {sol.contrato.tipo_contrato}{' '}
                        (renovación {sol.contrato.numero_renovacion ?? 1}) ·
                        Solicitado por {sol.solicitado_por.nombre_completo}
                      </p>
                    </div>
                    {puedeAprobar && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => onAprobar(sol.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Aprobar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onRechazar(sol.id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {camposComparados(sol).map((campo) => {
                      const cambia = campo.actual !== campo.propuesto;
                      return (
                        <div
                          key={campo.label}
                          className={cn(
                            'grid grid-cols-[90px_1fr_auto_1fr] items-center gap-2 rounded px-2 py-1 text-xs',
                            cambia && 'bg-amber-50',
                          )}
                        >
                          <span className="text-muted-foreground">
                            {campo.label}
                          </span>
                          <span className="truncate text-muted-foreground line-through decoration-muted-foreground/40">
                            {campo.actual}
                          </span>
                          <ArrowRight
                            className="h-3 w-3 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span
                            className={cn(
                              'truncate font-medium',
                              cambia && 'text-amber-700',
                            )}
                          >
                            {campo.propuesto}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Motivo</p>
                    <p className="whitespace-pre-wrap text-sm bg-muted/30 rounded p-2 border">
                      {sol.motivo}
                    </p>
                  </div>

                  {sol.archivos.length > 0 && (
                    <p className="inline-flex items-center gap-1 text-xs text-blue-700">
                      <Paperclip className="h-3 w-3" />
                      {sol.archivos.length}{' '}
                      {sol.archivos.length === 1
                        ? 'documento de sustento'
                        : 'documentos de sustento'}
                    </p>
                  )}

                  {sol.advertencia_planillas && (
                    <p className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <AlertTriangle
                        className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600"
                        aria-hidden="true"
                      />
                      {sol.advertencia_planillas}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
