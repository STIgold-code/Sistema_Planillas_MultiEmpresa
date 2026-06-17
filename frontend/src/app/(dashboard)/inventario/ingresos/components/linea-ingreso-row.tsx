'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TipoUniformeSelect } from '@/types/inventario';
import type { LineaIngreso } from '../hooks/use-ingresos';
import {
  bloquearTeclasEntero,
  bloquearTeclasDecimal,
} from '@/lib/numeric-input';

interface Props {
  linea: LineaIngreso;
  tipos: TipoUniformeSelect[];
  index: number;
  onChange: (index: number, linea: LineaIngreso) => void;
  onRemove: (index: number) => void;
  removable: boolean;
}

export function LineaIngresoRow({
  linea,
  tipos,
  index,
  onChange,
  onRemove,
  removable,
}: Props) {
  const update = (patch: Partial<LineaIngreso>) =>
    onChange(index, { ...linea, ...patch });

  const tipoSeleccionado = tipos.find((t) => t.id === linea.tipo_uniforme_id);
  const tallasTipo = tipoSeleccionado?.tallas ?? [];
  const sinTallas = tallasTipo.length === 0;

  const cambiarTipo = (v: string) => {
    const nuevoId = Number(v);
    const nuevasTallas = tipos.find((t) => t.id === nuevoId)?.tallas ?? [];
    // Si la talla actual no pertenece al nuevo tipo, se limpia.
    const conservarTalla =
      nuevasTallas.length === 0 ||
      nuevasTallas.some((talla) => talla.valor === linea.talla);
    update({
      tipo_uniforme_id: nuevoId,
      talla: conservarTalla ? linea.talla : '',
    });
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-12 sm:col-span-4">
        <Select
          value={linea.tipo_uniforme_id ? String(linea.tipo_uniforme_id) : ''}
          onValueChange={cambiarTipo}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Tipo de prenda" />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-4 sm:col-span-2">
        <Select
          value={linea.talla || ''}
          disabled={sinTallas}
          onValueChange={(v) => update({ talla: v })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue
              placeholder={sinTallas ? 'Sin tallas configuradas' : 'Talla'}
            />
          </SelectTrigger>
          <SelectContent>
            {tallasTipo.map((talla) => (
              <SelectItem key={talla.valor} value={talla.valor}>
                {talla.valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-3 sm:col-span-2">
        <Input
          className="h-9 text-sm"
          type="number"
          min={1}
          placeholder="Cant."
          value={linea.cantidad || ''}
          onKeyDown={bloquearTeclasEntero}
          onChange={(e) => update({ cantidad: parseInt(e.target.value, 10) || 0 })}
        />
      </div>

      <div className="col-span-4 sm:col-span-3">
        <Input
          className="h-9 text-sm"
          type="number"
          min={0}
          step="0.01"
          placeholder="Precio unit."
          value={linea.precio_unitario || ''}
          onKeyDown={bloquearTeclasDecimal}
          onChange={(e) =>
            update({ precio_unitario: parseFloat(e.target.value) || 0 })
          }
        />
      </div>

      <div className="col-span-1 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(index)}
          disabled={!removable}
          aria-label="Quitar línea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
