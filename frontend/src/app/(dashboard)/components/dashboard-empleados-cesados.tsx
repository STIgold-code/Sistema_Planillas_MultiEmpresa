'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ExternalLink, UserX, Users } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { EmpleadoCesado } from '../useDashboard';

interface Props {
  empleadosCesados: EmpleadoCesado[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
}

export function DashboardEmpleadosCesados({ empleadosCesados, expanded, onExpandChange }: Props) {
  if (empleadosCesados.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-rose-200 bg-rose-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-rose-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-rose-800 text-base md:text-lg">
                <UserX className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                Empleados Cesados
                <Badge className="ml-1 text-xs tabular-nums bg-rose-500 hover:bg-rose-600">
                  {empleadosCesados.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-rose-400 transition-transform duration-200', expanded && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-2">
            <p className="text-rose-700 text-xs md:text-sm">
              Los siguientes empleados tienen estado CESADO en el sistema.
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
                        <TableHead className="min-w-[150px]">Cargo</TableHead>
                        <TableHead className="min-w-[150px]">Sede</TableHead>
                        <TableHead className="min-w-[100px]">Fecha Cese</TableHead>
                        <TableHead className="text-right min-w-[80px]">Accion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empleadosCesados.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{emp.nombreCompleto}</p>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{emp.numero_documento}</TableCell>
                          <TableCell className="text-sm">{emp.cargo?.nombre || '-'}</TableCell>
                          <TableCell className="text-sm">{emp.sede?.nombre || '-'}</TableCell>
                          <TableCell className="text-sm">{formatDateSafe(emp.fecha_cese)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/rrhh/empleados/${emp.id}`}>
                                <ExternalLink className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Ver</span>
                              </Link>
                            </Button>
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
