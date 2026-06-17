'use client';

import { useState } from 'react';
import {
  X, FileSpreadsheet, FileDown, ChevronLeft, ChevronRight,
  Download, Users, Mail, Building2, Calendar, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MOCKUP: Modal de Vista Previa del Reporte
 *
 * Estética: Corporate Precision
 * - Tabla con datos de muestra
 * - Paginación y contador de registros
 * - Botones de descarga prominentes
 */

interface EmpleadoPreview {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  area: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'Activo' | 'Baja' | 'Vacaciones';
}

const DATOS_MUESTRA: EmpleadoPreview[] = [
  { id: 1, codigo: 'EMP-001', nombres: 'Carlos Alberto', apellidos: 'García López', dni: '45678912', email: 'cgarcia@empresa.com', area: 'Sistemas', cargo: 'Desarrollador Senior', fechaIngreso: '15/03/2021', estado: 'Activo' },
  { id: 2, codigo: 'EMP-002', nombres: 'María Elena', apellidos: 'Rodríguez Paz', dni: '41234567', email: 'mrodriguez@empresa.com', area: 'Administración', cargo: 'Analista Contable', fechaIngreso: '01/06/2020', estado: 'Activo' },
  { id: 3, codigo: 'EMP-003', nombres: 'Jorge Luis', apellidos: 'Mendoza Ríos', dni: '43567891', email: 'jmendoza@empresa.com', area: 'Operaciones', cargo: 'Supervisor', fechaIngreso: '10/01/2019', estado: 'Vacaciones' },
  { id: 4, codigo: 'EMP-004', nombres: 'Ana Patricia', apellidos: 'Vega Torres', dni: '46789123', email: 'avega@empresa.com', area: 'Recursos Humanos', cargo: 'Coordinadora RRHH', fechaIngreso: '22/08/2022', estado: 'Activo' },
  { id: 5, codigo: 'EMP-005', nombres: 'Roberto Carlos', apellidos: 'Fernández Díaz', dni: '42345678', email: 'rfernandez@empresa.com', area: 'Ventas', cargo: 'Ejecutivo Comercial', fechaIngreso: '05/11/2021', estado: 'Activo' },
  { id: 6, codigo: 'EMP-006', nombres: 'Lucía Mercedes', apellidos: 'Castillo Herrera', dni: '44567891', email: 'lcastillo@empresa.com', area: 'Sistemas', cargo: 'QA Engineer', fechaIngreso: '18/04/2023', estado: 'Activo' },
  { id: 7, codigo: 'EMP-007', nombres: 'Fernando José', apellidos: 'Paredes Soto', dni: '47891234', email: 'fparedes@empresa.com', area: 'Administración', cargo: 'Asistente Administrativo', fechaIngreso: '30/07/2020', estado: 'Baja' },
  { id: 8, codigo: 'EMP-008', nombres: 'Carmen Rosa', apellidos: 'Huamán Quispe', dni: '40123456', email: 'chuaman@empresa.com', area: 'Operaciones', cargo: 'Operador Logístico', fechaIngreso: '12/02/2022', estado: 'Activo' },
];

const COLUMNAS = [
  { key: 'codigo', label: 'Código', width: 'w-24' },
  { key: 'nombres', label: 'Nombres', width: 'w-36' },
  { key: 'apellidos', label: 'Apellidos', width: 'w-40' },
  { key: 'dni', label: 'DNI', width: 'w-24' },
  { key: 'email', label: 'Email', width: 'w-48' },
  { key: 'area', label: 'Área', width: 'w-32' },
  { key: 'cargo', label: 'Cargo', width: 'w-40' },
  { key: 'fechaIngreso', label: 'F. Ingreso', width: 'w-28' },
  { key: 'estado', label: 'Estado', width: 'w-24' },
];

type LoadingState = 'idle' | 'excel' | 'pdf';

interface ReportePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportePreviewModal({ isOpen, onClose }: ReportePreviewModalProps) {
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [currentPage, setCurrentPage] = useState(1);

  const totalRegistros = 234;
  const registrosPorPagina = 50;
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

  const handleDownload = async (formato: 'excel' | 'pdf') => {
    setLoading(formato);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Vista Previa: Maestro de Empleados
              </h2>
              <p className="text-sm text-slate-500">
                Filtros: Área: Sistemas • Estado: Activo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Mostrando</span>
            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {Math.min(registrosPorPagina, totalRegistros)}
            </span>
            <span className="text-slate-500">de</span>
            <span className="font-semibold text-slate-900">{totalRegistros}</span>
            <span className="text-slate-500">registros</span>
          </div>

          {/* Botones de descarga */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownload('excel')}
              disabled={loading !== 'idle'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
                'hover:bg-emerald-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Descargar Excel
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={loading !== 'idle'}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'bg-red-600 text-white shadow-md shadow-red-500/25',
                'hover:bg-red-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Descargar PDF
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200">
              <tr>
                {COLUMNAS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
                      col.width
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DATOS_MUESTRA.map((empleado, index) => (
                <tr
                  key={empleado.id}
                  className={cn(
                    'hover:bg-indigo-50/50 transition-colors',
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-600">
                      {empleado.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-900">{empleado.nombres}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">{empleado.apellidos}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-600">{empleado.dni}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      {empleado.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {empleado.area}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700">{empleado.cargo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {empleado.fechaIngreso}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={empleado.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer con paginación */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Página <span className="font-medium text-slate-700">{currentPage}</span> de{' '}
            <span className="font-medium text-slate-700">{totalPaginas}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                'border border-slate-200 bg-white text-slate-600',
                'hover:border-indigo-300 hover:text-indigo-600',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-all',
                    currentPage === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {page}
                </button>
              ))}
              <span className="px-1 text-slate-400">...</span>
              <button
                onClick={() => setCurrentPage(totalPaginas)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-all',
                  currentPage === totalPaginas
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {totalPaginas}
              </button>
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPaginas, currentPage + 1))}
              disabled={currentPage === totalPaginas}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                'border border-slate-200 bg-white text-slate-600',
                'hover:border-indigo-300 hover:text-indigo-600',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600'
              )}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botón descarga rápida */}
          <button
            onClick={() => handleDownload('excel')}
            disabled={loading !== 'idle'}
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <Download className="w-4 h-4" />
            Descargar todo ({totalRegistros} registros)
          </button>
        </div>
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: 'Activo' | 'Baja' | 'Vacaciones' }) {
  const config = {
    Activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Baja: 'bg-red-50 text-red-700 border-red-200',
    Vacaciones: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border',
      config[estado]
    )}>
      {estado}
    </span>
  );
}

export default ReportePreviewModal;
