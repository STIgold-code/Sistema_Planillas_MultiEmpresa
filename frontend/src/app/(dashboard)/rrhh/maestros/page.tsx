'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Briefcase, Landmark, MapPin, Building, ClipboardCheck, Megaphone, UserX, Truck, Shirt, Layers, Tag } from 'lucide-react';
import Link from 'next/link';

const maestros = [
  {
    titulo: 'Areas',
    descripcion: 'Gestiona las areas internas de Ermir',
    icono: Building2,
    url: '/rrhh/maestros/areas',
    color: 'text-blue-500',
  },
  {
    titulo: 'Cargos',
    descripcion: 'Gestiona los cargos de la empresa',
    icono: Briefcase,
    url: '/rrhh/maestros/cargos',
    color: 'text-purple-500',
  },
  {
    titulo: 'Clientes',
    descripcion: 'Empresas donde se destaca personal',
    icono: Building,
    url: '/rrhh/maestros/clientes',
    color: 'text-green-500',
  },
  {
    titulo: 'Sedes',
    descripcion: 'Ubicaciones de clientes donde trabajan empleados',
    icono: MapPin,
    url: '/rrhh/maestros/sedes',
    color: 'text-red-500',
  },
  {
    titulo: 'Bancos',
    descripcion: 'Gestiona el catalogo de bancos',
    icono: Landmark,
    url: '/rrhh/maestros/bancos',
    color: 'text-amber-500',
  },
  {
    titulo: 'Tipos de Evaluacion',
    descripcion: 'Tipos de evaluacion para seleccion de personal',
    icono: ClipboardCheck,
    url: '/rrhh/maestros/tipos-evaluacion',
    color: 'text-cyan-500',
  },
  {
    titulo: 'Procedencias',
    descripcion: 'Fuentes de reclutamiento de postulantes',
    icono: Megaphone,
    url: '/rrhh/maestros/procedencias',
    color: 'text-orange-500',
  },
  {
    titulo: 'Tipos de Cese',
    descripcion: 'Tipos de cese para solicitudes de baja de personal',
    icono: UserX,
    url: '/rrhh/maestros/tipos-cese',
    color: 'text-rose-500',
  },
  {
    titulo: 'Proveedores',
    descripcion: 'Proveedores de bienes y servicios del sistema',
    icono: Truck,
    url: '/rrhh/maestros/proveedores',
    color: 'text-teal-500',
  },
  {
    titulo: 'Tipos de Uniforme',
    descripcion: 'Prendas de uniforme y sus tallas',
    icono: Shirt,
    url: '/rrhh/maestros/tipos-uniforme',
    color: 'text-indigo-500',
  },
  {
    titulo: 'Características',
    descripcion: 'Atributos descriptivos que se aplican a las prendas',
    icono: Tag,
    url: '/rrhh/maestros/caracteristicas',
    color: 'text-emerald-500',
  },
  {
    titulo: 'Plantillas de Uniforme',
    descripcion: 'El "uniforme completo" que se aplica a los empleados',
    icono: Layers,
    url: '/rrhh/maestros/plantillas-uniforme',
    color: 'text-fuchsia-500',
  },
];

export default function MaestrosPage() {
  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div>
        <h1 className="text-2xl font-bold">Maestros</h1>
        <p className="text-muted-foreground">Administra los datos maestros del sistema</p>
      </div>

      <div className="flex-1 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {maestros.map((maestro) => (
          <Link key={maestro.url} href={maestro.url}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-2 rounded-lg bg-muted ${maestro.color}`}>
                  <maestro.icono className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{maestro.titulo}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{maestro.descripcion}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
