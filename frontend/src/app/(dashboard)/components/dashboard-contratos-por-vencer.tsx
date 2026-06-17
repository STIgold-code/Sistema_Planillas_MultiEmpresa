'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ChevronDown, ExternalLink, FileText, RefreshCw, XCircle } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { ContratoPorVencer } from '../useDashboard';

interface Props {
  contratosPorVencer: ContratoPorVencer[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
  onRenovar: (contrato: ContratoPorVencer) => void;
  onSolicitarCese: (empleadoId: number, nombreCompleto: string) => void;
}

function UrgencyBadge({ dias }: { dias: number }) {
  if (dias <= 7) return <Badge variant="destructive">Urgente ({dias} dias)</Badge>;
  if (dias <= 15) return <Badge className="bg-orange-500 hover:bg-orange-600">{dias} dias</Badge>;
  return <Badge variant="secondary">{dias} dias</Badge>;
}

export function DashboardContratosPorVencer({
  contratosPorVencer,
  expanded,
  onExpandChange,
  onRenovar,
  onSolicitarCese,
}: Props) {
  if (contratosPorVencer.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-amber-200 bg-amber-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-amber-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                Contratos por Vencer
                <Badge className="ml-1 text-xs tabular-nums bg-amber-500 hover:bg-amber-600">
                  {contratosPorVencer.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-amber-400 transition-transform duration-200', expanded && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-2">
            <p className="text-amber-700 text-xs md:text-sm">
              Los siguientes contratos vencen en los proximos 30 dias. Renueva o cesa segun corresponda.
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
                        <TableHead className="min-w-[120px]">Tipo Contrato</TableHead>
                        <TableHead className="min-w-[100px]">Vencimiento</TableHead>
                        <TableHead className="min-w-[120px]">Dias Restantes</TableHead>
                        <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratosPorVencer.map((contrato) => (
                        <TableRow key={contrato.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{contrato.nombreCompleto}</p>
                              <p className="text-xs text-muted-foreground">{contrato.empleado.numero_documento}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{contrato.empleado.cargo?.nombre || '-'}</p>
                              <p className="text-xs text-muted-foreground">{contrato.empleado.area?.nombre || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{contrato.tipo_contrato}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDateSafe(contrato.fecha_fin)}</TableCell>
                          <TableCell>
                            <UrgencyBadge dias={contrato.diasRestantes} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => onSolicitarCese(contrato.empleado.id, contrato.nombreCompleto)}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Cesar</span>
                              </Button>
                              <Button size="sm" className="h-7 text-xs" onClick={() => onRenovar(contrato)}>
                                <RefreshCw className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Renovar</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                <Link href={`/rrhh/empleados/${contrato.empleado.id}`}>
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
                <Link href="/rrhh/contratos">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver todos los contratos
                </Link>
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
