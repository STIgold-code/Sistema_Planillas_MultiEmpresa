"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ClipboardList, ArrowRight } from "lucide-react";
import { cn, formatDateSafe } from "@/lib/utils";
import type { RequerimientoPendienteAprobacion } from "@/types/inventario";

interface Props {
  requerimientos: RequerimientoPendienteAprobacion[];
  expanded: boolean;
  onExpandChange: (open: boolean) => void;
}

export function DashboardRequerimientosPendientes({
  requerimientos,
  expanded,
  onExpandChange,
}: Props) {
  if (requerimientos.length === 0) return null;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandChange}>
      <Card className="border-blue-200 bg-blue-50/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none px-4 md:px-6 transition-colors hover:bg-blue-100/40">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2 text-blue-800 text-base md:text-lg">
                <ClipboardList className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                <span className="hidden sm:inline">
                  Requerimientos pendientes de aprobación
                </span>
                <span className="sm:hidden">Requerimientos pendientes</span>
                <Badge className="ml-1 text-xs tabular-nums bg-blue-500 hover:bg-blue-600">
                  {requerimientos.length}
                </Badge>
              </CardTitle>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-blue-400 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-2 px-4 md:px-6 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-blue-700 text-xs md:text-sm">
              Requerimientos de uniformes en borrador que esperan tu aprobación.
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-blue-300"
            >
              <Link href="/inventario/requerimientos">
                Ver todos
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
                        <TableHead className="min-w-[220px]">Nombre</TableHead>
                        <TableHead className="min-w-[110px]">Fecha</TableHead>
                        <TableHead className="min-w-[80px] text-center">
                          Líneas
                        </TableHead>
                        <TableHead className="min-w-[160px]">
                          Creado por
                        </TableHead>
                        <TableHead className="min-w-[120px] text-right">
                          Acción
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requerimientos.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">
                            {r.nombre}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateSafe(r.fecha)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="tabular-nums">
                              {r._count.detalles}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.usuario.nombre_completo}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Link href={`/inventario/requerimientos/${r.id}`}>
                                Revisar
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
