'use client';

import { useRouter } from 'next/navigation';
import { CarnetSucamec, EstadoCarnetSucamec } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, ExternalLink, Loader2, CheckCircle } from 'lucide-react';
import { formatDateSafe } from '@/lib/utils';
import { differenceInDays, startOfDay } from 'date-fns';

const estadoBadgeVariant: Record<EstadoCarnetSucamec, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  VIGENTE: 'default',
  VENCIDO: 'destructive',
  SUSPENDIDO: 'secondary',
  ANULADO: 'outline',
};

const estadoLabels: Record<EstadoCarnetSucamec, string> = {
  VIGENTE: 'Vigente',
  VENCIDO: 'Vencido',
  SUSPENDIDO: 'Suspendido',
  ANULADO: 'Anulado',
};

function getDiasRestantes(fechaVencimiento: string | undefined): number | null {
  if (!fechaVencimiento) return null;
  const [year, month, day] = fechaVencimiento.split('T')[0].split('-').map(Number);
  const fechaLocal = new Date(year, month - 1, day);
  return differenceInDays(fechaLocal, startOfDay(new Date()));
}

function getNombreCompleto(empleado: CarnetSucamec['empleado']): string {
  if (!empleado) return '-';
  return `${empleado.apellido_paterno} ${empleado.apellido_materno}, ${empleado.nombres}`;
}

interface SucamecTablaProps {
  carnets: CarnetSucamec[];
  loading: boolean;
}

export function SucamecTabla({ carnets, loading }: SucamecTablaProps) {
  const router = useRouter();

  return (
    <Card className="flex-1">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Empleado</TableHead>
                <TableHead className="min-w-[100px]">DNI</TableHead>
                <TableHead className="min-w-[120px]">N Carnet</TableHead>
                <TableHead className="min-w-[110px]">F. Emision</TableHead>
                <TableHead className="min-w-[110px]">F. Vencimiento</TableHead>
                <TableHead className="min-w-[100px]">Dias Rest.</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="min-w-[100px]">Documento</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : carnets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron carnets SUCAMEC con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                carnets.map((carnet) => {
                  const diasRestantes = getDiasRestantes(carnet.fecha_vencimiento);
                  return (
                    <TableRow key={carnet.id}>
                      <TableCell className="font-medium text-sm">
                        {getNombreCompleto(carnet.empleado)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {carnet.empleado?.numero_documento || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {carnet.numero_carnet}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateSafe(carnet.fecha_emision)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateSafe(carnet.fecha_vencimiento)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {carnet.estado === 'VIGENTE' && diasRestantes !== null ? (
                          <span
                            className={`font-medium ${
                              diasRestantes <= 0
                                ? 'text-red-600'
                                : diasRestantes <= 30
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {diasRestantes <= 0 ? 'Vencido' : `${diasRestantes} dias`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant={estadoBadgeVariant[carnet.estado]}>
                          {estadoLabels[carnet.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {carnet.documento ? (
                          <a
                            href={carnet.documento.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            title={carnet.documento.archivo_nombre}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="truncate max-w-[100px]">Ver</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Sin doc.</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/rrhh/sucamec/${carnet.id}`)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/rrhh/empleados/${carnet.empleado_id}`)}
                            title="Ir a ficha del empleado"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
