'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, BadgeDollarSign, ArrowRight } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { SolicitudDescuento } from '@/types/inventario';

interface Props {
  descuentos: SolicitudDescuento[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
}

export function DashboardDescuentosPendientes({
  descuentos,
  expanded,
  onExpandChange,
}: Props) {
  if (descuentos.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-amber-200 bg-amber-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-amber-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-base md:text-lg">
                <BadgeDollarSign className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="hidden sm:inline">
                  Descuentos de uniforme pendientes
                </span>
                <span className="sm:hidden">Descuentos pendientes</span>
                <Badge className="ml-1 text-xs tabular-nums bg-amber-500 hover:bg-amber-600">
                  {descuentos.length}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-amber-400 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-2 px-4 md:px-6 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-amber-700 text-xs md:text-sm">
              Uniformes no devueltos esperando que definas el monto a descontar.
            </p>
            <Button asChild size="sm" variant="outline" className="border-amber-300">
              <Link href="/inventario/descuentos">
                Revisar y aprobar
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <CardContent className="px-4 md:px-6">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden md:rounded-lg border-0 md:border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Empleado</TableHead>
                        <TableHead className="min-w-[100px]">DNI</TableHead>
                        <TableHead className="min-w-[90px] text-center">
                          Prendas
                        </TableHead>
                        <TableHead className="min-w-[120px] text-right">
                          Ref. (precio)
                        </TableHead>
                        <TableHead className="min-w-[110px]">Solicitado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {descuentos.map((s) => {
                        const ref = s.items.reduce(
                          (acc, i) => acc + Number(i.precio_referencia),
                          0,
                        );
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <p className="font-medium text-sm">
                                {s.empleado.apellido_paterno}{' '}
                                {s.empleado.apellido_materno}, {s.empleado.nombres}
                              </p>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {s.empleado.numero_documento}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="tabular-nums">
                                {s.items.length}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              S/ {ref.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDateSafe(s.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
