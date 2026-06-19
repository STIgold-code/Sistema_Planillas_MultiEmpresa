'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Activity, Users, FileText, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface ResumenItem {
  usuario_id: number;
  accion: string;
  tabla_afectada: string;
  _count: { id: number };
}

interface DashboardData {
  resumen: ResumenItem[];
  totalRegistros: number;
  registrosHoy: number;
  usuariosActivos: number;
}

const ACCION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  LOGIN: 'bg-purple-500',
  LOGOUT: 'bg-gray-500',
  CALCULAR: 'bg-amber-500',
  APROBAR: 'bg-emerald-500',
  RECHAZAR: 'bg-rose-500',
  PAGAR: 'bg-cyan-500',
  ANULAR: 'bg-orange-500',
  CERRAR_PERIODO: 'bg-slate-500',
  REABRIR_PERIODO: 'bg-indigo-500',
  INICIAR_SESION: 'bg-violet-500',
  FINALIZAR_SESION: 'bg-fuchsia-500',
  APROBAR_JEFE: 'bg-teal-500',
  APROBAR_RRHH: 'bg-lime-500',
};

const ACCION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Iniciar Sesión',
  LOGOUT: 'Cerrar Sesión',
  CALCULAR: 'Calcular',
  APROBAR: 'Aprobar',
  RECHAZAR: 'Rechazar',
  PAGAR: 'Pagar',
  ANULAR: 'Anular',
  CERRAR_PERIODO: 'Cerrar Período',
  REABRIR_PERIODO: 'Reabrir Período',
  INICIAR_SESION: 'Iniciar Sesión Tareo',
  FINALIZAR_SESION: 'Finalizar Sesión Tareo',
  APROBAR_JEFE: 'Aprobar (Jefe)',
  APROBAR_RRHH: 'Aprobar (RRHH)',
};

const TABLA_LABELS: Record<string, string> = {
  empleados: 'Empleados',
  contratos: 'Contratos',
  planillas: 'Planillas',
  periodos_tareo: 'Períodos Tareo',
  sesiones_tareo: 'Sesiones Tareo',
  justificaciones_tareo: 'Justificaciones',
  solicitudes_vacaciones: 'Vacaciones',
  vacantes: 'Vacantes',
  postulantes: 'Postulantes',
  users: 'Usuarios',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function AuditoriaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fechaDesde = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const fechaHasta = format(new Date(), 'yyyy-MM-dd');

        // Obtener resumen de actividad
        const resumen = await api.get<ResumenItem[]>(
          `/auditoria/resumen?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
        );

        // Obtener total de registros del último mes
        const totalResponse = await api.get<{ data: any[]; meta: { total: number } }>(
          `/auditoria?limit=1&fecha_desde=${fechaDesde}`
        );

        // Obtener registros de hoy
        const hoy = format(new Date(), 'yyyy-MM-dd');
        const hoyResponse = await api.get<{ data: any[]; meta: { total: number } }>(
          `/auditoria?limit=1&fecha_desde=${hoy}`
        );

        // Calcular usuarios únicos
        const usuariosUnicos = new Set(resumen.map(r => r.usuario_id)).size;

        setData({
          resumen: resumen || [],
          totalRegistros: totalResponse.meta?.total || 0,
          registrosHoy: hoyResponse.meta?.total || 0,
          usuariosActivos: usuariosUnicos,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Procesar datos para visualizaciones
  const accionesPorTipo = data?.resumen.reduce((acc, item) => {
    acc[item.accion] = (acc[item.accion] || 0) + item._count.id;
    return acc;
  }, {} as Record<string, number>) || {};

  const modulosPorActividad = data?.resumen.reduce((acc, item) => {
    acc[item.tabla_afectada] = (acc[item.tabla_afectada] || 0) + item._count.id;
    return acc;
  }, {} as Record<string, number>) || {};

  const maxAcciones = Math.max(...Object.values(accionesPorTipo), 1);
  const maxModulos = Math.max(...Object.values(modulosPorActividad), 1);

  // Ordenar por cantidad
  const accionesOrdenadas = Object.entries(accionesPorTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const modulosOrdenados = Object.entries(modulosPorActividad)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/configuracion/auditoria">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Dashboard de Actividad
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Resumen de los últimos 30 días
          </p>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total de Registros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalRegistros.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.registrosHoy.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios Activos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.usuariosActivos || 0}</p>
            <p className="text-xs text-muted-foreground">Con actividad registrada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tipos de Acción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{Object.keys(accionesPorTipo).length}</p>
            <p className="text-xs text-muted-foreground">Acciones diferentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acciones por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Acción</CardTitle>
            <CardDescription>Cantidad de operaciones por tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accionesOrdenadas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos disponibles
              </p>
            ) : (
              accionesOrdenadas.map(([accion, count]) => (
                <div key={accion} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${ACCION_COLORS[accion] || 'bg-gray-400'}`} />
                      {ACCION_LABELS[accion] || accion}
                    </span>
                    <span className="font-mono font-medium">{count.toLocaleString()}</span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={maxAcciones}
                    color={ACCION_COLORS[accion] || 'bg-gray-400'}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Módulos más modificados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Módulos Más Activos</CardTitle>
            <CardDescription>Tablas con más operaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {modulosOrdenados.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos disponibles
              </p>
            ) : (
              modulosOrdenados.map(([tabla, count], index) => {
                const colors = [
                  'bg-blue-500',
                  'bg-emerald-500',
                  'bg-violet-500',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-cyan-500',
                  'bg-indigo-500',
                  'bg-teal-500',
                ];
                return (
                  <div key={tabla} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                        {TABLA_LABELS[tabla] || tabla}
                      </span>
                      <span className="font-mono font-medium">{count.toLocaleString()}</span>
                    </div>
                    <ProgressBar
                      value={count}
                      max={maxModulos}
                      color={colors[index % colors.length]}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link al listado completo */}
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/configuracion/auditoria">
            Ver todos los registros
          </Link>
        </Button>
      </div>
    </div>
  );
}
