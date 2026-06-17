'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ChevronDown, ExternalLink, RefreshCw, Users, XCircle } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { EmpleadoPendiente } from '../useDashboard';

interface Props {
  empleadosPendientes: EmpleadoPendiente[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
  onRenovar: (contrato: EmpleadoPendiente) => void;
  onSolicitarCese: (empleadoId: number, nombreCompleto: string) => void;
}

export function DashboardEmpleadosPendientes({
  empleadosPendientes,
  expanded,
  onExpandChange,
  onRenovar,
  onSolicitarCese,
}: Props) {
  if (empleadosPendientes.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-red-200 bg-red-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-red-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-red-800 text-base md:text-lg">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                Empleados Pendientes
                <Badge variant="destructive" className="ml-1 text-xs tabular-nums">
                  {empleadosPendientes.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-red-400 transition-transform duration-200', expanded && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-2">
            <p className="text-red-700 text-xs md:text-sm">
              Los siguientes empleados requieren accion inmediata: renovar contrato o procesar cese.
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
                        <TableHead className="min-w-[150px]">Cargo / Area</TableHead>
                        <TableHead className="min-w-[120px]">Ultimo Contrato</TableHead>
                        <TableHead className="min-w-[100px]">Vencio</TableHead>
                        <TableHead className="min-w-[120px]">Dias Pendiente</TableHead>
                        <TableHead className="text-right min-w-[200px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleadosPendientes.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{emp.nombreCompleto}</p>
                              <p className="text-xs text-muted-foreground">{emp.empleado.numero_documento}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{emp.empleado.cargo?.nombre || '-'}</p>
                              <p className="text-xs text-muted-foreground">{emp.empleado.area?.nombre || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{emp.tipo_contrato}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDateSafe(emp.fecha_fin)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{emp.diasPendiente} dias</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => onSolicitarCese(emp.empleado.id, emp.nombreCompleto)}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Cesar</span>
                              </Button>
                              <Button size="sm" className="h-7 text-xs" onClick={() => onRenovar(emp)}>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Renovar</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                <Link href={`/rrhh/empleados/${emp.empleado.id}`}>
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  <span className="hidden sm:inline">Ver</span>
                                </Link>
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
            <div className="mt-4 flex justify-center md:justify-end">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/rrhh/empleados">
                  <Users className="mr-2 h-4 w-4" />
                  Ver todos los empleados
                </Link>
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
