'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDateSafe } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Loader2,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  resumen: {
    solicitudes_pendientes_jefe: number;
    solicitudes_pendientes_rrhh: number;
    en_goce_actualmente: number;
    periodos_por_vencer: number;
    triple_vacacional_pendiente: number;
  };
  alertas: {
    periodos_por_vencer: any[];
    triple_vacacional: any[];
  };
  solicitudes_recientes: any[];
}

const estadoBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDIENTE_JEFE: 'outline',
  PENDIENTE_RRHH: 'secondary',
  APROBADA: 'default',
  EN_GOCE: 'default',
  GOZADA: 'secondary',
  RECHAZADA: 'destructive',
  CANCELADA: 'destructive',
};

const estadoLabels: Record<string, string> = {
  PENDIENTE_JEFE: 'Pendiente Jefe',
  PENDIENTE_RRHH: 'Pendiente RRHH',
  APROBADA: 'Aprobada',
  EN_GOCE: 'En Goce',
  GOZADA: 'Gozada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function VacacionesPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get<DashboardData>('/vacaciones/dashboard');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Vacaciones</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las solicitudes y períodos vacacionales
          </p>
        </div>
        <Button onClick={() => router.push('/rrhh/vacaciones/solicitudes/nueva')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/solicitudes?estado=PENDIENTE_JEFE')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Jefe</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{data?.resumen.solicitudes_pendientes_jefe || 0}</div>
            <p className="text-xs text-muted-foreground">Esperando aprobación</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/solicitudes?estado=PENDIENTE_RRHH')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes RRHH</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{data?.resumen.solicitudes_pendientes_rrhh || 0}</div>
            <p className="text-xs text-muted-foreground">Validación final</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Goce</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{data?.resumen.en_goce_actualmente || 0}</div>
            <p className="text-xs text-muted-foreground">Empleados de vacaciones</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/periodos?alerta=vencimiento')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{data?.resumen.periodos_por_vencer || 0}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 días</p>
          </CardContent>
        </Card>

        <Card className={data?.resumen.triple_vacacional_pendiente ? 'border-red-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triple Vacacional</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600">{data?.resumen.triple_vacacional_pendiente || 0}</div>
            <p className="text-xs text-muted-foreground">Pendientes de pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticas */}
      {(data?.alertas.periodos_por_vencer.length || 0) > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas - Períodos por Vencer
            </CardTitle>
            <CardDescription>
              Empleados con vacaciones pendientes que vencen pronto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.alertas.periodos_por_vencer.slice(0, 5).map((periodo: any) => (
                <div
                  key={periodo.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {periodo.empleado.nombres} {periodo.empleado.apellido_paterno}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {periodo.dias_pendientes} días pendientes - Vence:{' '}
                      {formatDateSafe(periodo.fecha_limite_goce)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/rrhh/vacaciones/solicitudes/nueva?empleado=${periodo.empleado_id}`)}
                  >
                    Registrar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Triple Vacacional */}
      {(data?.alertas.triple_vacacional.length || 0) > 0 && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Triple Vacacional Generado
            </CardTitle>
            <CardDescription>
              Empleados con períodos vencidos que requieren pago de triple vacacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.alertas.triple_vacacional.map((periodo: any) => (
                <div
                  key={periodo.id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {periodo.empleado.nombres} {periodo.empleado.apellido_paterno}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {periodo.dias_pendientes} días - Sueldo: S/. {periodo.empleado.sueldo_base}
                    </p>
                  </div>
                  <Badge variant="destructive">Pendiente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Solicitudes Recientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Solicitudes Recientes</CardTitle>
            <CardDescription>Últimas solicitudes de vacaciones registradas</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/rrhh/vacaciones/solicitudes')}
          >
            Ver todas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[70px] text-center bg-slate-100">ID</TableHead>
                <TableHead className="min-w-[150px]">Empleado</TableHead>
                <TableHead className="hidden md:table-cell min-w-[150px]">Fechas</TableHead>
                <TableHead className="min-w-[100px]">Días</TableHead>
                <TableHead className="min-w-[100px]">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.solicitudes_recientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay solicitudes recientes
                  </TableCell>
                </TableRow>
              ) : (
                data?.solicitudes_recientes.map((solicitud: any) => (
                  <TableRow
                    key={solicitud.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/rrhh/vacaciones/solicitudes/${solicitud.id}`)}
                  >
                    <TableCell className="font-mono text-sm text-center text-slate-700 font-semibold bg-slate-100">
                      {solicitud.empleado_id}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {solicitud.empleado.nombres} {solicitud.empleado.apellido_paterno}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDateSafe(solicitud.fecha_inicio_solicitada)} -{' '}
                      {formatDateSafe(solicitud.fecha_fin_solicitada)}
                    </TableCell>
                    <TableCell className="text-sm">{solicitud.dias_solicitados}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={estadoBadgeVariant[solicitud.estado]}>
                        {estadoLabels[solicitud.estado]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <div className="flex-1 grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/solicitudes')}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solicitudes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gestionar solicitudes de vacaciones
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/periodos')}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Períodos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ver saldos y períodos por empleado
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/rrhh/vacaciones/configuracion')}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Parámetros y reglas de vacaciones
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
