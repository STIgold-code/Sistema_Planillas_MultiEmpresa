'use client';

import { useState } from 'react';
import {
  Users, FileText, Clock, CalendarDays, Briefcase,
  TrendingUp, FileSpreadsheet, FileDown, History,
  ChevronRight, Search, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MOCKUP: Catálogo de Reportes
 * Ruta: /reportes
 *
 * Estética: Corporate Precision
 * - Tipografía: Geist (sistema) con pesos contrastantes
 * - Colores: Slate base + Indigo accents
 * - Layout: Grid asimétrico con cards de altura variable
 */

interface Reporte {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  formatos: ('excel' | 'pdf')[];
  icono: React.ElementType;
  popular?: boolean;
}

const REPORTES: Reporte[] = [
  // Empleados
  { id: 'emp-general', nombre: 'Maestro de Empleados', descripcion: 'Lista completa con datos personales y laborales', categoria: 'Empleados', formatos: ['excel', 'pdf'], icono: Users, popular: true },
  { id: 'emp-cumple', nombre: 'Cumpleaños del Mes', descripcion: 'Empleados que cumplen años', categoria: 'Empleados', formatos: ['excel', 'pdf'], icono: CalendarDays },
  { id: 'emp-docs', nombre: 'Estado Documentación', descripcion: 'Documentos pendientes y vencidos', categoria: 'Empleados', formatos: ['excel'], icono: FileText },
  // Planilla
  { id: 'pla-mensual', nombre: 'Nómina Mensual', descripcion: 'Detalle de haberes y descuentos', categoria: 'Planilla', formatos: ['excel', 'pdf'], icono: FileSpreadsheet, popular: true },
  { id: 'pla-aportes', nombre: 'Aportes Empleador', descripcion: 'EsSalud, SCTR, Vida Ley', categoria: 'Planilla', formatos: ['excel'], icono: TrendingUp },
  { id: 'pla-banco', nombre: 'Archivo Bancario', descripcion: 'TXT para abono de haberes', categoria: 'Planilla', formatos: ['excel'], icono: Briefcase },
  // Tareo
  { id: 'tar-resumen', nombre: 'Resumen Asistencia', descripcion: 'Días trabajados, faltas, permisos', categoria: 'Tareo', formatos: ['excel', 'pdf'], icono: Clock, popular: true },
  { id: 'tar-alertas', nombre: 'Alertas de Tareo', descripcion: 'Empleados con 3+ faltas', categoria: 'Tareo', formatos: ['excel'], icono: Clock },
  // Contratos
  { id: 'con-vencer', nombre: 'Contratos por Vencer', descripcion: 'Próximos a expirar en N días', categoria: 'Contratos', formatos: ['excel', 'pdf'], icono: FileText },
  { id: 'con-vigentes', nombre: 'Contratos Vigentes', descripcion: 'Todos los contratos activos', categoria: 'Contratos', formatos: ['excel'], icono: FileText },
  // Vacaciones
  { id: 'vac-saldos', nombre: 'Saldos de Vacaciones', descripcion: 'Días pendientes por empleado', categoria: 'Vacaciones', formatos: ['excel', 'pdf'], icono: CalendarDays },
];

const CATEGORIAS = ['Todos', 'Empleados', 'Planilla', 'Tareo', 'Contratos', 'Vacaciones'];

const CATEGORIA_COLORS: Record<string, string> = {
  'Empleados': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Planilla': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Tareo': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Contratos': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Vacaciones': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

export function ReportesCatalogo() {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'historial'>('catalogo');
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const reportesFiltrados = REPORTES.filter(r => {
    const matchCategoria = categoriaActiva === 'Todos' || r.categoria === categoriaActiva;
    const matchBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          r.descripcion.toLowerCase().includes(busqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header con gradiente sutil */}
      <div className="bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Título con icono */}
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/25">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Centro de Reportes
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Genera y descarga reportes en Excel o PDF
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('catalogo')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                activeTab === 'catalogo'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Catálogo
              </span>
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                activeTab === 'historial'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Historial
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'catalogo' ? (
          <>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {/* Búsqueda */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar reportes..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Categorías */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all',
                      categoriaActiva === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de reportes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportesFiltrados.map((reporte, index) => (
                <ReporteCard key={reporte.id} reporte={reporte} index={index} />
              ))}
            </div>

            {/* Empty state */}
            {reportesFiltrados.length === 0 && (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No se encontraron reportes</p>
              </div>
            )}

            {/* Contador */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Mostrando {reportesFiltrados.length} de {REPORTES.length} reportes
              </p>
            </div>
          </>
        ) : (
          <HistorialTab />
        )}
      </div>
    </div>
  );
}

function ReporteCard({ reporte, index }: { reporte: Reporte; index: number }) {
  const Icon = reporte.icono;
  const colorClass = CATEGORIA_COLORS[reporte.categoria] || 'bg-slate-100 text-slate-600';

  return (
    <div
      className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Popular badge */}
      {reporte.popular && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-md">
          Popular
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={cn('p-2.5 rounded-lg border', colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
            {reporte.nombre}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
            {reporte.descripcion}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Categoría */}
        <span className={cn('text-xs font-medium px-2 py-1 rounded-md border', colorClass)}>
          {reporte.categoria}
        </span>

        {/* Formatos */}
        <div className="flex items-center gap-1.5">
          {reporte.formatos.includes('excel') && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
              <FileSpreadsheet className="w-3 h-3" />
              XLS
            </span>
          )}
          {reporte.formatos.includes('pdf') && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
              <FileDown className="w-3 h-3" />
              PDF
            </span>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-5 h-5 text-indigo-500" />
      </div>
    </div>
  );
}

function HistorialTab() {
  const historial = [
    { id: 1, nombre: 'Maestro de Empleados', filtros: 'Área: Sistemas', fecha: '07/02/2026 10:30', formato: 'excel', registros: 234 },
    { id: 2, nombre: 'Nómina Mensual', filtros: 'Enero 2026', fecha: '06/02/2026 15:45', formato: 'pdf', registros: 156 },
    { id: 3, nombre: 'Contratos por Vencer', filtros: '30 días', fecha: '05/02/2026 09:12', formato: 'excel', registros: 12 },
    { id: 4, nombre: 'Saldos de Vacaciones', filtros: 'Todos', fecha: '04/02/2026 14:20', formato: 'excel', registros: 189 },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="font-semibold text-slate-900">Reportes Generados</h2>
        <p className="text-sm text-slate-500">Últimos 30 días</p>
      </div>

      <div className="divide-y divide-slate-100">
        {historial.map((item) => (
          <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={cn(
                'p-2 rounded-lg',
                item.formato === 'excel' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              )}>
                {item.formato === 'excel' ? <FileSpreadsheet className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-medium text-slate-900">{item.nombre}</p>
                <p className="text-sm text-slate-500">{item.filtros} • {item.registros} registros</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{item.fecha}</span>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Regenerar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportesCatalogo;
