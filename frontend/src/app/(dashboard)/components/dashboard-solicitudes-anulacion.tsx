'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, FileX, Check, X, Eye, Paperclip } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { SolicitudAnulacionPendiente } from '@/types/solicitudes-anulacion';

interface Props {
  solicitudes: SolicitudAnulacionPendiente[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
  onVerDetalle: (solicitud: SolicitudAnulacionPendiente) => void;
}

export function DashboardSolicitudesAnulacion({
  solicitudes,
  expanded,
  onExpandChange,
  onAprobar,
  onRechazar,
  onVerDetalle,
}: Props) {
  if (solicitudes.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-red-200 bg-red-50/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-red-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-red-800 text-base md:text-lg">
                <FileX className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="hidden sm:inline">Solicitudes de Anulación Pendientes</span>
                <span className="sm:hidden">Anulaciones Pendientes</span>
                <Badge className="ml-1 text-xs tabular-nums bg-red-500 hover:bg-red-600">
                  {solicitudes.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-red-400 transition-transform duration-200', expanded && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-2">
            <p className="text-red-700 text-xs md:text-sm">
              Solicitudes de anulación de contrato pendientes de revisión del administrador.
            </p>
          </div>
          <CardContent className="px-4 md:px-6">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden md:rounded-lg border-0 md:border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Empleado</TableHead>
                        <TableHead className="min-w-[100px]">DNI</TableHead>
                        <TableHead className="min-w-[120px]">Contrato</TableHead>
                        <TableHead className="min-w-[100px]">Estado Actual</TableHead>
                        <TableHead className="min-w-[130px]">Solicitado Por</TableHead>
                        <TableHead className="min-w-[90px]">Docs</TableHead>
                        <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudes.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {sol.empleado.apellido_paterno} {sol.empleado.apellido_materno}, {sol.empleado.nombres}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{sol.empleado.numero_documento}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex flex-col">
                              <span>#{sol.contrato.id}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateSafe(sol.contrato.fecha_inicio)}
                                {sol.contrato.fecha_fin ? ` → ${formatDateSafe(sol.contrato.fecha_fin)}` : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{sol.contrato.estado}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{sol.solicitado_por.nombre_completo}</TableCell>
                          <TableCell className="text-sm">
                            {sol.archivos && sol.archivos.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-blue-700">
                                <Paperclip className="h-3 w-3" />
                                {sol.archivos.length}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => onVerDetalle(sol)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Ver
                              </Button>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
