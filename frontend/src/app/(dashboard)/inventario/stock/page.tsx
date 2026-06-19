'use client';

import { useState } from 'react';
import { Package, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/lib/auth';
import { useUser } from '@/contexts/user-context';
import { useStock } from './hooks/use-stock';
import { useExistencias } from './hooks/use-existencias';
import { StockExistencias } from './components/stock-existencias';
import { KardexInventario } from './components/kardex-inventario';
import { ItemDetalleDialog } from './components/item-detalle-dialog';
import { RegistrarBajaDialog } from './components/registrar-baja-dialog';
import type { ItemInventarioDetalle } from '@/types/inventario';

export default function StockPage() {
  const usuario = useUser();
  const puedeRegistrarBaja =
    hasPermission(usuario, 'inventarios:baja_solicitar') ||
    hasPermission(usuario, 'inventarios:baja_aprobar');

  const { fetchDetalle } = useStock();
  const {
    existencias,
    loading: existenciasLoading,
    refrescar: refrescarExistencias,
  } = useExistencias();

  const [detalle, setDetalle] = useState<ItemInventarioDetalle | null>(null);
  const [showRegistrarBaja, setShowRegistrarBaja] = useState(false);
  // Remonta el kardex para refrescarlo tras una baja (re-fetch del movimiento).
  const [kardexKey, setKardexKey] = useState(0);

  const refrescarTodo = () => {
    refrescarExistencias();
    setKardexKey((k) => k + 1);
  };

  const verDetalle = async (itemId: number) => {
    const data = await fetchDetalle(itemId);
    if (data) setDetalle(data);
  };

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Stock</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Existencias y movimientos del inventario de prendas
            </p>
          </div>
        </div>
        {puedeRegistrarBaja && (
          <Button
            variant="outline"
            onClick={() => setShowRegistrarBaja(true)}
            className="w-full sm:w-auto"
          >
            <PackageX className="mr-2 h-4 w-4" />
            Registrar baja
          </Button>
        )}
      </div>

      <StockExistencias existencias={existencias} loading={existenciasLoading} />

      <KardexInventario key={kardexKey} onVerItem={verDetalle} />

      <ItemDetalleDialog item={detalle} onClose={() => setDetalle(null)} />

      <RegistrarBajaDialog
        open={showRegistrarBaja}
        onOpenChange={setShowRegistrarBaja}
        onRegistrada={refrescarTodo}
      />
    </div>
  );
}
