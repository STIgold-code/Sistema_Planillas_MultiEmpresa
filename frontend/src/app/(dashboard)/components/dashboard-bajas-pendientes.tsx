'use client';

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
import { ChevronDown, PackageX, Check, X } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import type { SolicitudBaja } from '@/types/inventario';

interface Props {
  bajas: SolicitudBaja[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
  puedeAprobar: boolean;
  procesando: boolean;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
}

export function DashboardBajasPendientes({
  bajas,
  expanded,
  onExpandChange,
  puedeAprobar,
  procesando,
  onAprobar,
  onRechazar,
}: Props) {
  if (bajas.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-orange-200 bg-orange-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-orange-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-orange-800 text-base md:text-lg">
                <PackageX className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="hidden sm:inline">
                  Bajas de prenda pendientes
                </span>
                <span className="sm:hidden">Bajas pendientes</span>
                <Badge className="ml-1 text-xs tabular-nums bg-orange-500 hover:bg-orange-600">
                  {bajas.length}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-orange-400 transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="px-4 md:px-6 pb-2 text-orange-700 text-xs md:text-sm">
            Prendas que un operario marcó para dar de baja, esperando tu
            aprobación.
          </p>
          <CardContent className="px-4 md:px-6">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden md:rounded-lg border-0 md:border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Prenda</TableHead>
                        <TableHead className="min-w-[60px]">Talla</TableHead>
                        <TableHead className="min-w-[220px]">Motivo</TableHead>
                        <TableHead className="min-w-[160px]">
                          Solicitado por
                        </TableHead>
                        <TableHead className="min-w-[110px]">Fecha</TableHead>
                        {puedeAprobar && (
                          <TableHead className="min-w-[150px] text-right">
                            Acciones
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bajas.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <p className="font-mono text-xs font-medium">
                              {b.item.codigo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {b.item.tipo_uniforme.nombre}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {b.item.talla}
                          </TableCell>
                          <TableCell
                            className="max-w-[240px] truncate text-sm"
                            title={b.motivo}
                          >
                            {b.motivo}
                          </TableCell>
                          <TableCell className="text-sm">
                            {b.solicitado_por.nombre_completo}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateSafe(b.created_at)}
                          </TableCell>
                          {puedeAprobar && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                  disabled={procesando}
                                  onClick={() => onAprobar(b.id)}
                                >
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                  disabled={procesando}
                                  onClick={() => onRechazar(b.id)}
                                  aria-label="Rechazar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
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
