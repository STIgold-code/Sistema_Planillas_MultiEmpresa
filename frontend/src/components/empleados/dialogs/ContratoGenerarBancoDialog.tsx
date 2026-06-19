'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PlantillaContrato } from '@/types';
import { PlantillaDocumento } from '../hooks/contratos.types';

export interface ContratoGenerarBancoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  plantillas: PlantillaContrato[];
  plantillasBanco: PlantillaDocumento[];
  selectedPlantilla: string;
  setSelectedPlantilla: (id: string) => void;
  selectedPlantillaBanco: string;
  setSelectedPlantillaBanco: (id: string) => void;
  generating: boolean;
  handleGenerarUnificado: () => void;
}

export function ContratoGenerarBancoDialog({
  open,
  onOpenChange,
  activeTab,
  setActiveTab,
  plantillas,
  plantillasBanco,
  selectedPlantilla,
  setSelectedPlantilla,
  selectedPlantillaBanco,
  setSelectedPlantillaBanco,
  generating,
  handleGenerarUnificado,
}: ContratoGenerarBancoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir Documento</DialogTitle>
          <DialogDescription>
            Seleccione el tipo de plantilla y el documento a generar.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="banco">Banco Documentos</TabsTrigger>
            <TabsTrigger value="contrato">Plantillas Contrato</TabsTrigger>
          </TabsList>

          <div className="py-4">
            <TabsContent value="banco" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Plantilla General</Label>
                <Select
                  value={selectedPlantillaBanco}
                  onValueChange={setSelectedPlantillaBanco}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillasBanco.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.nombre} ({p.categoria})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {plantillasBanco.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay plantillas generales disponibles.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contrato" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Plantilla de Contrato</Label>
                <Select
                  value={selectedPlantilla}
                  onValueChange={setSelectedPlantilla}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas
                      .filter((p) => p.archivo_base_url)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {plantillas.filter((p) => p.archivo_base_url).length === 0 && (
                  <p className="text-xs text-amber-600">
                    No hay plantillas de contrato con archivo Word asociado.
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerarUnificado}
            disabled={generating || (activeTab === 'banco' ? !selectedPlantillaBanco : !selectedPlantilla)}
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar Documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
