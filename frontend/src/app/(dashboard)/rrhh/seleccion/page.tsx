'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, UserCheck, UserX, Loader2 } from 'lucide-react';

interface Stats {
  vacantes: { total: number; publicadas: number };
  postulantes: { total: number; aprobados: number; rechazados: number };
}

export default function SeleccionPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [vacantesRes, postulantesRes] = await Promise.all([
          api.get<{ total: number; publicadas: number; por_estado: Record<string, number> }>('/vacantes/resumen'),
          api.get<{ total: number; aprobados: number; rechazados: number; por_estado: Record<string, number> }>('/postulantes/resumen'),
        ]);

        setStats({
          vacantes: {
            total: vacantesRes.total,
            publicadas: vacantesRes.publicadas,
          },
          postulantes: {
            total: postulantesRes.total,
            aprobados: postulantesRes.aprobados,
            rechazados: postulantesRes.rechazados,
          },
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      titulo: 'Vacantes',
      descripcion: 'Gestionar puestos de trabajo',
      url: '/rrhh/seleccion/vacantes',
      icono: Briefcase,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      stats: stats ? `${stats.vacantes.publicadas} abiertas de ${stats.vacantes.total}` : '-',
    },
    {
      titulo: 'Postulantes',
      descripcion: 'Gestionar candidatos',
      url: '/rrhh/seleccion/postulantes',
      icono: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      stats: stats ? `${stats.postulantes.total} registrados` : '-',
    },
    {
      titulo: 'Aprobados',
      descripcion: 'Candidatos seleccionados',
      url: '/rrhh/seleccion/postulantes?estado=APROBADO',
      icono: UserCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      stats: stats ? `${stats.postulantes.aprobados} aprobados` : '-',
    },
    {
      titulo: 'Rechazados',
      descripcion: 'Candidatos no seleccionados',
      url: '/rrhh/seleccion/postulantes?estado=RECHAZADO',
      icono: UserX,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      stats: stats ? `${stats.postulantes.rechazados} rechazados` : '-',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Seleccion de Personal</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Gestiona vacantes y procesos de seleccion</p>
      </div>

      <div className="grid gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.titulo} href={card.url}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.titulo}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icono className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold">{card.stats}</div>
                <CardDescription>{card.descripcion}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
