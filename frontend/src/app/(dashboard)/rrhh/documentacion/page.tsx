'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  FileCheck,
  FileX,
  FileClock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Users,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateSafe } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface DashboardData {
  total_empleados: number;
  estadisticas: {
    COMPLETO: number;
    INCOMPLETO: number;
    PENDIENTE: number;
    VENCIDO: number;
  };
  porcentaje_cumplimiento: number;
  documentos_vencidos: number;
  documentos_por_vencer_30_dias: number;
  alertas: AlertaDocumento[];
}

interface AlertaDocumento {
  id: number;
  fecha_vencimiento: string;
  estado: 'PENDIENTE' | 'POR_VENCER';
  dias_restantes: number;
  empleado: {
    id: number;
    numero_documento: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    area?: { nombre: string };
  };
  tipo_documento_empleado?: { nombre: string };
}

export default function DocumentacionDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await api.get<DashboardData>('/empleados/documentacion/dashboard');
      setData(response);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      const response = await api.post<{ actualizados: number }>('/empleados/documentacion/recalcular');
      toast.success(`Se actualizaron ${response.actualizados} empleados`);
      fetchDashboard();
    } catch (error) {
      console.error('Error recalculando:', error);
      toast.error('Error al recalcular estados');
    } finally {
      setRecalculando(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    return formatDateSafe(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { estadisticas, porcentaje_cumplimiento, alertas, total_empleados } = data;

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Documentacion</h1>
          <p className="text-sm text-muted-foreground">
            Estado de cumplimiento de documentacion de empleados
          </p>
        </div>
        <Button onClick={handleRecalcular} disabled={recalculando} variant="outline">
          {recalculando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Recalcular Estados
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_empleados}</div>
            <p className="text-xs text-muted-foreground">Empleados activos</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completos</CardTitle>
            <FileCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{estadisticas.COMPLETO}</div>
            <p className="text-xs text-muted-foreground">
              {porcentaje_cumplimiento}% de cumplimiento
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incompletos</CardTitle>
            <FileClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{estadisticas.INCOMPLETO}</div>
            <p className="text-xs text-muted-foreground">Faltan documentos</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <FileX className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{estadisticas.PENDIENTE}</div>
            <p className="text-xs text-muted-foreground">Sin documentos</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{estadisticas.VENCIDO}</div>
            <p className="text-xs text-muted-foreground">Documentos vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cumplimiento General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progreso</span>
              <span className="font-medium">{porcentaje_cumplimiento}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-3 rounded-full bg-green-500 transition-all"
                style={{ width: `${porcentaje_cumplimiento}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de documentos */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas de Vencimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertas.map((alerta) => (
                  <TableRow
                    key={alerta.id}
                    className={alerta.estado === 'PENDIENTE' ? 'bg-red-50' : 'bg-amber-50'}
                  >
                    <TableCell className="font-medium">
                      {alerta.empleado.apellido_paterno} {alerta.empleado.apellido_materno},{' '}
                      {alerta.empleado.nombres}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={alerta.empleado.area?.nombre || undefined}>
                      {alerta.empleado.area?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[180px] truncate" title={alerta.tipo_documento_empleado?.nombre || undefined}>
                      {alerta.tipo_documento_empleado?.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(alerta.fecha_vencimiento)}</TableCell>
                    <TableCell>
                      {alerta.estado === 'PENDIENTE' ? (
                        <Badge variant="destructive">Vencido</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          {alerta.dias_restantes} dias
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/rrhh/empleados/${alerta.empleado.id}`)}
                        title="Ver empleado"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No hay alertas de vencimiento
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
