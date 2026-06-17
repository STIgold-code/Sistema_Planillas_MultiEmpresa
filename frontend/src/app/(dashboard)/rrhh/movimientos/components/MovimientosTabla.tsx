'use client';

import { useRouter } from 'next/navigation';
import { MovimientoPersonal, UltimosPeriodosConDatos } from '@/types';
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
import { Eye, Loader2, UserPlus, UserMinus, Clock } from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import { MESES } from '../hooks/useMovimientos';

const tipoBadgeConfig: Record<
  MovimientoPersonal['tipo'],
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: typeof UserPlus }
> = {
  INGRESO: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80', icon: UserPlus },
  CESE: { variant: 'destructive', className: '', icon: UserMinus },
  VENCIMIENTO: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100/80', icon: Clock },
};

const tipoLabels: Record<MovimientoPersonal['tipo'], string> = {
  INGRESO: 'Ingreso',
  CESE: 'Cese',
  VENCIMIENTO: 'Vencimiento',
};

interface MovimientosTablaProps {
  movimientos: MovimientoPersonal[];
  loading: boolean;
  ultimosPeriodos: UltimosPeriodosConDatos | null;
  onNavigatePeriodo: (filters: Record<string, string>) => void;
}

export function MovimientosTabla({
  movimientos,
  loading,
  ultimosPeriodos,
  onNavigatePeriodo,
}: MovimientosTablaProps) {
  const router = useRouter();

  return (
    <Card className="flex-1">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Tipo</TableHead>
                <TableHead className="min-w-[100px]">DNI</TableHead>
                <TableHead className="min-w-[200px]">Nombre Completo</TableHead>
                <TableHead className="min-w-[100px]">Area</TableHead>
                <TableHead className="min-w-[120px]">Sede</TableHead>
                <TableHead className="min-w-[150px]">Cliente</TableHead>
                <TableHead className="min-w-[100px]">Fecha</TableHead>
                <TableHead className="min-w-[100px]">Dias Rest.</TableHead>
                <TableHead className="min-w-[120px]">Motivo</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-muted-foreground">
                        No se encontraron movimientos en el periodo seleccionado
                      </p>
                      {ultimosPeriodos && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {ultimosPeriodos.ultimoCese && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigatePeriodo({
                                mes: ultimosPeriodos.ultimoCese!.mes.toString(),
                                anio: ultimosPeriodos.ultimoCese!.anio.toString(),
                                tipo: 'CESES',
                              })}
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              Ver ceses de {MESES[ultimosPeriodos.ultimoCese.mes - 1]?.label} {ultimosPeriodos.ultimoCese.anio}
                            </Button>
                          )}
                          {ultimosPeriodos.ultimoIngreso && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigatePeriodo({
                                mes: ultimosPeriodos.ultimoIngreso!.mes.toString(),
                                anio: ultimosPeriodos.ultimoIngreso!.anio.toString(),
                                tipo: 'INGRESOS',
                              })}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Ver ingresos de {MESES[ultimosPeriodos.ultimoIngreso.mes - 1]?.label} {ultimosPeriodos.ultimoIngreso.anio}
                            </Button>
                          )}
                          {ultimosPeriodos.ultimoVencimiento && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigatePeriodo({
                                mes: ultimosPeriodos.ultimoVencimiento!.mes.toString(),
                                anio: ultimosPeriodos.ultimoVencimiento!.anio.toString(),
                                tipo: 'VENCIMIENTOS',
                              })}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Ver vencimientos de {MESES[ultimosPeriodos.ultimoVencimiento.mes - 1]?.label} {ultimosPeriodos.ultimoVencimiento.anio}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => {
                  const config = tipoBadgeConfig[mov.tipo];
                  const Icon = config.icon;
                  return (
                    <TableRow key={`${mov.tipo}-${mov.id}`}>
                      <TableCell>
                        <Badge variant={config.variant} className={cn('gap-1', config.className)}>
                          <Icon className="h-3 w-3" />
                          {tipoLabels[mov.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{mov.numero_documento}</TableCell>
                      <TableCell className="font-medium text-sm">{mov.nombre_completo}</TableCell>
                      <TableCell className="text-sm">{mov.area || '-'}</TableCell>
                      <TableCell className="text-sm">{mov.sede || '-'}</TableCell>
                      <TableCell className="text-sm">{mov.cliente || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDateSafe(mov.fecha_movimiento)}</TableCell>
                      <TableCell className="text-sm">
                        {mov.tipo === 'VENCIMIENTO' && mov.dias_restantes !== undefined ? (
                          <Badge
                            variant={mov.dias_restantes <= 0 ? 'destructive' : 'outline'}
                            className={cn(
                              'font-medium',
                              mov.dias_restantes <= 0
                                ? ''
                                : mov.dias_restantes <= 7
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : mov.dias_restantes <= 15
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-green-100 text-green-800 border-green-200'
                            )}
                          >
                            {mov.dias_restantes <= 0 ? 'Vencido' : `${mov.dias_restantes}d`}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{mov.motivo || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            mov.estado_empleado === 'ACTIVO' && 'bg-green-100 text-green-800 border-green-200',
                            mov.estado_empleado === 'CESADO' && 'bg-red-100 text-red-800 border-red-200',
                            mov.estado_empleado === 'BAJA' && 'bg-gray-100 text-gray-800 border-gray-200',
                            mov.estado_empleado === 'PENDIENTE' && 'bg-blue-100 text-blue-800 border-blue-200'
                          )}
                        >
                          {mov.estado_empleado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/rrhh/empleados/${mov.empleado_id}`)}
                          title="Ver empleado"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
