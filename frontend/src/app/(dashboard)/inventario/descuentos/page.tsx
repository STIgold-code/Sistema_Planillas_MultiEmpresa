'use client';

import { useState } from 'react';
import { Plus, Loader2, BadgeDollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDescuentos } from './hooks/use-descuentos';
import { DescuentosTable } from './components/descuentos-table';
import { SolicitarDescuentoDialog } from './components/solicitar-descuento-dialog';
import { DescuentoMasivaPanel } from './components/descuento-masiva-panel';
import { AprobarDescuentoDialog } from './components/aprobar-descuento-dialog';
import type { SolicitudDescuento } from '@/types/inventario';

export default function DescuentosPage() {
  const {
    descuentos,
    loading,
    saving,
    crear,
    aprobar,
    rechazar,
    refetch,
  } = useDescuentos();
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [masivaOpen, setMasivaOpen] = useState(false);
  const [detalle, setDetalle] = useState<SolicitudDescuento | null>(null);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Descuentos</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Descuentos por uniformes no devueltos
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setMasivaOpen(true)}
            className="w-full sm:w-auto"
          >
            <Users className="mr-2 h-4 w-4" />
            Solicitar descuento masivo
          </Button>
          <Button
            onClick={() => setSolicitarOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Solicitar descuento
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DescuentosTable descuentos={descuentos} onVer={setDetalle} />
      )}

      <SolicitarDescuentoDialog
        open={solicitarOpen}
        saving={saving}
        onOpenChange={setSolicitarOpen}
        onSubmit={crear}
      />

      <DescuentoMasivaPanel
        open={masivaOpen}
        onOpenChange={setMasivaOpen}
        onSolicitado={refetch}
      />

      <AprobarDescuentoDialog
        solicitud={detalle}
        saving={saving}
        onClose={() => setDetalle(null)}
        onAprobar={aprobar}
        onRechazar={rechazar}
      />
    </div>
  );
}
