'use client';

import { ArrowLeftRight } from 'lucide-react';
import { KardexInventario } from '../stock/components/kardex-inventario';

export default function MovimientosPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Movimientos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Kardex: todo lo que entró y salió del stock
          </p>
        </div>
      </div>
      <KardexInventario />
    </div>
  );
}
