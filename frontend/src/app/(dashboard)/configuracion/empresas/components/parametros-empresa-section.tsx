'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface ParametroEmpresa {
  id: number;
  clave: string;
  valor: string | number;
  descripcion: string | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

/** Claves permitidas y su etiqueta para el usuario. */
const CLAVES: { value: string; label: string }[] = [
  { value: 'sctrSalud', label: 'SCTR Salud (%)' },
  { value: 'sctrPension', label: 'SCTR Pensión (%)' },
  { value: 'vidaLeyTasa', label: 'Vida Ley (%)' },
];

const etiquetaClave = (clave: string) =>
  CLAVES.find((c) => c.value === clave)?.label ?? clave;

const aPorcentaje = (fraccion: string | number) =>
  `${(Number(fraccion) * 100).toFixed(2)}%`;

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { timeZone: 'UTC' });

/**
 * Tasas propias de la empresa (pólizas SCTR / Vida Ley), versionadas por
 * vigencia. Si la empresa no define una tasa, rige el valor nacional.
 */
export function ParametrosEmpresaSection({ empresaId }: { empresaId: number }) {
  const [parametros, setParametros] = useState<ParametroEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [clave, setClave] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await api.getArray<ParametroEmpresa>(
        `/companies/${empresaId}/parametros`,
      );
      setParametros(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar las tasas'));
    } finally {
      setCargando(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async () => {
    const valorPct = Number(porcentaje);
    if (!clave || !desde || !Number.isFinite(valorPct) || valorPct <= 0) {
      toast.error('Completa la tasa, el porcentaje y la vigencia desde.');
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/companies/${empresaId}/parametros`, {
        clave,
        valor: valorPct / 100,
        vigencia_desde: desde,
        ...(hasta ? { vigencia_hasta: hasta } : {}),
      });
      toast.success('Tasa guardada');
      setClave('');
      setPorcentaje('');
      setDesde('');
      setHasta('');
      cargar();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar la tasa'));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    try {
      await api.delete(`/companies/${empresaId}/parametros/${id}`);
      toast.success('Tasa eliminada');
      cargar();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la tasa'));
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Tasas propias (pólizas)</p>
        <p className="text-xs text-muted-foreground">
          SCTR y Vida Ley según la póliza de esta empresa, con su vigencia. Si
          no defines una tasa, se aplica el valor general del sistema. Al
          renovar la póliza, agrega una fila nueva con la nueva vigencia.
        </p>
      </div>

      {cargando ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : parametros.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin tasas propias: rigen los valores generales.
        </p>
      ) : (
        <ul className="space-y-1">
          {parametros.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{etiquetaClave(p.clave)}</span>{' '}
                {aPorcentaje(p.valor)}
                <span className="ml-2 text-xs text-muted-foreground">
                  desde {formatearFecha(p.vigencia_desde)}
                  {p.vigencia_hasta
                    ? ` hasta ${formatearFecha(p.vigencia_hasta)}`
                    : ' (vigente)'}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => eliminar(p.id)}
                aria-label={`Eliminar ${etiquetaClave(p.clave)}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <Label className="text-xs">Tasa</Label>
          <Select value={clave} onValueChange={setClave}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Elegir" />
            </SelectTrigger>
            <SelectContent>
              {CLAVES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">%</Label>
          <Input
            className="h-8"
            inputMode="decimal"
            placeholder="1.50"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Desde</Label>
          <Input
            className="h-8"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Hasta (opcional)</Label>
          <Input
            className="h-8"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full"
            onClick={agregar}
            disabled={guardando}
          >
            {guardando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1 h-3.5 w-3.5" />
            )}
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
}
