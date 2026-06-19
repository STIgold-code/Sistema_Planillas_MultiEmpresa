'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ChevronDown,
  FileWarning,
  Loader2,
  Calendar,
  User,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { cn, formatDateSafe } from '@/lib/utils';
import { toast } from 'sonner';

interface EmpleadoConAlerta {
  empleado_id: number;
  numero_documento: string;
  nombre_completo: string;
  foto_url: string | null;
  area: string | null;
  sede: string | null;
  cargo: string | null;
  cantidad_faltas: number;
  requiere_pre_aviso: boolean;
}

interface AlertasFaltasResponse {
  empleados: EmpleadoConAlerta[];
  total: number;
  minimo_faltas: number;
  rango: {
    fecha_inicio: string;
    fecha_fin: string;
  };
}

interface AlertasFaltasPanelProps {
  periodoId: number;
  mes: number;
  anio: number;
  className?: string;
}

export function AlertasFaltasPanel({
  periodoId,
  mes,
  anio,
  className,
}: AlertasFaltasPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertas, setAlertas] = useState<AlertasFaltasResponse | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Inicializar fechas con el rango del periodo actual
  useEffect(() => {
    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0);
    setFechaInicio(inicioMes.toISOString().split('T')[0]);
    setFechaFin(finMes.toISOString().split('T')[0]);
  }, [mes, anio]);

  const fetchAlertas = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      const response = await api.get<AlertasFaltasResponse>(
        `/tareo/alertas-faltas?${params.toString()}`
      );
      setAlertas(response);

      // Abrir automáticamente si hay alertas
      if (response.total > 0) {
        setOpen(true);
      }
    } catch (error: any) {
      console.error('Error fetching alertas:', error);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  // Cargar alertas cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchAlertas();
    }
  }, [fetchAlertas, fechaInicio, fechaFin]);

  const handleUpdateRango = () => {
    fetchAlertas();
    setConfigDialogOpen(false);
    toast.success('Rango de fechas actualizado');
  };

  // Si no hay alertas, no mostrar nada
  if (!alertas || alertas.total === 0) {
    return null;
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen} className={className}>
        <Card className="border-orange-200 bg-orange-50/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-orange-100/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                      Alertas de Pre-Aviso de Despido
                      <Badge variant="destructive" className="text-xs">
                        {alertas.total} empleado{alertas.total > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Empleados con {alertas.minimo_faltas}+ faltas requieren carta de pre-aviso
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfigDialogOpen(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Cambiar rango
                  </Button>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-orange-600 transition-transform',
                      open && 'rotate-180'
                    )}
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  {alertas.empleados.map((empleado) => (
                    <div
                      key={empleado.empleado_id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                          {empleado.foto_url ? (
                            <img
                              src={empleado.foto_url}
                              alt={empleado.nombre_completo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {empleado.nombre_completo}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono">{empleado.numero_documento}</span>
                            {empleado.area && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {empleado.area}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="destructive"
                          className="text-sm font-bold px-3"
                        >
                          {empleado.cantidad_faltas} faltas
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            // Navegar al banco de documentos del empleado
                            window.open(
                              `/rrhh/empleados/${empleado.empleado_id}/editar?tab=documentos`,
                              '_blank'
                            );
                          }}
                        >
                          <FileWarning className="h-4 w-4 mr-1" />
                          Ir a Documentos
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-orange-600 mt-3 text-center">
                Rango evaluado:{' '}
                {formatDateSafe(alertas.rango.fecha_inicio)} -{' '}
                {formatDateSafe(alertas.rango.fecha_fin)}
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dialog para configurar rango de fechas */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Configurar Rango de Fechas
            </DialogTitle>
            <DialogDescription>
              Selecciona el rango de fechas para evaluar las faltas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRango}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
