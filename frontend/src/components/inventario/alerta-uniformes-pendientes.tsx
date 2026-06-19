'use client';

import { useState, useEffect } from 'react';
import { Shirt, AlertTriangle, Receipt, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ItemsPendientesEmpleado } from '@/types/inventario';

interface Props {
  empleadoId: number | null | undefined;
}

/**
 * Alerta de uniformes sin devolver de un empleado, para los diálogos de cese.
 * Muestra lo que el empleado tiene pendiente y permite, si no los devuelve,
 * generar el descuento de planilla en un clic (crea la solicitud, que luego se
 * aprueba). Si el módulo no aplica o falta permiso, falla en silencio.
 * No bloquea el cese.
 */
export function AlertaUniformesPendientes({ empleadoId }: Props) {
  const [data, setData] = useState<ItemsPendientesEmpleado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [generado, setGenerado] = useState(false);

  useEffect(() => {
    if (!empleadoId) return;
    let activo = true;
    (async () => {
      try {
        const res = await api.get<ItemsPendientesEmpleado>(
          `/inventario/empleados/${empleadoId}/pendientes`,
        );
        if (activo) setData(res);
      } catch {
        if (activo) setData(null);
      }
    })();
    return () => {
      activo = false;
    };
  }, [empleadoId]);

  const generarDescuento = async () => {
    if (!empleadoId || !data) return;
    setGenerando(true);
    try {
      await api.post('/inventario/descuentos', {
        empleado_id: empleadoId,
        motivo: 'Uniformes no devueltos al cese',
        item_ids: data.items.map((i) => i.id),
      });
      setGenerado(true);
      toast.success('Descuento de planilla generado (pendiente de aprobación)');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo generar el descuento',
      );
    } finally {
      setGenerando(false);
    }
  };

  // Si no hay empleado o no tiene pendientes, no renderiza nada.
  if (!empleadoId || !data || data.total === 0) return null;

  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-xs space-y-1.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
        <p className="text-amber-800">
          Este empleado tiene <strong>{data.total}</strong> uniforme(s) sin
          devolver. Si los devuelve, regístralo en Entregas; si no, descuéntalos
          de su planilla.
        </p>
      </div>
      <ul className="pl-5 space-y-0.5">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-amber-700">
            <Shirt className="h-3 w-3 shrink-0" />
            <span className="font-mono">{item.codigo}</span>
            <span>·</span>
            <span>
              {item.tipo_uniforme.nombre} ({item.talla})
            </span>
          </li>
        ))}
      </ul>

      {generado ? (
        <p className="flex items-center gap-1.5 pl-5 text-green-700 font-medium">
          <Check className="h-3.5 w-3.5" />
          Descuento de planilla generado (pendiente de aprobación).
        </p>
      ) : (
        <div className="pl-5 pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
            onClick={generarDescuento}
            disabled={generando}
          >
            {generando ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
            )}
            Descontar de planilla
          </Button>
        </div>
      )}
    </div>
  );
}
