'use client';

import { useState } from 'react';
import {
  ArrowLeft, Users, FileSpreadsheet, FileDown, Eye,
  Calendar, Building2, MapPin, Loader2, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MOCKUP: Formulario de Generación de Reporte
 * Ruta: /reportes/[tipo]
 *
 * Estética: Corporate Precision
 * - Formulario estructurado con secciones claras
 * - Feedback visual inmediato
 * - Botones de acción con estados
 */

interface FiltroConfig {
  id: string;
  tipo: 'select' | 'date' | 'multiselect';
  label: string;
  placeholder: string;
  opciones?: { value: string; label: string }[];
  icono: React.ElementType;
}

const FILTROS: FiltroConfig[] = [
  {
    id: 'area',
    tipo: 'select',
    label: 'Área',
    placeholder: 'Todas las áreas',
    icono: Building2,
    opciones: [
      { value: '', label: 'Todas las áreas' },
      { value: '1', label: 'Administración' },
      { value: '2', label: 'Sistemas' },
      { value: '3', label: 'Recursos Humanos' },
      { value: '4', label: 'Operaciones' },
      { value: '5', label: 'Ventas' },
    ]
  },
  {
    id: 'sede',
    tipo: 'select',
    label: 'Sede',
    placeholder: 'Todas las sedes',
    icono: MapPin,
    opciones: [
      { value: '', label: 'Todas las sedes' },
      { value: '1', label: 'Lima - Principal' },
      { value: '2', label: 'Arequipa' },
      { value: '3', label: 'Trujillo' },
    ]
  },
  {
    id: 'estado',
    tipo: 'select',
    label: 'Estado',
    placeholder: 'Todos los estados',
    icono: Users,
    opciones: [
      { value: '', label: 'Todos los estados' },
      { value: 'ACTIVO', label: 'Activo' },
      { value: 'PENDIENTE', label: 'Pendiente' },
      { value: 'CESADO', label: 'Cesado' },
    ]
  },
];

type LoadingState = 'idle' | 'preview' | 'excel' | 'pdf';
type SuccessState = null | 'preview' | 'excel' | 'pdf';

export function ReporteFormulario() {
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [success, setSuccess] = useState<SuccessState>(null);

  const handleAction = async (action: 'preview' | 'excel' | 'pdf') => {
    setLoading(action);
    setSuccess(null);

    // Simular carga
    await new Promise(resolve => setTimeout(resolve, 1500));

    setLoading('idle');
    setSuccess(action);

    // Limpiar success después de 2s
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">
                    Maestro de Empleados
                  </h1>
                  <p className="text-sm text-slate-500">
                    Lista completa con datos personales y laborales
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium">
                Excel
              </span>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md font-medium">
                PDF
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Card de Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header del card */}
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="font-semibold text-slate-900">Configurar Filtros</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Selecciona los criterios para generar el reporte
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FILTROS.map((filtro) => {
                const Icon = filtro.icono;
                return (
                  <div key={filtro.id} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Icon className="w-4 h-4 text-slate-400" />
                      {filtro.label}
                    </label>
                    <select
                      value={filtros[filtro.id] || ''}
                      onChange={(e) => setFiltros({ ...filtros, [filtro.id]: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:border-slate-300"
                    >
                      {filtro.opciones?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Fechas */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Rango de Fechas (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">Fecha Ingreso Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">Fecha Ingreso Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Info de registros estimados */}
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">~234</span> registros estimados
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-3">
                {/* Vista Previa */}
                <button
                  onClick={() => handleAction('preview')}
                  disabled={loading !== 'idle'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'border border-slate-200 bg-white text-slate-700',
                    'hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    success === 'preview' && 'border-green-500 bg-green-50 text-green-600'
                  )}
                >
                  {loading === 'preview' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : success === 'preview' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Vista Previa
                </button>

                {/* Descargar Excel */}
                <button
                  onClick={() => handleAction('excel')}
                  disabled={loading !== 'idle'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
                    'hover:bg-emerald-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    success === 'excel' && 'bg-green-600'
                  )}
                >
                  {loading === 'excel' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : success === 'excel' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  Excel
                </button>

                {/* Descargar PDF */}
                <button
                  onClick={() => handleAction('pdf')}
                  disabled={loading !== 'idle'}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                    'bg-red-600 text-white shadow-md shadow-red-500/25',
                    'hover:bg-red-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    success === 'pdf' && 'bg-green-600'
                  )}
                >
                  {loading === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : success === 'pdf' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
          <p className="text-sm text-indigo-700">
            <strong>Tip:</strong> Usa &quot;Vista Previa&quot; para verificar los datos antes de descargar el archivo completo.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReporteFormulario;
