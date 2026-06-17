'use client';

import { useState } from 'react';
import { ReportesCatalogo } from './ReportesCatalogo';
import { ReporteFormulario } from './ReporteFormulario';
import { ReportePreviewModal } from './ReportePreviewModal';

/**
 * DEMO: Página de demostración de los mockups
 *
 * Muestra los 3 componentes del módulo de reportes:
 * 1. ReportesCatalogo - Grid de reportes disponibles
 * 2. ReporteFormulario - Formulario con filtros
 * 3. ReportePreviewModal - Modal de vista previa
 */

export function ReportesMockupDemo() {
  const [vista, setVista] = useState<'catalogo' | 'formulario'>('catalogo');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navbar de demo */}
      <div className="bg-indigo-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium bg-amber-500 text-amber-900 px-2 py-0.5 rounded">
            MOCKUP
          </span>
          <span className="font-semibold">Módulo de Reportes - Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVista('catalogo')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              vista === 'catalogo'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            1. Catálogo
          </button>
          <button
            onClick={() => setVista('formulario')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              vista === 'formulario'
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            2. Formulario
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-3 py-1.5 text-sm rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            3. Preview Modal
          </button>
        </div>
      </div>

      {/* Contenido */}
      {vista === 'catalogo' ? (
        <ReportesCatalogo />
      ) : (
        <ReporteFormulario />
      )}

      {/* Modal de Preview */}
      <ReportePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}

export { ReportesCatalogo } from './ReportesCatalogo';
export { ReporteFormulario } from './ReporteFormulario';
export { ReportePreviewModal } from './ReportePreviewModal';

export default ReportesMockupDemo;
