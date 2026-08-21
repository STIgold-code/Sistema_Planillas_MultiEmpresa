'use client';

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDateSafe } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { esPeriodoCalendario, etiquetaDiaMes, etiquetaFechaCompleta, fechaDeDia } from '@/lib/ventana-periodo';
import { TareoGrillaEmpleado, TareoGrillaResponse, DiasConJustificacion } from '@/types';
import type { CeldaModificada, CeldaPos, RangoRectangular } from '../useTareoDetalle';
import { pideMinutos } from '../useTareoDetalle';

/** Marcacion elegida que espera sus minutos antes de confirmarse. */
interface TipoMarcacionPendiente {
  id: number;
  codigo: string;
}

/**
 * Ocho horas. Mas que una jornada completa ya no es tardanza ni permiso
 * parcial: es una inasistencia y se registra con su propio codigo.
 */
const MINUTOS_MAXIMOS = 480;

/** Atajos frecuentes, para no tipear los casos de siempre. */
const MINUTOS_SUGERIDOS = [15, 30, 60, 120];

interface TareoGrillaProps {
  data: TareoGrillaResponse;
  diasFiltrados: number[];
  empleadosFiltrados: TareoGrillaEmpleado[];
  cambiosPendientes: Map<string, CeldaModificada>;
  celdaActiva: { tareoId: number; dia: number } | null;
  rangoInicio: CeldaPos | null;
  rangoSeleccionado: RangoRectangular | null;
  diasConJustificacion: DiasConJustificacion;
  parentRef: React.RefObject<HTMLDivElement | null>;
  onCeldaClick: (tareoId: number, dia: number, empleadoIndex: number, event: React.MouseEvent) => void;
  onColumnHeaderClick: (dia: number) => void;
  onCeldaActiveClose: () => void;
  onSelectMarcacion: (empleado: TareoGrillaEmpleado, dia: number, tipoId: number | null, minutos?: number) => void;
  onOpenJustificacion: (tareoId: number, empleadoId: number, nombre: string, dia: number) => void;
  onOpenHistorialDrawer: (empleadoId: number, nombre: string, tareoId: number) => void;
  onVerHistorial: (detalleId: number) => void;
}

export function TareoGrilla({
  data,
  diasFiltrados,
  empleadosFiltrados,
  cambiosPendientes,
  celdaActiva,
  rangoInicio,
  rangoSeleccionado,
  diasConJustificacion,
  parentRef,
  onCeldaClick,
  onColumnHeaderClick,
  onCeldaActiveClose,
  onSelectMarcacion,
  onOpenJustificacion,
  onOpenHistorialDrawer,
  onVerHistorial,
}: TareoGrillaProps) {
  const isReadonly = data.periodo.estado === 'CERRADO' || data.periodo.estado === 'ANULADO';
  const esCalendario = esPeriodoCalendario(data.periodo.fecha_inicio);

  // Marcacion elegida que todavia espera sus minutos. Mientras esta puesta, el
  // popover muestra el paso de minutos en vez de cerrarse: sin el dato el
  // descuento seria cero y la marca no serviria de nada.
  const [tipoPendienteMinutos, setTipoPendienteMinutos] = React.useState<TipoMarcacionPendiente | null>(null);
  const [minutos, setMinutos] = React.useState('');

  const cerrarPasoMinutos = () => {
    setTipoPendienteMinutos(null);
    setMinutos('');
  };

  const confirmarMinutos = (empleado: TareoGrillaEmpleado, dia: number) => {
    if (!tipoPendienteMinutos) return;
    const valor = Number(minutos);
    if (!Number.isFinite(valor) || valor <= 0 || valor > MINUTOS_MAXIMOS) return;
    onSelectMarcacion(empleado, dia, tipoPendienteMinutos.id, Math.round(valor));
    cerrarPasoMinutos();
  };

  const renderCelda = (empleado: TareoGrillaEmpleado, dia: number, empleadoIndex: number) => {
    const diaData = empleado.dias.find(d => d.dia === dia);
    const isActive = celdaActiva?.tareoId === empleado.tareo_id && celdaActiva?.dia === dia;
    const hasChange = cambiosPendientes.has(`${empleado.tareo_id}-${dia}`);
    const isFueraContrato = diaData && !diaData.en_contrato;

    const diasJustificados = diasConJustificacion[empleado.tareo_id] || [];
    const tieneJustificacion = diasJustificados.includes(dia);

    const isRangoInicio = rangoInicio?.tareoId === empleado.tareo_id && rangoInicio?.dia === dia;
    const isInRangoRect = rangoSeleccionado &&
      empleadoIndex >= rangoSeleccionado.empleadoIndexInicio &&
      empleadoIndex <= rangoSeleccionado.empleadoIndexFin &&
      dia >= rangoSeleccionado.diaInicio &&
      dia <= rangoSeleccionado.diaFin;

    if (isFueraContrato) {
      return (
        <div
          key={`${empleado.tareo_id}-${dia}`}
          className="flex-shrink-0 border-r px-1 py-0.5 text-center text-xs flex items-center justify-center cursor-not-allowed"
          style={{
            width: '32px',
            background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 2px, #e5e7eb 2px, #e5e7eb 4px)',
          }}
          title="Día fuera del período de contrato"
        >
          <span className="text-gray-400 font-medium">
            {diaData?.codigo || '-'}
          </span>
        </div>
      );
    }

    return (
      <Popover key={`${empleado.tareo_id}-${dia}`} open={isActive} onOpenChange={(open) => {
          if (open) return;
          cerrarPasoMinutos();
          onCeldaActiveClose();
        }}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'flex-shrink-0 border-r px-1 py-0.5 text-center text-xs cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-center relative',
              hasChange && 'ring-2 ring-yellow-400 ring-inset',
              isReadonly && 'cursor-not-allowed opacity-75',
              isRangoInicio && 'ring-2 ring-blue-500 ring-dashed bg-blue-50',
              isInRangoRect && 'bg-blue-100 ring-1 ring-blue-400'
            )}
            style={{
              width: '32px',
              backgroundColor: isRangoInicio || isInRangoRect ? undefined : (diaData?.color ? `${diaData.color}20` : undefined),
            }}
            onClick={(e) => onCeldaClick(empleado.tareo_id, dia, empleadoIndex, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenHistorialDrawer(empleado.empleado_id, empleado.nombre_completo, empleado.tareo_id);
            }}
          >
            {tieneJustificacion && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" title="Tiene justificación" />
            )}
            <span style={{ color: diaData?.color || undefined }} className="font-medium leading-none">
              {diaData?.codigo || '-'}
              {!!diaData?.minutos_no_laborados && (
                <span className="block text-[9px] font-normal opacity-80">
                  {diaData.minutos_no_laborados}m
                </span>
              )}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {tipoPendienteMinutos ? (
            <div className="mb-2 space-y-2">
              <p className="text-xs font-medium">
                {tipoPendienteMinutos.codigo} — minutos no laborados
              </p>
              <div className="grid grid-cols-4 gap-1">
                {MINUTOS_SUGERIDOS.map(sugerido => (
                  <button
                    key={sugerido}
                    className="p-1.5 text-xs font-medium rounded bg-orange-50 hover:bg-orange-100 text-orange-700"
                    onClick={() => {
                      onSelectMarcacion(empleado, dia, tipoPendienteMinutos.id, sugerido);
                      cerrarPasoMinutos();
                    }}
                  >
                    {sugerido}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={MINUTOS_MAXIMOS}
                autoFocus
                value={minutos}
                onChange={e => setMinutos(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmarMinutos(empleado, dia);
                  if (e.key === 'Escape') cerrarPasoMinutos();
                }}
                placeholder="Otra cantidad"
                aria-label="Minutos no laborados"
                className="w-full rounded border px-2 py-1 text-xs"
              />
              <div className="flex gap-1">
                <button
                  className="flex-1 p-1.5 text-xs font-medium rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"
                  disabled={!minutos || Number(minutos) <= 0 || Number(minutos) > MINUTOS_MAXIMOS}
                  onClick={() => confirmarMinutos(empleado, dia)}
                >
                  Aplicar
                </button>
                <button
                  className="flex-1 p-1.5 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200"
                  onClick={cerrarPasoMinutos}
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-4 gap-1 mb-2">
            {data.tipos_marcacion.map(tipo => (
              <button
                key={tipo.id}
                className="p-1.5 text-xs font-medium rounded hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${tipo.color}30`, color: tipo.color }}
                onClick={() => {
                  if (pideMinutos(tipo)) {
                    setTipoPendienteMinutos({ id: tipo.id, codigo: tipo.codigo });
                    setMinutos('');
                    return;
                  }
                  onSelectMarcacion(empleado, dia, tipo.id);
                }}
                title={tipo.descripcion}
              >
                {tipo.codigo}
              </button>
            ))}
            <button
              className="p-1.5 text-xs font-medium rounded bg-gray-100 hover:bg-gray-200 col-span-4"
              onClick={() => onSelectMarcacion(empleado, dia, null)}
            >
              Limpiar
            </button>
          </div>
          )}

          <div className="border-t pt-2 space-y-1">
            <button
              className="w-full p-1.5 text-xs font-medium rounded bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center gap-1"
              onClick={() => {
                onCeldaActiveClose();
                onOpenJustificacion(empleado.tareo_id, empleado.empleado_id, empleado.nombre_completo, dia);
              }}
            >
              + Justificación
            </button>
            <button
              className="w-full p-1.5 text-xs font-medium rounded bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center gap-1"
              onClick={() => {
                onCeldaActiveClose();
                onOpenHistorialDrawer(empleado.empleado_id, empleado.nombre_completo, empleado.tareo_id);
              }}
            >
              Ver historial
            </button>
            {diaData?.detalle_id && (
              <button
                className="w-full p-1.5 text-xs font-medium rounded bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center gap-1"
                onClick={() => {
                  onCeldaActiveClose();
                  onVerHistorial(diaData.detalle_id!);
                }}
              >
                Auditoría
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div
      ref={parentRef}
      className="border rounded-md overflow-auto max-h-[calc(100vh-280px)]"
    >
      <div style={{ width: `${820 + (diasFiltrados.length * 32) + 120}px`, minWidth: `${820 + (diasFiltrados.length * 32) + 120}px` }}>
        {/* Header row */}
        <div className="flex bg-background border-b sticky top-0 z-20">
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background sticky left-0 z-30" style={{ width: '50px' }}>#</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-center text-sm font-semibold bg-slate-200 text-slate-700 sticky z-30" style={{ width: '70px', left: '50px' }}>ID</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background sticky z-30" style={{ width: '100px', left: '120px' }}>DNI</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background sticky z-30" style={{ width: '200px', left: '220px' }}>Empleado</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background" style={{ width: '120px' }}>Área</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background" style={{ width: '120px' }}>Sede</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background" style={{ width: '80px' }}>Inicio</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-left text-sm font-medium bg-background" style={{ width: '80px' }}>Fin</div>
          {diasFiltrados.map(dia => {
            const fecha = esCalendario ? null : fechaDeDia(data.periodo.fecha_inicio, dia);
            return (
              <div
                key={dia}
                className={cn(
                  'flex-shrink-0 border-r py-1 text-center font-medium bg-background cursor-pointer hover:bg-blue-50 transition-colors',
                  fecha ? 'px-0.5 text-[10px]' : 'px-1 text-xs',
                  isReadonly ? 'cursor-not-allowed' : ''
                )}
                style={{ width: '32px' }}
                onClick={() => onColumnHeaderClick(dia)}
                title={
                  fecha
                    ? `${etiquetaFechaCompleta(fecha)} - click para seleccionar el día en todos los empleados`
                    : `Click para seleccionar día ${dia} en todos los empleados`
                }
              >
                {fecha ? etiquetaDiaMes(fecha) : dia}
              </div>
            );
          })}
          <div className="flex-shrink-0 border-r px-2 py-1 text-center text-xs font-medium bg-green-50" style={{ width: '40px' }} title="Días Trabajados">DT</div>
          <div className="flex-shrink-0 border-r px-2 py-1 text-center text-xs font-medium bg-red-50" style={{ width: '40px' }} title="Faltas">F</div>
          <div className="flex-shrink-0 px-2 py-1 text-center text-xs font-medium bg-yellow-50" style={{ width: '40px' }} title="Descansos">DL</div>
        </div>

        {/* Body rows */}
        <div className="w-full">
          {empleadosFiltrados.map((empleado, index) => (
            <div
              key={empleado.tareo_id}
              className={cn('flex border-b hover:bg-muted/30', index % 2 === 0 ? 'bg-background' : 'bg-muted/10')}
              style={{ height: '32px' }}
            >
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs flex items-center bg-background sticky left-0 z-10" style={{ width: '50px' }}>{index + 1}</div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-sm font-mono flex items-center justify-center text-slate-700 font-semibold bg-slate-100 sticky z-10" style={{ width: '70px', left: '50px' }}>
                {empleado.empleado_id}
              </div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs font-mono flex items-center bg-background sticky z-10" style={{ width: '100px', left: '120px' }}>
                {empleado.numero_documento}
              </div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs font-medium flex items-center truncate bg-background sticky z-10" style={{ width: '200px', left: '220px' }}>
                {empleado.nombre_completo}
              </div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs flex items-center truncate" style={{ width: '120px' }}>{empleado.area || '-'}</div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs flex items-center truncate" style={{ width: '120px' }}>{empleado.sede || '-'}</div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs flex items-center" style={{ width: '80px' }}>
                {empleado.fecha_inicio_contrato ? formatDateSafe(empleado.fecha_inicio_contrato) : '-'}
              </div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-xs flex items-center" style={{ width: '80px' }}>
                {empleado.fecha_fin_contrato ? formatDateSafe(empleado.fecha_fin_contrato) : '-'}
              </div>
              {diasFiltrados.map(dia => renderCelda(empleado, dia, index))}
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-center text-xs font-medium bg-green-50 flex items-center justify-center" style={{ width: '40px' }}>
                {empleado.totales['DIA_TRABAJADO'] || 0}
              </div>
              <div className="flex-shrink-0 border-r px-2 py-0.5 text-center text-xs font-medium bg-red-50 flex items-center justify-center" style={{ width: '40px' }}>
                {empleado.totales['FALTA'] || 0}
              </div>
              <div className="flex-shrink-0 px-2 py-0.5 text-center text-xs font-medium bg-yellow-50 flex items-center justify-center" style={{ width: '40px' }}>
                {empleado.totales['NO_LABORABLE'] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
