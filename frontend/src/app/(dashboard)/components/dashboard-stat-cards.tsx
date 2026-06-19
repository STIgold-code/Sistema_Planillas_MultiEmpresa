'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertCircle, AlertTriangle, ShieldAlert, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '../useDashboard';

interface Props {
  stats: DashboardStats;
}

export function DashboardStatCards({ stats }: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);

  const alertCards = [
    {
      titulo: 'Empleados Pendientes',
      valor: stats.contratosVencidos,
      descripcion: 'Requieren accion',
      icono: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200 border-l-red-500',
      titleColor: 'text-red-800',
      valueColor: 'text-red-600',
      descColor: 'text-red-600/70',
    },
    {
      titulo: 'Contratos por Vencer',
      valor: stats.contratosPorVencer,
      descripcion: 'Proximos 30 dias',
      icono: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      border: 'border-amber-200 border-l-amber-500',
      titleColor: 'text-amber-800',
      valueColor: 'text-amber-600',
      descColor: 'text-amber-600/70',
    },
    {
      titulo: 'Solicitudes de Cese',
      valor: stats.solicitudesCesePendientes,
      descripcion: 'Pendientes de aprobacion',
      icono: ShieldAlert,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      border: 'border-orange-200 border-l-orange-500',
      titleColor: 'text-orange-800',
      valueColor: 'text-orange-600',
      descColor: 'text-orange-600/70',
    },
  ];

  const infoCards = [
    {
      titulo: 'Total Empleados',
      valor: stats.totalEmpleados,
      valorStr: stats.totalEmpleados.toString(),
      descripcion: 'Empleados activos',
      icono: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      titulo: 'Empleados Cesados',
      valor: stats.empleadosCesados,
      valorStr: stats.empleadosCesados.toString(),
      descripcion: 'Estado CESADO',
      icono: UserX,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
    },
    {
      titulo: 'Planilla Mes',
      valor: stats.planillaMes ?? null,
      valorStr: stats.planillaMes != null ? formatCurrency(stats.planillaMes) : '-',
      descripcion: stats.mesActual || '',
      icono: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      titulo: 'Ausencias Mes',
      valor: stats.ausenciasMes,
      valorStr: stats.ausenciasMes.toString(),
      descripcion: 'Total faltas del mes',
      icono: UserX,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
    {
      titulo: 'Ausencias Hoy',
      valor: stats.ausenciasHoy,
      valorStr: stats.ausenciasHoy.toString(),
      descripcion: 'Faltas del dia',
      icono: UserX,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  return (
    <>
      {/* Alertas */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alertas</p>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {alertCards.map((stat) => (
            <Card key={stat.titulo} className={cn('border-l-[3px] py-0', stat.border)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className={cn('text-xs font-medium', stat.titleColor)}>
                  {stat.titulo}
                </CardTitle>
                <div className={`rounded-full p-1 ${stat.bg}`}>
                  <stat.icono className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={cn('text-xl font-bold leading-tight', stat.valueColor)}>{stat.valor}</div>
                <p className={cn('text-[11px] leading-tight mt-0.5', stat.descColor)}>{stat.descripcion}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumen</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {infoCards.map((stat) => (
            <Card key={stat.titulo} className="py-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                <CardTitle className="text-xs font-medium">{stat.titulo}</CardTitle>
                <div className={cn('rounded-full p-1', stat.bg, stat.valor === 0 && 'opacity-40')}>
                  <stat.icono className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={cn('text-xl font-bold leading-tight', stat.valor === 0 ? 'text-muted-foreground/40' : 'text-foreground')}>
                  {stat.valorStr}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{stat.descripcion}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
