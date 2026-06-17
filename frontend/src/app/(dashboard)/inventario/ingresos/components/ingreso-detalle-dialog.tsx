'use client';

import { useState } from 'react';
import { Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateSafe } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';
import { descargarArchivo } from '../../shared/descargar-archivo';
import {
  ESTADO_ITEM_LABELS,
  type IngresoInventarioFull,
  type EstadoItemInventario,
} from '@/types/inventario';

interface Props {
  ingreso: IngresoInventarioFull | null;
  onClose: () => void;
}

const ESTADO_BADGE: Record<EstadoItemInventario, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ENTREGADO: 'bg-blue-100 text-blue-700 border-blue-200',
  BAJA: 'bg-red-100 text-red-700 border-red-200',
};

export function IngresoDetalleDialog({ ingreso, onClose }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [abriendoArchivo, setAbriendoArchivo] = useState(false);

  if (!ingreso) return null;

  const total = ingreso.items.reduce((acc, i) => acc + Number(i.precio), 0);

  /**
   * Abre el archivo de la factura. El endpoint de archivos está protegido por
   * JWT, así que se descarga el blob con el token y se abre en una pestaña nueva.
   */
  const verArchivo = async () => {
    if (!ingreso.archivo_url) return;
    setAbriendoArchivo(true);
    try {
      const token = getAccessToken();
      const res = await fetch(ingreso.archivo_url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('No se pudo abrir el archivo');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Liberar el objeto tras un margen para que el navegador alcance a abrirlo.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo abrir el archivo de la factura');
    } finally {
      setAbriendoArchivo(false);
    }
  };

  const exportar = async () => {
    setDescargando(true);
    try {
      await descargarArchivo(
        `/inventario/ingresos/${ingreso.id}/export/excel`,
        `Ingreso_${ingreso.id}.xlsx`,
      );
    } catch {
      toast.error('No se pudo descargar el Excel');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Dialog open={ingreso !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingreso #{ingreso.id}</DialogTitle>
          <DialogDescription>Compra de prendas al proveedor</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cabecera */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Fecha</dt>
              <dd className="font-medium">{formatDateSafe(ingreso.fecha_ingreso)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">N° Documento</dt>
              <dd className="font-medium">{ingreso.numero_documento || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Proveedor</dt>
              <dd className="font-medium">{ingreso.proveedor.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Registrado por</dt>
              <dd className="font-medium">{ingreso.usuario.nombre_completo}</dd>
            </div>
            {ingreso.observaciones && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Observaciones</dt>
                <dd>{ingreso.observaciones}</dd>
              </div>
            )}
          </dl>

          {/* Factura digitalizada (solo si el ingreso tiene datos de factura) */}
          {(ingreso.numero_factura ||
            ingreso.monto_total != null ||
            ingreso.archivo_url) && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="col-span-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                <FileText className="h-3.5 w-3.5" />
                Factura digitalizada
              </div>
              {ingreso.numero_factura && (
                <div>
                  <dt className="text-xs text-muted-foreground">N° Factura</dt>
                  <dd className="font-medium">{ingreso.numero_factura}</dd>
                </div>
              )}
              {ingreso.fecha_factura && (
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Fecha factura
                  </dt>
                  <dd className="font-medium">
                    {formatDateSafe(ingreso.fecha_factura)}
                  </dd>
                </div>
              )}
              {ingreso.monto_total != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Monto total</dt>
                  <dd className="font-medium tabular-nums">
                    S/ {Number(ingreso.monto_total).toFixed(2)}
                  </dd>
                </div>
              )}
              {ingreso.archivo_url && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Archivo</dt>
                  <dd>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={verArchivo}
                      disabled={abriendoArchivo}
                      className="h-8"
                    >
                      {abriendoArchivo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Ver factura
                    </Button>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* Prendas que ingresaron */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Prendas que ingresaron ({ingreso.items.length})
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Código</th>
                    <th className="px-3 py-1.5 text-left">Prenda</th>
                    <th className="px-3 py-1.5 text-center">Talla</th>
                    <th className="px-3 py-1.5 text-right">Precio</th>
                    <th className="px-3 py-1.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ingreso.items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-1.5 font-mono text-xs">{it.codigo}</td>
                      <td className="px-3 py-1.5">{it.tipo_uniforme.nombre}</td>
                      <td className="px-3 py-1.5 text-center">{it.talla}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        S/ {Number(it.precio).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${ESTADO_BADGE[it.estado]}`}
                        >
                          {ESTADO_ITEM_LABELS[it.estado]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 text-sm font-semibold">
                  <tr className="border-t">
                    <td className="px-3 py-1.5" colSpan={3}>
                      Total
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      S/ {total.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={exportar}
            disabled={descargando}
            className="sm:mr-auto"
          >
            {descargando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
