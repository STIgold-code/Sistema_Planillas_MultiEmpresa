'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface JsonDiffViewerProps {
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  className?: string;
}

type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

interface FieldChange {
  field: string;
  type: ChangeType;
  oldValue: any;
  newValue: any;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') {
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('es-PE');
        }
      } catch {
        // Not a valid date
      }
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function getFieldLabel(field: string): string {
  // Convert snake_case to readable format
  const labels: Record<string, string> = {
    estado: 'Estado',
    motivo: 'Motivo',
    motivo_rechazo: 'Motivo de Rechazo',
    motivo_cancelacion: 'Motivo de Cancelación',
    dias_solicitados: 'Días Solicitados',
    dias_aprobados: 'Días Aprobados',
    fecha_inicio: 'Fecha Inicio',
    fecha_fin: 'Fecha Fin',
    fecha_inicio_aprobada: 'Fecha Inicio Aprobada',
    fecha_fin_aprobada: 'Fecha Fin Aprobada',
    periodo_id: 'ID Período',
    empleado_id: 'ID Empleado',
    tiempo_limite_minutos: 'Tiempo Límite (min)',
    incluye_venta: 'Incluye Venta',
    dias_venta: 'Días Vendidos',
    sueldo_base: 'Sueldo Base',
    cuenta_bancaria: 'Cuenta Bancaria',
    cci: 'CCI',
    afp_id: 'AFP',
    eps_id: 'EPS',
    _descripcion: 'Descripción',
  };

  return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function ChangeIndicator({ type }: { type: ChangeType }) {
  if (type === 'added') return <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-green-500" title="Agregado" />;
  if (type === 'removed') return <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-red-500" title="Eliminado" />;
  if (type === 'modified') return <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-amber-500" title="Modificado" />;
  return null;
}

export function JsonDiffViewer({ before, after, className }: JsonDiffViewerProps) {
  const changes = useMemo<FieldChange[]>(() => {
    const result: FieldChange[] = [];
    const allKeys = new Set<string>();

    // Collect all keys, excluding internal fields
    const excludeFields = ['_descripcion'];

    if (before) {
      Object.keys(before).forEach((k) => {
        if (!excludeFields.includes(k)) allKeys.add(k);
      });
    }
    if (after) {
      Object.keys(after).forEach((k) => {
        if (!excludeFields.includes(k)) allKeys.add(k);
      });
    }

    allKeys.forEach((field) => {
      const oldValue = before?.[field];
      const newValue = after?.[field];

      const oldExists = before && field in before;
      const newExists = after && field in after;

      if (!oldExists && newExists) {
        result.push({ field, type: 'added', oldValue: null, newValue });
      } else if (oldExists && !newExists) {
        result.push({ field, type: 'removed', oldValue, newValue: null });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        result.push({ field, type: 'modified', oldValue, newValue });
      }
      // Skip unchanged fields to keep the view clean
    });

    return result;
  }, [before, after]);

  if (changes.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground italic p-4 bg-muted/50 rounded-lg', className)}>
        No hay cambios para mostrar
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Desktop: tabla clásica */}
      <table className="hidden sm:table w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left font-medium px-3 py-2 border-b">Campo</th>
            <th className="text-left font-medium px-3 py-2 border-b">Antes</th>
            <th className="text-left font-medium px-3 py-2 border-b">Después</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr
              key={change.field}
              className={cn(
                'border-b last:border-b-0',
                change.type === 'added' && 'bg-green-50',
                change.type === 'removed' && 'bg-red-50',
                change.type === 'modified' && 'bg-amber-50',
              )}
            >
              <td className="px-3 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <ChangeIndicator type={change.type} />
                  {getFieldLabel(change.field)}
                </div>
              </td>
              <td className={cn(
                'px-3 py-2 font-mono text-xs break-all',
                change.type === 'removed' && 'text-red-700',
                change.type === 'modified' && 'text-muted-foreground line-through',
              )}>
                {formatValue(change.oldValue)}
              </td>
              <td className={cn(
                'px-3 py-2 font-mono text-xs break-all',
                change.type === 'added' && 'text-green-700',
                change.type === 'modified' && 'text-amber-700 font-semibold',
              )}>
                {formatValue(change.newValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: layout apilado */}
      <div className="sm:hidden divide-y">
        {changes.map((change) => (
          <div
            key={change.field}
            className={cn(
              'px-3 py-3 space-y-1',
              change.type === 'added' && 'bg-green-50',
              change.type === 'removed' && 'bg-red-50',
              change.type === 'modified' && 'bg-amber-50',
            )}
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <ChangeIndicator type={change.type} />
              {getFieldLabel(change.field)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="block text-[10px] font-sans font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Antes
                </span>
                <span className={cn(
                  'break-all',
                  change.type === 'removed' && 'text-red-700',
                  change.type === 'modified' && 'text-muted-foreground line-through',
                )}>
                  {formatValue(change.oldValue)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-sans font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  Después
                </span>
                <span className={cn(
                  'break-all',
                  change.type === 'added' && 'text-green-700',
                  change.type === 'modified' && 'text-amber-700 font-semibold',
                )}>
                  {formatValue(change.newValue)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
