'use client';

import { useEffect, useState } from 'react';
import { Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { bloquearTeclasEntero } from '@/lib/numeric-input';
import { EmpleadoSelector } from '../../../shared/empleado-selector';
import type {
  TallaEmpleadoPrellenada,
  PlantillaUniforme,
} from '@/types/inventario';
import type { LineaEmpleado } from '../hooks/use-requerimiento-detalle';

export interface FilaPrenda extends TallaEmpleadoPrellenada {
  cantidad: number;
}

export interface EdicionInicial {
  empleadoId: number;
  empleadoNombre: string;
  filas: FilaPrenda[];
}

interface Props {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  cargarTallas: (empleadoId: number) => Promise<TallaEmpleadoPrellenada[]>;
  onGuardar: (empleadoId: number, lineas: LineaEmpleado[]) => Promise<boolean>;
  /** Si se provee, el dialog abre en modo edición con empleado fijo y filas pre-cargadas. */
  inicial?: EdicionInicial | null;
}

export function EmpleadoPrendasDialog({
  open,
  saving,
  onOpenChange,
  cargarTallas,
  onGuardar,
  inicial = null,
}: Props) {
  const esEdicion = inicial !== null;
  const [empleadoId, setEmpleadoId] = useState<number | null>(inicial?.empleadoId ?? null);
  const [empleadoNombre, setEmpleadoNombre] = useState(inicial?.empleadoNombre ?? '');
  const [filas, setFilas] = useState<FilaPrenda[]>(inicial?.filas ?? []);
  const [cargando, setCargando] = useState(false);
  // Catálogo de tallas válidas por tipo de uniforme (para los combos de talla).
  const [tallasPorTipo, setTallasPorTipo] = useState<Record<number, string[]>>(
    {},
  );
  // Plantillas de uniforme ("uniforme completo") para aplicar de un clic.
  const [plantillas, setPlantillas] = useState<PlantillaUniforme[]>([]);
  const [plantillaSel, setPlantillaSel] = useState('');

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    api
      .get<PlantillaUniforme[]>('/plantillas-uniforme')
      .then((res) => {
        if (!vivo) return;
        setPlantillas(res);
        const predet = res.find((p) => p.predeterminada) ?? res[0];
        if (predet) setPlantillaSel(String(predet.id));
      })
      .catch(() => {
        if (vivo) setPlantillas([]);
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  // Carga el catálogo de tallas por tipo de uniforme al abrir el dialog.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    api
      .get<{ id: number; tallas: { valor: string }[] }[]>(
        '/tipos-uniforme/select',
      )
      .then((res) => {
        if (!vivo) return;
        const mapa: Record<number, string[]> = {};
        for (const t of res) mapa[t.id] = t.tallas.map((x) => x.valor);
        setTallasPorTipo(mapa);
      })
      .catch(() => {
        if (vivo) setTallasPorTipo({});
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const seleccionarEmpleado = async (e: {
    id: number;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  }) => {
    setEmpleadoId(e.id);
    setEmpleadoNombre(`${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`);
    setCargando(true);
    const tallas = await cargarTallas(e.id);
    setFilas(
      tallas.map((t) => ({ ...t, cantidad: t.talla ? t.cantidad_estandar : 0 })),
    );
    setCargando(false);
  };

  const updateFila = (idx: number, patch: Partial<FilaPrenda>) =>
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  // Aplica una plantilla: arma las filas con sus artículos y cantidades,
  // conservando la talla que el empleado ya tuviera (clave para ingresantes:
  // trae las prendas y solo falta cargar las tallas).
  const aplicarPlantilla = () => {
    const pl = plantillas.find((p) => String(p.id) === plantillaSel);
    if (!pl) return;
    setFilas(
      pl.items.map((it) => {
        const existente = filas.find(
          (f) => f.tipo_uniforme_id === it.tipo_uniforme_id,
        );
        return {
          tipo_uniforme_id: it.tipo_uniforme_id,
          tipo_nombre: it.tipo_uniforme.nombre,
          cantidad_estandar: it.cantidad,
          talla: existente?.talla ?? '',
          cantidad: it.cantidad,
        };
      }),
    );
  };

  const handleGuardar = async () => {
    if (!empleadoId) return;
    const lineas: LineaEmpleado[] = filas
      .filter((f) => f.talla.trim() && f.cantidad >= 1)
      .map((f) => ({
        tipo_uniforme_id: f.tipo_uniforme_id,
        talla: f.talla.trim(),
        cantidad: f.cantidad,
      }));
    const ok = await onGuardar(empleadoId, lineas);
    if (ok) handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? 'Editar prendas del empleado' : 'Cargar prendas de un empleado'}
          </DialogTitle>
          <DialogDescription>
            {esEdicion
              ? 'Ajusta talla y cantidad de las prendas. Deja la cantidad en 0 para quitar una prenda del requerimiento.'
              : 'Las tallas guardadas del empleado se pre-llenan. Ajusta talla y cantidad; deja cantidad en 0 para omitir una prenda.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {esEdicion ? (
            <div className="space-y-1">
              <Label>Empleado</Label>
              <p className="text-sm font-medium">{empleadoNombre}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                Empleado <span className="text-red-600">*</span>
              </Label>
              <EmpleadoSelector selectedId={empleadoId} onSelect={seleccionarEmpleado} />
              {empleadoId && (
                <p className="text-xs text-green-700">Seleccionado: {empleadoNombre}</p>
              )}
            </div>
          )}

          {empleadoId && !cargando && plantillas.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 sm:flex-row sm:items-center">
              <span className="flex-1 text-xs text-foreground">
                Aplica un <strong>uniforme completo</strong> y solo carga las
                tallas.
              </span>
              <div className="flex items-center gap-2">
                {plantillas.length > 1 && (
                  <Select value={plantillaSel} onValueChange={setPlantillaSel}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {plantillas.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.nombre}
                          {p.predeterminada ? ' (predet.)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={aplicarPlantilla}
                  disabled={!plantillaSel}
                >
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  Aplicar uniforme completo
                </Button>
              </div>
            </div>
          )}

          {cargando ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            empleadoId &&
            filas.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span className="col-span-6">Prenda</span>
                  <span className="col-span-3">Talla</span>
                  <span className="col-span-3">Cantidad</span>
                </div>
                {filas.map((f, idx) => {
                  const tallasTipo = tallasPorTipo[f.tipo_uniforme_id] ?? [];
                  const sinTallas = tallasTipo.length === 0;
                  return (
                  <div key={f.tipo_uniforme_id} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-6 text-sm truncate">{f.tipo_nombre}</span>
                    <div className="col-span-3">
                      <Select
                        value={f.talla || ''}
                        disabled={sinTallas}
                        onValueChange={(v) => updateFila(idx, { talla: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue
                            placeholder={
                              sinTallas ? 'Sin tallas configuradas' : 'Talla'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {tallasTipo.map((tv) => (
                            <SelectItem key={tv} value={tv}>
                              {tv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="col-span-3 h-8 text-sm"
                      type="number"
                      min={0}
                      value={f.cantidad || ''}
                      onKeyDown={bloquearTeclasEntero}
                      onChange={(e) =>
                        updateFila(idx, { cantidad: parseInt(e.target.value, 10) || 0 })
                      }
                    />
                  </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={saving || !empleadoId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
